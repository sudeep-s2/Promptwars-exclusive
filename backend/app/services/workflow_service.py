import uuid
import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.schemas.document import DocumentMetadata, DocumentProcessingResponse
from app.services.document_processor import DocumentProcessor, DocumentProcessingException
from app.services.analyzer import LegalAnalyzer
from app.services.rag_service import RAGService
from app.services.llm.base import LLMProviderError, ConfigurationError
from app.db.session import is_database_available, get_session_factory

logger = logging.getLogger(__name__)


class DocumentWorkflowService:
    """
    Central orchestration service for the complete document lifecycle:
    1. Process PDF (validation, text extraction, cleaning, section-aware chunking)
    2. Index canonical chunks with embeddings into PostgreSQL + pgvector (if available)
    3. Execute structured LegalAnalysis via configured LLM provider
    4. Return workspace-ready combined response
    """

    def __init__(
        self,
        rag_service: Optional[RAGService] = None,
        analyzer: Optional[LegalAnalyzer] = None,
    ):
        self.rag_service = rag_service or RAGService()
        self.analyzer = analyzer or LegalAnalyzer()

    def process_and_index_document(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: Optional[str] = None,
        analyze: bool = True,
        db: Optional[Session] = None,
    ) -> DocumentProcessingResponse:
        """
        Executes end-to-end document intake workflow:
        Process -> Assign document_id -> Vector Index -> Legal Analysis -> Combined Payload.
        """
        # Step 1: Real PDF extraction and canonical chunking
        result = DocumentProcessor.process_pdf(
            file_bytes=file_bytes,
            filename=filename or "uploaded.pdf",
            content_type=content_type,
        )

        # Step 2: Assign stable UUID document_id
        document_id = str(uuid.uuid4())
        result.document_id = document_id

        # Step 3: Vector indexing in PostgreSQL + pgvector
        indexing_status = "unavailable"
        try:
            if db is not None:
                self.rag_service.index_document(
                    document_id=document_id,
                    filename=result.filename,
                    file_type=result.file_type,
                    file_size=result.file_size,
                    page_count=result.page_count,
                    section_count=result.section_count,
                    chunk_count=result.chunk_count,
                    chunks=result.chunks,
                    db=db,
                )
                indexing_status = "indexed"
            elif is_database_available():
                factory = get_session_factory()
                if factory:
                    with factory() as session:
                        self.rag_service.index_document(
                            document_id=document_id,
                            filename=result.filename,
                            file_type=result.file_type,
                            file_size=result.file_size,
                            page_count=result.page_count,
                            section_count=result.section_count,
                            chunk_count=result.chunk_count,
                            chunks=result.chunks,
                            db=session,
                        )
                        indexing_status = "indexed"
        except Exception as idx_exc:
            logger.warning("Vector indexing skipped or degraded for doc %s: %s", document_id, idx_exc)
            indexing_status = "failed"

        result.indexing_status = indexing_status

        # Step 4: Structured Legal Analysis (Single LLM Call)
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
            result.analysis = self.analyzer.analyze(chunks=result.chunks, metadata=metadata)

        return result
