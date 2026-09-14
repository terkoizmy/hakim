"""Tests for the permanent Sectors archive (ROADMAP poin 1).

The policy decided with the project owner: every payload that cost Sectors
credits is archived permanently (append-once), because the `cache` layer
THROWS ITS CONTENTS AWAY when the 7-day TTL expires — data already paid for
was being lost. The archive also protects the demo: the paid
`company_report:BBCA:sections=…` payload outlives its cache entry.

Contract points under test:

- Write touches exactly ONE place (`SectorsClient._http_get`), so every
  credit-hitting call is archived, including the paginated registry.
- Fixture mode and cache hits never touch the archive → 0 effect on tests.
- A cache miss in live mode is served from the archive when possible, with
  the payload's ORIGINAL retrieval date (honest provenance) and no HTTP call
  (0 credits).
- `archive_fallback=False` restores the old pay-again behaviour.
- Append-once: re-fetching the same key does not overwrite the first payload.

Hermetic: `ollama_api_key=""` (backend/.env holds a real key otherwise) and
every HTTP call goes through `httpx.MockTransport` — no network, 0 credits.
"""

from __future__ import annotations

import asyncio
import json
import time

import httpx
import pytest

from app.config import Settings
from app.db import Database
from app.sectors import SectorsClient
from app.sectors.client import _credits_for, _params_summary

REPORT = {"symbol": "TEST", "financials": {"revenue": 1000}}
SCREENER = {"results": [], "pagination": {"total_count": 0}}
# Fixture mode cocokkan kunci SECARA PERSIS (cabang GENERIC tidak longgar),
# jadi tes mode fixture harus memakai kombinasi sections yang benar-benar ada
# di snapshot — sama seperti yang diminta jalur sidang.
FIXTURE_SYMBOL = "BBCA"
FIXTURE_SECTIONS = "financials,valuation,peers,management,ownership,dividend"


def _settings(tmp_path, mode: str = "live", **overrides) -> Settings:
    return Settings(
        sectors_mode=mode,
        db_path=str(tmp_path / "test.db"),
        sectors_api_key="kunci-uji",
        ollama_api_key="",  # hermetic: jangan mewarisi kunci asli dari .env
        **overrides,
    )


def _client(settings, handler) -> SectorsClient:
    return SectorsClient(
        settings=settings, db=Database(settings.db_path), transport=httpx.MockTransport(handler)
    )


def _counting_handler(payload: dict):
    """MockTransport yang menghitung panggilan, supaya kredit bisa dibuktikan 0."""
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json=payload)

    return handler, calls


# ------------------------------------------------------------------ write path


def test_live_response_is_archived(tmp_path):
    settings = _settings(tmp_path)
    handler, calls = _counting_handler(REPORT)
    client = _client(settings, handler)

    asyncio.run(client.company_report("TEST", "financials,valuation"))

    assert len(calls) == 1, "harus tepat satu panggilan live"
    rows, total = client.db.archive_list()
    assert total == 1
    assert rows[0]["endpoint"] == "company_report"
    assert rows[0]["symbol"] == "TEST"
    assert rows[0]["params"] == "sections=financials,valuation"
    # company report = 1 kredit per seksi.
    assert rows[0]["credits"] == 2
    assert client.db.archive_credits() == 2


def test_cache_hit_is_not_archived_again(tmp_path):
    """Panggilan kedua = cache hit → 0 kredit, dan arsip tidak bertambah."""
    settings = _settings(tmp_path)
    handler, calls = _counting_handler(REPORT)
    client = _client(settings, handler)

    asyncio.run(client.company_report("TEST", "financials"))
    asyncio.run(client.company_report("TEST", "financials"))

    assert len(calls) == 1
    _, total = client.db.archive_list()
    assert total == 1
    assert client.db.archive_credits() == 1


def test_archive_is_append_once(tmp_path):
    """Kunci arsip = kunci cache: payload PERTAMA yang menang, tidak ditimpa.

    Arsip adalah catatan historis, bukan cache kedua — refresh data yang sudah
    pernah dibayar tidak boleh menulis ulang isi arsip.
    """
    settings = _settings(tmp_path)
    client = _client(settings, _counting_handler(REPORT)[0])
    asyncio.run(client.company_report("TEST", "financials"))

    client.db.archive_put(
        "company_report:TEST:sections=financials",
        "company_report",
        "TEST",
        "sections=financials",
        {"symbol": "TEST", "financials": {"revenue": 9999}},
    )

    stored, _ = client.db.archive_get("company_report:TEST:sections=financials")
    assert stored["financials"]["revenue"] == 1000, "arsip tertimpa payload baru"


