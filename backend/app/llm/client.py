"""OpenAI-compatible LLM client (Ollama cloud).

Uses the `openai` SDK pointed at OLLAMA_BASE_URL with OLLAMA_API_KEY.
Model per role comes from settings (MODEL_ANALYST / MODEL_DEBATE / MODEL_JUDGE).

When the LLM is not configured or unreachable, callers fall back to the
deterministic templates in app.llm.templates (settings.llm_fallback_template).
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from openai import AsyncOpenAI

from ..config import Settings, get_settings

logger = logging.getLogger(__name__)


class LLMUnavailable(Exception):
    """Raised when no API key is configured or the endpoint is unreachable."""


class LLMClient:
    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        self._client: Optional[AsyncOpenAI] = None
        if self.settings.ollama_api_key:
            self._client = AsyncOpenAI(
                base_url=self.settings.ollama_base_url,
                api_key=self.settings.ollama_api_key,
                timeout=90.0,
                max_retries=2,
            )

    @property
    def available(self) -> bool:
        return self._client is not None

    async def chat(
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        json_mode: bool = False,
        max_tokens: int = 2000,
    ) -> str:
        if not self._client:
            raise LLMUnavailable("OLLAMA_API_KEY tidak dikonfigurasi")
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        resp = await self._client.chat.completions.create(**kwargs)
        content = resp.choices[0].message.content
        if not content:
            raise LLMUnavailable("LLM mengembalikan respons kosong")
        return content
