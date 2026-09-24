import uuid
import re
import asyncio
import logging
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, Query, Path, HTTPException, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.schemas.document import DocumentChunk, DocumentMetadata, DocumentProcessingResponse
from app.schemas.analysis import LegalAnalysis, QARequest, QAResponse
from app.schemas.rag import GroundedQuestionRequest, GroundedAnswerResponse
from app.services.document_processor import (
    DocumentProcessor,
    DocumentProcessingException,
)
from app.services.analyzer import LegalAnalyzer
from app.services.workflow_service import DocumentWorkflowService
from app.services.llm.base import LLMProviderError, ConfigurationError
from app.services.rag_service import RAGService, RAGError, DocumentNotFoundError
from app.db.session import get_db, is_database_available, DatabaseUnavailableError, get_session_factory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


def sanitize_error_detail(detail: str) -> str:
    """Redact any potential API keys, connection strings, or sensitive tokens from error details."""
    if not isinstance(detail, str):
        return "An error occurred."
    redacted = re.sub(r"AIza[0-9A-Za-z\-_]{20,}", "[REDACTED_API_KEY]", detail)
    redacted = re.sub(r"xai-[0-9A-Za-z\-_]{15,}", "[REDACTED_API_KEY]", redacted)
    redacted = re.sub(r"://([^:]+):([^@]+)@", r"://\1:[REDACTED]@", redacted)
    return redacted


class QABody(BaseModel):
    question: str = Field(
        ...,
        min_length=2,
        max_length=1000,
        description="User query about the legal document",
    )
    chunks: List[DocumentChunk] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Retrieved or provided document chunks",
    )


@router.post(
    "/upload",
    response_model=DocumentProcessingResponse,
    summary="Upload and Process Legal PDF",
    description="Uploads a PDF legal document (up to 10 MB), validates, extracts text page-by-page, segments into section-aware chunks, and indexes embeddings into PostgreSQL vector storage if available.",
    responses={
        200: {"description": "Document successfully processed, chunked, and optionally indexed."},
        400: {"description": "Corrupted or empty PDF file."},
        413: {"description": "File exceeds the 10 MB size limit."},
        415: {"description": "Unsupported media format. Only PDF files are accepted."},
        422: {"description": "Document contains no extractable text."},
        500: {"description": "Internal document processing error or provider configuration error."},
        502: {"description": "LLM provider upstream failure."},
    },
)
async def upload_document(
    file: UploadFile = File(..., description="Legal document in PDF format"),
    analyze: bool = Query(False, description="Whether to execute LLM legal analysis immediately"),
):
    """
    Handle document upload, text extraction, cleaning, section-aware chunking,
    and vector indexing in PostgreSQL + pgvector when available.
    """
    try:
        file_bytes = await file.read()

        workflow = DocumentWorkflowService()
        result = await asyncio.to_thread(
            workflow.process_and_index_document,
            file_bytes=file_bytes,
            filename=file.filename or "uploaded.pdf",
            content_type=file.content_type,
            analyze=analyze,
        )
        return result

    except DocumentProcessingException as dpe:
        logger.warning("Document processing failed: %s (Status: %d)", dpe.message, dpe.status_code)
        raise HTTPException(
            status_code=dpe.status_code,
            detail=dpe.message,
        ) from dpe

    except ConfigurationError as ce:
        logger.error("LLM Provider configuration error: %s", ce.message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=sanitize_error_detail(ce.message),
        ) from ce

    except LLMProviderError as lpe:
        logger.error("LLM Provider error during analysis: %s", lpe.message)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=sanitize_error_detail(lpe.message),
        ) from lpe

    except Exception as exc:
        logger.exception("Unexpected error processing uploaded document: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the document. Please verify the file and try again.",
        ) from exc


@router.post(
    "/analyze",
    response_model=DocumentProcessingResponse,
    summary="Upload and Analyze Legal PDF",
    description="Uploads a PDF, chunks it, and executes structured LegalAnalysis using the active LLM provider.",
)
async def analyze_document(
    file: UploadFile = File(..., description="Legal document in PDF format"),
):
    """Explicit endpoint to upload and perform complete LLM legal analysis."""
    return await upload_document(file=file, analyze=True)


@router.post(
    "/{document_id}/questions",
    response_model=GroundedAnswerResponse,
    summary="RAG Document-Grounded Q&A",
    description="Performs semantic vector retrieval across document chunks stored in pgvector and generates a strictly grounded answer with verified source citations.",
    responses={
        200: {"description": "Grounded answer with verified source chunk citations."},
        400: {"description": "Invalid query or malformed request."},
        404: {"description": "Document not found in the vector index."},
        500: {"description": "Provider configuration error."},
        502: {"description": "Upstream LLM or Embedding provider error."},
        503: {"description": "PostgreSQL database unavailable."},
    },
)
async def ask_document_question(
    document_id: str = Path(
        ...,
        min_length=1,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_\-\.]+$",
        description="Unique identifier for the document",
    ),
    body: GroundedQuestionRequest = ...,
    db: Session = Depends(get_db),
):
    """
    RAG-powered document question answering:
    1. Embeds question.
    2. Performs cosine similarity search isolated to document_id.
    3. Evaluates relevance threshold.
    4. Generates grounded answer with zero-trust verified citations.
    """
    try:
        rag_service = RAGService()
        response = await asyncio.to_thread(
            rag_service.answer_question,
            document_id=document_id,
            question=body.question,
            db=db,
        )
        return response

    except DocumentNotFoundError as dnfe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=sanitize_error_detail(dnfe.message),
        ) from dnfe

    except DatabaseUnavailableError as due:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PostgreSQL database with pgvector is currently unavailable. See docs/development.md for setup instructions.",
        ) from due

    except ConfigurationError as ce:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=sanitize_error_detail(ce.message),
        ) from ce

    except LLMProviderError as lpe:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=sanitize_error_detail(lpe.message),
        ) from lpe

    except RAGError as re:
        raise HTTPException(
            status_code=re.status_code,
            detail=sanitize_error_detail(re.message),
        ) from re

    except Exception as exc:
        logger.exception("Error in RAG Q&A: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate grounded answer.",
        ) from exc


@router.post(
    "/qa",
    response_model=QAResponse,
    summary="Direct Document-Grounded Legal Q&A (Direct Chunk Fallback)",
    description="Answers questions strictly grounded in provided document chunks without requiring a database index.",
)
async def grounded_qa(body: QABody):
    """Execute grounded question-answering with active LLM provider directly on provided chunks."""
    try:
        analyzer = LegalAnalyzer()
        response = await asyncio.to_thread(
            analyzer.answer_question,
            question=body.question,
            chunks=body.chunks,
        )
        return response
    except ConfigurationError as ce:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=sanitize_error_detail(ce.message),
        ) from ce
    except LLMProviderError as lpe:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=sanitize_error_detail(lpe.message),
        ) from lpe
    except Exception as exc:
        logger.exception("Error during Q&A: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate answer for the question.",
        ) from exc
