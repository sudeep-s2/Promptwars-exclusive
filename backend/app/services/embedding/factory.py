import logging
from app.services.embedding.base import EmbeddingProvider, EmbeddingConfigurationError
from app.services.embedding.gemini import GeminiEmbeddingProvider

logger = logging.getLogger(__name__)


def get_embedding_provider() -> EmbeddingProvider:
    """
    Centralized factory for obtaining the configured EmbeddingProvider.
    Uses Gemini embeddings. Strictly avoids automatic fallback to Grok or unrequested providers.
    """
    try:
        return GeminiEmbeddingProvider()
    except EmbeddingConfigurationError as e:
        logger.error("Embedding provider configuration failed: %s", e.message)
        raise
