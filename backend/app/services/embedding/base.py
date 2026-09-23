from abc import ABC, abstractmethod
from typing import List


class EmbeddingError(Exception):
    """Raised when an embedding provider fails to generate an embedding."""
    def __init__(self, message: str, original_error: Exception = None):
        self.message = message
        self.original_error = original_error
        super().__init__(self.message)


class EmbeddingConfigurationError(Exception):
    """Raised when embedding provider configuration or credentials are missing."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class EmbeddingProvider(ABC):
    """Abstract base class for text embedding generation."""

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Returns the embedding vector dimension."""
        pass

    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """
        Embed a single text string.
        Raises EmbeddingError if input is empty or embedding generation fails.
        """
        pass

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Embed multiple text strings in batch.
        Raises EmbeddingError if texts is empty or embedding fails.
        """
        pass
