import os
import logging
from typing import Optional
from app.services.llm.base import LLMProvider, ConfigurationError
from app.services.llm.gemini_provider import GeminiProvider
from app.services.llm.grok_provider import GrokProvider

logger = logging.getLogger(__name__)


def get_llm_provider(provider_name: Optional[str] = None) -> LLMProvider:
    """
    Factory to instantiate and validate the active LLM provider.
    
    Defaults to Gemini.
    Provider is explicitly controlled via LLM_PROVIDER ('gemini' or 'grok').
    Strict Cost Rule: Never automatically falls back from Gemini to Grok.
    """
    selected = (provider_name or os.getenv("LLM_PROVIDER", "gemini")).lower().strip()

    if selected in ("gemini", "google"):
        provider = GeminiProvider()
        provider.validate_configuration()
        return provider
    elif selected in ("grok", "xai"):
        provider = GrokProvider()
        provider.validate_configuration()
        return provider
    else:
        raise ConfigurationError(
            f"Unsupported LLM provider '{selected}'. Supported providers are 'gemini' and 'grok'."
        )
