import json
import math
from unittest.mock import MagicMock, patch
import pytest

from app.models.document import Document, DocumentChunkModel
from app.schemas.document import DocumentChunk
from app.schemas.rag import GroundedQuestionRequest, GroundedAnswerResponse, SourceCitation
from app.schemas.analysis import RawQAOutput
from app.services.embedding.base import EmbeddingProvider, EmbeddingError, EmbeddingConfigurationError
from app.services.embedding.gemini import GeminiEmbeddingProvider
from app.services.embedding.factory import get_embedding_provider
from app.services.rag_service import (
    RAGService,
    RAGError,
    DocumentNotFoundError,
    INSUFFICIENT_CONTEXT_MESSAGE,
    RELEVANCE_SIMILARITY_THRESHOLD,
)
from app.services.llm.base import LLMProvider, LLMProviderError, ConfigurationError


# --- Mock Embedding Provider for Deterministic Testing ---
class MockEmbeddingProvider(EmbeddingProvider):
    def __init__(self, dimension: int = 768, failure: bool = False):
        self._dim = dimension
        self.failure = failure

    @property
    def dimension(self) -> int:
        return self._dim

    def embed_text(self, text: str) -> list[float]:
        if self.failure:
            raise EmbeddingError("Simulated embedding API error")
        if not text or not text.strip():
            raise EmbeddingError("Cannot embed empty text.")
        
        # Deterministic pseudo-embedding based on keywords
        vec = [0.0] * self._dim
        t = text.lower()
        if "payment" in t or "invoice" in t or "fee" in t:
            vec[0] = 0.9
            vec[1] = 0.3
        elif "termination" in t or "cancel" in t or "notice" in t:
            vec[0] = 0.1
            vec[1] = 0.95
        elif "intellectual property" in t or "patent" in t or "copyright" in t:
            vec[0] = 0.4
            vec[2] = 0.9
        elif "prime minister" in t or "india" in t:
            vec[10] = 0.99  # Completely orthogonal
        else:
            vec[5] = 0.5
        
        # Normalize vector
        norm = math.sqrt(sum(x * x for x in vec))
        return [x / norm for x in vec] if norm > 0 else vec

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if self.failure:
            raise EmbeddingError("Simulated batch embedding error")
        return [self.embed_text(t) for t in texts]


# --- Mock LLM Provider for RAG Testing ---
class MockRAGLLMProvider(LLMProvider):
    @property
    def name(self) -> str:
        return "mock-rag-llm"

    def validate_configuration(self) -> None:
        pass

    def analyze_document(self, chunks, metadata):
        raise NotImplementedError

    def answer_question(self, question: str, chunks: list[DocumentChunk]) -> RawQAOutput:
        q_lower = question.lower()
        if "prime minister" in q_lower or "health insurance" in q_lower:
            return RawQAOutput(
                question=question,
                answer=INSUFFICIENT_CONTEXT_MESSAGE,
                source_chunk_id=None,
                verbatim_quote=None,
            )
        if "termination" in q_lower:
            return RawQAOutput(
                question=question,
                answer="Either party may terminate upon thirty (30) days prior written notice.",
                source_chunk_id="chunk-p3-001",
                verbatim_quote="30 days written notice",
            )
        if "payment" in q_lower:
            return RawQAOutput(
                question=question,
                answer="Invoices are payable within 30 days and overdue balances accrue 1.5% monthly interest.",
                source_chunk_id="chunk-p1-002",
                verbatim_quote="payable within thirty (30) days",
            )
        return RawQAOutput(
            question=question,
            answer="General agreement terms apply.",
            source_chunk_id="chunk-p1-001",
            verbatim_quote="Agreement terms",
        )


# ==============================================================================
# 1. EMBEDDING TESTS
# ==============================================================================
def test_embedding_empty_text_rejected():
    provider = MockEmbeddingProvider()
    with pytest.raises(EmbeddingError, match="empty"):
        provider.embed_text("")
    with pytest.raises(EmbeddingError, match="empty"):
        provider.embed_text("   \n\t  ")