def test_fixture_mode_never_touches_the_archive(tmp_path):
    """Fixture mode = 0 HTTP dan 0 arsip (perilaku tes lain tidak berubah)."""
    settings = _settings(tmp_path, mode="fixture")
    handler, calls = _counting_handler(REPORT)
    client = _client(settings, handler)

    asyncio.run(client.company_report(FIXTURE_SYMBOL, FIXTURE_SECTIONS))

    assert calls == []
    assert client.db.archive_list()[1] == 0


# ------------------------------------------------------------------- read path


def test_expired_cache_is_served_from_the_archive_without_paying(tmp_path):
    """Inti kebijakan: TTL habis ≠ bayar ulang. Arsip menjawab, kredit 0.

    Tanggal yang dilaporkan harus tanggal ambil ASLI, bukan tanggal hari ini.
    """
    settings = _settings(tmp_path)
    handler, calls = _counting_handler(REPORT)
    client = _client(settings, handler)

    # Payload lama yang seolah diambil 20 hari lalu, lalu cache-nya dibuang
    # (TTL 7 hari) — persis situasi yang menghapus data berbayar sebelum ini.
    old = time.time() - 20 * 86400
    client.db.archive_put(
        "company_report:TEST:sections=financials", "company_report", "TEST",
        "sections=financials", REPORT, credits=1,
    )
    conn = client.db._connect()
    conn.execute("UPDATE api_archive SET fetched_at = ?", (old,))
    conn.commit()
    conn.close()

    resp = asyncio.run(client.company_report("TEST", "financials"))

    assert calls == [], "arsip terisi → tidak boleh ada panggilan berbayar"
    assert resp.payload["financials"]["revenue"] == 1000
    assert resp.cache == "hit"
    assert resp.fetched_at == time.strftime("%Y-%m-%d", time.localtime(old))
    assert resp.fetched_at != time.strftime("%Y-%m-%d", time.localtime())


def test_archive_fallback_can_be_switched_off(tmp_path):
    """Saklar darurat: fallback mati → perilaku lama (bayar lagi)."""
    settings = _settings(tmp_path, archive_fallback=False)
    handler, calls = _counting_handler(REPORT)
    client = _client(settings, handler)
    client.db.archive_put(
        "company_report:TEST:sections=financials", "company_report", "TEST",
        "sections=financials", REPORT, credits=1,
    )

    resp = asyncio.run(client.company_report("TEST", "financials"))

    assert len(calls) == 1, "fallback mati harus tetap memanggil Sectors"
    assert resp.cache == "miss"


def test_expired_cache_with_empty_archive_still_pays(tmp_path):
    settings = _settings(tmp_path)
    handler, calls = _counting_handler(REPORT)
    client = _client(settings, handler)

    resp = asyncio.run(client.company_report("TEST", "financials"))

    assert len(calls) == 1
    assert resp.cache == "miss"
    assert client.db.archive_list()[1] == 1, "payload baru harus ikut terarsip"


def test_archive_key_is_param_exact(tmp_path):
    """Arsip tidak boleh menjawab permintaan yang berbeda params-nya.

    Jaminan keamanan fallback: kunci memuat params, jadi payload arsip selalu
    untuk permintaan yang PERSIS sama (mis. rentang tanggal daily_transaction).
    """
    settings = _settings(tmp_path)
    handler, calls = _counting_handler(REPORT)
    client = _client(settings, handler)
    client.db.archive_put(
        "company_report:TEST:sections=ownership", "company_report", "TEST",
        "sections=ownership", REPORT, credits=1,
    )

    asyncio.run(client.company_report("TEST", "financials"))  # seksi berbeda

    assert len(calls) == 1, "params berbeda → arsip tidak boleh dipakai"


def test_fixture_mode_ignores_a_poisoned_archive(tmp_path):
    """Arsip berisi data live tidak boleh bocor ke mode fixture."""
    settings = _settings(tmp_path, mode="fixture")
    handler, calls = _counting_handler(REPORT)
    client = _client(settings, handler)
    key = f"company_report:{FIXTURE_SYMBOL}:sections={FIXTURE_SECTIONS}"
    client.db.archive_put(
        key, "company_report", FIXTURE_SYMBOL, f"sections={FIXTURE_SECTIONS}",
        {"symbol": FIXTURE_SYMBOL, "financials": {"revenue": 4242}}, credits=6,
    )

    resp = asyncio.run(client.company_report(FIXTURE_SYMBOL, FIXTURE_SECTIONS))

    assert calls == []
    assert resp.payload.get("financials", {}).get("revenue") != 4242
    # Fixture dibaca dari berkas, bukan dari arsip — tanggalnya hari ini.
    assert resp.cache == "miss"


# --------------------------------------------------------------- credit accounting


