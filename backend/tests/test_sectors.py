"""Unit tests for the Sectors client rules (sectors-docs-digest.md).

Critical rules under test:
- Authorization header is the RAW key, NO "Bearer " prefix.
- Company report ALWAYS sends explicit `sections`.
- Screener ALWAYS uses `where=`, never `q=`.
- 429 -> retry with backoff.
"""

from __future__ import annotations

import asyncio

import httpx
import pytest

from app.config import Settings
from app.db import Database
from app.sectors import SectorsClient, SectorsError


def _settings(tmp_path, **overrides) -> Settings:
    base = {
        "sectors_mode": "live",
        "sectors_api_key": "raw-secret-key",
        "sectors_base_url": "https://api.sectors.app",
        "db_path": str(tmp_path / "test.db"),
    }
    base.update(overrides)
    return Settings(**base)


def _client(tmp_path, handler, **overrides) -> SectorsClient:
    settings = _settings(tmp_path, **overrides)
    db = Database(settings.db_path)
    transport = httpx.MockTransport(handler)
    return SectorsClient(settings=settings, db=db, transport=transport)


def test_auth_header_is_raw_key_without_bearer(tmp_path):
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["auth"] = request.headers.get("Authorization", "")
        captured["url"] = str(request.url)
        return httpx.Response(200, json={"valuation": {"forward_pe": 8.4}})

    client = _client(tmp_path, handler)
    resp = asyncio.run(client.company_report("CUAN", "valuation"))

    assert resp.payload["valuation"]["forward_pe"] == 8.4
    assert captured["auth"] == "raw-secret-key"
    assert "Bearer" not in captured["auth"]
    assert "sections=valuation" in captured["url"]


def test_company_report_always_sends_explicit_sections(tmp_path):
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(200, json={})

    client = _client(tmp_path, handler)
    asyncio.run(client.company_report("BBCA", "financials,valuation"))

    from urllib.parse import unquote

    url = unquote(captured["url"])
    assert "sections=financials,valuation" in url
    # base URL must not double the /v2 prefix
    assert url.count("/v2/") == 1
    assert url.startswith("https://api.sectors.app/v2/company/report/BBCA/")


def test_screener_uses_where_not_q(tmp_path):
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(200, json={"results": []})

    client = _client(tmp_path, handler)
    asyncio.run(client.screener(where="symbol in ['BBCA']", limit=10))

    assert "where=symbol%20in%20%5B'BBCA'%5D" in captured["url"] or "where=" in captured["url"]
    assert "q=" not in captured["url"]


def test_429_retries_with_backoff_then_succeeds(tmp_path):
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] < 3:
            return httpx.Response(429, json={})
        return httpx.Response(200, json={"valuation": {"forward_pe": 8.4}})

    client = _client(tmp_path, handler)
    resp = asyncio.run(client.company_report("CUAN", "valuation"))

    assert calls["n"] == 3
    assert resp.payload["valuation"]["forward_pe"] == 8.4


def test_404_raises_sectors_error(tmp_path):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={})

    client = _client(tmp_path, handler)

    with pytest.raises(SectorsError):
        asyncio.run(client.company_report("NOPE", "valuation"))