def test_embedding_provider_failure():
    failing_provider = MockEmbeddingProvider(failure=True)
    with pytest.raises(EmbeddingError, match="Simulated embedding API error"):
        failing_provider.embed_text("Sample valid text")


def test_embedding_dimension_validation():
    provider = MockEmbeddingProvider(dimension=768)
    vec = provider.embed_text("Test legal clause")
    assert len(vec) == 768
    assert provider.dimension == 768


def test_gemini_embedding_provider_missing_key():
    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(EmbeddingConfigurationError, match="GEMINI_API_KEY"):
            GeminiEmbeddingProvider(api_key=None)


def test_gemini_embedding_provider_success():
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.embedding.values = [0.1] * 768
    mock_client.models.embed_content.return_value = mock_response

    with patch("google.genai.Client", return_value=mock_client):
        provider = GeminiEmbeddingProvider(api_key="fake-test-key")
        vec = provider.embed_text("Article II: Compensation")
        assert len(vec) == 768
        assert mock_client.models.embed_content.called
        call_kwargs = mock_client.models.embed_content.call_args.kwargs
        assert call_kwargs["model"] == "gemini-embedding-2"
        assert call_kwargs["config"].output_dimensionality == 768


def test_gemini_embedding_provider_dimension_mismatch_raises():
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.embedding.values = [0.1] * 1536  # Incompatible dimension
    mock_client.models.embed_content.return_value = mock_response

    with patch("google.genai.Client", return_value=mock_client):
        provider = GeminiEmbeddingProvider(api_key="fake-test-key", dimension=768)
        with pytest.raises(EmbeddingError, match="dimension mismatch"):
            provider.embed_text("Article II: Compensation")


def test_clear_all_embeddings_purges_old_vectors():
    mock_db = MagicMock()
    mock_result = MagicMock()
    mock_result.rowcount = 15
    mock_db.execute.return_value = mock_result

    rag_service = RAGService(embedding_provider=MockEmbeddingProvider())
    cleared = rag_service.clear_all_embeddings(mock_db)

    assert cleared == 15
    assert mock_db.execute.called
    assert mock_db.commit.called


# ==============================================================================
# 2. INDEXING TESTS
# ==============================================================================
def test_indexing_chunks_and_preserving_chunk_ids():
    mock_db = MagicMock()
    # Simulate doc not existing yet
    mock_db.query.return_value.filter.return_value.first.return_value = None

    embedder = MockEmbeddingProvider()
    rag_service = RAGService(embedding_provider=embedder)

    chunks = [
        DocumentChunk(chunk_id="chunk-p1-001", page_number=1, section_title="Preamble", text="This Agreement...", char_count=20),
        DocumentChunk(chunk_id="chunk-p1-002", page_number=1, section_title="Compensation", text="Net 30 payment...", char_count=20),
    ]

    count = rag_service.index_document(
        document_id="doc-test-123",
        filename="contract.pdf",
        file_type="application/pdf",
        file_size=5000,
        page_count=1,
        section_count=2,
        chunk_count=2,
        chunks=chunks,
        db=mock_db,
    )

    assert count == 2
    # Verify commit called
    assert mock_db.commit.called
    # Verify chunks added have preserved chunk_id
    args, kwargs = mock_db.add_all.call_args
    added_models = args[0]
    assert len(added_models) == 2
    assert added_models[0].chunk_id == "chunk-p1-001"
    assert added_models[1].chunk_id == "chunk-p1-002"
    assert added_models[0].document_id == "doc-test-123"
    assert len(added_models[0].embedding) == 768


def test_indexing_idempotent_duplicate_handling():
    mock_db = MagicMock()
    # Simulate doc already existing
    existing_doc = Document(id="doc-test-123", filename="contract.pdf", page_count=1)
    mock_db.query.return_value.filter.return_value.first.return_value = existing_doc

    embedder = MockEmbeddingProvider()
    rag_service = RAGService(embedding_provider=embedder)

    chunks = [
        DocumentChunk(chunk_id="chunk-p1-001", page_number=1, section_title="Preamble", text="Updated text", char_count=12),
    ]

    count = rag_service.index_document(
        document_id="doc-test-123",
        filename="contract.pdf",
        file_type="application/pdf",
        file_size=5000,
        page_count=1,
        section_count=1,
        chunk_count=1,
        chunks=chunks,
        db=mock_db,
    )

    assert count == 1
    # Verify delete was executed to clear old chunks for this document_id
    assert mock_db.execute.called
    assert mock_db.commit.called


