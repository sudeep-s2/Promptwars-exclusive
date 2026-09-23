import io
import os
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.analysis import RawAnalysisOutput, RawFindingOutput, ExecutiveSummary, CounselDiscussionPoint, RawQAOutput
from app.schemas.rag import GroundedAnswerResponse, SourceCitation
from app.models.document import Document, DocumentChunkModel
from app.services.rag_service import RAGService, INSUFFICIENT_CONTEXT_MESSAGE
from app.services.llm.base import LLMProvider, LLMProviderError
from tests.test_rag import MockEmbeddingProvider


client = TestClient(app)

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "sample_documents")
SERVICES_PDF = os.path.join(SAMPLE_DIR, "sample_services_agreement.pdf")
NDA_PDF = os.path.join(SAMPLE_DIR, "sample_nda.pdf")


class MockIntegrationLLM(LLMProvider):
    @property
    def name(self) -> str:
        return "mock-gemini-integration"

    def validate_configuration(self) -> None:
        pass

    def analyze_document(self, chunks, metadata) -> RawAnalysisOutput:
        return RawAnalysisOutput(
            executive_summary=ExecutiveSummary(
                document_type="Master Services Agreement",
                parties=["Client Corp", "Consulting Provider LLC"],
                effective_date="Upon SOW Execution",
                duration="Ongoing until terminated",
                financial_summary="Monthly Invoicing Net 30, 1.5% interest",
                high_level_overview="Master Services Agreement governing consulting engineering deliverables.",
            ),
            findings=[
                RawFindingOutput(
                    title="Uncapped IP Indemnity",
                    category="Liability",
                    attention_level="high",
                    plain_english="Provider defends client against IP claims without dollar cap.",
                    why_it_matters="Could expose provider to catastrophic damages.",
                    recommendation="Negotiate an aggregate cap on indemnification.",
                    source_chunk_id="chunk-p2-002",
                ),
                RawFindingOutput(
                    title="30-Day Written Notice Termination",
                    category="Termination",
                    attention_level="moderate",
                    plain_english="Either party can terminate with 30 days prior notice.",
                    why_it_matters="Allows predictable exit timelines.",
                    recommendation="Ensure transition assistance terms are clearly defined.",
                    source_chunk_id="chunk-p3-001",
                ),
            ],
            counsel_discussion_points=[
                CounselDiscussionPoint(
                    clause_ref="ARTICLE IV: INDEMNIFICATION",
                    topic="Review IP Indemnity Exposure",
                    recommended_question="Can we insert a mutual liability cap for intellectual property defense obligations?",
                ),
                CounselDiscussionPoint(
                    clause_ref="ARTICLE VI: TERMINATION",
                    topic="Termination Notice Period",
                    recommended_question="What transition deliverables survive termination under Article VI?",
                ),
            ],
            suggested_questions=[
                "What is the required termination notice period?",
                "Are intellectual property indemnities capped?",
            ],
        )

    def answer_question(self, question: str, chunks) -> RawQAOutput:
        q_lower = question.lower()
        if "prime minister" in q_lower or "capital of france" in q_lower:
            return RawQAOutput(
                question=question,
                answer=INSUFFICIENT_CONTEXT_MESSAGE,
                source_chunk_id=None,
                verbatim_quote=None,
            )
        return RawQAOutput(
            question=question,
            answer="Either party may terminate upon thirty (30) days prior written notice.",
            source_chunk_id="chunk-p3-001",
            verbatim_quote="thirty (30) days prior written notice",
        )


