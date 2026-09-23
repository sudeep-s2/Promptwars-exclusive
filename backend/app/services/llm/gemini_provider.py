import os
import logging
from typing import List, Optional
from app.schemas.document import DocumentChunk, DocumentMetadata
from app.schemas.analysis import RawAnalysisOutput, RawQAOutput
from app.services.llm.base import LLMProvider, LLMProviderError, ConfigurationError

logger = logging.getLogger(__name__)

# Default Flash model constant suitable for Free-tier and structured JSON output
DEFAULT_GEMINI_FLASH_MODEL = "gemini-2.5-flash"
FALLBACK_GEMINI_FLASH_MODEL = "gemini-1.5-flash"


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider implementing structured legal analysis."""

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key or os.getenv("GEMINI_API_KEY", "").strip()
        self._client = None
        self._selected_model: Optional[str] = None

    @property
    def name(self) -> str:
        return "gemini"

    def validate_configuration(self) -> None:
        """Validate API key presence without making remote calls."""
        if not self._api_key:
            raise ConfigurationError("Gemini API key is not configured. Set GEMINI_API_KEY in your environment.")

    def _get_client(self):
        """Lazy-initialize google-genai client."""
        if self._client is None:
            self.validate_configuration()
            try:
                from google import genai
                self._client = genai.Client(api_key=self._api_key)
            except Exception as e:
                raise LLMProviderError(f"Failed to initialize Gemini client: {str(e)}")
        return self._client

    def get_model_name(self) -> str:
        """
        Select an appropriate Flash-class model.
        Uses safe model discovery with fallback to default constants.
        """
        if self._selected_model:
            return self._selected_model

        client = self._get_client()
        try:
            available = [m.name for m in client.models.list() if m.name]
            cleaned = [m.split("/")[-1] for m in available]
            flash_models = [
                m for m in cleaned
                if "flash" in m.lower()
                and not any(ex in m.lower() for ex in ["image", "embed", "vision", "thinking-exp", "robotics"])
            ]
            if DEFAULT_GEMINI_FLASH_MODEL in flash_models:
                self._selected_model = DEFAULT_GEMINI_FLASH_MODEL
            elif FALLBACK_GEMINI_FLASH_MODEL in flash_models:
                self._selected_model = FALLBACK_GEMINI_FLASH_MODEL
            elif flash_models:
                self._selected_model = flash_models[0]
            else:
                self._selected_model = DEFAULT_GEMINI_FLASH_MODEL
        except Exception as exc:
            logger.info("Model listing not accessible, using default model %s (%s)", DEFAULT_GEMINI_FLASH_MODEL, str(exc))
            self._selected_model = DEFAULT_GEMINI_FLASH_MODEL

        return self._selected_model

    def analyze_document(
        self,
        chunks: List[DocumentChunk],
        metadata: DocumentMetadata,
    ) -> RawAnalysisOutput:
        """Execute structured legal analysis via Gemini with schema enforcement."""
        client = self._get_client()
        model_name = self.get_model_name()

        chunk_texts = [
            f"[Chunk ID: {c.chunk_id} | Page {c.page_number} | Section: {c.section_title or 'General'}]\n{c.text}"
            for c in chunks
        ]
        document_context = "\n\n---\n\n".join(chunk_texts)

        prompt = f"""You are LexLens, an expert legal document intelligence assistant.
Analyze the following legal document chunks and produce a structured analysis.

GROUNDING RULE:
For each finding, provide the exact 'source_chunk_id' from the document chunks (e.g. chunk-p1-002).
The application will retrieve the authentic verbatim text and page citations directly from that chunk.

ANALYSIS GUIDANCE:
1. Executive Summary:
   - Identify document type (e.g. Master Services Agreement, Non-Disclosure Agreement).
   - Identify contracting parties verbatim as stated in preamble.
   - Summarize effective date, duration, financial terms, and high-level purpose.
2. Findings:
   - Identify 4 to 8 critical clauses across categories: Liability, Payment, Intellectual Property, Termination, Obligations, Confidentiality, Governing Law, Boilerplate.
   - Assign attention_level: 'high', 'moderate', or 'standard'. Use 'high' for uncapped liability, indemnification, broad IP transfer.
   - Plain English summary must be simple and accessible (8th-grade reading level).
   - Practical business impact ('why_it_matters') must explain concrete implications.
   - 'source_chunk_id': MUST match one of the provided Chunk IDs.
3. Counsel Discussion Points:
   - Generate 3 to 5 targeted questions for the user to ask their attorney.
4. Suggested Questions:
   - Provide 4 natural questions a user would ask about this document.

DOCUMENT CHUNKS:
{document_context}
"""

        try:
            from google.genai import types
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RawAnalysisOutput,
                temperature=0.1,
            )
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )

            raw_text = response.text or ""
            if not raw_text.strip():
                raise LLMProviderError("Gemini returned an empty response.")

            raw_analysis = RawAnalysisOutput.model_validate_json(raw_text)
            return raw_analysis

        except LLMProviderError:
            raise
        except Exception as e:
            logger.exception("Gemini analysis error: %s", str(e))
            raise LLMProviderError(f"Gemini legal analysis failed: {str(e)}")

    def answer_question(
        self,
        question: str,
        chunks: List[DocumentChunk],
    ) -> RawQAOutput:
        """Answer a user question grounded strictly in document chunks."""
        client = self._get_client()
        model_name = self.get_model_name()

        chunk_texts = [
            f"[Chunk ID: {c.chunk_id} | Page {c.page_number} | Section: {c.section_title or 'General'}]\n{c.text}"
            for c in chunks
        ]
        context = "\n\n---\n\n".join(chunk_texts)

        prompt = f"""You are LexLens Grounded Legal Q&A.
Answer the user's question STRICTLY using the document context provided below.

RULES:
1. STRICT GROUNDING: Answer directly and plainly in 2 to 4 sentences using ONLY the provided document context.
2. SOURCE CITATION: Provide the supporting 'source_chunk_id' from the document chunks whenever facts from that chunk support the answer.
3. MISSING OR NON-EXISTENT TERMS: If the document does NOT contain terms addressing the question, or if the question asks about a specific penalty, fee, or clause (e.g. '$50,000 penalty') that is not present in the document, state clearly that the document does not contain this information and set 'source_chunk_id': null.
4. NO LEGAL ADVICE: Do NOT provide legal advice, legal opinions, conclusions on legality or enforceability, or advice on whether to sign, breach, or sue. If the question asks for a legal opinion, state the relevant document terms factually (if any), state that LexLens cannot provide legal conclusions or enforceability opinions, and advise consulting an attorney.
5. CONTRADICTIONS: If the document context contains conflicting or contradictory terms on the queried topic, explicitly describe both conflicting provisions without making a legal judgment on which clause takes precedence.

DOCUMENT CHUNKS:
{context}

QUESTION:
{question}
"""
        try:
            from google.genai import types
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RawQAOutput,
                temperature=0.1,
            )
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )
            raw_text = response.text or ""
            return RawQAOutput.model_validate_json(raw_text)
        except Exception as e:
            logger.exception("Gemini Q&A failed: %s", str(e))
            raise LLMProviderError(f"Gemini Q&A synthesis failed: {str(e)}")
