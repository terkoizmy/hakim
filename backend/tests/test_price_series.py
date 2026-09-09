"""Tests for the price-series feature (CONTRACT 1.1.0).

- build_price_series unit tests (ascending, cap 52, missing fields, < 2).
- Fixture: GET /api/trials/{id}/price-series returns >= 2 ascending points.
- Fixture: < 2 points -> points: null (HTTP 200, not an error).
- Fixture: postmortem includes price_series.
- Live: the price-series endpoint does not call Sectors twice for the same trial
  (snapshot in DB -> 0 credits; the trial's own daily_transaction call is the
  only one).
"""

from __future__ import annotations

import time

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import Database
from app.eventbus import EventBus
from app.llm import LLMClient
from app.main import create_app
from app.price_series import MAX_PRICE_POINTS, build_price_series
from app.sectors import SectorsClient


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
    sectors = SectorsClient(settings=settings, db=db)
    llm = LLMClient(settings=settings)
    app = create_app(settings=settings, db=db, bus=bus, sectors=sectors, llm=llm)
    return app, db


def _wait_memo(client, trial_id, timeout: float = 30.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = client.get(f"/api/trials/{trial_id}/memo")
        if r.status_code == 200:
            return r.json()
        time.sleep(0.1)
    raise AssertionError("Memo tidak muncul dalam batas waktu")


def _start_trial(client, ticker: str, mode: str = "fixture") -> str:
    r = client.post("/api/trials", json={"ticker": ticker, "mode": mode})
    assert r.status_code == 202
    return r.json()["trial_id"]


# ---------------------------------------------------------------------------
# build_price_series unit tests
# ---------------------------------------------------------------------------


def test_build_price_series_sorts_ascending_and_keeps_fields():
    payload = {
        "data": [
            {"date": "2026-09-08", "close": 8400, "volume": 12000000, "change_pct": 0.5},
            {"date": "2026-09-01", "close": 8358, "volume": 9000000, "change_pct": -0.2},
            {"date": "2026-08-25", "close": 8375, "volume": 11000000, "change_pct": 0.3},
        ]
    }
    points = build_price_series(payload)
    assert [p["date"] for p in points] == ["2026-08-25", "2026-09-01", "2026-09-08"]
    assert points[0] == {
        "date": "2026-08-25",
        "close": 8375,
        "volume": 11000000,
        "change_pct": 0.3,
    }


def test_build_price_series_caps_at_52():
    rows = [{"date": f"2026-01-{i:02d}", "close": 100 + i} for i in range(1, 60)]
    points = build_price_series({"data": rows})
    assert len(points) == MAX_PRICE_POINTS
    # keeps the most recent 52, still ascending
    assert points[0]["date"] == "2026-01-08"
    assert points[-1]["date"] == "2026-01-59"


def test_build_price_series_skips_rows_without_date_or_close():
    payload = {
        "data": [
            {"date": "2026-09-08", "close": 8400},
            {"date": "2026-09-01"},  # no close
            {"close": 100},  # no date
            {"date": "2026-08-25", "close": 8375, "volume": 1},
        ]
    }
    points = build_price_series(payload)
    assert len(points) == 2
    assert points[0]["date"] == "2026-08-25"


def test_build_price_series_single_point_returns_one():
    points = build_price_series({"data": [{"date": "2026-09-08", "close": 8400}]})
    assert len(points) == 1


def test_build_price_series_empty():
    assert build_price_series({}) == []
    assert build_price_series({"data": []}) == []


# ---------------------------------------------------------------------------
# Endpoint tests (fixture)
# ---------------------------------------------------------------------------


def test_price_series_fixture_bbc(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        trial_id = _start_trial(client, "BBCA")
        _wait_memo(client, trial_id)

        r = client.get(f"/api/trials/{trial_id}/price-series")
        assert r.status_code == 200
        body = r.json()
        assert body["trial_id"] == trial_id
        assert body["ticker"] == "BBCA"
        points = body["points"]
        assert points is not None
        assert len(points) >= 2
        dates = [p["date"] for p in points]
        assert dates == sorted(dates)
        for p in points:
            assert set(p) >= {"date", "close", "volume", "change_pct"}


def test_price_series_null_when_less_than_2_points(app_env):
    app, db = app_env
    with TestClient(app) as client:
        trial_id = _start_trial(client, "BBCA")
        _wait_memo(client, trial_id)
        # overwrite the snapshot with a single point -> contract says null
        db.save_price_series(
            trial_id, "BBCA", [{"date": "2026-09-08", "close": 8400}], "2026-09-09T00:00:00Z"
        )

        r = client.get(f"/api/trials/{trial_id}/price-series")
        assert r.status_code == 200
        assert r.json()["points"] is None


def test_postmortem_includes_price_series(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        trial_id = _start_trial(client, "BBCA")
        memo = _wait_memo(client, trial_id)

        r = client.get(f"/api/journal/{memo['memo_id']}/postmortem")
        assert r.status_code == 200
        body = r.json()
        assert body["price_series"] is not None
        assert len(body["price_series"]) >= 2
        dates = [p["date"] for p in body["price_series"]]
        assert dates == sorted(dates)
        # existing postmortem fields unchanged
        assert body["price_at_trial"] is not None
        assert body["price_now"] is not None
        assert isinstance(body["change_pct"], float)
        assert isinstance(body["days_elapsed"], int)


# ---------------------------------------------------------------------------
# Live: no double Sectors call for the same trial
# ---------------------------------------------------------------------------


def test_price_series_does_not_call_sectors_twice(tmp_path):
    daily_calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/v2/daily/" in url:
            daily_calls["n"] += 1
            # raw live v2 shape: bare array — the client normalizes it
            return httpx.Response(
                200,
                json=[
                    {"symbol": "BBCA.JK", "date": "2026-09-08", "close": 8400, "volume": 12000000, "change_pct": 0.5},
                    {"symbol": "BBCA.JK", "date": "2026-09-01", "close": 8358, "volume": 9000000, "change_pct": -0.2},
                    {"symbol": "BBCA.JK", "date": "2026-08-25", "close": 8375, "volume": 11000000, "change_pct": 0.3},
                ],
            )
        if "/v2/company/report/" in url:
            return httpx.Response(
                200, json={"valuation": {"forward_pe": 8.4}, "last_close_price": 8400}
            )
        if "/v2/companies/" in url:
            return httpx.Response(
                200,
                json={
                    "results": [
                        {"symbol": "BBCA", "company_name": "Bank Central Asia Tbk", "free_float": 0.3}
                    ]
                },
            )
        if "/v2/foreign-flow/" in url:
            # raw live v2 shape: {data: [{date, net_foreign_inflow}]}
            return httpx.Response(
                200,
                json={"data": [{"date": "2026-09-08", "net_foreign_inflow": 1000000000}]},
            )
        if "/v2/filings/" in url:
            # raw live v2 shape: {results: [{..., transaction_type}]}
            return httpx.Response(
                200,
                json={
                    "results": [
                        {"transaction_type": "buy", "timestamp": "2026-07-10", "name": "Direksi", "shares": 10000}
                    ]
                },
            )
        if "/v2/suspensions/" in url:
            return httpx.Response(200, json={"results": []})
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
    transport = httpx.MockTransport(handler)
    sectors = SectorsClient(settings=settings, db=db, transport=transport)
    llm = LLMClient(settings=settings)
    app = create_app(settings=settings, db=db, bus=bus, sectors=sectors, llm=llm)

    with TestClient(app) as client:
        trial_id = _start_trial(client, "BBCA", mode="auto")
        _wait_memo(client, trial_id)
        # only the price analyst's own call during the trial
        assert daily_calls["n"] == 1

        r = client.get(f"/api/trials/{trial_id}/price-series")
        assert r.status_code == 200
        body = r.json()
        assert body["points"] is not None
        assert len(body["points"]) >= 2
        # the endpoint read the DB snapshot — no second Sectors call
        assert daily_calls["n"] == 1