# ==============================================================================
# INTEGRATION TESTS
# ==============================================================================
def test_full_e2e_document_journey_upload_to_rag():
    """
    Test complete user journey:
    Upload PDF -> Extract -> Index (mocked DB) -> Analyze -> Return Workspace -> Grounded Q&A.
    """
    if not os.path.exists(SERVICES_PDF):
        pytest.skip("sample_services_agreement.pdf not found")

    with open(SERVICES_PDF, "rb") as f:
        pdf_bytes = f.read()

    mock_llm = MockIntegrationLLM()

    with patch("app.services.analyzer.get_llm_provider", return_value=mock_llm), \
         patch("app.services.workflow_service.is_database_available", return_value=False):

        response = client.post(
            "/api/documents/upload?analyze=true",
            files={"file": ("sample_services_agreement.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        )

        assert response.status_code == 200
        data = response.json()
        doc_id = data.get("document_id")
        assert doc_id is not None
        assert data["filename"] == "sample_services_agreement.pdf"
        assert data["page_count"] >= 1
        assert len(data["chunks"]) > 0

        # Analysis verified
        analysis = data["analysis"]
        assert analysis is not None
        assert len(analysis["findings"]) == 2
        assert analysis["findings"][0]["attention_level"] == "high"
        assert len(analysis["counsel_discussion_points"]) == 2

        # Check chunk-ID hydration
        for finding in analysis["findings"]:
            assert finding["source_chunk_id"] is not None
            assert finding["verbatim_excerpt"] is not None
            assert finding["page_number"] >= 1


def test_rag_question_answering_endpoint_with_mock_db():
    """Verify POST /api/documents/{document_id}/questions with strict grounding and source resolution."""
    doc_id = "test-doc-integration-123"
    chunk_term = DocumentChunkModel(
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
    mock_res.all.return_value = [(chunk_term, 0.05)]  # Distance 0.05 -> similarity 0.95
    mock_db.execute.return_value = mock_res

    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    mock_llm = MockIntegrationLLM()
    mock_embed = MockEmbeddingProvider()

    with patch("app.services.rag_service.get_llm_provider", return_value=mock_llm), \
         patch("app.services.rag_service.get_embedding_provider", return_value=mock_embed):
        res = client.post(
            f"/api/documents/{doc_id}/questions",
            json={"question": "What is the notice period for termination?"},
        )

        assert res.status_code == 200
        qa_data = res.json()
        assert qa_data["grounding_status"] == "grounded"
        assert "thirty (30) days" in qa_data["answer"]
        assert len(qa_data["sources"]) == 1
        assert qa_data["sources"][0]["chunk_id"] == "chunk-p3-001"
        assert qa_data["sources"][0]["page_number"] == 3
        assert qa_data["sources"][0]["section_title"] == "ARTICLE VI: TERMINATION"
        assert qa_data["sources"][0]["text"] == chunk_term.text

    app.dependency_overrides.clear()


def test_rag_out_of_scope_query_returns_insufficient_context():
    """Verify out-of-scope question gets rejected with insufficient_context."""
    doc_id = "test-doc-integration-123"
    unrelated_chunk = DocumentChunkModel(
        document_id=doc_id,
        chunk_id="chunk-p1-001",
        page_number=1,
        section_title="Definitions",
        text="Definitions of Agreement",
        embedding=[0.0] * 768,
    )

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = Document(id=doc_id)
    mock_res = MagicMock()
    mock_res.all.return_value = [(unrelated_chunk, 0.85)]  # Similarity 0.15 (< 0.35 threshold)
    mock_db.execute.return_value = mock_res

    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    mock_llm = MockIntegrationLLM()
    mock_embed = MockEmbeddingProvider()
    with patch("app.services.rag_service.get_llm_provider", return_value=mock_llm), \
         patch("app.services.rag_service.get_embedding_provider", return_value=mock_embed):
        res = client.post(
            f"/api/documents/{doc_id}/questions",
            json={"question": "What is the capital of France?"},
        )

        assert res.status_code == 200
        qa_data = res.json()
        assert qa_data["grounding_status"] == "insufficient_context"
        assert len(qa_data["sources"]) == 0

    app.dependency_overrides.clear()


def test_multi_document_isolation_strictness():
    """Verify querying Doc A never resolves chunks belonging to Doc B."""
    doc_a = "doc-alpha"
    doc_b = "doc-beta"

    chunk_a = DocumentChunkModel(
        document_id=doc_a,
        chunk_id="chunk-p1-001",
        page_number=1,
        section_title="Alpha Terms",
        text="Alpha exclusive terms.",
        embedding=[0.5] * 768,
    )

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = Document(id=doc_a)

    def isolated_execute(stmt):
        # Emulate DB engine enforcing WHERE document_id == doc_a
        mock_r = MagicMock()
        mock_r.all.return_value = [(chunk_a, 0.05)]
        return mock_r

    mock_db.execute.side_effect = isolated_execute

    from app.db.session import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    mock_llm = MockIntegrationLLM()
    mock_embed = MockEmbeddingProvider()
    with patch("app.services.rag_service.get_llm_provider", return_value=mock_llm), \
         patch("app.services.rag_service.get_embedding_provider", return_value=mock_embed):
        res = client.post(
            f"/api/documents/{doc_a}/questions",
            json={"question": "What are the terms?"},
        )

        assert res.status_code == 200
        qa_data = res.json()
        for src in qa_data["sources"]:
            assert src["chunk_id"] == "chunk-p1-001"
            assert src["text"] == "Alpha exclusive terms."
            assert "beta" not in src["text"].lower()

    app.dependency_overrides.clear()


def test_partial_pipeline_analysis_failure():
    """Verify partial failure handling when LLM provider raises an error."""
    if not os.path.exists(SERVICES_PDF):
        pytest.skip("sample_services_agreement.pdf not found")

    with open(SERVICES_PDF, "rb") as f:
        pdf_bytes = f.read()

    failing_llm = MagicMock()
    failing_llm.analyze_document.side_effect = LLMProviderError("Upstream quota exceeded", status_code=502)

    with patch("app.services.analyzer.get_llm_provider", return_value=failing_llm):
        response = client.post(
            "/api/documents/upload?analyze=true",
            files={"file": ("sample_services_agreement.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        )
        assert response.status_code == 502
        assert "quota" in response.json()["detail"].lower()
