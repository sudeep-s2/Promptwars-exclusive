import json
import pytest
from unittest.mock import MagicMock, patch

from app.schemas.document import DocumentChunk, DocumentMetadata
from app.schemas.analysis import (
    RawAnalysisOutput,
    RawFindingOutput,
    LegalAnalysis,
    LegalFinding,
    ExecutiveSummary,
    CounselDiscussionPoint,
    RawQAOutput,
    QAResponse,
)
from app.services.llm.base import LLMProvider, LLMProviderError, ConfigurationError
from app.services.llm.gemini_provider import GeminiProvider
from app.services.llm.grok_provider import GrokProvider
from app.services.llm.factory import get_llm_provider
from app.services.analyzer import LegalAnalyzer


# ---------------------------------------------------------------------------
# Fixtures and Sample Data
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_chunks():
    return [
        DocumentChunk(
            chunk_id="chunk-p1-001",
            page_number=1,
            section_title="1. Definitions",
            text="1. Definitions. 'Confidential Information' refers to all proprietary code and trade secrets.",
            char_count=98,
        ),
        DocumentChunk(
            chunk_id="chunk-p2-001",
            page_number=2,
            section_title="4. Limitation of Liability",
            text="4. Limitation of Liability. In no event shall either party be liable for indirect damages. Provider's liability is capped at $50,000.",
            char_count=135,
        ),
    ]


@pytest.fixture
def sample_metadata():
    return DocumentMetadata(
        filename="master_agreement.pdf",
        file_type="application/pdf",
        file_size=54321,
        page_count=2,
        text_length=233,
        section_count=2,
        chunk_count=2,
    )


@pytest.fixture
def valid_raw_analysis_json():
    return json.dumps({
        "executive_summary": {
            "document_type": "Master Services Agreement",
            "parties": ["Acme Corp", "Beta Solutions LLC"],
            "effective_date": "October 1, 2026",
            "duration": "12 months",
            "financial_summary": "$50,000 maximum liability cap",
            "high_level_overview": "Standard commercial services contract with capped liability."
        },
        "findings": [
            {
                "category": "Liability",
                "attention_level": "moderate",
                "title": "Liability Dollar Cap",
                "plain_english": "The provider's total financial responsibility is capped at $50,000.",
                "why_it_matters": "Protects against unbounded damages from commercial claims.",
                "source_chunk_id": "chunk-p2-001"
            }
        ],
        "counsel_discussion_points": [
            {
                "clause_ref": "Section 4",
                "topic": "Liability Cap Sufficiency",
                "recommended_question": "Does the $50,000 cap adequately cover our potential exposure?"
            }
        ],
        "suggested_questions": [
            "What is the maximum liability limit under this contract?"
        ]
    })


