import logging
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from app.schemas.document import DocumentProcessingResponse
from app.services.document_processor import (
    DocumentProcessor,
    DocumentProcessingException,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentProcessingResponse,
    summary="Upload and Process Legal PDF",
    description="Uploads a PDF legal document (up to 10 MB), validates, extracts text page-by-page, and segments into section-aware chunks.",
    responses={
        200: {"description": "Document successfully processed and chunked."},
        400: {"description": "Corrupted or empty PDF file."},
        413: {"description": "File exceeds the 10 MB size limit."},
        415: {"description": "Unsupported media format. Only PDF files are accepted."},
        422: {"description": "Document contains no extractable text."},
        500: {"description": "Internal document processing error."},
    },
)
async def upload_document(file: UploadFile = File(..., description="Legal document in PDF format")):
    """
    Handle document upload, text extraction, cleaning, and section-aware chunking.
    Keeps processing logic delegated to the DocumentProcessor service layer.
    """
    try:
        # Read file contents into memory
        file_bytes = await file.read()

        # Delegate execution to service layer
        result = DocumentProcessor.process_pdf(
            file_bytes=file_bytes,
            filename=file.filename or "uploaded.pdf",
            content_type=file.content_type,
        )
        return result

    except DocumentProcessingException as dpe:
        # Explicit domain validation / processing error
        logger.warning("Document processing failed: %s (Status: %d)", dpe.message, dpe.status_code)
        raise HTTPException(
            status_code=dpe.status_code,
            detail=dpe.message,
        ) from dpe

    except Exception as exc:
        # Unexpected error — log internally, do NOT expose internal trace to client
        logger.exception("Unexpected error processing uploaded document: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the document. Please verify the file and try again.",
        ) from exc
