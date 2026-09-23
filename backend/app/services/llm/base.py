from abc import ABC, abstractmethod
from typing import List
from app.schemas.document import DocumentChunk, DocumentMetadata
from app.schemas.analysis import RawAnalysisOutput, RawQAOutput


class LLMProviderError(Exception):
    """Base exception for LLM provider errors."""
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class ConfigurationError(LLMProviderError):
    """Exception raised when an LLM provider lacks required configuration or API keys."""
    def __init__(self, message: str):
        super().__init__(message, status_code=500)


class LLMProvider(ABC):
    """Abstract interface defining the contract for LLM providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider (e.g. 'gemini', 'grok')."""
        pass

    @abstractmethod
    def validate_configuration(self) -> None:
        """
        Validate that the provider has required credentials configured.
        Raises ConfigurationError if configuration is invalid or missing.
        """
        pass

    @abstractmethod
    def analyze_document(
        self,
        chunks: List[DocumentChunk],
        metadata: DocumentMetadata,
    ) -> RawAnalysisOutput:
        """
        Execute structured legal analysis across document chunks.
        Returns RawAnalysisOutput containing source_chunk_id references for hydration.
        """
        pass

    @abstractmethod
    def answer_question(
        self,
        question: str,
        chunks: List[DocumentChunk],
    ) -> RawQAOutput:
        """
        Synthesize an answer and identify the supporting source_chunk_id.
        """
        pass
