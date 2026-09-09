"""FastAPI application entry point.

`create_app()` accepts injected dependencies so tests can use a temp DB and a
mock Sectors transport; production just calls `create_app()`.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .db import Database
from .endpoints import build_router
from .eventbus import EventBus
from .llm import LLMClient
from .sectors import SectorsClient

logger = logging.getLogger(__name__)


def create_app(
    settings: Optional[Settings] = None,
    db: Optional[Database] = None,
    bus: Optional[EventBus] = None,
    sectors: Optional[SectorsClient] = None,
    llm: Optional[LLMClient] = None,
) -> FastAPI:
    settings = settings or get_settings()
    db = db or Database()
    bus = bus or EventBus(db)
    sectors = sectors or SectorsClient(settings=settings, db=db)
    llm = llm or LLMClient(settings=settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        await sectors.aclose()

    app = FastAPI(title="SIDANG API", version=settings.version, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(build_router(settings, db, bus, sectors, llm))

    app.state.settings = settings
    app.state.db = db
    app.state.bus = bus
    app.state.sectors = sectors
    app.state.llm = llm
    return app


app = create_app()
