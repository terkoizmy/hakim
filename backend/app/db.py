"""SQLite persistence: trials, memos, SSE events, Sectors cache, ticker list.

One connection is opened per operation (cheap for SQLite, WAL mode) so the
layer is safe to call from async code and from TestClient threads without
sharing a connection.
"""

from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Optional

from .config import get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS trials (
    trial_id      TEXT PRIMARY KEY,
    ticker        TEXT NOT NULL,
    company_name  TEXT,
    mode          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'running',
    created_at    TEXT NOT NULL,
    finished_at   TEXT,
    error_code    TEXT,
    error_message TEXT,
    price_at_trial REAL
);

CREATE TABLE IF NOT EXISTS memos (
    memo_id       TEXT PRIMARY KEY,
    trial_id      TEXT NOT NULL,
    ticker        TEXT NOT NULL,
    company_name  TEXT,
    memo_json     TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    price_at_trial REAL
);

CREATE TABLE IF NOT EXISTS events (
    trial_id   TEXT NOT NULL,
    seq        INTEGER NOT NULL,
    event_json TEXT NOT NULL,
    PRIMARY KEY (trial_id, seq)
);

CREATE TABLE IF NOT EXISTS cache (
    cache_key  TEXT PRIMARY KEY,
    payload    TEXT NOT NULL,
    created_at REAL NOT NULL,
    expires_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS tickers (
    symbol       TEXT PRIMARY KEY,
    company_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_trial ON events(trial_id);
CREATE INDEX IF NOT EXISTS idx_memos_created ON memos(created_at);
"""


class Database:
    def __init__(self, path: Optional[str] = None):
        self.path = str(path or get_settings().db_path)
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    # -- low level ----------------------------------------------------------

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_schema(self) -> None:
        conn = self._connect()
        try:
            conn.executescript(SCHEMA)
            conn.commit()
        finally:
            conn.close()

    # -- trials -------------------------------------------------------------

    def create_trial(
        self,
        trial_id: str,
        ticker: str,
        company_name: str,
        mode: str,
        created_at: str,
    ) -> None:
        conn = self._connect()
        try:
            conn.execute(
                "INSERT INTO trials (trial_id, ticker, company_name, mode, status, created_at) "
                "VALUES (?, ?, ?, ?, 'running', ?)",
                (trial_id, ticker, company_name, mode, created_at),
            )
            conn.commit()
        finally:
            conn.close()

    def get_trial(self, trial_id: str) -> Optional[dict[str, Any]]:
        conn = self._connect()
        try:
            row = conn.execute(
                "SELECT * FROM trials WHERE trial_id = ?", (trial_id,)
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def update_trial_status(
        self,
        trial_id: str,
        status: str,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        price_at_trial: Optional[float] = None,
        finished_at: Optional[str] = None,
    ) -> None:
        conn = self._connect()
        try:
            conn.execute(
                "UPDATE trials SET status = ?, error_code = ?, error_message = ?, "
                "price_at_trial = COALESCE(?, price_at_trial), "
                "finished_at = COALESCE(?, finished_at) WHERE trial_id = ?",
                (status, error_code, error_message, price_at_trial, finished_at, trial_id),
            )
            conn.commit()
        finally:
            conn.close()

    # -- memos --------------------------------------------------------------

    def save_memo(self, memo: dict[str, Any], price_at_trial: Optional[float] = None) -> None:
        conn = self._connect()
        try:
            conn.execute(
                "INSERT INTO memos (memo_id, trial_id, ticker, company_name, memo_json, created_at, price_at_trial) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    memo["memo_id"],
                    memo["trial_id"],
                    memo["ticker"],
                    memo["company_name"],
                    json.dumps(memo, ensure_ascii=False),
                    memo["created_at"],
                    price_at_trial,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def get_memo_by_trial(self, trial_id: str) -> Optional[dict[str, Any]]:
        conn = self._connect()
        try:
            row = conn.execute(
                "SELECT * FROM memos WHERE trial_id = ?", (trial_id,)
            ).fetchone()
            return self._row_to_memo(row)
        finally:
            conn.close()

    def get_memo(self, memo_id: str) -> Optional[dict[str, Any]]:
        conn = self._connect()
        try:
            row = conn.execute(
                "SELECT * FROM memos WHERE memo_id = ?", (memo_id,)
            ).fetchone()
            return self._row_to_memo(row)
        finally:
            conn.close()

    @staticmethod
    def _row_to_memo(row: Optional[sqlite3.Row]) -> Optional[dict[str, Any]]:
        if row is None:
            return None
        memo = json.loads(row["memo_json"])
        memo["_price_at_trial"] = row["price_at_trial"]
        return memo

    def list_journal(self, limit: int = 20, offset: int = 0) -> tuple[list[dict[str, Any]], int]:
        conn = self._connect()
        try:
            total = conn.execute("SELECT COUNT(*) AS c FROM memos").fetchone()["c"]
            rows = conn.execute(
                "SELECT memo_id, ticker, company_name, memo_json, created_at, price_at_trial "
                "FROM memos ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
            items = []
            for row in rows:
                memo = json.loads(row["memo_json"])
                items.append(
                    {
                        "memo_id": row["memo_id"],
                        "ticker": row["ticker"],
                        "company_name": row["company_name"],
                        "verdict_category": memo["verdict"]["category"],
                        "info_richness": memo["info_richness"],
                        "price_at_trial": row["price_at_trial"],
                        "created_at": row["created_at"],
                    }
                )
            return items, total
        finally:
            conn.close()

    # -- SSE events ---------------------------------------------------------

    def append_event(self, trial_id: str, event_type: str, payload: dict[str, Any], ts: str) -> int:
        """Persist an event and return its monotonic per-trial seq."""
        conn = self._connect()
        try:
            row = conn.execute(
                "SELECT MAX(seq) AS m FROM events WHERE trial_id = ?", (trial_id,)
            ).fetchone()
            seq = (row["m"] or 0) + 1
            conn.execute(
                "INSERT INTO events (trial_id, seq, event_json) VALUES (?, ?, ?)",
                (trial_id, seq, json.dumps({"type": event_type, "payload": payload, "ts": ts}, ensure_ascii=False)),
            )
            conn.commit()
            return seq
        finally:
            conn.close()

    def get_events_after(self, trial_id: str, last_seq: int) -> list[dict[str, Any]]:
        conn = self._connect()
        try:
            rows = conn.execute(
                "SELECT seq, event_json FROM events WHERE trial_id = ? AND seq > ? ORDER BY seq",
                (trial_id, last_seq),
            ).fetchall()
            out = []
            for row in rows:
                ev = json.loads(row["event_json"])
                out.append(
                    {
                        "type": ev["type"],
                        "trial_id": trial_id,
                        "seq": row["seq"],
                        "ts": ev["ts"],
                        "payload": ev["payload"],
                    }
                )
            return out
        finally:
            conn.close()

    # -- Sectors cache ------------------------------------------------------

    def cache_get(self, key: str) -> Optional[dict[str, Any]]:
        conn = self._connect()
        try:
            row = conn.execute(
                "SELECT payload, expires_at FROM cache WHERE cache_key = ?", (key,)
            ).fetchone()
            if row is None:
                return None
            if row["expires_at"] < time.time():
                return None
            return json.loads(row["payload"])
        finally:
            conn.close()

    def cache_set(self, key: str, payload: dict[str, Any], ttl_days: int) -> None:
        conn = self._connect()
        try:
            now = time.time()
            conn.execute(
                "INSERT OR REPLACE INTO cache (cache_key, payload, created_at, expires_at) VALUES (?, ?, ?, ?)",
                (key, json.dumps(payload, ensure_ascii=False), now, now + ttl_days * 86400),
            )
            conn.commit()
        finally:
            conn.close()

    # -- ticker list --------------------------------------------------------

    def ticker_lookup(self, symbol: str) -> Optional[str]:
        """Return company_name for a known symbol, else None."""
        conn = self._connect()
        try:
            row = conn.execute(
                "SELECT company_name FROM tickers WHERE symbol = ?", (symbol,)
            ).fetchone()
            return row["company_name"] if row else None
        finally:
            conn.close()

    def upsert_tickers(self, rows: list[tuple[str, str]]) -> None:
        conn = self._connect()
        try:
            conn.executemany(
                "INSERT OR REPLACE INTO tickers (symbol, company_name) VALUES (?, ?)", rows
            )
            conn.commit()
        finally:
            conn.close()