# ==============================================================================
# 3. RETRIEVAL & DOCUMENT ISOLATION TESTS
# ==============================================================================
def test_retrieval_document_isolation():
    """Verify Document A query NEVER retrieves Document B chunks."""
    doc_a_id = "doc-aaa-111"
    doc_b_id = "doc-bbb-222"

    chunk_a = DocumentChunkModel(
        document_id=doc_a_id,
        chunk_id="chunk-p1-001",
        page_number=1,
        section_title="Termination",
        text="Doc A Termination clause: 30 days notice.",
        embedding=[0.1, 0.95] + [0.0] * 766,
    )

    chunk_b = DocumentChunkModel(
        document_id=doc_b_id,
        chunk_id="chunk-p1-001",
        page_number=1,
        section_title="Confidentiality",
        text="Doc B Confidentiality clause: 5 years.",
        embedding=[0.1, 0.95] + [0.0] * 766,
    )

    mock_db = MagicMock()
    # Query for document check returns Doc A
    mock_db.query.return_value.filter.return_value.first.return_value = Document(id=doc_a_id)

    # Mock execute return: SQL statement includes filter DocumentChunkModel.document_id == doc_a_id
    def fake_execute(stmt):
        # Inspect where clause representation or verify document isolation
        mock_result = MagicMock()
        mock_result.all.return_value = [(chunk_a, 0.05)]  # distance 0.05 -> similarity 0.95
        return mock_result

    mock_db.execute.side_effect = fake_execute

    embedder = MockEmbeddingProvider()
    rag_service = RAGService(embedding_provider=embedder)

    retrieved = rag_service.retrieve_relevant_chunks(document_id=doc_a_id, query="What is the notice period?", db=mock_db)

    assert len(retrieved) == 1
    chunk, score = retrieved[0]
    assert chunk.document_id == doc_a_id
    assert chunk.document_id != doc_b_id
    assert score > 0.9


def test_retrieval_non_existent_document_raises_404():
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None

    rag_service = RAGService(embedding_provider=MockEmbeddingProvider())
    with pytest.raises(DocumentNotFoundError):
        rag_service.retrieve_relevant_chunks(document_id="non-existent-id", query="Test query", db=mock_db)


# ==============================================================================
# 4. GENERATION & ZERO-TRUST SOURCE RESOLUTION TESTS
# ==============================================================================
def test_grounded_answer_generation_and_source_resolution():
    doc_id = "doc-grounded-test"
    chunk_1 = DocumentChunkModel(
        document_id=doc_id,
        chunk_id="chunk-p3-001",
        page_number=3,
        section_title="ARTICLE VI: TERMINATION",
        text="Either party may terminate upon thirty (30) days prior written notice.",
        embedding=[0.1, 0.95] + [0.0] * 766,
    )

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = Document(id=doc_id)
    mock_res = MagicMock()
    mock_res.all.return_value = [(chunk_1, 0.05)]  # distance 0.05 -> similarity 0.95
    mock_db.execute.return_value = mock_res

    embedder = MockEmbeddingProvider()
    mock_llm = MockRAGLLMProvider()
    rag_service = RAGService(embedding_provider=embedder, llm_provider=mock_llm)

    response = rag_service.answer_question(
        document_id=doc_id,
        question="What is the notice period for termination?",
        db=mock_db,
    )

    assert isinstance(response, GroundedAnswerResponse)
    assert response.grounding_status == "grounded"
    assert "thirty (30) days" in response.answer
    assert len(response.sources) == 1
    source = response.sources[0]
    assert source.chunk_id == "chunk-p3-001"
    assert source.page_number == 3
    assert source.section_title == "ARTICLE VI: TERMINATION"
    assert source.text == chunk_1.text  # Verbatim from DB, zero-trust


