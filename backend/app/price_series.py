"""Price series snapshot builder (CONTRACT 1.1.0).

Turns a Sectors daily_transaction payload into the contract's Point[] shape:
ascending by date, capped at the most recent MAX_PRICE_POINTS. Callers apply
the min-2 rule (fewer than 2 points -> null in the API response).
"""

from __future__ import annotations

from typing import Any

MAX_PRICE_POINTS = 52


def build_price_series(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Return [{date, close, volume, change_pct}] ascending by date.

    Rows without a date or close are skipped. The list is capped at the most
    recent MAX_PRICE_POINTS entries. May be empty or a single point — callers
    apply the contract's min-2 rule.
    """
    rows = payload.get("data", []) if isinstance(payload, dict) else []
    points: list[dict[str, Any]] = []
    for row in rows:
        date_str = row.get("date")
        close = row.get("close")
        if not date_str or close is None:
            continue
        point: dict[str, Any] = {"date": str(date_str), "close": close}
        if row.get("volume") is not None:
            point["volume"] = row["volume"]
        if row.get("change_pct") is not None:
            point["change_pct"] = row["change_pct"]
        points.append(point)
    points.sort(key=lambda p: p["date"])
    return points[-MAX_PRICE_POINTS:]
