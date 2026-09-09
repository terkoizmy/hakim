"""Per-trial event bus: persists every event to SQLite (for Last-Event-ID
replay) and broadcasts to live SSE subscribers.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from .db import Database
from .models import EventEnvelope


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class EventBus:
    def __init__(self, db: Database):
        self.db = db
        self._subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)

    async def publish(self, trial_id: str, event_type: str, payload: dict[str, Any]) -> EventEnvelope:
        ts = now_iso()
        seq = self.db.append_event(trial_id, event_type, payload, ts)
        envelope = EventEnvelope(type=event_type, trial_id=trial_id, seq=seq, ts=ts, payload=payload)
        for q in list(self._subscribers.get(trial_id, ())):
            q.put_nowait(envelope)
        return envelope

    def subscribe(self, trial_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers[trial_id].add(q)
        return q

    def unsubscribe(self, trial_id: str, q: asyncio.Queue) -> None:
        self._subscribers[trial_id].discard(q)
        if not self._subscribers[trial_id]:
            self._subscribers.pop(trial_id, None)
