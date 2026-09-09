"""Thin Sectors REST v2 client with SQLite cache and fixture mode.

Rules enforced here (see sectors-docs-digest.md):
- Authorization header is the RAW API key, NO "Bearer " prefix.
- Company report ALWAYS passes explicit `sections` (1 credit/section).
- Screener ALWAYS uses structured `where=` (1 credit), never `q=` (3 credits).
- HTTP 429 -> exponential backoff + retry.
- Responses cached in SQLite (TTL from settings).
- `SECTORS_MODE=fixture` (default): no HTTP at all — reads backend/app/sectors/fixtures/*.json
  (BBCA, CUAN, GENERIC fallback).
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional

import httpx

from ..config import Settings, get_settings
from ..db import Database

logger = logging.getLogger(__name__)

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

# Date/top-changes params are excluded from the fixture lookup key so fixture
# files do not depend on "today" or the credit-saving param pin. Live cache
# keys keep the full query string.
_FIXTURE_STRIP_PARAMS = {"start", "end", "classifications", "periods"}

# Listed-companies registry (CONTRACT 1.2.0): cached 1 day, refreshed only
# when empty/expired. Live refresh paginates the screener (max 200/page).
LISTED_COMPANIES_CACHE_KEY = "listed_companies"
LISTED_COMPANIES_TTL_DAYS = 1
SCREENER_PAGE_SIZE = 200
SCREENER_MAX_PAGES = 10


class SectorsError(Exception):
    """Non-retryable Sectors failure (maps to trial_failed error_code sectors_error)."""

    def __init__(self, message: str, status: Optional[int] = None):
        super().__init__(message)
        self.status = status


class TickerNotFound(Exception):
    """Ticker not present in the IDX listed-companies cache."""


@dataclass
class SectorsResponse:
    payload: dict[str, Any]
    cache: str  # "hit" | "miss"


@dataclass
class ToolCall:
    tool: str
    endpoint: str
    params_summary: str
    cache: str  # "hit" | "miss"


@dataclass
class GatherResult:
    data: dict[str, Any]
    tool_calls: list[ToolCall] = field(default_factory=list)


class SectorsClient:
    def __init__(
        self,
        settings: Optional[Settings] = None,
        db: Optional[Database] = None,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ):
        self.settings = settings or get_settings()
        self.db = db or Database()
        self._fixtures: dict[str, dict[str, Any]] = self._load_fixtures()
        self._http = httpx.AsyncClient(
            base_url=self.settings.sectors_base_url,
            timeout=30.0,
            transport=transport,
        )

    # ------------------------------------------------------------------ init

    def _load_fixtures(self) -> dict[str, dict[str, Any]]:
        fixtures: dict[str, dict[str, Any]] = {}
        if not FIXTURES_DIR.is_dir():
            return fixtures
        for path in sorted(FIXTURES_DIR.glob("*.json")):
            ticker = path.stem.upper()
            try:
                fixtures[ticker] = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as exc:
                logger.warning("Gagal memuat fixture %s: %s", path.name, exc)
        return fixtures

    # ------------------------------------------------------------- key utils

    @staticmethod
    def _key(name: str, symbol: Optional[str], params: dict[str, Any]) -> str:
        parts = [name]
        if symbol:
            parts.append(symbol)
        if params:
            qs = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
            parts.append(qs)
        return ":".join(parts)

    def _fixture_key(self, name: str, symbol: Optional[str], params: dict[str, Any]) -> str:
        stripped = {k: v for k, v in params.items() if k not in _FIXTURE_STRIP_PARAMS}
        return self._key(name, symbol, stripped)

    # ------------------------------------------------------------ core fetch

    async def _get(
        self,
        name: str,
        symbol: Optional[str],
        params: dict[str, Any],
        tool: str,
    ) -> SectorsResponse:
        """Fetch with cache-first, then fixture or live HTTP."""
        live_key = self._key(name, symbol, params)

        cached = self.db.cache_get(live_key)
        if cached is not None:
            return SectorsResponse(payload=cached, cache="hit")

        if self.settings.sectors_mode == "fixture":
            payload = self._fixture_lookup(name, symbol, params)
            return SectorsResponse(payload=payload, cache="miss")

        payload = await self._http_get(live_key, name, symbol, params)
        self.db.cache_set(live_key, payload, self.settings.cache_ttl_days)
        return SectorsResponse(payload=payload, cache="miss")

    def _fixture_lookup(
        self, name: str, symbol: Optional[str], params: dict[str, Any]
    ) -> dict[str, Any]:
        fkey = self._fixture_key(name, symbol, params)
        ticker = (symbol or "").upper()
        # Screener embeds the symbol in the where clause (symbol param is None),
        # so recover it to look up the ticker-specific fixture table.
        if not ticker:
            where = params.get("where", "")
            match = re.search(r"symbol\s+in\s+\[\s*'([^']+)'\s*\]", where)
            if match:
                ticker = match.group(1).upper()
        table = self._fixtures.get(ticker)
        if table and fkey in table:
            return table[fkey]
        # GENERIC fallback: replace the symbol everywhere in the key
        # (symbol position AND any `where=symbol in ['X']` clause).
        gkey = fkey.replace(ticker, "__generic__") if ticker else fkey
        gtable = self._fixtures.get("GENERIC", {})
        if gkey in gtable:
            return gtable[gkey]
        raise SectorsError(f"Fixture tidak tersedia untuk {fkey}")

    async def _http_get(
        self,
        live_key: str,
        name: str,
        symbol: Optional[str],
        params: dict[str, Any],
    ) -> dict[str, Any]:
        if not self.settings.sectors_api_key:
            raise SectorsError("SECTORS_API_KEY kosong (mode live membutuhkan key)")

        path = self._path_for(name, symbol)
        headers = {"Authorization": self.settings.sectors_api_key}  # raw key, NO Bearer
        max_retries = 4
        for attempt in range(max_retries):
            resp = await self._http.get(path, params=params, headers=headers)
            if resp.status_code == 429:
                wait = 2 ** attempt  # 1, 2, 4, 8 s
                logger.warning("Sectors 429 (rate limit), retry dalam %ss", wait)
                await asyncio.sleep(wait)
                continue
            if resp.status_code == 404:
                raise SectorsError(f"Sectors 404 untuk {path}", status=404)
            if resp.status_code >= 400:
                raise SectorsError(
                    f"Sectors {resp.status_code} untuk {path}: {resp.text[:200]}",
                    status=resp.status_code,
                )
            return resp.json()
        raise SectorsError(f"Sectors 429 setelah {max_retries} percobaan")

    @staticmethod
    @staticmethod
    def _path_for(name: str, symbol: Optional[str]) -> str:
        """Map a logical endpoint name to a REST v2 path.

        Paths verified against docs.sectors.app (llms.txt, api-references v2)
        on 2026-09-09. `index_daily` carries the index slug (ihsg/lq45/idx30)
        as a PATH param, passed through the `symbol` slot.
        """
        if name == "company_report":
            return f"/v2/company/report/{symbol}/"
        if name == "quarterly_financials":
            return f"/v2/financials/quarterly/{symbol}/"
        if name == "revenue_segments":
            return f"/v2/company/get-segments/{symbol}/"
        if name == "daily_transaction":
            return f"/v2/daily/{symbol}/"
        if name == "index_daily":
            return f"/v2/index-daily/{symbol}/"
        if name == "top_movers":
            return "/v2/companies/top-changes/"
        if name == "top_brokers":
            return f"/v2/broker-summary/{symbol}/"
        if name == "foreign_flow":
            return f"/v2/foreign-flow/{symbol}/"
        if name == "filings":
            return "/v2/filings/"
        if name == "suspensions":
            return "/v2/suspensions/"
        if name == "corporate_actions":
            return f"/v2/company/corporate-actions/{symbol}/"
        if name == "screener":
            return "/v2/companies/"
        raise SectorsError(f"Endpoint tidak dikenal: {name}")

    # ------------------------------------------------------- public methods

    async def company_report(self, symbol: str, sections: str) -> SectorsResponse:
        """Company report with EXPLICIT sections (never the 8-section default)."""
        return await self._get(
            "company_report", symbol, {"sections": sections}, tool="company_report"
        )

    async def revenue_segments(self, symbol: str) -> SectorsResponse:
        resp = await self._get("revenue_segments", symbol, {}, tool="revenue_segments")
        return self._normalized(resp, symbol, self._norm_segments)

    async def daily_transaction(self, symbol: str, start: str, end: str) -> SectorsResponse:
        resp = await self._get(
            "daily_transaction", symbol, {"start": start, "end": end}, tool="daily_transaction"
        )
        return self._normalized(resp, symbol, self._norm_daily)

    async def index_daily(self, index: str, start: str, end: str) -> SectorsResponse:
        # Index slug (ihsg/lq45/idx30) travels in the `symbol` slot — it is a
        # PATH param on /v2/index-daily/{index_code}/.
        code = index.strip().lower()
        resp = await self._get(
            "index_daily", code, {"start": start, "end": end}, tool="index_daily"
        )
        return self._normalized(resp, code, self._norm_index)

    async def top_movers(self) -> SectorsResponse:
        # /v2/companies/top-changes/ bills 1 credit per classification×period.
        # Default (2 classifications × 5 periods) = 10 credits — pin both
        # classifications to the 7-day period (2 credits). Both params are
        # array-typed: httpx repeats them as query params.
        resp = await self._get(
            "top_movers",
            None,
            {"classifications": ["top_gainers", "top_losers"], "periods": ["7d"]},
            tool="top_movers",
        )
        return self._normalized(resp, None, self._norm_movers)

    async def top_brokers(self, symbol: str, start: str, end: str) -> SectorsResponse:
        resp = await self._get(
            "top_brokers", symbol, {"start": start, "end": end}, tool="top_brokers"
        )
        return self._normalized(resp, symbol, self._norm_brokers)

    async def foreign_flow(self, symbol: str) -> SectorsResponse:
        resp = await self._get("foreign_flow", symbol, {}, tool="foreign_flow")
        return self._normalized(resp, symbol, self._norm_foreign_flow)

    async def filings(self, symbol: str) -> SectorsResponse:
        resp = await self._get("filings", symbol, {"symbol": symbol}, tool="filings")
        return self._normalized(resp, symbol, self._norm_filings)

    async def suspensions(self, symbol: str) -> SectorsResponse:
        resp = await self._get("suspensions", symbol, {"symbol": symbol}, tool="suspensions")
        return self._normalized(resp, symbol, self._norm_suspensions)

    async def corporate_actions(self, symbol: str) -> SectorsResponse:
        resp = await self._get("corporate_actions", symbol, {}, tool="corporate_actions")
        return self._normalized(resp, symbol, self._norm_actions)

    async def quarterly_financials(self, symbol: str, n_quarters: int = 4) -> SectorsResponse:
        resp = await self._get(
            "quarterly_financials", symbol, {"n_quarters": n_quarters}, tool="quarterly_financials"
        )
        return self._normalized(resp, symbol, self._norm_quarterly)

    # ------------------------------------------------- payload normalization

    @staticmethod
    def _normalized(
        resp: SectorsResponse, symbol: Optional[str], norm: Callable[[dict[str, Any], str], dict[str, Any]]
    ) -> SectorsResponse:
        """Map a live v2 payload into the fixture/evidence shape.

        Every normalizer is shape-detective and idempotent: fixture payloads
        (and already-normalized cache hits) pass through unchanged. The SQLite
        cache stores the RAW live payload; normalization happens per read.
        """
        return SectorsResponse(payload=norm(resp.payload, symbol or ""), cache=resp.cache)

    @staticmethod
    def _norm_quarterly(payload: Any, symbol: str) -> dict[str, Any]:
        # live: bare array [{symbol, financials_sector_metrics, ...}]
        if isinstance(payload, list):
            return {"symbol": symbol, "quarterly": payload}
        return payload

    @staticmethod
    def _norm_segments(payload: Any, symbol: str) -> dict[str, Any]:
        # live: {symbol, financial_year, revenue_breakdown: [...], summary}
        if isinstance(payload, dict) and "segments" not in payload and "revenue_breakdown" in payload:
            return {
                "symbol": payload.get("symbol", symbol),
                "financial_year": payload.get("financial_year"),
                "segments": payload.get("revenue_breakdown", []),
            }
        return payload

    @staticmethod
    def _norm_daily(payload: Any, symbol: str) -> dict[str, Any]:
        # live: bare array [{symbol, date, close, volume, ...}]
        if isinstance(payload, list):
            return {"symbol": symbol, "data": payload}
        return payload

    @staticmethod
    def _norm_index(payload: Any, index_code: str) -> dict[str, Any]:
        # live: bare array [{index_code, date, price}] — evidence reads `close`
        if isinstance(payload, list):
            return {
                "index": index_code,
                "data": [
                    {"date": row.get("date"), "close": row.get("price", row.get("close"))}
                    for row in payload
                ],
            }
        return payload

    @staticmethod
    def _norm_movers(payload: Any, symbol: str) -> dict[str, Any]:
        # live: {top_gainers: {7d: [{symbol, price_change, ...}]}, top_losers: {...}}
        # price_change is a FRACTION (0.232 = +23.2%) — evidence reads change_pct.
        if isinstance(payload, dict) and ("top_gainers" in payload or "top_losers" in payload):
            rows: list[dict[str, Any]] = []
            for cls in ("top_gainers", "top_losers"):
                for period, items in (payload.get(cls) or {}).items():
                    for it in items or []:
                        change = it.get("price_change")
                        rows.append(
                            {
                                "symbol": it.get("symbol", ""),
                                "change_pct": round(float(change) * 100, 2) if change is not None else None,
                                "last_close_price": it.get("last_close_price"),
                                "period": period,
                                "classification": cls,
                            }
                        )
            return {"data": rows}
        return payload

    @staticmethod
    def _norm_brokers(payload: Any, symbol: str) -> dict[str, Any]:
        # live: {symbol, start, end, data: [{date, summary: [{broker_code, bval, sval, ...}]}]}
        # evidence expects {top_buyers: [{broker_code, net_value}], top_sellers: [...]}
        if (
            isinstance(payload, dict)
            and isinstance(payload.get("data"), list)
            and "top_buyers" not in payload
            and payload.get("data")
            and isinstance(payload["data"][0], dict)
            and "summary" in payload["data"][0]
        ):
            agg: dict[str, dict[str, float]] = {}
            for day in payload["data"]:
                for row in day.get("summary", []) or []:
                    code = row.get("broker_code")
                    if not code:
                        continue
                    a = agg.setdefault(code, {"bval": 0.0, "sval": 0.0})
                    a["bval"] += float(row.get("bval") or 0)
                    a["sval"] += float(row.get("sval") or 0)
            buyers = sorted(
                (
                    {"broker_code": c, "net_value": v["bval"] - v["sval"]}
                    for c, v in agg.items()
                    if v["bval"] > v["sval"]
                ),
                key=lambda b: b["net_value"],
                reverse=True,
            )[:5]
            sellers = sorted(
                (
                    {"broker_code": c, "net_value": v["sval"] - v["bval"]}
                    for c, v in agg.items()
                    if v["sval"] > v["bval"]
                ),
                key=lambda s: s["net_value"],
                reverse=True,
            )[:5]
            return {"symbol": payload.get("symbol", symbol), "top_buyers": buyers, "top_sellers": sellers}
        return payload

    @staticmethod
    def _norm_foreign_flow(payload: Any, symbol: str) -> dict[str, Any]:
        # live: {symbol, start, end, data: [{date, net_foreign_inflow}]}
        if isinstance(payload, dict) and "net_foreign_flow" not in payload and "data" in payload:
            total = sum(float(row.get("net_foreign_inflow") or 0) for row in payload.get("data", []) or [])
            return {"symbol": payload.get("symbol", symbol), "net_foreign_flow": total}
        return payload

    @staticmethod
    def _norm_filings(payload: Any, symbol: str) -> dict[str, Any]:
        # live: {results: [{..., transaction_type: buy/sell, timestamp}]} —
        # evidence filters on `type` == buy/sell.
        if isinstance(payload, dict) and "filings" not in payload and "results" in payload:
            rows = []
            for f in payload.get("results", []) or []:
                row = dict(f)
                row["type"] = row.get("transaction_type")
                row["date"] = row.get("timestamp")
                rows.append(row)
            return {"symbol": payload.get("symbol", symbol), "filings": rows}
        return payload

    @staticmethod
    def _norm_suspensions(payload: Any, symbol: str) -> dict[str, Any]:
        # live: {results: [{symbol, suspension_date, reason, pdf_url}]}
        if isinstance(payload, dict) and "suspensions" not in payload and "results" in payload:
            rows = [{"date": r.get("suspension_date"), **r} for r in payload.get("results", []) or []]
            return {"symbol": payload.get("symbol", symbol), "suspensions": rows}
        return payload

    @staticmethod
    def _norm_actions(payload: Any, symbol: str) -> dict[str, Any]:
        # live: {symbol, corporate_actions: {agm: [...], dividend: [...], ...}}
        # evidence expects a flat list with `type` = category key.
        if isinstance(payload, dict) and isinstance(payload.get("corporate_actions"), dict):
            rows = [
                {"type": cat, **(item or {})}
                for cat, items in payload["corporate_actions"].items()
                for item in (items or [])
            ]
            return {"symbol": payload.get("symbol", symbol), "corporate_actions": rows}
        return payload

    async def screener(
        self, where: str, order_by: str = "symbol", limit: int = 50, offset: int = 0
    ) -> SectorsResponse:
        """Structured screener — `where`, never `q=`.

        `offset` is only added to the params when non-zero so existing cache
        keys (and fixture lookups) stay unchanged.
        """
        params: dict[str, Any] = {"where": where, "order_by": order_by, "limit": limit}
        if offset:
            params["offset"] = offset
        return await self._get("screener", None, params, tool="screener")

    # ------------------------------------------------------- ticker registry

    async def validate_ticker(self, symbol: str) -> str:
        """Return company_name if the ticker is known, else raise TickerNotFound.

        Validates against the cached listed-companies table BEFORE any Sectors
        call (a 404 from Sectors would still cost 1 credit).
        """
        sym = self.normalize_symbol(symbol)
        known = self.db.ticker_lookup(sym)
        if known:
            return known

        if self.settings.sectors_mode == "fixture":
            table = self._fixtures.get("GENERIC", {})
            listed = table.get("_listed_companies", [])
            for row in listed:
                if row.get("symbol", "").upper() == sym:
                    self.db.upsert_tickers([(sym, row.get("company_name", sym))])
                    return row.get("company_name", sym)
            raise TickerNotFound(sym)

        # live: targeted screener lookup (1 credit) then cache the result.
        # The API stores symbols with the .JK suffix (e.g. "BBRI.JK"), so
        # match both the normalized and suffixed forms in the same call.
        resp = await self.screener(where=f"symbol in ['{sym}','{sym}.JK']", limit=10)
        results = resp.payload.get("results", [])
        for row in results:
            row_sym = self.normalize_symbol(row.get("symbol", ""))
            if row_sym == sym:
                name = row.get("company_name", sym)
                self.db.upsert_tickers([(sym, name)])
                return name
        raise TickerNotFound(sym)

    async def listed_companies(self) -> list[dict[str, str]]:
        """Full listed-companies registry [{symbol, company_name}].

        Served from a 1-day cache. On a cold cache it is fetched once and
        mirrored into the tickers table, so GET /api/tickers and the
        POST /api/trials validation share the same registry:
          - fixture: GENERIC._listed_companies (0 HTTP)
          - live: paginated screener (1 credit/page, first refresh only)
        """
        cached = self.db.cache_get(LISTED_COMPANIES_CACHE_KEY)
        if cached is not None:
            return cached.get("results", [])

        if self.settings.sectors_mode == "fixture":
            table = self._fixtures.get("GENERIC", {})
            rows = table.get("_listed_companies", [])
        else:
            rows = await self._fetch_all_listed()

        results = [
            {
                "symbol": self.normalize_symbol(row.get("symbol", "")),
                "company_name": row.get("company_name", ""),
            }
            for row in rows
            if row.get("symbol")
        ]
        self.db.cache_set(
            LISTED_COMPANIES_CACHE_KEY, {"results": results}, LISTED_COMPANIES_TTL_DAYS
        )
        self.db.upsert_tickers([(r["symbol"], r["company_name"]) for r in results])
        return results

    async def _fetch_all_listed(self) -> list[dict[str, Any]]:
        """Paginate the screener to fetch the full listed-companies registry."""
        rows: list[dict[str, Any]] = []
        offset = 0
        for _ in range(SCREENER_MAX_PAGES):
            resp = await self.screener(
                where="symbol != ''", order_by="symbol", limit=SCREENER_PAGE_SIZE, offset=offset
            )
            page = resp.payload.get("results", [])
            rows.extend(page)
            total = resp.payload.get("pagination", {}).get("total_count", 0)
            offset += len(page)
            if not page or offset >= total:
                break
        return rows

    @staticmethod
    def normalize_symbol(symbol: str) -> str:
        return symbol.strip().upper().removesuffix(".JK")

    # ------------------------------------------------------------- utilities

    async def current_price(self, symbol: str) -> float:
        """Latest close price — used by the postmortem endpoint."""
        sym = self.normalize_symbol(symbol)
        if self.settings.sectors_mode == "fixture":
            table = self._fixtures.get(sym, self._fixtures.get("GENERIC", {}))
            price = table.get("_current_price")
            if price is not None:
                return float(price)
            raise SectorsError(f"Fixture _current_price tidak tersedia untuk {sym}")
        resp = await self.company_report(sym, "valuation")
        return float(resp.payload.get("valuation", {}).get("close_price", 0.0))

    async def aclose(self) -> None:
        await self._http.aclose()