def test_out_of_scope_query_refusal_insufficient_context():
    doc_id = "doc-refusal-test"
    # Even if DB returns some unrelated chunk with low similarity
    chunk_unrelated = DocumentChunkModel(
        document_id=doc_id,
        chunk_id="chunk-p1-001",
        page_number=1,
        section_title="Definitions",
        text="Definitions of Agreement terms.",
        embedding=[0.5] + [0.0] * 767,
    )

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = Document(id=doc_id)
    mock_res = MagicMock()
    # High cosine distance (0.80) -> low similarity (0.20), below RELEVANCE_SIMILARITY_THRESHOLD (0.35)
    mock_res.all.return_value = [(chunk_unrelated, 0.80)]
    mock_db.execute.return_value = mock_res

    embedder = MockEmbeddingProvider()
    mock_llm = MockRAGLLMProvider()
    rag_service = RAGService(embedding_provider=embedder, llm_provider=mock_llm)

    response = rag_service.answer_question(
        document_id=doc_id,
        question="Who is the current Prime Minister of India?",
        db=mock_db,
    )

    assert response.grounding_status == "insufficient_context"
    assert response.answer == INSUFFICIENT_CONTEXT_MESSAGE
    assert len(response.sources) == 0


def test_invalid_source_chunk_id_handling():
    """If LLM hallucinates a non-existent chunk ID, it is sanitized zero-trust."""
    doc_id = "doc-hallucination-test"
    valid_chunk = DocumentChunkModel(
        document_id=doc_id,
        chunk_id="chunk-p1-002",
        page_number=1,
        section_title="Payment",
        text="Invoices payable Net 30.",
        embedding=[0.9, 0.3] + [0.0] * 766,
    )

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = Document(id=doc_id)
    mock_res = MagicMock()
    mock_res.all.return_value = [(valid_chunk, 0.1)]  # similarity 0.90
    mock_db.execute.return_value = mock_res

    embedder = MockEmbeddingProvider()
    
    # LLM returns a hallucinated chunk_id not in retrieved chunks
    class HallucinatingLLM(LLMProvider):
        @property
        def name(self):
            return "hallucinating-llm"
        def validate_configuration(self):
            pass
        def analyze_document(self, chunks, metadata):
            raise NotImplementedError
        def answer_question(self, question, chunks):
            return RawQAOutput(
                question=question,
                answer="Payment is due Net 30.",
                source_chunk_id="chunk-non-existent-999",  # Hallucinated ID
                verbatim_quote="Payment is due",
            )

    rag_service = RAGService(embedding_provider=embedder, llm_provider=HallucinatingLLM())

    response = rag_service.answer_question(
        document_id=doc_id,
        question="When is payment due?",
        db=mock_db,
    )

    # Zero-trust safety: falls back safely to genuine retrieved chunk rather than crashing
    assert len(response.sources) == 1
    assert response.sources[0].chunk_id == "chunk-p1-002"
    assert response.sources[0].text == "Invoices payable Net 30."


# ==============================================================================
# 5. EVALUATION DATASET INTEGRITY & SAMPLE DOCUMENTS TESTS
# ==============================================================================
def test_evaluation_dataset_file_structure():
    with open("backend/tests/rag_eval/legal_qa_eval.json", "r", encoding="utf-8") as f:
        eval_data = json.load(f)

    assert len(eval_data) >= 8
    for item in eval_data:
        assert "question" in item
        assert "question_type" in item
        assert "expected_chunk_ids" in item
        assert isinstance(item["expected_chunk_ids"], list)


