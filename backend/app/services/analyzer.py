import logging
from typing import List, Optional
from app.schemas.document import DocumentChunk, DocumentMetadata
from app.schemas.analysis import (
    RawAnalysisOutput,
    RawQAOutput,
    LegalAnalysis,
    LegalFinding,
    QAResponse,
)
from app.services.llm.base import LLMProvider
from app.services.llm.factory import get_llm_provider

logger = logging.getLogger(__name__)


class LegalAnalyzer:
    """
    Coordinates legal document analysis, provider delegation, and deterministic chunk-ID grounding.
    Hydrates genuine verbatim text, page numbers, and section titles directly from DocumentChunks.
    Never trusts or displays LLM-generated verbatim quotes.
    """

    def __init__(self, provider: Optional[LLMProvider] = None):
        self._provider = provider

    def _get_provider(self) -> LLMProvider:
        if self._provider is None:
            self._provider = get_llm_provider()
        return self._provider

    @staticmethod
    def hydrate_and_validate_findings(
        raw_analysis: RawAnalysisOutput,
        chunks: List[DocumentChunk],
    ) -> LegalAnalysis:
        """
        Hydrate authentic text and citations from genuine document chunks using source_chunk_id.
        Flags citation_valid = False if the source_chunk_id does not exist in the document.
        """
        chunks_by_id = {c.chunk_id: c for c in chunks}
        hydrated_findings: List[LegalFinding] = []

        for raw in raw_analysis.findings:
            chunk = chunks_by_id.get(raw.source_chunk_id)
            if chunk:
                hydrated_findings.append(
                    LegalFinding(
                        category=raw.category,
                        attention_level=raw.attention_level,
                        title=raw.title,
                        plain_english=raw.plain_english,
                        why_it_matters=raw.why_it_matters,
                        source_chunk_id=raw.source_chunk_id,
                        page_number=chunk.page_number,
                        section_title=chunk.section_title or "General Provisions",
                        verbatim_excerpt=chunk.text,  # Authentic text from document processor
                        citation_valid=True,
                    )
                )
            else:
                # LLM provided a chunk ID not in the document
                hydrated_findings.append(
                    LegalFinding(
                        category=raw.category,
                        attention_level=raw.attention_level,
                        title=raw.title,
                        plain_english=raw.plain_english,
                        why_it_matters=raw.why_it_matters,
                        source_chunk_id=raw.source_chunk_id,
                        page_number=1,
                        section_title="Unverified Section",
                        verbatim_excerpt="Source chunk reference could not be verified in the document.",
                        citation_valid=False,
                    )
                )

        return LegalAnalysis(
            executive_summary=raw_analysis.executive_summary,
            findings=hydrated_findings,
            counsel_discussion_points=raw_analysis.counsel_discussion_points,
            suggested_questions=raw_analysis.suggested_questions,
        )

    def analyze(
        self,
        chunks: List[DocumentChunk],
        metadata: DocumentMetadata,
    ) -> LegalAnalysis:
        """Execute document analysis and hydrate genuine source grounding."""
        provider = self._get_provider()
        raw_analysis = provider.analyze_document(chunks=chunks, metadata=metadata)
        validated_analysis = self.hydrate_and_validate_findings(raw_analysis, chunks)
        return validated_analysis

    def answer_question(
        self,
        question: str,
        chunks: List[DocumentChunk],
    ) -> QAResponse:
        """Answer question using the active LLM provider and hydrate genuine source text."""
        provider = self._get_provider()
        raw_qa = provider.answer_question(question=question, chunks=chunks)

        chunks_by_id = {c.chunk_id: c for c in chunks}
        chunk = chunks_by_id.get(raw_qa.source_chunk_id) if raw_qa.source_chunk_id else None

        if chunk:
            citation = f"Page {chunk.page_number} · Section: {chunk.section_title or 'General'}"
            page_num = chunk.page_number
            excerpt = chunk.text
        else:
            citation = "Document-wide Context"
            page_num = 1
            excerpt = None

        return QAResponse(
            question=question,
            answer=raw_qa.answer,
            source_citation=citation,
            page_number=page_num,
            verbatim_excerpt=excerpt,
            source_chunk_id=raw_qa.source_chunk_id,
        )
