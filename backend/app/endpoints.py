"""FastAPI REST endpoints + SSE stream (CONTRACT §3).

The router is built with injected dependencies so tests can pass a temp DB and
a mock Sectors transport.
"""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request
from sse_starlette.sse import EventSourceResponse, ServerSentEvent

from .config import Settings
from .db import Database
from .eventbus import EventBus, now_iso
from .llm import LLMClient
from .models import (
    BoardChatRequest,
    BoardChatResponse,
    BoardResponse,
    CreateTrialRequest,
    CreateTrialResponse,
    HealthResponse,
    JournalResponse,
    PostmortemResponse,
    PriceSeriesResponse,
    SectorListResponse,
    TickerListResponse,
)
from .board import build_board_for_ticker
from .orchestrator import TERMINAL_EVENTS, TrialContext, TrialFailed, run_trial
from .price_series import build_price_series
from .sectors import SectorsClient, TickerNotFound

logger = logging.getLogger(__name__)

HEARTBEAT_INTERVAL = 15.0

# Cooldown re-sidang untuk emiten yang sama (CONTRACT 1.2.2).
RETRIAL_COOLDOWN = timedelta(days=7)


def build_router(
    settings: Settings,
    db: Database,
    bus: EventBus,
    sectors: SectorsClient,
    llm: LLMClient,
) -> APIRouter:
    router = APIRouter()

    # ------------------------------------------------------------------ trials

    @router.post("/api/trials", status_code=202, response_model=CreateTrialResponse)
    async def create_trial(req: CreateTrialRequest) -> CreateTrialResponse:
        ticker = sectors.normalize_symbol(req.ticker)
        data_mode = "fixture" if req.mode == "fixture" else settings.sectors_mode
        try:
            company_name = await sectors.validate_ticker(ticker)
        except TickerNotFound:
            raise HTTPException(status_code=422, detail="Ticker tidak dikenal")

        # Cooldown re-sidang: memo terakhir untuk emiten yang sama mengikat 7 hari.
        # Memo lama tetap bisa dibuka kapan pun dari jurnal — hanya sidang BARU
        # yang ditolak, supaya data arsip tidak dobel dan kredit Sectors tidak
        # terbuang untuk emiten yang putusannya belum kedaluwarsa.
        last = db.last_memo_for_ticker(ticker)
        if last:
            try:
                last_dt = datetime.fromisoformat(last["created_at"].replace("Z", "+00:00"))
            except ValueError:
                last_dt = None
            if last_dt is not None:
                elapsed = datetime.now(timezone.utc) - last_dt
                if elapsed < RETRIAL_COOLDOWN:
                    next_allowed = (last_dt + RETRIAL_COOLDOWN).strftime("%d %b %Y")
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            f"{ticker} sudah diadili pada {last_dt.strftime('%d %b %Y')} — "
                            f"memorandumnya masih berlaku di jurnal. Sidang ulang emiten yang "
                            f"sama dapat dilakukan setelah {next_allowed}."
                        ),
                    )

        trial_id = "tr_" + secrets.token_hex(6)
        created_at = now_iso()
        db.create_trial(trial_id, ticker, company_name, data_mode, created_at)
        asyncio.create_task(
            _run_trial_task(trial_id, ticker, company_name, data_mode)
        )
        return CreateTrialResponse(
            trial_id=trial_id,
            ticker=ticker,
            company_name=company_name,
            mode=data_mode,
            created_at=created_at,
        )

    # ------------------------------------------------------------------- SSE

    @router.get("/api/trials/{trial_id}/events")
    async def trial_events(trial_id: str, request: Request) -> EventSourceResponse:
        if db.get_trial(trial_id) is None:
            raise HTTPException(status_code=404, detail="Trial tidak ditemukan")
        return EventSourceResponse(_event_generator(trial_id, request))

    # ------------------------------------------------------------------- memo

    @router.get("/api/trials/{trial_id}/memo")
    async def trial_memo(trial_id: str) -> dict[str, Any]:
        memo = db.get_memo_by_trial(trial_id)
        if memo is None:
            raise HTTPException(status_code=404, detail="Memo belum tersedia")
        memo.pop("_price_at_trial", None)
        return memo

    # ---------------------------------------------------------------- journal

    @router.get("/api/journal", response_model=JournalResponse)
    async def journal(limit: int = 20, offset: int = 0) -> JournalResponse:
        items, total = db.list_journal(limit=min(limit, 100), offset=offset)
        return JournalResponse(items=items, total=total)

    @router.get("/api/journal/{memo_id}/postmortem", response_model=PostmortemResponse)
    async def postmortem(memo_id: str) -> PostmortemResponse:
        memo = db.get_memo(memo_id)
        if memo is None:
            raise HTTPException(status_code=404, detail="Memo tidak ditemukan")
        price_at_trial = memo.pop("_price_at_trial", None)
        price_now = await sectors.current_price(memo["ticker"])
        if price_at_trial:
            change_pct = round((price_now - price_at_trial) / price_at_trial * 100, 2)
        else:
            price_at_trial, change_pct = price_now, 0.0
        days_elapsed = (date.today() - date.fromisoformat(memo["created_at"][:10])).days
        return PostmortemResponse(
            memo=memo,
            price_at_trial=price_at_trial,
            price_now=price_now,
            change_pct=change_pct,
            days_elapsed=days_elapsed,
            price_series=await _price_series_for(memo["trial_id"], memo["ticker"]),
        )

    # ----------------------------------------------------------- price series

    @router.get("/api/trials/{trial_id}/price-series", response_model=PriceSeriesResponse)
    async def price_series(trial_id: str) -> PriceSeriesResponse:
        trial = db.get_trial(trial_id)
        if trial is None:
            raise HTTPException(status_code=404, detail="Trial tidak ditemukan")
        return PriceSeriesResponse(
            trial_id=trial_id,
            ticker=trial["ticker"],
            points=await _price_series_for(trial_id, trial["ticker"]),
        )

    async def _price_series_for(trial_id: str, ticker: str) -> Optional[list[dict[str, Any]]]:
        """Return the trial's price points (ascending, 2-52) or None.

        Primary source is the snapshot saved at trial completion (0 credits).
        Fallback for pre-1.1.0 trials reuses the Sectors daily_transaction cache
        (0 credits while the TTL is alive; 1 credit + warning when expired).
        """
        points = db.get_price_series(trial_id)
        if points is None:
            points = await _fetch_price_series(ticker)
        if not points or len(points) < 2:
            return None
        return points

    async def _fetch_price_series(ticker: str) -> Optional[list[dict[str, Any]]]:
        """Fallback fetch via the same endpoint the price analyst uses."""
        end = date.today().isoformat()
        start = (date.today() - timedelta(days=90)).isoformat()
        try:
            resp = await sectors.daily_transaction(ticker, start, end)
            if resp.cache == "miss":
                logger.warning(
                    "price-series fallback: cache daily_transaction expired untuk %s (1 kredit)", ticker
                )
            return build_price_series(resp.payload)
        except Exception as exc:
            logger.warning("price-series fallback gagal untuk %s: %s", ticker, exc)
            return None

    # ---------------------------------------------------------------- tickers

    @router.get("/api/tickers", response_model=TickerListResponse)
    async def tickers(
        q: str = "", limit: int = 50, offset: int = 0, sector: str = ""
    ) -> TickerListResponse:
        """Listed-companies registry for the dashboard (CONTRACT 1.2.0).

        Ensures the registry is populated first (0 credits in fixture mode;
        live mode refreshes at most once a day). `q` is a case-insensitive
        substring match on ticker OR company_name; `sector` filters by the
        IDX sector classification (CONTRACT 1.2.3). `total` counts only rows
        matching the filters.
        """
        await sectors.listed_companies()
        items, total = db.list_tickers(
            q=q.strip(), limit=min(limit, 200), offset=max(offset, 0), sector=sector.strip()
        )
        return TickerListResponse(items=items, total=total)

    @router.get("/api/tickers/sectors", response_model=SectorListResponse)
    async def ticker_sectors() -> SectorListResponse:
        """Distinct sectors in the registry with per-sector counts (CONTRACT 1.2.3)."""
        await sectors.listed_companies()
        items = db.ticker_sectors()
        return SectorListResponse(items=items, total=len(items))

    # ------------------------------------------------------------------ board

    @router.get("/api/board/{ticker}", response_model=BoardResponse)
    async def get_board(ticker: str) -> BoardResponse:
        """Dynamic detective board graph builder using live Sectors & SQLite memo."""
        try:
            return await build_board_for_ticker(ticker, db=db, sectors=sectors)
        except Exception as exc:
            logger.error("Gagal menyusun board untuk ticker %s: %s", ticker, exc)
            raise HTTPException(status_code=500, detail=f"Gagal memuat papan detektif {ticker}: {exc}")

    @router.post("/api/board/{ticker}/chat", response_model=BoardChatResponse)
    async def chat_board(ticker: str, req: BoardChatRequest) -> BoardChatResponse:
        """AI Detective Chat: answers questions about cross-ownership, board, and risks."""
        sym = ticker.strip().upper()
        q = req.message.strip().lower()

        # Build context from board data
        board_data = await build_board_for_ticker(sym, db=db, sectors=sectors)
        sh_list = [n.data.label for n in board_data.nodes if n.data.type == "pemegang"]
        mg_list = [f"{n.data.label} ({n.data.sub})" for n in board_data.nodes if n.data.type == "orang"]
        rf_list = [n.data.label for n in board_data.nodes if n.data.type == "redflag"]

        # Simple intelligent heuristics with context
        if "pemilik" in q or "pemegang" in q or "saham" in q:
            reply = f"Berdasarkan data registri IDX, pemegang saham utama {sym} meliputi: {', '.join(sh_list) if sh_list else 'Masyarakat / Publik'}."
        elif "direksi" in q or "komisaris" in q or "manajemen" in q or "orang" in q:
            reply = f"Jajaran pengurus kunci {sym} saat ini tercatat: {', '.join(mg_list[:4]) if mg_list else 'Belum terindeks'}."
        elif "red flag" in q or "risiko" in q or "kejanggalan" in q:
            if rf_list:
                reply = f"Temuan risiko penting pada {sym}: " + " | ".join(rf_list)
            else:
                reply = f"Tidak ada temuan red flag berat yang terindikasi pada audit komite sidang terkini {sym}."
        elif "valuasi" in q or "harga" in q or "pb" in q or "pe" in q:
            reply = board_data.aiInsights.get("fakta", f"Valuasi {sym} saat ini terpantau di papan fakta metrik.")
        else:
            reply = f"Investigasi {sym} ({board_data.name}): {board_data.thesisSummary} Anda dapat mengklik node pada papan untuk memperluas jaringan koneksi."

        return BoardChatResponse(reply=reply)

    # ----------------------------------------------------------------- health

    @router.get("/api/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(
            status="ok", sectors_mode=settings.sectors_mode, version=settings.version
        )

    # ------------------------------------------------------------ background

    async def _run_trial_task(
        trial_id: str, ticker: str, company_name: str, data_mode: str
    ) -> None:
        ctx = TrialContext(
            trial_id=trial_id,
            ticker=ticker,
            company_name=company_name,
            data_mode=data_mode,
            db=db,
            bus=bus,
            sectors=sectors,
            llm=llm,
            settings=settings,
        )
        try:
            await asyncio.wait_for(run_trial(ctx), timeout=settings.trial_timeout_seconds)
        except TrialFailed as exc:
            await bus.publish(
                trial_id,
                "trial_failed",
                {
                    "error_code": exc.error_code,
                    "message": exc.message,
                    "phase": exc.phase,
                    "agent_id": exc.agent_id,
                },
            )
            db.update_trial_status(
                trial_id,
                "failed",
                error_code=exc.error_code,
                error_message=exc.message,
                finished_at=now_iso(),
            )
        except asyncio.TimeoutError:
            await bus.publish(
                trial_id,
                "trial_failed",
                {
                    "error_code": "timeout",
                    "message": "Sidang melebihi batas waktu",
                    "phase": None,
                    "agent_id": None,
                },
            )
            db.update_trial_status(
                trial_id,
                "failed",
                error_code="timeout",
                error_message="Sidang melebihi batas waktu",
                finished_at=now_iso(),
            )
        except Exception as exc:  # unexpected — surface as sectors_error
            logger.exception("Trial %s gagal tak terduga", trial_id)
            await bus.publish(
                trial_id,
                "trial_failed",
                {
                    "error_code": "sectors_error",
                    "message": str(exc),
                    "phase": None,
                    "agent_id": None,
                },
            )
            db.update_trial_status(
                trial_id,
                "failed",
                error_code="sectors_error",
                error_message=str(exc),
                finished_at=now_iso(),
            )

    # ------------------------------------------------------------ SSE stream

    async def _event_generator(trial_id: str, request: Request):
        """Replay persisted events (Last-Event-ID), then stream live + heartbeat."""
        last_id = request.headers.get("last-event-id", "")
        last_seq = int(last_id) if last_id.isdigit() else 0

        q = bus.subscribe(trial_id)
        try:
            # Drain anything already queued (published between subscribe and now).
            buffered: list[Any] = []
            while not q.empty():
                buffered.append(q.get_nowait())

            replayed = db.get_events_after(trial_id, last_seq)
            replayed_seqs = {ev["seq"] for ev in replayed}
            for ev in replayed:
                yield ServerSentEvent(
                    data=json.dumps(ev, ensure_ascii=False), id=str(ev["seq"])
                )
            if replayed and replayed[-1]["type"] in TERMINAL_EVENTS:
                return

            for env in buffered:
                if env.seq in replayed_seqs:
                    continue
                yield ServerSentEvent(
                    data=json.dumps(env.model_dump(), ensure_ascii=False), id=str(env.seq)
                )
                if env.type in TERMINAL_EVENTS:
                    return

            while True:
                try:
                    env = await asyncio.wait_for(q.get(), timeout=HEARTBEAT_INTERVAL)
                except asyncio.TimeoutError:
                    yield ServerSentEvent(
                        data=json.dumps(
                            {
                                "type": "heartbeat",
                                "trial_id": trial_id,
                                "seq": 0,
                                "ts": now_iso(),
                                "payload": {},
                            },
                            ensure_ascii=False,
                        )
                    )
                    continue
                yield ServerSentEvent(
                    data=json.dumps(env.model_dump(), ensure_ascii=False), id=str(env.seq)
                )
                if env.type in TERMINAL_EVENTS:
                    return
        finally:
            bus.unsubscribe(trial_id, q)

    return router