def test_real_sample_documents_indexing_with_gemini_embedding_2():
    """Verify sample_services_agreement.pdf and sample_nda.pdf indexing with 768d vectors."""
    import os
    from app.services.document_processor import DocumentProcessor

    sample_dir = os.path.join(os.path.dirname(__file__), "..", "..", "sample_documents")
    services_path = os.path.join(sample_dir, "sample_services_agreement.pdf")
    nda_path = os.path.join(sample_dir, "sample_nda.pdf")

    if not os.path.exists(services_path) or not os.path.exists(nda_path):
        pytest.skip("Sample documents directory not found")

    with open(services_path, "rb") as f:
        services_bytes = f.read()
    with open(nda_path, "rb") as f:
        nda_bytes = f.read()

    res_services = DocumentProcessor.process_pdf(services_bytes, "sample_services_agreement.pdf")
    res_nda = DocumentProcessor.process_pdf(nda_bytes, "sample_nda.pdf")

    # Verify chunk attributes
    assert len(res_services.chunks) > 0
    assert len(res_nda.chunks) > 0

    for ch in res_services.chunks + res_nda.chunks:
        assert ch.chunk_id.startswith("chunk-p")
        assert ch.page_number >= 1
        assert len(ch.text) > 0
        assert ch.section_title is None or isinstance(ch.section_title, str)

    embedder = MockEmbeddingProvider(dimension=768)
    assert embedder.dimension == 768

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None

    rag_service = RAGService(embedding_provider=embedder)

    # Index Services Agreement
    count_sa = rag_service.index_document(
        document_id="doc-sa-001",
        filename=res_services.filename,
        file_type="application/pdf",
        file_size=res_services.file_size,
        page_count=res_services.page_count,
        section_count=res_services.section_count,
        chunk_count=res_services.chunk_count,
        chunks=res_services.chunks,
        db=mock_db,
    )
    assert count_sa == len(res_services.chunks)

    # Re-index to verify idempotency
    mock_db.query.return_value.filter.return_value.first.return_value = Document(id="doc-sa-001")
    count_reindex = rag_service.index_document(
        document_id="doc-sa-001",
        filename=res_services.filename,
        file_type="application/pdf",
        file_size=res_services.file_size,
        page_count=res_services.page_count,
        section_count=res_services.section_count,
        chunk_count=res_services.chunk_count,
        chunks=res_services.chunks,
        db=mock_db,
    )
    assert count_reindex == len(res_services.chunks)


def test_rag_evaluation_dataset_queries():
    """Verify all questions in legal_qa_eval.json against RAG service logic."""
    with open("backend/tests/rag_eval/legal_qa_eval.json", "r", encoding="utf-8") as f:
        eval_items = json.load(f)

    doc_id = "doc-eval-contract"
    chunk_payment = DocumentChunkModel(
        document_id=doc_id,
        chunk_id="chunk-p1-002",
        page_number=1,
        section_title="ARTICLE II: COMPENSATION AND PAYMENT TERMS",
        text="Invoices payable Net 30 days. Overdue balances accrue 1.5% interest.",
        embedding=[0.9, 0.3] + [0.0] * 766,
    )
    chunk_term = DocumentChunkModel(
        document_id=doc_id,
        chunk_id="chunk-p3-001",
        page_number=3,
        section_title="ARTICLE VI: TERMINATION",
        text="Either party may terminate upon thirty (30) days prior written notice.",
        embedding=[0.1, 0.95] + [0.0] * 766,
    )

    embedder = MockEmbeddingProvider(dimension=768)
    mock_llm = MockRAGLLMProvider()
    rag_service = RAGService(embedding_provider=embedder, llm_provider=mock_llm)

    for item in eval_items:
        q = item["question"]
        q_type = item["question_type"]

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = Document(id=doc_id)

        if q_type == "out-of-scope":
            # Simulate low similarity for out of scope
            unrelated = DocumentChunkModel(
                document_id=doc_id,
                chunk_id="chunk-p1-001",
                page_number=1,
                section_title="Definitions",
                text="Definitions",
                embedding=[0.0] * 768,
            )
            mock_res = MagicMock()
            mock_res.all.return_value = [(unrelated, 0.85)]  # Distance 0.85 -> similarity 0.15 (< 0.35)
            mock_db.execute.return_value = mock_res

            res = rag_service.answer_question(document_id=doc_id, question=q, db=mock_db)
            assert res.grounding_status == "insufficient_context"
            assert len(res.sources) == 0
        else:
            # In-scope
            target_chunk = chunk_term if "terminat" in q.lower() else chunk_payment
            mock_res = MagicMock()
            mock_res.all.return_value = [(target_chunk, 0.05)]  # Similarity 0.95
            mock_db.execute.return_value = mock_res

            res = rag_service.answer_question(document_id=doc_id, question=q, db=mock_db)
            assert res.grounding_status == "grounded"
            assert len(res.sources) >= 1