# ---------------------------------------------------------------------------
# Test 1: Gemini Provider Selected
# ---------------------------------------------------------------------------
def test_gemini_provider_selected(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-gemini-key")
    provider = get_llm_provider()
    assert isinstance(provider, GeminiProvider)
    assert provider.name == "gemini"


# ---------------------------------------------------------------------------
# Test 2: Grok Provider Selected
# ---------------------------------------------------------------------------
def test_grok_provider_selected(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "grok")
    monkeypatch.setenv("XAI_API_KEY", "dummy-xai-key")
    provider = get_llm_provider()
    assert isinstance(provider, GrokProvider)
    assert provider.name == "grok"


# ---------------------------------------------------------------------------
# Test 3: Missing Gemini Key
# ---------------------------------------------------------------------------
def test_missing_gemini_key(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ConfigurationError) as exc_info:
        get_llm_provider()
    assert "Gemini API key is not configured" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 4: Missing Grok Key
# ---------------------------------------------------------------------------
def test_missing_grok_key(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "grok")
    monkeypatch.delenv("XAI_API_KEY", raising=False)
    with pytest.raises(ConfigurationError) as exc_info:
        get_llm_provider()
    assert "Grok API key is not configured" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 5: Provider-Independent RawAnalysisOutput Parsing
# ---------------------------------------------------------------------------
def test_provider_independent_legal_analysis_parsing(valid_raw_analysis_json):
    raw_analysis = RawAnalysisOutput.model_validate_json(valid_raw_analysis_json)
    assert raw_analysis.executive_summary.document_type == "Master Services Agreement"
    assert len(raw_analysis.findings) == 1
    assert raw_analysis.findings[0].category == "Liability"
    assert raw_analysis.findings[0].attention_level == "moderate"
    assert raw_analysis.findings[0].source_chunk_id == "chunk-p2-001"
    assert len(raw_analysis.counsel_discussion_points) == 1
    assert len(raw_analysis.suggested_questions) == 1


# ---------------------------------------------------------------------------
# Test 6: Gemini Provider Failure Handling
# ---------------------------------------------------------------------------
def test_gemini_provider_failure(monkeypatch, sample_chunks, sample_metadata):
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-key")
    provider = GeminiProvider(api_key="dummy-key")

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = Exception("Google API Quota Exceeded")
    provider._client = mock_client
    provider._selected_model = "gemini-2.5-flash"

    with pytest.raises(LLMProviderError) as exc_info:
        provider.analyze_document(sample_chunks, sample_metadata)
    assert "Gemini legal analysis failed" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 7: Grok Provider Failure Handling (xAI endpoint)
# ---------------------------------------------------------------------------
def test_grok_provider_failure(monkeypatch, sample_chunks, sample_metadata):
    monkeypatch.setenv("XAI_API_KEY", "dummy-key")
    provider = GrokProvider(api_key="dummy-key")

    with patch("httpx.Client.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.text = '{"error": {"message": "Rate limit exceeded"}}'
        mock_response.json.return_value = {"error": {"message": "Rate limit exceeded"}}
        mock_post.return_value = mock_response

        with pytest.raises(LLMProviderError) as exc_info:
            provider.analyze_document(sample_chunks, sample_metadata)
        assert "xAI Grok API error (429)" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 8: Invalid Structured Output Rejected
# ---------------------------------------------------------------------------
def test_invalid_structured_output(monkeypatch, sample_chunks, sample_metadata):
    provider = GrokProvider(api_key="dummy-key")

    with patch("httpx.Client.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": '{"corrupted": true}'}}]
        }
        mock_post.return_value = mock_response

        with pytest.raises(LLMProviderError) as exc_info:
            provider.analyze_document(sample_chunks, sample_metadata)
        assert "Grok legal analysis failed" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Test 9: Chunk-ID Grounding Hydration and Invalid Reference Detection
# ---------------------------------------------------------------------------
def test_chunk_id_grounding_hydration(valid_raw_analysis_json, sample_chunks):
    raw_analysis = RawAnalysisOutput.model_validate_json(valid_raw_analysis_json)

    # 1. Valid source_chunk_id -> Must hydrate genuine chunk text, page, and section
    analysis = LegalAnalyzer.hydrate_and_validate_findings(raw_analysis, sample_chunks)
    finding = analysis.findings[0]

    assert finding.source_chunk_id == "chunk-p2-001"
    assert finding.page_number == 2
    assert finding.section_title == "4. Limitation of Liability"
    # Verbatim excerpt must come directly from DocumentChunk, NOT LLM
    assert finding.verbatim_excerpt == sample_chunks[1].text
    assert finding.citation_valid is True

    # 2. Invalid source_chunk_id -> Must flag citation_valid = False and use safe unverified text
    invalid_finding = RawFindingOutput(
        category="Termination",
        attention_level="high",
        title="Immediate Termination Trap",
        plain_english="Party may terminate instantly.",
        why_it_matters="High risk.",
        source_chunk_id="chunk-fake-999",  # Does not exist in sample_chunks
    )
    raw_analysis.findings.append(invalid_finding)

    analysis_with_invalid = LegalAnalyzer.hydrate_and_validate_findings(raw_analysis, sample_chunks)
    invalid_result = analysis_with_invalid.findings[1]

    assert invalid_result.source_chunk_id == "chunk-fake-999"
    assert invalid_result.citation_valid is False
    assert invalid_result.section_title == "Unverified Section"
    assert "could not be verified" in invalid_result.verbatim_excerpt
