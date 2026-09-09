"""Regression tests for the LLM finish_reason=length retry (orchestrator hotfix).

The hotfix in app/llm/client.py: when a reasoning model burns its completion
budget thinking before producing content (finish_reason == "length"), chat()
retries ONCE with max_tokens*2 (capped at 16000) instead of failing outright.

Under test:
- A truncated first response followed by a successful retry returns the content.
- The retry uses max_tokens*2 and reuses the same messages.
- The retry budget never shrinks (cap at 16000).
- No retry happens when the first response is not truncated.
- Empty content after the retry still raises LLMUnavailable.
"""

from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

from app.config import Settings
from app.llm.client import LLMClient, LLMUnavailable


def _settings(**overrides) -> Settings:
    base = {
        "ollama_api_key": "test-key",
        "ollama_base_url": "https://ollama.com/v1",
        "sectors_mode": "fixture",
    }
    base.update(overrides)
    return Settings(**base)


def _resp(content, finish_reason):
    """A fake OpenAI chat completion response."""
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=content),
                finish_reason=finish_reason,
            )
        ]
    )


def _make_fake_openai(responses: list):
    """Return an AsyncOpenAI stand-in that records create() kwargs and
    returns the scripted responses in order."""

    class FakeOpenAI:
        def __init__(self, *args, **kwargs):
            self.calls: list[dict] = []
            self.chat = SimpleNamespace(
                completions=SimpleNamespace(create=self._create)
            )

        async def _create(self, **kwargs):
            self.calls.append(kwargs)
            return responses.pop(0)

    return FakeOpenAI


def test_retry_on_length_returns_content_and_doubles_budget(monkeypatch):
    responses = [
        _resp(content=None, finish_reason="length"),
        _resp(content='{"ok": true}', finish_reason="stop"),
    ]
    monkeypatch.setattr("app.llm.client.AsyncOpenAI", _make_fake_openai(responses))

    client = LLMClient(_settings())
    messages = [{"role": "user", "content": "ringkas data ini"}]
    content = asyncio.run(client.chat("m", messages, json_mode=True, max_tokens=2000))

    assert content == '{"ok": true}'
    fake = client._client
    assert len(fake.calls) == 2
    # first attempt uses the requested budget, retry doubles it
    assert fake.calls[0]["max_tokens"] == 2000
    assert fake.calls[1]["max_tokens"] == 4000
    # retry re-sends the same messages (full context, bigger budget)
    assert fake.calls[1]["messages"] == messages
    assert fake.calls[1]["model"] == fake.calls[0]["model"]


def test_retry_budget_never_shrinks(monkeypatch):
    responses = [
        _resp(content=None, finish_reason="length"),
        _resp(content="ok", finish_reason="stop"),
    ]
    monkeypatch.setattr("app.llm.client.AsyncOpenAI", _make_fake_openai(responses))

    client = LLMClient(_settings())
    content = asyncio.run(client.chat("m", [{"role": "user", "content": "hi"}], max_tokens=9000))

    assert content == "ok"
    fake = client._client
    # min(9000*2, 16000) == 16000 — capped, never smaller than the original
    assert fake.calls[1]["max_tokens"] == 16000
    assert fake.calls[1]["max_tokens"] >= fake.calls[0]["max_tokens"]


def test_no_retry_when_not_truncated(monkeypatch):
    responses = [_resp(content="ok", finish_reason="stop")]
    monkeypatch.setattr("app.llm.client.AsyncOpenAI", _make_fake_openai(responses))

    client = LLMClient(_settings())
    content = asyncio.run(client.chat("m", [{"role": "user", "content": "hi"}], max_tokens=2000))

    assert content == "ok"
    assert len(client._client.calls) == 1


def test_empty_content_after_retry_raises(monkeypatch):
    responses = [
        _resp(content=None, finish_reason="length"),
        _resp(content=None, finish_reason="length"),
    ]
    monkeypatch.setattr("app.llm.client.AsyncOpenAI", _make_fake_openai(responses))

    client = LLMClient(_settings())
    with pytest.raises(LLMUnavailable):
        asyncio.run(client.chat("m", [{"role": "user", "content": "hi"}], max_tokens=2000))