@pytest.mark.parametrize(
    "name,params,expected",
    [
        ("company_report", {"sections": "financials"}, 1),
        ("company_report", {"sections": "financials,valuation"}, 2),
        ("company_report", {"sections": "financials, valuation ,ownership"}, 3),
        ("company_report", {"sections": ""}, 1),
        ("top_movers", {"classifications": ["top_gainers", "top_losers"], "periods": ["7d"]}, 2),
        (
            "top_movers",
            {"classifications": ["a", "b"], "periods": ["7d", "30d"]},
            4,
        ),
        ("screener", {"where": "sector != ''"}, 1),
        ("daily_transaction", {"start": "2026-01-01", "end": "2026-02-01"}, 1),
    ],
)
def test_credits_for_matches_the_documented_cost_rules(name, params, expected):
    assert _credits_for(name, params) == expected


@pytest.mark.parametrize(
    "params,expected",
    [
        ({}, ""),
        ({"sections": "financials"}, "sections=financials"),
        ({"start": "a", "end": "b"}, "end=b&start=a"),  # terurut → stabil
        ({"classifications": ["x", "y"], "periods": ["7d"]}, "classifications=x,y&periods=7d"),
    ],
)
def test_params_summary_is_compact_and_stable(params, expected):
    assert _params_summary(params) == expected


# --------------------------------------------------------------------- db layer


def test_archive_list_filters_and_paginates(tmp_path):
    db = Database(str(tmp_path / "test.db"))
    for i in range(5):
        db.archive_put(
            f"daily_transaction:BBCA:start=2026-01-0{i + 1}",
            "daily_transaction",
            "BBCA",
            f"start=2026-01-0{i + 1}",
            {"i": i},
        )
    db.archive_put("company_report:CUAN:sections=financials", "company_report", "CUAN", "", {})

    rows, total = db.archive_list(symbol="BBCA")
    assert total == 5
    assert all(r["symbol"] == "BBCA" for r in rows)

    rows, total = db.archive_list(endpoint="company_report")
    assert total == 1 and rows[0]["symbol"] == "CUAN"

    page1, _ = db.archive_list(symbol="BBCA", limit=2, offset=0)
    page2, _ = db.archive_list(symbol="BBCA", limit=2, offset=2)
    assert len(page1) == 2 and len(page2) == 2
    assert {r["cache_key"] for r in page1}.isdisjoint({r["cache_key"] for r in page2})

    # credits_total sengaja lintas-seluruh-arsip, bukan per halaman.
    assert db.archive_credits() == 6


def test_archive_get_returns_none_for_unknown_key(tmp_path):
    db = Database(str(tmp_path / "test.db"))
    assert db.archive_get("tidak:ada") is None


def test_archive_survives_cache_expiry(tmp_path):
    """Cacat yang diperbaiki: cache membuang isinya saat TTL habis, arsip tidak."""
    settings = _settings(tmp_path)
    db = Database(settings.db_path)
    client = SectorsClient(settings=settings, db=db, transport=httpx.MockTransport(lambda r: httpx.Response(200, json=REPORT)))

    asyncio.run(client.company_report("TEST", "financials"))

    # Paksa entri cache kedaluwarsa (TTL 7 hari lewat).
    conn = db._connect()
    conn.execute("UPDATE cache SET expires_at = ?", (time.time() - 1,))
    conn.commit()
    conn.close()

    assert db.cache_get("company_report:TEST:sections=financials") is None, "cache harus kosong"
    stored, _ = db.archive_get("company_report:TEST:sections=financials")
    assert stored == REPORT, "payload berbayar harus selamat di arsip"


def test_archive_payload_is_readable_json(tmp_path):
    """Payload disimpan apa adanya — bukan string ter-escape (bisa dibaca ulang)."""
    db = Database(str(tmp_path / "test.db"))
    db.archive_put("k", "company_report", "TEST", "", REPORT)
    conn = db._connect()
    raw = conn.execute("SELECT payload FROM api_archive WHERE cache_key = 'k'").fetchone()["payload"]
    conn.close()
    assert json.loads(raw) == REPORT


def test_archive_put_honours_an_explicit_fetched_at(tmp_path):
    """Backfill menyelamatkan payload LAMA: tanggal ambil aslinya harus dipertahankan.

    Kalau `fetched_at` diabaikan, arsip akan mengklaim data 9 Sep diambil hari ini
    — provenance yang berbohong, persis yang dilarang §3.3.
    """
    db = Database(str(tmp_path / "test.db"))
    old = time.time() - 30 * 86400
    db.archive_put("k", "company_report", "TEST", "", REPORT, credits=3, fetched_at=old)

    payload, fetched_at = db.archive_get("k")
    assert payload == REPORT
    assert fetched_at == old
    rows, _ = db.archive_list()
    assert rows[0]["credits"] == 3
    # Tanpa argumen, perilaku lama (sekarang) tetap dipertahankan.
    db.archive_put("k2", "company_report", "TEST", "sections=x", REPORT)
    assert db.archive_get("k2")[1] >= time.time() - 5
