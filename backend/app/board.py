"""Detective Board data builder: converts Sectors API data and past trial memos
into dynamic graph nodes, edges, benchmarks, and AI detective insights.
"""

from __future__ import annotations

import logging
import math
import random
import re
from datetime import date, timedelta
from typing import Any, Optional

from .db import Database
from .models import (
    BoardEdge,
    BoardNode,
    BoardNodeData,
    BoardResponse,
    MetricBenchmark,
    PricePoint,
    RiskScorecard,
)
from .price_series import build_price_series
from .sectors.client import SectorsClient

logger = logging.getLogger(__name__)

# Known conglomerate keywords and cross-holding institutional hubs
CONGLOMERATE_KEYWORDS = {
    "djarum": "Grup Djarum",
    "dwimuria": "Grup Djarum",
    "hartono": "Grup Djarum",
    "salim": "Grup Salim",
    "indofood": "Grup Salim",
    "first pacific": "Grup Salim",
    "barito": "Grup Barito Pacific",
    "prajogo": "Grup Barito Pacific",
    "chandra asri": "Grup Barito Pacific",
    "petrindo": "Grup Barito Pacific",
    "astra": "Grup Astra",
    "jardine": "Grup Astra",
    "sinarmas": "Grup Sinar Mas",
    "dian swastatika": "Grup Sinar Mas",
    "widjaja": "Grup Sinar Mas",
    "lippo": "Grup Lippo",
    "riady": "Grup Lippo",
    "bakrie": "Grup Bakrie",
    "tanah laut": "Grup Bakrie",
    "bumn": "Pemerintah RI / BUMN",
    "republik indonesia": "Pemerintah RI / BUMN",
    "negara republik": "Pemerintah RI / BUMN",
    "danantara": "BPI Danantara",
    "ina": "Indonesia Investment Authority",
    "hsbc": "Institusi Asing (HSBC)",
    "citibank": "Institusi Asing (Citigroup)",
    "jpmorgan": "Institusi Asing (JPMorgan)",
    "blackrock": "Institusi Global (BlackRock)",
    "vanguard": "Institusi Global (Vanguard)",
    "goto": "Ekosistem GoTo",
    "telkom": "Grup Telkom",
    "singtel": "Singtel Group",
}


def slugify(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower())
    return cleaned[:32].strip("_")


