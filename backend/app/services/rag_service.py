import json
import logging
from typing import List, Tuple, Optional
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.document import Document, DocumentChunkModel
from app.schemas.document import DocumentChunk, DocumentMetadata
from app.schemas.rag import GroundedAnswerResponse, SourceCitation
from app.services.embedding.base import EmbeddingProvider, EmbeddingError
from app.services.embedding.factory import get_embedding_provider
from app.services.llm.factory import get_llm_provider
from app.services.llm.base import LLMProvider, LLMProviderError, ConfigurationError

logger = logging.getLogger(__name__)

# Default retrieval configuration
DEFAULT_TOP_K = 5
# Minimum cosine similarity threshold to consider chunks relevant (1 - cosine_distance)
# Cosine distance ranges from 0 (identical) to 2 (opposite). Similarity = 1 - distance.
# Chunks below this similarity are considered ungrounded or out-of-scope.
RELEVANCE_SIMILARITY_THRESHOLD = 0.35

INSUFFICIENT_CONTEXT_MESSAGE = "This document does not provide enough information to answer that question."


class RAGError(Exception):
    """Base exception for RAG pipeline errors."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class DocumentNotFoundError(RAGError):
    """Raised when the requested document ID is not found in the index."""
    def __init__(self, document_id: str):
        super().__init__(f"Document '{document_id}' was not found in the index.", status_code=404)


class RAGService:
    """
    Orchestrates the document-grounded Retrieval-Augmented Generation pipeline:
    - Indexes canonical document chunks with embeddings into PostgreSQL + pgvector.
    - Performs isolated cosine-similarity vector retrieval strictly scoped by document_id.
    - Evaluates relevance and enforces zero-trust source verification with the active LLM.
    """

    def __init__(
        self,
        embedding_provider: Optional[EmbeddingProvider] = None,
        llm_provider: Optional[LLMProvider] = None,
        top_k: int = DEFAULT_TOP_K,
        relevance_threshold: float = RELEVANCE_SIMILARITY_THRESHOLD,
    ):
        self._embedding_provider = embedding_provider
        self._llm_provider = llm_provider
        self.top_k = top_k
        self.relevance_threshold = relevance_threshold

    @property
    def embedding_provider(self) -> EmbeddingProvider:
        if self._embedding_provider is None:
            self._embedding_provider = get_embedding_provider()
        return self._embedding_provider

    @property
    def llm_provider(self) -> LLMProvider:
        if self._llm_provider is None:
            self._llm_provider = get_llm_provider()
        return self._llm_provider

    def index_document(
        self,
        document_id: str,
        filename: str,
        file_type: str,
        file_size: Optional[int],
        page_count: int,
        section_count: int,
        chunk_count: int,
        chunks: List[DocumentChunk],
        db: Session,
    ) -> int:
        """
        Idempotently index document and its canonical chunks into PostgreSQL + pgvector.
        If document already exists, existing chunks are replaced to avoid duplicate vectors.
        """
        if not chunks:
            logger.warning("No chunks provided for document indexing: %s", document_id)
            return 0

        try:
            # 1. Generate embeddings for all canonical chunks in batch
            chunk_texts = [c.text for c in chunks]
            embeddings = self.embedding_provider.embed_batch(chunk_texts)

            # 2. Check if Document row exists; create or update
            doc = db.query(Document).filter(Document.id == document_id).first()
            if not doc:
                doc = Document(
                    id=document_id,
                    filename=filename,
                    file_type=file_type,
                    file_size=file_size,
                    page_count=page_count,
                    section_count=section_count,
                    chunk_count=chunk_count,
                )
                db.add(doc)
            else:
                doc.filename = filename
                doc.file_type = file_type
                doc.file_size = file_size
                doc.page_count = page_count
                doc.section_count = section_count
                doc.chunk_count = chunk_count

            # 3. Idempotently clear existing chunks for this document_id
            db.execute(delete(DocumentChunkModel).where(DocumentChunkModel.document_id == document_id))

            # 4. Insert chunks with authentic text, preserved chunk_id, and embeddings
            chunk_models = []
            for chunk, emb in zip(chunks, embeddings):
                chunk_model = DocumentChunkModel(
                    document_id=document_id,
                    chunk_id=chunk.chunk_id,
                    page_number=chunk.page_number,
                    section_title=chunk.section_title or "General / Preamble",
                    text=chunk.text,
                    embedding=emb,
                )
                chunk_models.append(chunk_model)

            db.add_all(chunk_models)
            db.commit()
            logger.info("Successfully indexed %d chunks for document %s", len(chunk_models), document_id)
            return len(chunk_models)

        except (EmbeddingError, SQLAlchemyError) as exc:
            db.rollback()
            logger.error("Failed to index document %s: %s", document_id, exc)
            raise RAGError(f"Document indexing failed: {str(exc)}") from exc

    def clear_all_embeddings(self, db: Session) -> int:
        """
        Discards all existing chunk embeddings across all documents.
        Ensures clean separation and prevents mixing incompatible embedding spaces.
        """
        try:
            result = db.execute(delete(DocumentChunkModel))
            db.commit()
            deleted_count = result.rowcount if hasattr(result, "rowcount") else 0
            logger.info("Cleared %s existing chunk embeddings from database for model migration.", deleted_count)
            return deleted_count
        except SQLAlchemyError as exc:
            db.rollback()
            logger.error("Failed to clear embeddings: %s", exc)
            raise RAGError(f"Failed to clear embeddings: {str(exc)}") from exc

    def retrieve_relevant_chunks(
        self,
        document_id: str,
        query: str,
        db: Session,
        top_k: Optional[int] = None,
    ) -> List[Tuple[DocumentChunkModel, float]]:
        """
        Execute cosine-distance similarity search strictly isolated to the specified document_id.
        Returns list of (DocumentChunkModel, similarity_score) tuples ordered by highest similarity.
        """
        k = top_k or self.top_k

        # 1. Verify document exists in database
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise DocumentNotFoundError(document_id)

        # 2. Generate embedding for user query
        query_vector = self.embedding_provider.embed_text(query)

        # 3. Cosine distance search in pgvector: <=> operator returns cosine distance (0=identical)
        # Similarity = 1.0 - distance
        stmt = (
            select(
                DocumentChunkModel,
                DocumentChunkModel.embedding.cosine_distance(query_vector).label("distance"),
            )
            .filter(DocumentChunkModel.document_id == document_id)
            .order_by(DocumentChunkModel.embedding.cosine_distance(query_vector))
            .limit(k)
        )

        results = db.execute(stmt).all()
        scored_chunks: List[Tuple[DocumentChunkModel, float]] = []
        for chunk_model, distance in results:
            # Distance can rarely be slightly negative or > 2 due to floating point precision
            dist = float(distance) if distance is not None else 1.0
            similarity = max(0.0, min(1.0, 1.0 - dist))
            scored_chunks.append((chunk_model, round(similarity, 4)))

        return scored_chunks

    def answer_question(
        self,
        document_id: str,
        question: str,
        db: Session,
    ) -> GroundedAnswerResponse:
        """
        End-to-end grounded question answering:
        1. Retrieve top-k chunks with strict document isolation.
        2. Relevance gate: if top similarity is below threshold, return insufficient context.
        3. Grounded LLM generation: generate answer with source_chunk_ids.
        4. Zero-trust resolution: resolve actual text, page, and section from DB chunks.
        """
        cleaned_question = question.strip()
        if not cleaned_question:
            raise RAGError("Question cannot be empty.", status_code=400)

        # 1. Retrieve top chunks
        retrieved = self.retrieve_relevant_chunks(document_id=document_id, query=cleaned_question, db=db)

        if not retrieved:
            return GroundedAnswerResponse(
                question=cleaned_question,
                answer=INSUFFICIENT_CONTEXT_MESSAGE,
                sources=[],
                grounding_status="insufficient_context",
                confidence_score=0.0,
            )

        top_chunk, top_similarity = retrieved[0]
        logger.info(
            "Query: '%s' for doc '%s'. Top retrieved chunk: %s (similarity: %.4f)",
            cleaned_question[:50],
            document_id,
            top_chunk.chunk_id,
            top_similarity,
        )

        # 2. Relevance threshold check
        if top_similarity < self.relevance_threshold:
            logger.info(
                "Top similarity %.4f is below relevance threshold %.4f. Returning insufficient context.",
                top_similarity,
                self.relevance_threshold,
            )
            return GroundedAnswerResponse(
                question=cleaned_question,
                answer=INSUFFICIENT_CONTEXT_MESSAGE,
                sources=[],
                grounding_status="insufficient_context",
                confidence_score=top_similarity,
            )

        # 3. Assemble Grounded Prompt Context
        context_blocks = []
        chunk_lookup = {}
        for chunk_model, score in retrieved:
            chunk_lookup[chunk_model.chunk_id] = (chunk_model, score)
            context_blocks.append(
                f"[CHUNK_ID: {chunk_model.chunk_id} | PAGE: {chunk_model.page_number} | SECTION: {chunk_model.section_title}]\n"
                f"{chunk_model.text}"
            )

        context_str = "\n\n---\n\n".join(context_blocks)

        prompt = (
            "You are an objective legal document analysis assistant answering questions about a user's uploaded agreement.\n\n"
            "STRICT GROUNDING RULES:\n"
            "1. Answer ONLY using the facts explicitly stated in the Provided Context below.\n"
            "2. If the context does not contain enough information to answer the question, state: "
            f"'{INSUFFICIENT_CONTEXT_MESSAGE}' and set 'is_sufficient' to false.\n"
            "3. Do NOT invent terms, infer unwritten business intent, or use outside legal knowledge.\n"
            "4. For every substantive claim made in your answer, identify the exact source_chunk_id that directly supports it.\n"
            "5. Do NOT output verbatim quotes in your citation fields; cite only the source_chunk_id.\n\n"
            f"USER QUESTION: {cleaned_question}\n\n"
            f"PROVIDED CONTEXT:\n{context_str}\n\n"
            "OUTPUT FORMAT: Return a valid JSON object matching this schema:\n"
            "{\n"
            '  "answer": "Plain-language, factual answer or refusal message",\n'
            '  "source_chunk_ids": ["chunk-id-1", ...],\n'
            '  "is_sufficient": true\n'
            "}"
        )

        try:
            # Convert retrieved models to DocumentChunk objects for LLM provider
            retrieved_chunks = [
                DocumentChunk(
                    chunk_id=cm.chunk_id,
                    page_number=cm.page_number,
                    section_title=cm.section_title,
                    text=cm.text,
                    char_count=len(cm.text),
                )
                for cm, _ in retrieved
            ]
            
            raw_qa = self.llm_provider.answer_question(question=cleaned_question, chunks=retrieved_chunks)
            raw_answer = raw_qa.answer
            cited_chunk_ids = [raw_qa.source_chunk_id] if raw_qa.source_chunk_id else []

        except (LLMProviderError, ConfigurationError) as lpe:
            logger.error("LLM Provider error during RAG Q&A: %s", lpe.message)
            raise
        except Exception as exc:
            logger.exception("Unexpected error generating grounded answer: %s", exc)
            raise RAGError(f"Failed to generate grounded answer: {str(exc)}") from exc

        # Check if LLM signaled insufficient information
        lower_ans = raw_answer.lower()
        if (
            "not provide enough information" in lower_ans
            or "does not contain" in lower_ans
            or not cited_chunk_ids
        ):
            # If the answer acknowledges lack of info, mark as insufficient_context
            return GroundedAnswerResponse(
                question=cleaned_question,
                answer=raw_answer,
                sources=[],
                grounding_status="insufficient_context",
                confidence_score=round(top_similarity, 2),
            )

        # 4. Zero-Trust Source Resolution: Lookup chunk in retrieved records
        resolved_sources: List[SourceCitation] = []
        for cid in cited_chunk_ids:
            if cid in chunk_lookup:
                ch_model, sim = chunk_lookup[cid]
                resolved_sources.append(
                    SourceCitation(
                        chunk_id=ch_model.chunk_id,
                        page_number=ch_model.page_number,
                        section_title=ch_model.section_title,
                        text=ch_model.text,
                        similarity_score=sim,
                    )
                )

        # If LLM cited a chunk that wasn't in the retrieved set, fall back to top retrieved chunk
        if not resolved_sources and retrieved:
            best_chunk, best_sim = retrieved[0]
            resolved_sources.append(
                SourceCitation(
                    chunk_id=best_chunk.chunk_id,
                    page_number=best_chunk.page_number,
                    section_title=best_chunk.section_title,
                    text=best_chunk.text,
                    similarity_score=best_sim,
                )
            )

        status_str = "grounded" if resolved_sources else "insufficient_context"
        confidence = round(sum(s.similarity_score or 0.0 for s in resolved_sources) / len(resolved_sources), 2) if resolved_sources else round(top_similarity, 2)

        return GroundedAnswerResponse(
            question=cleaned_question,
            answer=raw_answer,
            sources=resolved_sources,
            grounding_status=status_str,
            confidence_score=confidence,
        )
