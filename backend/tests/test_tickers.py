"""Tests for the tickers endpoint (CONTRACT 1.2.0).

- Fixture mode: GET /api/tickers returns the listed-companies registry with
  ZERO HTTP calls (the transport raises if any request is attempted).
- q is case-insensitive on ticker AND company_name; total = filtered count.
- limit/offset paginate.
- Live mode: first call refreshes the registry (screener), later calls are
  cache hits (0 credits).
"""

from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import Database
from app.eventbus import EventBus
from app.llm import LLMClient
from app.main import create_app
from app.sectors import SectorsClient


def _boom(request: httpx.Request) -> httpx.Response:
    raise AssertionError("Fixture mode must not make HTTP calls")


@pytest.fixture
def app_env(tmp_path):
    settings = Settings(
        sectors_mode="fixture",
        db_path=str(tmp_path / "test.db"),
        ollama_api_key="",
        llm_fallback_template=True,
    )
    db = Database(settings.db_path)
    bus = EventBus(db)
    sectors = SectorsClient(settings=settings, db=db, transport=httpx.MockTransport(_boom))
    llm = LLMClient(settings=settings)
    app = create_app(settings=settings, db=db, bus=bus, sectors=sectors, llm=llm)
    return app, db


def test_tickers_fixture_returns_registry(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        r = client.get("/api/tickers")
        assert r.status_code == 200
        body = r.json()
        assert body["total"] >= 1
        assert len(body["items"]) == body["total"]  # default limit 50 >= registry size
        for item in body["items"]:
            assert set(item) == {"ticker", "company_name"}
            assert item["ticker"]
        tickers = {i["ticker"] for i in body["items"]}
        assert "BBCA" in tickers
        assert "CUAN" in tickers


def test_tickers_q_lowercase_finds_bbc(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        r = client.get("/api/tickers", params={"q": "bbca"})
        assert r.status_code == 200
        body = r.json()
        assert body["total"] == 1
        assert body["items"] == [{"ticker": "BBCA", "company_name": "Bank Central Asia Tbk"}]


def test_tickers_q_matches_company_name(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        r = client.get("/api/tickers", params={"q": "bank"})
        assert r.status_code == 200
        body = r.json()
        tickers = {i["ticker"] for i in body["items"]}
        assert {"BBCA", "BBRI", "BMRI", "BBNI"} <= tickers
        assert body["total"] == len(body["items"])  # all match, under limit


def test_tickers_q_no_match(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        r = client.get("/api/tickers", params={"q": "zzz"})
        assert r.status_code == 200
        assert r.json() == {"items": [], "total": 0}


def test_tickers_limit_offset(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        total = client.get("/api/tickers", params={"limit": 200}).json()["total"]
        assert total >= 2

        first = client.get("/api/tickers", params={"limit": 1}).json()
        assert len(first["items"]) == 1
        assert first["total"] == total

        second = client.get("/api/tickers", params={"limit": 1, "offset": 1}).json()
        assert len(second["items"]) == 1
        assert second["items"][0]["ticker"] != first["items"][0]["ticker"]
        assert second["total"] == total


def test_tickers_live_refreshes_once_then_cache_hit(tmp_path):
    screener_calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/v2/companies/" in url:
            screener_calls["n"] += 1
            return httpx.Response(
                200,
                json={
                    "results": [
                        {"symbol": "BBCA.JK", "company_name": "Bank Central Asia Tbk"},
                        {"symbol": "CUAN.JK", "company_name": "Petrindo Jaya Kreasi Tbk"},
                        {"symbol": "TLKM.JK", "company_name": "Telkom Indonesia Tbk"},
                    ],
                    "pagination": {"total_count": 3, "limit": 200, "offset": 0},
                },
            )
        return httpx.Response(200, json={})

    settings = Settings(
        sectors_mode="live",
        sectors_api_key="raw-secret-key",
        sectors_base_url="https://api.sectors.app",
        db_path=str(tmp_path / "live.db"),
        ollama_api_key="",
        llm_fallback_template=True,
    )
    db = Database(settings.db_path)
    bus = EventBus(db)
    sectors = SectorsClient(settings=settings, db=db, transport=httpx.MockTransport(handler))
    llm = LLMClient(settings=settings)
    app = create_app(settings=settings, db=db, bus=bus, sectors=sectors, llm=llm)

    with TestClient(app) as client:
        r = client.get("/api/tickers")
        assert r.status_code == 200
        assert r.json()["total"] == 3
        assert screener_calls["n"] == 1  # first refresh

        r2 = client.get("/api/tickers", params={"q": "bbca"})
        assert r2.status_code == 200
        assert r2.json()["items"] == [
            {"ticker": "BBCA", "company_name": "Bank Central Asia Tbk"}
        ]
        assert screener_calls["n"] == 1  # cache hit — no new Sectors call
