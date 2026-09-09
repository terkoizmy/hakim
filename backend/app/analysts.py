"""The five data analysts of the SIDANG committee.

Each analyst gathers Sectors data (via the client), extracts grounded evidence,
then writes a short markdown summary. Analysts run concurrently; a failure in
one must not sink the trial.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Awaitable, Callable

from .evidence import Evidence, extract_antigorengan, extract_fundamental, extract_insider, extract_price, extract_smartmoney
from .sectors import SectorsClient, ToolCall, GatherResult

SECTIONS_FUNDAMENTAL = "financials,valuation,peers,management,ownership,dividend"


def _dates(days_back: int) -> tuple[str, str]:
    end = date.today().isoformat()
    start = (date.today() - timedelta(days=days_back)).isoformat()
    return start, end


# ---------------------------------------------------------------------------
# Gather functions
# ---------------------------------------------------------------------------

async def gather_fundamental(ctx: Any) -> GatherResult:
    tool_calls: list[ToolCall] = []
    cr = await ctx.sectors.company_report(ctx.ticker, SECTIONS_FUNDAMENTAL)
    ctx.shared["company_report"] = cr.payload
    tool_calls.append(ToolCall("company_report", f"/v2/company/report/{ctx.ticker}/", f"sections={SECTIONS_FUNDAMENTAL}", cr.cache))
    qf = await ctx.sectors.quarterly_financials(ctx.ticker)
    tool_calls.append(ToolCall("quarterly_financials", f"/v2/financials/quarterly/{ctx.ticker}/", "n_quarters=4", qf.cache))
    rs = await ctx.sectors.revenue_segments(ctx.ticker)
    tool_calls.append(ToolCall("revenue_segments", f"/v2/company/segments/{ctx.ticker}/", "", rs.cache))
    return GatherResult(
        data={"company_report": cr.payload, "quarterly_financials": qf.payload, "revenue_segments": rs.payload},
        tool_calls=tool_calls,
    )


async def gather_price(ctx: Any) -> GatherResult:
    tool_calls: list[ToolCall] = []
    start, end = _dates(90)
    dt = await ctx.sectors.daily_transaction(ctx.ticker, start, end)
    # Keep the raw payload for the price-series snapshot (CONTRACT 1.1.0).
    ctx.shared["daily_transaction"] = dt.payload
    tool_calls.append(ToolCall("daily_transaction", f"/v2/transaction/daily/{ctx.ticker}/", f"start={start}&end={end}", dt.cache))
    idx = await ctx.sectors.index_daily("IDXCOMPOSITE", start, end)
    tool_calls.append(ToolCall("index_daily", "/v2/transaction/index-daily/", f"index=IDXCOMPOSITE&start={start}&end={end}", idx.cache))
    s, e = _dates(7)
    tm = await ctx.sectors.top_movers(s, e)
    tool_calls.append(ToolCall("top_movers", "/v2/ranking/top-changes/", f"start={s}&end={e}", tm.cache))
    return GatherResult(
        data={"daily_transaction": dt.payload, "index_daily": idx.payload, "top_movers": tm.payload},
        tool_calls=tool_calls,
    )


async def gather_smartmoney(ctx: Any) -> GatherResult:
    tool_calls: list[ToolCall] = []
    start, end = _dates(30)
    tb = await ctx.sectors.top_brokers(ctx.ticker, start, end)
    tool_calls.append(ToolCall("top_brokers", f"/v2/broker/top-buyers-sellers/{ctx.ticker}/", f"start={start}&end={end}", tb.cache))
    ff = await ctx.sectors.foreign_flow(ctx.ticker)
    tool_calls.append(ToolCall("foreign_flow", f"/v2/foreign-flow/{ctx.ticker}/", "period=30d", ff.cache))
    return GatherResult(
        data={"top_brokers": tb.payload, "foreign_flow": ff.payload},
        tool_calls=tool_calls,
    )


async def gather_insider(ctx: Any) -> GatherResult:
    tool_calls: list[ToolCall] = []
    if "company_report" in ctx.shared:
        cr_payload = ctx.shared["company_report"]
        tool_calls.append(ToolCall("company_report", f"/v2/company/report/{ctx.ticker}/", "sections=management,ownership", "hit"))
    else:
        cr = await ctx.sectors.company_report(ctx.ticker, "management,ownership")
        cr_payload = cr.payload
        tool_calls.append(ToolCall("company_report", f"/v2/company/report/{ctx.ticker}/", "sections=management,ownership", cr.cache))
    fl = await ctx.sectors.filings(ctx.ticker)
    tool_calls.append(ToolCall("filings", "/v2/news/filings/", f"symbol={ctx.ticker}", fl.cache))
    return GatherResult(
        data={"company_report": cr_payload, "filings": fl.payload},
        tool_calls=tool_calls,
    )


async def gather_antigorengan(ctx: Any) -> GatherResult:
    tool_calls: list[ToolCall] = []
    sp = await ctx.sectors.suspensions(ctx.ticker)
    tool_calls.append(ToolCall("suspensions", "/v2/news/suspensions/", f"symbol={ctx.ticker}", sp.cache))
    ca = await ctx.sectors.corporate_actions(ctx.ticker)
    tool_calls.append(ToolCall("corporate_actions", f"/v2/company/corporate-actions/{ctx.ticker}/", "", ca.cache))
    sc = await ctx.sectors.screener(where=f"symbol in ['{ctx.ticker}']", limit=10)
    tool_calls.append(ToolCall("screener", "/v2/companies/", f"where=symbol in ['{ctx.ticker}']", sc.cache))
    return GatherResult(
        data={"suspensions": sp.payload, "corporate_actions": ca.payload, "screener": sc.payload},
        tool_calls=tool_calls,
    )


# ---------------------------------------------------------------------------
# Analyst specs
# ---------------------------------------------------------------------------

@dataclass
class AnalystSpec:
    agent_id: str
    display_name: str
    gather: Callable[[Any], Awaitable[GatherResult]]
    extract: Callable[[dict[str, Any], str], list[Evidence]]
    system_prompt: str


ANALYSTS: list[AnalystSpec] = [
    AnalystSpec(
        agent_id="fundamental",
        display_name="Analisis Fundamental",
        gather=gather_fundamental,
        extract=extract_fundamental,
        system_prompt=(
            "Kamu adalah Analisis Fundamental dalam sidang saham IDX. "
            "Tugasmu: menilai esensi bisnis, parit ekonomi, dan valuasi vs peers "
            "berdasarkan bukti dari Sectors API. Tulis ringkasan markdown singkat "
            "(maks 200 kata) dalam Bahasa Indonesia. Jangan menambahkan angka yang "
            "tidak ada di bukti."
        ),
    ),
    AnalystSpec(
        agent_id="price",
        display_name="Analisis Harga",
        gather=gather_price,
        extract=extract_price,
        system_prompt=(
            "Kamu adalah Analisis Harga dalam sidang saham IDX. "
            "Tugasmu: menilai momentum harga, posisi vs indeks, dan konteks top movers "
            "berdasarkan bukti dari Sectors API. Tulis ringkasan markdown singkat "
            "(maks 200 kata) dalam Bahasa Indonesia. Jangan menambahkan angka yang "
            "tidak ada di bukti."
        ),
    ),
    AnalystSpec(
        agent_id="smartmoney",
        display_name="Smart Money",
        gather=gather_smartmoney,
        extract=extract_smartmoney,
        system_prompt=(
            "Kamu adalah analis Smart Money dalam sidang saham IDX. "
            "Tugasmu: membaca akumulasi/distribusi broker institusi dan arus asing "
            "berdasarkan bukti dari Sectors API. Tulis ringkasan markdown singkat "
            "(maks 200 kata) dalam Bahasa Indonesia. Jangan menambahkan angka yang "
            "tidak ada di bukti."
        ),
    ),
    AnalystSpec(
        agent_id="insider",
        display_name="Insider",
        gather=gather_insider,
        extract=extract_insider,
        system_prompt=(
            "Kamu adalah analis Insider dalam sidang saham IDX. "
            "Tugasmu: membaca transaksi direksi/komisaris dan pemegang saham besar "
            "berdasarkan bukti dari Sectors API. Tulis ringkasan markdown singkat "
            "(maks 200 kata) dalam Bahasa Indonesia. Jangan menambahkan angka yang "
            "tidak ada di bukti."
        ),
    ),
    AnalystSpec(
        agent_id="antigorengan",
        display_name="Anti-Gorengan",
        gather=gather_antigorengan,
        extract=extract_antigorengan,
        system_prompt=(
            "Kamu adalah analis Anti-Gorengan dalam sidang saham IDX. "
            "Tugasmu: mendeteksi red flag khas saham gorengan Indonesia — riwayat "
            "suspensi, free float rendah, aksi korporasi berisiko — berdasarkan bukti "
            "dari Sectors API. Tulis ringkasan markdown singkat (maks 200 kata) dalam "
            "Bahasa Indonesia. Jangan menambahkan angka yang tidak ada di bukti."
        ),
    ),
]
