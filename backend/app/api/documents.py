import logging
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, Query, HTTPException, status
from pydantic import BaseModel, Field

from app.schemas.document import DocumentChunk, DocumentMetadata, DocumentProcessingResponse
from app.schemas.analysis import LegalAnalysis, QARequest, QAResponse
from app.services.document_processor import (
    DocumentProcessor,
    DocumentProcessingException,
)
from app.services.analyzer import LegalAnalyzer
from app.services.llm.base import LLMProviderError, ConfigurationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


class QABody(BaseModel):
    question: str = Field(..., description="User query about the legal document")
    chunks: List[DocumentChunk] = Field(..., description="Retrieved or all document chunks")


@router.post(
    "/upload",
    response_model=DocumentProcessingResponse,
    summary="Upload and Process Legal PDF",
    description="Uploads a PDF legal document (up to 10 MB), validates, extracts text page-by-page, and segments into section-aware chunks. Optionally runs structured legal analysis.",
    responses={
        200: {"description": "Document successfully processed and chunked."},
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
    Handle document upload, text extraction, cleaning, and section-aware chunking.
    Delegates processing logic to DocumentProcessor and optional analysis to LegalAnalyzer.
    """
    try:
        file_bytes = await file.read()

        result = DocumentProcessor.process_pdf(
            file_bytes=file_bytes,
            filename=file.filename or "uploaded.pdf",
            content_type=file.content_type,
        )

        if analyze:
            metadata = DocumentMetadata(
                filename=result.filename,
                file_type=result.file_type,
                file_size=result.file_size,
                page_count=result.page_count,
                text_length=result.text_length,
                section_count=result.section_count,
                chunk_count=result.chunk_count,
            )
            analyzer = LegalAnalyzer()
            result.analysis = analyzer.analyze(chunks=result.chunks, metadata=metadata)

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
            detail=ce.message,
        ) from ce

    except LLMProviderError as lpe:
        logger.error("LLM Provider error during analysis: %s", lpe.message)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=lpe.message,
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
    "/qa",
    response_model=QAResponse,
    summary="Document-Grounded Legal Q&A",
    description="Answers questions strictly grounded in provided document chunks with verifiable citations.",
)
async def grounded_qa(body: QABody):
    """Execute grounded question-answering with active LLM provider."""
    try:
        analyzer = LegalAnalyzer()
        response = analyzer.answer_question(question=body.question, chunks=body.chunks)
        return response
    except ConfigurationError as ce:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=ce.message) from ce
    except LLMProviderError as lpe:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=lpe.message) from lpe
    except Exception as exc:
        logger.exception("Error during Q&A: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate answer for the question.",
        ) from exc
