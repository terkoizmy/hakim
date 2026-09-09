"""Command-line entry point for running a SIDANG trial.

Usage:
    python -m app.cli sidang BBCA --mode fixture
    python -m app.cli sidang BBCA --mode auto
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import secrets
import sys

from .config import get_settings
from .db import Database
from .eventbus import EventBus, now_iso
from .llm import LLMClient
from .orchestrator import TrialContext, TrialFailed, run_trial
from .sectors import SectorsClient, TickerNotFound


def _resolve_mode(mode: str) -> str:
    if mode == "fixture":
        return "fixture"
    return get_settings().sectors_mode  # "auto" -> configured SECTORS_MODE


async def _run(ticker: str, mode: str) -> int:
    settings = get_settings()
    data_mode = _resolve_mode(mode)
    db = Database()
    bus = EventBus(db)
    sectors = SectorsClient(settings=settings, db=db)
    llm = LLMClient(settings=settings)

    try:
        company_name = await sectors.validate_ticker(ticker)
    except TickerNotFound:
        print(f"Ticker tidak dikenal: {ticker}", file=sys.stderr)
        return 2

    trial_id = "tr_" + secrets.token_hex(6)
    db.create_trial(trial_id, ticker, company_name, data_mode, now_iso())

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
        memo = await asyncio.wait_for(run_trial(ctx), timeout=settings.trial_timeout_seconds)
    except TrialFailed as exc:
        db.update_trial_status(
            trial_id, "failed", error_code=exc.error_code, error_message=exc.message, finished_at=now_iso()
        )
        print(f"Trial gagal [{exc.error_code}]: {exc.message}", file=sys.stderr)
        return 1
    except asyncio.TimeoutError:
        db.update_trial_status(
            trial_id, "failed", error_code="timeout", error_message="Trial melebihi batas waktu", finished_at=now_iso()
        )
        print("Trial timeout", file=sys.stderr)
        return 1

    print(json.dumps(memo.model_dump(), ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="sidang", description="SIDANG — sidang saham IDX")
    sub = parser.add_subparsers(dest="command", required=True)
    sidang = sub.add_parser("sidang", help="Jalankan sidang untuk satu ticker")
    sidang.add_argument("ticker", help="Kode saham IDX, mis. BBCA")
    sidang.add_argument("--mode", choices=["fixture", "auto"], default="fixture")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    if args.command == "sidang":
        return asyncio.run(_run(args.ticker, args.mode))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