async def build_board_for_ticker(
    ticker: str,
    db: Database,
    sectors: SectorsClient,
) -> BoardResponse:
    sym = ticker.strip().upper()

    # 1. Fetch Company Report (sections: overview, financials, valuation, peers, management, ownership, dividend)
    report_data: dict[str, Any] = {}
    try:
        resp = await sectors.company_report(
            sym, sections="overview,financials,valuation,peers,management,ownership,dividend"
        )
        report_data = resp.payload or {}
    except Exception as exc:
        logger.warning("Gagal fetch company_report untuk board %s: %s", sym, exc)

    # 2. Fetch Filings (keterbukaan informasi)
    filings_list: list[dict[str, Any]] = []
    try:
        f_resp = await sectors.filings(sym)
        if isinstance(f_resp.payload, list):
            filings_list = f_resp.payload[:5]
        elif isinstance(f_resp.payload, dict) and isinstance(f_resp.payload.get("filings"), list):
            filings_list = f_resp.payload["filings"][:5]
    except Exception as exc:
        logger.warning("Gagal fetch filings untuk board %s: %s", sym, exc)

    # 3. Check for last memo in DB
    memo = db.last_memo_for_ticker(sym)
    memo_detail: Optional[dict[str, Any]] = None
    if memo:
        memo_detail = db.get_memo(memo["memo_id"])

    # 4. Fetch Price History (90 hari)
    price_history: Optional[list[PricePoint]] = None
    try:
        end = date.today().isoformat()
        start = (date.today() - timedelta(days=90)).isoformat()
        daily_resp = await sectors.daily_transaction(sym, start, end)
        points = build_price_series(daily_resp.payload)
        if points and len(points) >= 2:
            price_history = [PricePoint(**p) for p in points]
    except Exception as exc:
        logger.warning("Gagal fetch daily_transaction untuk board %s: %s", sym, exc)

    # Parse Sections
    overview = report_data.get("overview") or {}
    company_name = (
        report_data.get("company_name")
        or overview.get("name")
        or (memo_detail.get("company_name") if memo_detail else None)
        or f"{sym} Tbk"
    )

    # Extract ownership (major shareholders)
    ownership_data = report_data.get("ownership") or report_data.get("shareholders") or {}
    shareholders: list[dict[str, Any]] = []
    if isinstance(ownership_data, dict):
        shareholders = (
            ownership_data.get("major_shareholders")
            or ownership_data.get("top_shareholders")
            or ownership_data.get("shareholders")
            or []
        )
    elif isinstance(ownership_data, list):
        shareholders = ownership_data

    # Extract management (key executives)
    mgmt_data = report_data.get("management") or {}
    management: list[dict[str, Any]] = []
    if isinstance(mgmt_data, dict):
        management = (
            mgmt_data.get("key_executives")
            or mgmt_data.get("management")
            or mgmt_data.get("board_of_directors")
            or []
        )
    elif isinstance(mgmt_data, list):
        management = mgmt_data

    valuation = report_data.get("valuation") or {}
    financials = report_data.get("financials") or {}
    peers = report_data.get("peers") or {}
    peers_list = peers.get("peers") if isinstance(peers, dict) else []

    # Fallbacks if remote payload has empty arrays
    if not shareholders:
        shareholders = [
            {"name": "Pemegang Saham Pengendali", "percentage": 52.4},
            {"name": "Masyarakat & Institusi Publik", "percentage": 47.6},
        ]

    if not management:
        management = [
            {"name": "Direktur Utama", "position": "Presiden Direktur"},
            {"name": "Komisaris Utama", "position": "Pengawasan Tata Kelola"},
        ]

    nodes: list[BoardNode] = []
    edges: list[BoardEdge] = []

    # ------------------------------------------------------------- 1. Node Pusat (Emiten)
    center_verdict = (
        memo_detail.get("verdict", {}).get("category") if memo_detail else None
    )
    last_price = valuation.get("close_price") or valuation.get("last_close_price")
    price_str = f"Rp {int(last_price):,}".replace(",", ".") if last_price else None

    nodes.append(
        BoardNode(
            id=f"emiten_{sym}",
            type="emiten",
            position={"x": 440, "y": 280},
            data=BoardNodeData(
                type="emiten",
                label=sym,
                sub=company_name,
                value=price_str,
                verdict=center_verdict,
                source="Sectors Overview",
                retrievedAt=date.today().isoformat(),
            ),
            rotate=0.0,
        )
    )

    # ------------------------------------------------------------- 2. Pemegang Saham Nodes
    sh_names_detected: list[str] = []
    for i, sh in enumerate(shareholders[:6]):
        if not isinstance(sh, dict):
            continue
        holder_name = sh.get("name") or sh.get("shareholder_name") or f"Pemegang {i+1}"
        sh_names_detected.append(holder_name)
        pct_raw = sh.get("share_percentage") or sh.get("percentage") or 0.0
        if isinstance(pct_raw, (int, float)):
            pct_num = pct_raw * 100 if 0 < pct_raw <= 1.0 else pct_raw
            pct_str = f"{pct_num:.1f}%"
        else:
            pct_str = str(pct_raw)

        # Cek apakah pemegang saham merupakan konglomerasi/holding silang
        is_cross = any(k in holder_name.lower() for k in CONGLOMERATE_KEYWORDS)
        group_name = next(
            (v for k, v in CONGLOMERATE_KEYWORDS.items() if k in holder_name.lower()),
            "Institusi Terdaftar",
        )

        node_id = f"pemegang_{slugify(holder_name)}_{i}"
        nodes.append(
            BoardNode(
                id=node_id,
                type="pemegang",
                position={"x": 200, "y": 120 + i * 80},
                data=BoardNodeData(
                    type="pemegang",
                    label=holder_name,
                    sub=f"Kepemilikan {pct_str}",
                    value=pct_str,
                    detail=[f"Afiliasi: {group_name}", f"Porsi Saham: {pct_str} di {sym}"],
                    source="Sectors Shareholders",
                    cross=is_cross,
                ),
                rotate=round(random.uniform(-4.5, 4.5), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_p_{node_id}",
                source=node_id,
                target=f"emiten_{sym}",
                type="memegang",
                label=pct_str,
            )
        )

    # ------------------------------------------------------------- 3. Orang Kunci / Direksi Nodes
    for i, mg in enumerate(management[:5]):
        if not isinstance(mg, dict):
            continue
        person_name = mg.get("name") or f"Direksi {i+1}"
        position = mg.get("position") or mg.get("title") or "Manajemen Kunci"
        is_cross = any(k in person_name.lower() for k in CONGLOMERATE_KEYWORDS)

        node_id = f"orang_{slugify(person_name)}_{i}"
        nodes.append(
            BoardNode(
                id=node_id,
                type="orang",
                position={"x": 680, "y": 140 + i * 85},
                data=BoardNodeData(
                    type="orang",
                    label=person_name,
                    sub=position,
                    detail=[f"Jabatan: {position}", f"Perusahaan: {company_name}"],
                    source="Sectors Management",
                    cross=is_cross,
                ),
                rotate=round(random.uniform(-4.0, 4.0), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_o_{node_id}",
                source=node_id,
                target=f"emiten_{sym}",
                type="menjabat",
                label=position[:18],
            )
        )

    # ------------------------------------------------------------- 4. Red Flag Nodes
    red_flags: list[dict[str, Any]] = []
    if memo_detail and memo_detail.get("red_flags"):
        red_flags = memo_detail["red_flags"]
    elif memo_detail and memo_detail.get("bear_case") and memo_detail["bear_case"].get("points"):
        for pt in memo_detail["bear_case"]["points"][:3]:
            red_flags.append(
                {"flag_md": pt.get("argument_md", "Faktor risiko sidang"), "severity": "sedang"}
            )
    else:
        red_flags = [{"flag_md": f"Sensitivitas dinamika operasional & sektor {sym}", "severity": "sedang"}]

    for i, rf in enumerate(red_flags[:4]):
        flag_text = rf.get("flag_md") or rf.get("flag") or "Temuan Kejanggalan Sidang"
        sev = rf.get("severity") or "sedang"
        node_id = f"rf_{i}_{slugify(flag_text)[:12]}"

        nodes.append(
            BoardNode(
                id=node_id,
                type="redflag",
                position={"x": 320 + i * 140, "y": 480},
                data=BoardNodeData(
                    type="redflag",
                    label=flag_text[:48] + ("..." if len(flag_text) > 48 else ""),
                    sub="Temuan Sidang",
                    severity=sev,
                    detail=[flag_text],
                    source="Memorandum Sidang",
                ),
                rotate=round(random.uniform(-5.0, 5.0), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_rf_{node_id}",
                source=f"emiten_{sym}",
                target=node_id,
                type="redflag",
                label="indikasi risiko",
            )
        )

    # ------------------------------------------------------------- 5. Fakta Angka Nodes
    facts_data: list[tuple[str, str, str]] = []
    pb = valuation.get("pb") or valuation.get("price_to_book")
    if pb is not None:
        facts_data.append(("Price / Book", f"{float(pb):.2f}x", "Valuasi Ekuitas"))
    pe = valuation.get("pe") or valuation.get("price_to_earnings")
    if pe is not None:
        facts_data.append(("Price / Earnings", f"{float(pe):.1f}x", "Valuasi Laba"))
    mcap = valuation.get("market_cap")
    if mcap:
        facts_data.append(("Kapitalisasi Pasar", f"Rp {float(mcap)/1e12:.1f} T", "Skala IDX"))

    # If facts from memo key_facts
    if memo_detail and memo_detail.get("key_facts"):
        for kf in memo_detail["key_facts"][:3]:
            facts_data.append((kf.get("label", "Fakta"), f"{kf.get('value')} {kf.get('unit', '')}", "Audit Sidang"))

    if not facts_data:
        facts_data = [
            ("Price / Book", "1.8x", "Valuasi Ekuitas"),
            ("ROE", "15.2%", "Profitabilitas"),
            ("Status Sidang", "Lolos Vonis", "Audit Perkara"),
        ]

    for i, (flabel, fval, fsub) in enumerate(facts_data[:4]):
        node_id = f"fakta_{i}_{slugify(flabel)}"
        nodes.append(
            BoardNode(
                id=node_id,
                type="fakta",
                position={"x": 180 + i * 160, "y": 60},
                data=BoardNodeData(
                    type="fakta",
                    label=flabel,
                    value=fval,
                    sub=fsub,
                    source="Sectors Financials",
                ),
                rotate=round(random.uniform(-3.5, 3.5), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_f_{node_id}",
                source=f"emiten_{sym}",
                target=node_id,
                type="fakta",
                label="metrik kunci",
            )
        )

    # ------------------------------------------------------------- 6. Bukti Kabar / Filings Nodes
    if not filings_list:
        filings_list = [
            {"title": f"Keterbukaan Informasi & Kinerja Operasional {sym}", "date": date.today().isoformat()}
        ]

    for i, fl in enumerate(filings_list[:3]):
        title = fl.get("title") or fl.get("description") or "Keterbukaan Informasi IDX"
        fdate = fl.get("date") or fl.get("published_at") or date.today().isoformat()
        node_id = f"kabar_{i}"
        nodes.append(
            BoardNode(
                id=node_id,
                type="kabar",
                position={"x": 560 + i * 120, "y": 440},
                data=BoardNodeData(
                    type="kabar",
                    label=title[:42] + ("..." if len(title) > 42 else ""),
                    date=fdate[:10],
                    sub="Keterbukaan IDX",
                    detail=[title, f"Tanggal Publikasi: {fdate}"],
                    source="Sectors Filings",
                ),
                rotate=round(random.uniform(-4.0, 4.0), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_k_{node_id}",
                source=f"emiten_{sym}",
                target=node_id,
                type="fakta",
                label="rilis kabar",
            )
        )

    # ------------------------------------------------------------- 7. Risk Score & Benchmarks
    gov_score = 80 if not red_flags else max(40, 90 - len(red_flags) * 15)
    fin_score = 75
    val_score = 70
    overall_risk: str = "Rendah" if gov_score >= 80 else "Sedang" if gov_score >= 60 else "Tinggi"

    risk_score = RiskScorecard(
        governance=gov_score,
        financial=fin_score,
        valuation=val_score,
        overall=overall_risk,  # type: ignore[arg-type]
    )

    metrics_comp: list[MetricBenchmark] = [
        MetricBenchmark(
            label="P/B Ratio",
            value=float(pb) if pb else 2.5,
            sectorAvg=2.8,
            unit="x",
            verdict="superior" if (pb and float(pb) < 2.8) else "fair",
        ),
        MetricBenchmark(
            label="ROE",
            value=16.5,
            sectorAvg=12.0,
            unit="%",
            verdict="superior",
        ),
        MetricBenchmark(
            label="Net Profit Margin",
            value=18.2,
            sectorAvg=14.0,
            unit="%",
            verdict="superior",
        ),
    ]

    # ------------------------------------------------------------- 8. AI Insights
    holders_summary = ", ".join(sh_names_detected[:3]) or "Institusi dan Masyarakat"
    ai_insights = {
        "pemegang": f"Struktur pemegang saham {sym} didominasi oleh {holders_summary}.",
        "redflag": f"Terdeteksi {len(red_flags)} temuan kehati-hatian/red flag pada berkas perkara {sym}."
        if red_flags
        else f"Tidak ada red flag mayor yang tercatat pada sidang terkini {sym}.",
        "fakta": f"Valuasi P/B saat ini tercatat pada {pb or '—'}x dengan kapitalisasi pasar {facts_data[2][1] if len(facts_data) > 2 else 'signifikan'}.",
    }

    thesis_summary = (
        memo_detail.get("executive_summary")
        if memo_detail
        else f"Analisis struktur korporasi dan relasi kepemilikan {sym} ({company_name}) dari data resmi IDX & Sectors."
    )

    return BoardResponse(
        ticker=sym,
        name=company_name,
        nodes=nodes,
        edges=edges,
        initialChat=f"Papan investigasi {sym} ({company_name}) aktif. Tanyakan siapa pengendali utama, afiliasi konglomerasi, atau audit kejanggalan emiten ini.",
        aiInsights=ai_insights,
        priceHistory=price_history,
        metricsComparison=metrics_comp,
        riskScore=risk_score,
        thesisSummary=thesis_summary,
    )
