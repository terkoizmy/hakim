"""End-to-end API tests via TestClient (CHECKPOINT 2).

Covers: health, invalid ticker 422, full trial flow (memo + journal +
postmortem), SSE replay from Last-Event-ID, and the full SSE event sequence.
"""

from __future__ import annotations

import json
import time

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import Database
from app.eventbus import EventBus
from app.llm import LLMClient
from app.main import create_app
from app.sectors import SectorsClient


@pytest.fixture
def app_env(tmp_path):
    settings = Settings(
        sectors_mode="fixture",
        db_path=str(tmp_path / "test.db"),
        # Hermetic: never inherit OLLAMA_API_KEY from backend/.env, or the
        # trial would call the real LLM and blow the _wait_memo timeout.
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


def _start_trial(client, ticker: str) -> str:
    r = client.post("/api/trials", json={"ticker": ticker, "mode": "fixture"})
    assert r.status_code == 202
    return r.json()["trial_id"]


def _parse_sse(resp) -> list[dict]:
    events: list[dict] = []
    data_lines: list[str] = []
    for raw in resp.iter_lines():
        if raw.startswith("data:"):
            data_lines.append(raw[5:].strip())
        elif raw == "" and data_lines:
            events.append(json.loads("\n".join(data_lines)))
            data_lines = []
    if data_lines:
        events.append(json.loads("\n".join(data_lines)))
    return events


# ---------------------------------------------------------------------------
# Health & validation
# ---------------------------------------------------------------------------


def test_health(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        r = client.get("/api/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["sectors_mode"] == "fixture"
        assert body["version"]


def test_invalid_ticker_422(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        r = client.post("/api/trials", json={"ticker": "NOTATICKER", "mode": "fixture"})
        assert r.status_code == 422
        assert "Ticker tidak dikenal" in r.json()["detail"]


# ---------------------------------------------------------------------------
# Full flow
# ---------------------------------------------------------------------------


def test_full_flow_memo_journal_postmortem(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        trial_id = _start_trial(client, "BBCA")

        memo = _wait_memo(client, trial_id)
        assert memo["trial_id"] == trial_id
        assert memo["ticker"] == "BBCA"
        assert memo["schema_version"] == "1.0.0"
        assert memo["data_mode"] == "fixture"
        assert memo["key_facts"]
        assert memo["verdict"]["category"] in (
            "layak_diteliti_lanjut",
            "perlu_kehati_hatian",
            "red_flag_berat",
        )
        # self-contained citations reference the memo's own key_facts
        fact_ids = {f["fact_id"] for f in memo["key_facts"]}
        assert fact_ids
        for c in memo["citations"]:
            assert c["cite_id"] in fact_ids

        # audit table = REAL Sectors calls recorded during the trial (not the
        # judge's prose source_endpoint strings)
        assert memo["tool_calls"], "tool_calls audit harus terisi"
        for tc in memo["tool_calls"]:
            assert tc["endpoint"].startswith("/v2/")
            assert tc["agent_id"]
            assert tc["cache"] in ("hit", "miss")

        # journal
        jr = client.get("/api/journal")
        assert jr.status_code == 200
        jbody = jr.json()
        assert jbody["total"] >= 1
        assert any(item["memo_id"] == memo["memo_id"] for item in jbody["items"])
        # journal items carry trial_id so the FE can call the price-series
        # endpoint (0 credits) without the postmortem
        item = next(i for i in jbody["items"] if i["memo_id"] == memo["memo_id"])
        assert item["trial_id"] == trial_id

        # postmortem
        pr = client.get(f"/api/journal/{memo['memo_id']}/postmortem")
        assert pr.status_code == 200
        pbody = pr.json()
        assert pbody["memo"]["memo_id"] == memo["memo_id"]
        assert pbody["price_at_trial"] is not None
        assert pbody["price_now"] is not None
        assert isinstance(pbody["change_pct"], float)
        assert isinstance(pbody["days_elapsed"], int)


# ---------------------------------------------------------------------------
# SSE
# ---------------------------------------------------------------------------


def test_sse_replay_full_sequence(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        trial_id = _start_trial(client, "CUAN")
        _wait_memo(client, trial_id)

        with client.stream(
            "GET", f"/api/trials/{trial_id}/events", headers={"Last-Event-ID": "0"}
        ) as resp:
            assert resp.status_code == 200
            events = _parse_sse(resp)

        types = [e["type"] for e in events]
        assert types[0] == "trial_started"
        assert "memo_ready" in types
        assert "trial_failed" not in types
        assert types.count("agent_started") == 5
        assert types.count("agent_finished") == 5
        assert types.count("debate_utterance") == 4
        assert types.count("phase_started") == 4  # evidence + debate r1 + r2 + verdict
        assert events[-1]["type"] == "memo_ready"

        # seq strictly increasing
        seqs = [e["seq"] for e in events if e["seq"] > 0]
        assert seqs == sorted(seqs)
        assert len(seqs) == len(set(seqs))

        # every envelope carries the contract fields
        for ev in events:
            assert set(ev) >= {"type", "trial_id", "seq", "ts", "payload"}
            assert ev["trial_id"] == trial_id


def test_sse_replay_last_event_id(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        trial_id = _start_trial(client, "BBCA")
        _wait_memo(client, trial_id)

        with client.stream(
            "GET", f"/api/trials/{trial_id}/events", headers={"Last-Event-ID": "0"}
        ) as resp:
            all_events = _parse_sse(resp)
        assert all_events

        mid_seq = all_events[len(all_events) // 2]["seq"]
        with client.stream(
            "GET", f"/api/trials/{trial_id}/events", headers={"Last-Event-ID": str(mid_seq)}
        ) as resp:
            tail_events = _parse_sse(resp)

        assert tail_events
        assert all(e["seq"] > mid_seq for e in tail_events)
        assert tail_events[-1]["type"] == "memo_ready"


def test_sse_404_for_unknown_trial(app_env):
    app, _ = app_env
    with TestClient(app) as client:
        r = client.get("/api/trials/tr_nonexistent/events")
        assert r.status_code == 404


def test_retrial_cooldown_409(app_env):
    """Emiten yang sudah punya memo < 7 hari tidak boleh diadili ulang (CONTRACT 1.2.2)."""
    app, _ = app_env
    with TestClient(app) as client:
        trial_id = _start_trial(client, "BBCA")
        _wait_memo(client, trial_id)

        r = client.post("/api/trials", json={"ticker": "BBCA", "mode": "fixture"})
        assert r.status_code == 409
        assert "sudah diadili" in r.json()["detail"]

        # emiten lain tetap boleh
        r2 = client.post("/api/trials", json={"ticker": "CUAN", "mode": "fixture"})
        assert r2.status_code == 202
