import os
import logging
from typing import List
from google import genai
from google.genai import types

from app.services.embedding.base import EmbeddingProvider, EmbeddingError, EmbeddingConfigurationError

logger = logging.getLogger(__name__)

# Centralized model choice inside provider implementation (do not expose in .env)
DEFAULT_EMBEDDING_MODEL = "text-embedding-004"
DEFAULT_EMBEDDING_DIMENSION = 768


class GeminiEmbeddingProvider(EmbeddingProvider):
    """
    Embedding provider utilizing Google Gemini embedding models via official google-genai SDK.
    """

    def __init__(self, api_key: str = None, model: str = DEFAULT_EMBEDDING_MODEL, dimension: int = DEFAULT_EMBEDDING_DIMENSION):
        self._api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self._api_key or not self._api_key.strip():
            raise EmbeddingConfigurationError("GEMINI_API_KEY is not configured or is empty.")

        self._model = model
        self._dimension = dimension
        try:
            self._client = genai.Client(api_key=self._api_key)
        except Exception as exc:
            raise EmbeddingConfigurationError(f"Failed to initialize Gemini client: {exc}") from exc

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding vector for a single text chunk or query."""
        if not text or not text.strip():
            raise EmbeddingError("Cannot generate embedding for empty or whitespace-only text.")

        try:
            response = self._client.models.embed_content(
                model=self._model,
                contents=text.strip(),
            )
            
            # Extract embedding values
            embedding_vals = None
            if hasattr(response, "embedding") and response.embedding:
                embedding_vals = response.embedding.values
            elif hasattr(response, "embeddings") and response.embeddings:
                embedding_vals = response.embeddings[0].values
            
            if not embedding_vals:
                raise EmbeddingError(f"Gemini API returned empty embedding values for model {self._model}.")

            vals = list(embedding_vals)
            if len(vals) != self._dimension:
                logger.warning(
                    "Embedding dimension mismatch: expected %d, got %d. Updating dimension.",
                    self._dimension,
                    len(vals),
                )
                self._dimension = len(vals)

            return vals

        except EmbeddingError:
            raise
        except Exception as exc:
            logger.error("Gemini embedding generation failed: %s", exc)
            raise EmbeddingError(f"Gemini embedding API error: {str(exc)}", original_error=exc) from exc

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of document chunks."""
        if not texts:
            return []

        results: List[List[float]] = []
        for i, text in enumerate(texts):
            if not text or not text.strip():
                raise EmbeddingError(f"Cannot generate embedding for empty text at index {i}.")
            vector = self.embed_text(text)
            results.append(vector)

        return results
