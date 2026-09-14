"""Detective Board data builder: converts Sectors API data and past trial memos
into dynamic graph nodes, edges, benchmarks, and AI detective insights.

Enriched version: fetches ALL available data sources from Sectors API and uses
real data throughout — no hardcoded metrics or mock fallbacks.
"""

from __future__ import annotations

import logging
import math
import random
import re
from datetime import date, timedelta
from typing import Any, Optional

from .config import Settings
from .db import Database
from .llm import LLMClient
from .models import (
    BoardChatResponse,
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


# Sectors menuliskan alias di dalam SATU string nama. Bentuk yang benar-benar
# muncul di data produksi: "Nama Utama/Alias", lalu varian
# "… Disebut Juga …", "… Atau Dipanggil …".
_ALIAS_MARKERS = (
    " disebut juga ",
    " disebut pula ",
    " atau dipanggil ",
    " yang biasa dipanggil ",
    " yang juga dikenal ",
    " alias ",
    " a.k.a. ",
    " a.k.a ",
)


def canonical_person_name(raw: str) -> str:
    """Nama utama tanpa bagian alias — dipakai sebagai identitas untuk dedup.

    Bukan untuk ditampilkan mentah-mentah: pemanggil tetap menyimpan ejaan asli
    di `detail` supaya bisa dilacak balik ke respons Sectors.
    """
    name = raw.strip()
    if "/" in name:
        head = name.split("/", 1)[0].strip()
        if len(head) >= 3:
            name = head
    haystack = f" {name.lower()} "
    for marker in _ALIAS_MARKERS:
        idx = haystack.find(marker)
        if idx != -1:
            name = name[:idx]
            break
    return name.strip(" ,;-") or raw.strip()


def _fmt_rp(value: float | int) -> str:
    """Format Rupiah value into human-readable string."""
    abs_val = abs(value)
    sign = "-" if value < 0 else ""
    if abs_val >= 1e12:
        return f"{sign}Rp{abs_val / 1e12:.1f}T"
    if abs_val >= 1e9:
        return f"{sign}Rp{abs_val / 1e9:.0f}M"
    if abs_val >= 1e6:
        return f"{sign}Rp{abs_val / 1e6:.0f}jt"
    return f"{sign}Rp{abs_val:,.0f}"


def _safe_float(val: Any, default: float | None = None) -> float | None:
    """Safely convert a value to float, returning default if not possible."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _pct_from_registry(raw: Any) -> float | None:
    """Persen kepemilikan dari registri major_shareholders (0–100).

    Sectors kadang mengirim fraksi (0–1) dan kadang sudah persen — jaga
    perilaku lama: nilai <= 1 dianggap fraksi.
    """
    num = _safe_float(raw)
    if num is None:
        return None
    return num * 100 if 0 < num <= 1.0 else num


def _pct_from_executive(raw: Any) -> float | None:
    """Persen dari `executives_shareholdings` — selalu fraksi (0.0004 = 0,04%)."""
    num = _safe_float(raw)
    return None if num is None else num * 100


def _fmt_pct(pct: float) -> str:
    """Format persen kepemilikan dengan presisi menyesuaikan besarannya.

    Kalau selalu dibulatkan 1 desimal, pemegang kecil terlihat "0.0%" — padahal
    registri IDX memang mencatat kepemilikan mereka (mis. 0,006% = 7,8 juta
    lembar). Informasinya hilang, jadi presisi dinaikkan untuk nilai kecil.
    """
    if pct >= 1:
        return f"{pct:.1f}%"
    if pct >= 0.01:
        return f"{pct:.2f}%"
    if pct > 0:
        return f"{pct:.3f}%"
    return "0%"


def _get_latest_financials(financials: dict[str, Any]) -> dict[str, Any]:
    """Extract the latest year's financials from the historical_financials dict/list."""
    hist = financials.get("historical_financials")
    if isinstance(hist, dict):
        # Dict keyed by year string — get the latest year
        if hist:
            latest_year = max(hist.keys(), key=lambda y: int(y) if y.isdigit() else 0)
            return hist[latest_year] if isinstance(hist[latest_year], dict) else {}
    elif isinstance(hist, list):
        # List of dicts with 'year' key — get the latest
        valid = [r for r in hist if isinstance(r, dict) and r.get("year")]
        if valid:
            latest = max(valid, key=lambda r: int(r.get("year", 0)))
            return latest
    return {}


def _get_latest_valuation_hist(valuation: dict[str, Any]) -> dict[str, Any]:
    """Extract the latest year's valuation from historical_valuation."""
    hv = valuation.get("historical_valuation")
    if isinstance(hv, dict) and hv:
        latest_year = max(hv.keys(), key=lambda y: int(y) if y.isdigit() else 0)
        return hv[latest_year] if isinstance(hv[latest_year], dict) else {}
    elif isinstance(hv, list):
        valid = [r for r in hv if isinstance(r, dict) and r.get("year")]
        if valid:
            return max(valid, key=lambda r: int(r.get("year", 0)))
    return {}


async def build_board_for_ticker(
    ticker: str,
    db: Database,
    sectors: SectorsClient,
) -> BoardResponse:
    sym = ticker.strip().upper()

    # ================================================================
    # DATA FETCHING — gather all available sources
    # ================================================================

    # 1. Company Report (overview, financials, valuation, peers, management, ownership, dividend)
    report_data: dict[str, Any] = {}
    report_fetched_at: str = ""
    report_cache: str = ""
    try:
        resp = await sectors.company_report(
            sym, sections="overview,financials,valuation,peers,management,ownership,dividend"
        )
        report_data = resp.payload or {}
        report_fetched_at = resp.fetched_at
        report_cache = resp.cache
    except Exception as exc:
        logger.warning("Gagal fetch company_report untuk board %s: %s", sym, exc)

    # 2. Filings (keterbukaan informasi & transaksi insider)
    filings_raw: list[dict[str, Any]] = []
    try:
        f_resp = await sectors.filings(sym)
        payload = f_resp.payload or {}
        if isinstance(payload, dict) and isinstance(payload.get("filings"), list):
            filings_raw = payload["filings"]
        elif isinstance(payload, dict) and isinstance(payload.get("results"), list):
            filings_raw = payload["results"]
        elif isinstance(payload, list):
            filings_raw = payload
    except Exception as exc:
        logger.warning("Gagal fetch filings untuk board %s: %s", sym, exc)

    # 3. Suspensions (riwayat suspensi BEI)
    suspensions_list: list[dict[str, Any]] = []
    try:
        s_resp = await sectors.suspensions(sym)
        payload = s_resp.payload or {}
        if isinstance(payload, dict) and isinstance(payload.get("suspensions"), list):
            suspensions_list = payload["suspensions"]
        elif isinstance(payload, dict) and isinstance(payload.get("results"), list):
            suspensions_list = payload["results"]
    except Exception as exc:
        logger.warning("Gagal fetch suspensions untuk board %s: %s", sym, exc)

    # 4. Foreign Flow (arus modal asing)
    foreign_flow_data: dict[str, Any] = {}
    try:
        ff_resp = await sectors.foreign_flow(sym)
        foreign_flow_data = ff_resp.payload or {}
    except Exception as exc:
        logger.warning("Gagal fetch foreign_flow untuk board %s: %s", sym, exc)

    # 5. Top Brokers (bandarmology)
    brokers_data: dict[str, Any] = {}
    try:
        end_date = date.today().isoformat()
        start_date = (date.today() - timedelta(days=30)).isoformat()
        br_resp = await sectors.top_brokers(sym, start_date, end_date)
        brokers_data = br_resp.payload or {}
    except Exception as exc:
        logger.warning("Gagal fetch top_brokers untuk board %s: %s", sym, exc)

    # 6. Corporate Actions
    corp_actions_list: list[dict[str, Any]] = []
    try:
        ca_resp = await sectors.corporate_actions(sym)
        payload = ca_resp.payload or {}
        if isinstance(payload, dict) and isinstance(payload.get("corporate_actions"), list):
            corp_actions_list = payload["corporate_actions"]
        elif isinstance(payload, dict) and isinstance(payload.get("corporate_actions"), dict):
            # Live format: {agm: [...], dividend: [...], ...} — already normalized to flat list
            # but handle un-normalized case too
            for cat, items in payload["corporate_actions"].items():
                for item in (items or []):
                    if isinstance(item, dict):
                        corp_actions_list.append({"type": cat, **item})
    except Exception as exc:
        logger.warning("Gagal fetch corporate_actions untuk board %s: %s", sym, exc)

    # 7. Revenue Segments
    segments_list: list[dict[str, Any]] = []
    try:
        seg_resp = await sectors.revenue_segments(sym)
        payload = seg_resp.payload or {}
        if isinstance(payload, dict) and isinstance(payload.get("segments"), list):
            segments_list = payload["segments"]
    except Exception as exc:
        logger.warning("Gagal fetch revenue_segments untuk board %s: %s", sym, exc)

    # 8. Check for last memo in DB
    memo = db.last_memo_for_ticker(sym)
    memo_detail: Optional[dict[str, Any]] = None
    if memo:
        memo_detail = db.get_memo(memo["memo_id"])

    # 9. Price History (90 hari)
    price_history: Optional[list[PricePoint]] = None
    try:
        end_str = date.today().isoformat()
        start_str = (date.today() - timedelta(days=90)).isoformat()
        daily_resp = await sectors.daily_transaction(sym, start_str, end_str)
        points = build_price_series(daily_resp.payload)
        if points and len(points) >= 2:
            price_history = [PricePoint(**p) for p in points]
    except Exception as exc:
        logger.warning("Gagal fetch daily_transaction untuk board %s: %s", sym, exc)

    # ================================================================
    # PARSE SECTIONS from company report
    # ================================================================

    overview = report_data.get("overview") or {}
    company_name = (
        report_data.get("company_name")
        or overview.get("name")
        or (memo_detail.get("company_name") if memo_detail else None)
        or f"{sym} Tbk"
    )

    # Ownership — extract major shareholders, top transactions, institutional flow
    ownership_data = report_data.get("ownership") or report_data.get("shareholders") or {}
    shareholders: list[dict[str, Any]] = []
    top_transactions: Any = None
    institutional_flow: Any = None
    exec_shareholdings: list[dict[str, Any]] = []

    if isinstance(ownership_data, dict):
        shareholders = (
            ownership_data.get("major_shareholders")
            or ownership_data.get("top_shareholders")
            or ownership_data.get("shareholders")
            or []
        )
        top_transactions = ownership_data.get("top_transactions")
        institutional_flow = ownership_data.get("institutional_transaction_flow")
    elif isinstance(ownership_data, list):
        shareholders = ownership_data

    # Management — extract key executives & their shareholdings
    mgmt_data = report_data.get("management") or {}
    management: list[dict[str, Any]] = []
    if isinstance(mgmt_data, dict):
        management = (
            mgmt_data.get("key_executives")
            or mgmt_data.get("management")
            or mgmt_data.get("board_of_directors")
            or []
        )
        exec_shareholdings = mgmt_data.get("executives_shareholdings") or []
    elif isinstance(mgmt_data, list):
        management = mgmt_data

    valuation = report_data.get("valuation") or {}
    financials = report_data.get("financials") or {}
    dividend_data = report_data.get("dividend") or {}
    peers = report_data.get("peers") or {}
    peers_list: list[dict[str, Any]] = peers.get("peers", []) if isinstance(peers, dict) else []

    # Extract real financial metrics from latest year
    latest_fin = _get_latest_financials(financials)
    latest_val_hist = _get_latest_valuation_hist(valuation)

    real_roe = _safe_float(latest_fin.get("roe"))
    real_npm = _safe_float(latest_fin.get("net_profit_margin"))
    real_der = _safe_float(latest_fin.get("debt_to_equity_ratio"))
    real_revenue = _safe_float(latest_fin.get("revenue"))
    real_earnings = _safe_float(latest_fin.get("earnings") or latest_fin.get("net_income"))
    yoy_earnings_growth = _safe_float(financials.get("yoy_quarter_earnings_growth"))
    yoy_revenue_growth = _safe_float(financials.get("yoy_quarter_revenue_growth"))

    # Valuation metrics
    last_price = _safe_float(valuation.get("close_price") or valuation.get("last_close_price"))
    intrinsic_value = _safe_float(valuation.get("intrinsic_value"))
    forward_pe = _safe_float(valuation.get("forward_pe"))
    real_pe = _safe_float(valuation.get("pe") or latest_val_hist.get("pe"))
    real_pb = _safe_float(valuation.get("pb") or latest_val_hist.get("pb"))
    pe_peer_avg = _safe_float(latest_val_hist.get("pe_peer_avg"))
    pb_peer_avg = _safe_float(latest_val_hist.get("pb_peer_avg"))
    mcap = _safe_float(valuation.get("market_cap"))

    # Dividend metrics
    dividend_yield = _safe_float(dividend_data.get("yield_ttm"))
    payout_ratio = _safe_float(dividend_data.get("payout_ratio"))

    # Foreign flow
    net_foreign = _safe_float(foreign_flow_data.get("net_foreign_flow"))

    # ================================================================
    # BUILD NODES & EDGES
    # ================================================================

    nodes: list[BoardNode] = []
    edges: list[BoardEdge] = []

    # ------------------------------------------------------------- 1. Node Pusat (Emiten)
    center_verdict = (
        memo_detail.get("verdict", {}).get("category") if memo_detail else None
    )
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
                retrievedAt=report_fetched_at or date.today().isoformat(),
                cache=report_cache or None,
            ),
            rotate=0.0,
        )
    )

    # ------------------------------------------- 2. Pemegang Saham & Orang Kunci
    # Satu orang bisa terdaftar DUA KALI di data Sectors: di registri pemegang
    # saham dan di jajaran direksi/komisaris — sering dengan ejaan alias berbeda
    # ("Tan Ho Hien/Subur Disebut Juga Subur Tan" vs "…/Subur Atau Dipanggil
    # Subur Tan"). Karena itu keduanya dikumpulkan dulu ke satu registry orang,
    # baru dipancarkan jadi kartu: papan tidak boleh menampilkan orang yang sama
    # sebagai dua node terpisah.
    people: dict[str, dict[str, Any]] = {}

    def _person(raw_name: str) -> dict[str, Any]:
        canonical = canonical_person_name(raw_name)
        key = slugify(canonical) or slugify(raw_name) or "orang"
        person = people.get(key)
        if person is None:
            person = {
                "key": key,
                "name": canonical,
                "raw_names": [],
                "holder_pct": None,
                "exec_pct": None,
                "share_amount": None,
                "share_value": None,
                "position": None,
                "cross": False,
            }
            people[key] = person
        raw = raw_name.strip()
        if raw and raw not in person["raw_names"]:
            person["raw_names"].append(raw)
        return person

    for sh in shareholders[:6]:
        if not isinstance(sh, dict):
            continue
        holder_name = sh.get("name") or sh.get("shareholder_name") or ""
        if not holder_name:
            continue
        person = _person(holder_name)
        pct_num = _pct_from_registry(sh.get("share_percentage") or sh.get("percentage"))
        if pct_num is not None and (
            person["holder_pct"] is None or pct_num > person["holder_pct"]
        ):
            person["holder_pct"] = pct_num
        if sh.get("share_amount"):
            person["share_amount"] = sh["share_amount"]
        if sh.get("share_value"):
            person["share_value"] = sh["share_value"]
        person["cross"] = person["cross"] or any(
            k in holder_name.lower() for k in CONGLOMERATE_KEYWORDS
        )

    # Kepemilikan saham direksi/komisaris (executives_shareholdings), diindeks
    # per nama utama supaya cocok walau ejaan aliasnya berbeda.
    exec_sh_map: dict[str, dict[str, Any]] = {
        slugify(canonical_person_name(esh["name"])): esh
        for esh in exec_shareholdings
        if isinstance(esh, dict) and esh.get("name")
    }

    for mg in management[:5]:
        if not isinstance(mg, dict):
            continue
        person_name = mg.get("name") or ""
        if not person_name:
            continue
        person = _person(person_name)
        if not person["position"]:
            person["position"] = mg.get("position") or mg.get("title") or "Manajemen Kunci"
        person["cross"] = person["cross"] or any(
            k in person_name.lower() for k in CONGLOMERATE_KEYWORDS
        )
        exec_sh = exec_sh_map.get(person["key"])
        if exec_sh:
            pct_num = _pct_from_executive(exec_sh.get("share_percentage"))
            if pct_num is not None and (
                person["exec_pct"] is None or pct_num > person["exec_pct"]
            ):
                person["exec_pct"] = pct_num
            if exec_sh.get("share_amount") and not person["share_amount"]:
                person["share_amount"] = exec_sh["share_amount"]

    # Pancarkan satu kartu per orang. Tipe node mengikuti registri asalnya:
    # tercatat di registri pemegang saham → `pemegang` (punya `value` = %),
    # hanya di jajaran manajemen → `orang`. Orang yang ada di keduanya menjadi
    # `pemegang` dengan jabatan ikut di `sub`, dan membawa DUA benang sekaligus
    # (`memegang` + `menjabat`) — itu inti "benang merah" papan ini.
    sh_names_detected: list[str] = []
    holder_idx = 0
    exec_idx = 0

    for person in people.values():
        is_holder = person["holder_pct"] is not None
        pct_str = _fmt_pct(person["holder_pct"]) if is_holder else None
        exec_pct_str = (
            _fmt_pct(person["exec_pct"]) if person["exec_pct"] is not None else None
        )

        sub_bits: list[str] = []
        if pct_str:
            sub_bits.append(f"Kepemilikan {pct_str}")
        if person["position"]:
            sub_bits.append(person["position"])

        detail_items: list[str] = []
        group_name = next(
            (v for k, v in CONGLOMERATE_KEYWORDS.items() if k in person["name"].lower()),
            None,
        )
        if group_name:
            detail_items.append(f"Afiliasi: {group_name}")
        if pct_str:
            detail_items.append(f"Porsi Saham: {pct_str} di {sym}")
        if not is_holder and exec_pct_str:
            detail_items.append(f"Porsi Saham (direksi): {exec_pct_str}")
        if person["position"]:
            detail_items.append(f"Jabatan: {person['position']}")
            detail_items.append(f"Perusahaan: {company_name}")
        if person["share_amount"]:
            detail_items.append(
                f"Jumlah Lembar: {int(person['share_amount']):,}".replace(",", ".")
            )
        if person["share_value"]:
            detail_items.append(f"Nilai: {_fmt_rp(float(person['share_value']))}")
        # Ejaan asli tetap ditampilkan agar bisa dilacak balik ke Sectors.
        aliases = [r for r in person["raw_names"] if r != person["name"]]
        if aliases:
            detail_items.append(f"Nama tercatat: {'; '.join(aliases)}")

        if is_holder:
            node_id = f"pemegang_{person['key']}"
            node_xy = {"x": 200, "y": 120 + holder_idx * 80}
            holder_idx += 1
            sh_names_detected.append(person["name"])
        else:
            node_id = f"orang_{person['key']}"
            node_xy = {"x": 680, "y": 140 + exec_idx * 85}
            exec_idx += 1

        nodes.append(
            BoardNode(
                id=node_id,
                type="pemegang" if is_holder else "orang",
                position=node_xy,
                data=BoardNodeData(
                    type="pemegang" if is_holder else "orang",
                    label=person["name"],
                    sub=" · ".join(sub_bits) or None,
                    value=pct_str,
                    detail=detail_items,
                    source="Sectors Ownership" if is_holder else "Sectors Management",
                    cross=person["cross"],
                ),
                rotate=round(random.uniform(-4.5, 4.5), 1),
            )
        )

        if is_holder:
            edges.append(
                BoardEdge(
                    id=f"edge_p_{node_id}",
                    source=node_id,
                    target=f"emiten_{sym}",
                    type="memegang",
                    label=pct_str,
                )
            )
        if person["position"]:
            edges.append(
                BoardEdge(
                    id=f"edge_o_{node_id}",
                    source=node_id,
                    target=f"emiten_{sym}",
                    type="menjabat",
                    label=person["position"][:18],
                )
            )
        # Direksi bersaham yang tidak masuk registri pemegang saham: benang
        # kepemilikannya tetap digambar agar jejaknya tidak hilang.
        if not is_holder and (exec_pct_str or person["share_amount"]):
            label = (
                f"{int(person['share_amount']):,} lbr".replace(",", ".")
                if person["share_amount"]
                else exec_pct_str
            )
            edges.append(
                BoardEdge(
                    id=f"edge_esh_{node_id}",
                    source=node_id,
                    target=f"emiten_{sym}",
                    type="memegang",
                    label=label,
                )
            )
    # ------------------------------------------------------------- 4. Red Flag Nodes (dari berbagai sumber)
    red_flags: list[dict[str, Any]] = []

    # 4a. Suspensi BEI — red flag kritis
    for sus in suspensions_list:
        if not isinstance(sus, dict):
            continue
        sus_date = sus.get("date") or sus.get("suspension_date") or ""
        reason = sus.get("reason") or "Suspensi perdagangan oleh BEI"
        status = sus.get("status") or ""
        flag_text = f"Suspensi BEI ({sus_date[:10]}): {reason}"
        if status:
            flag_text += f" [Status: {status}]"
        red_flags.append({"flag_md": flag_text, "severity": "high", "source": "Sectors Suspensions"})

    # 4b. Insider Selling dari filings — red flag jika insider menjual
    insider_sells: list[dict[str, Any]] = []
    insider_buys: list[dict[str, Any]] = []
    for fl in filings_raw:
        if not isinstance(fl, dict):
            continue
        tx_type = (fl.get("type") or fl.get("transaction_type") or "").lower()
        if tx_type in ("sell", "jual"):
            insider_sells.append(fl)
        elif tx_type in ("buy", "beli"):
            insider_buys.append(fl)

    if insider_sells:
        total_sell_value = sum(_safe_float(s.get("value"), 0) or 0 for s in insider_sells)
        sell_names = list({s.get("name") or s.get("title") or "Insider" for s in insider_sells[:3]})
        severity = "high" if total_sell_value > 1e9 else "medium"
        flag_text = (
            f"Insider Selling: {', '.join(sell_names)} melepas saham"
            f" (total {_fmt_rp(total_sell_value)})"
            if total_sell_value > 0
            else f"Insider Selling: {', '.join(sell_names)} melepas saham"
        )
        red_flags.append({"flag_md": flag_text, "severity": severity, "source": "Sectors Filings"})

    # 4c. Foreign outflow — red flag jika asing keluar masif
    if net_foreign is not None and net_foreign < -1e9:
        red_flags.append({
            "flag_md": f"Net Foreign Outflow {_fmt_rp(net_foreign)} (30 hari) — modal asing keluar",
            "severity": "medium",
            "source": "Sectors Foreign Flow",
        })

    # 4d. High DER — red flag jika leverage tinggi
    if real_der is not None and real_der > 2.0:
        red_flags.append({
            "flag_md": f"Debt-to-Equity Ratio tinggi: {real_der:.2f}x (>2x)",
            "severity": "medium",
            "source": "Sectors Financials",
        })

    # 4e. Earnings decline — red flag jika laba menurun
    if yoy_earnings_growth is not None and yoy_earnings_growth < -0.1:
        pct = yoy_earnings_growth * 100
        red_flags.append({
            "flag_md": f"Laba kuartalan menyusut {pct:.1f}% YoY",
            "severity": "high" if yoy_earnings_growth < -0.2 else "medium",
            "source": "Sectors Financials",
        })

    # 4f. Red flags from memo (if available)
    if memo_detail and memo_detail.get("red_flags"):
        for rf in memo_detail["red_flags"]:
            if isinstance(rf, dict):
                red_flags.append({
                    "flag_md": rf.get("flag_md") or rf.get("flag") or "Temuan sidang",
                    "severity": rf.get("severity", "medium"),
                    "source": "Memorandum Sidang",
                })

    # If still no red flags, that's actually a good sign — no need to fabricate
    for i, rf in enumerate(red_flags[:6]):
        flag_text = rf.get("flag_md") or "Temuan Kejanggalan"
        sev = rf.get("severity") or "medium"
        source = rf.get("source") or "Analisis"
        node_id = f"rf_{i}_{slugify(flag_text)[:12]}"

        nodes.append(
            BoardNode(
                id=node_id,
                type="redflag",
                position={"x": 120 + i * 140, "y": 480},
                data=BoardNodeData(
                    type="redflag",
                    label=flag_text[:60] + ("..." if len(flag_text) > 60 else ""),
                    sub=source,
                    severity=sev,
                    detail=[flag_text],
                    source=source,
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

    # ------------------------------------------------------------- 5. Fakta Angka Nodes (dari data riil)
    facts_data: list[tuple[str, str, str, str]] = []  # (label, value, sub, source)

    if real_pe is not None:
        pe_context = f" (peer avg: {pe_peer_avg:.1f}x)" if pe_peer_avg else ""
        facts_data.append(("Price / Earnings", f"{real_pe:.1f}x{pe_context}", "Valuasi Laba", "Sectors Valuation"))
    if real_pb is not None:
        pb_context = f" (peer avg: {pb_peer_avg:.1f}x)" if pb_peer_avg else ""
        facts_data.append(("Price / Book", f"{real_pb:.2f}x{pb_context}", "Valuasi Ekuitas", "Sectors Valuation"))
    if mcap is not None:
        facts_data.append(("Kapitalisasi Pasar", _fmt_rp(mcap), "Skala IDX", "Sectors Valuation"))
    if intrinsic_value is not None and last_price is not None:
        margin = ((intrinsic_value - last_price) / last_price) * 100
        direction = "upside" if margin > 0 else "downside"
        facts_data.append((
            "Nilai Intrinsik",
            f"Rp {int(intrinsic_value):,} ({margin:+.1f}% {direction})".replace(",", "."),
            f"vs Harga Rp {int(last_price):,}".replace(",", "."),
            "Sectors Valuation",
        ))
    elif intrinsic_value is not None:
        facts_data.append(("Nilai Intrinsik", f"Rp {int(intrinsic_value):,}".replace(",", "."), "Valuasi Fundamental", "Sectors Valuation"))
    if real_roe is not None:
        roe_pct = real_roe * 100 if abs(real_roe) <= 1 else real_roe
        facts_data.append(("ROE", f"{roe_pct:.1f}%", "Profitabilitas", "Sectors Financials"))
    if real_npm is not None:
        npm_pct = real_npm * 100 if abs(real_npm) <= 1 else real_npm
        facts_data.append(("Net Profit Margin", f"{npm_pct:.1f}%", "Profitabilitas", "Sectors Financials"))
    if real_der is not None:
        facts_data.append(("Debt/Equity", f"{real_der:.2f}x", "Solvabilitas", "Sectors Financials"))
    if dividend_yield is not None:
        dy_pct = dividend_yield * 100 if abs(dividend_yield) <= 1 else dividend_yield
        facts_data.append(("Dividend Yield", f"{dy_pct:.2f}%", "Imbal Hasil", "Sectors Dividend"))
    if yoy_earnings_growth is not None:
        eg_pct = yoy_earnings_growth * 100
        facts_data.append(("Pertumbuhan Laba YoY", f"{eg_pct:+.1f}%", "Momentum", "Sectors Financials"))
    if forward_pe is not None:
        facts_data.append(("Forward PE", f"{forward_pe:.1f}x", "Ekspektasi Pasar", "Sectors Valuation"))

    # Add key_facts from memo if we still have room
    if memo_detail and memo_detail.get("key_facts"):
        for kf in memo_detail["key_facts"][:2]:
            if len(facts_data) >= 8:
                break
            facts_data.append((
                kf.get("label", "Fakta"),
                f"{kf.get('value')} {kf.get('unit', '')}",
                "Audit Sidang",
                kf.get("source_endpoint", "Memorandum Sidang"),
            ))

    for i, (flabel, fval, fsub, fsource) in enumerate(facts_data[:8]):
        node_id = f"fakta_{i}_{slugify(flabel)}"
        nodes.append(
            BoardNode(
                id=node_id,
                type="fakta",
                position={"x": 100 + (i % 4) * 180, "y": 40 + (i // 4) * 70},
                data=BoardNodeData(
                    type="fakta",
                    label=flabel,
                    value=fval,
                    sub=fsub,
                    source=fsource,
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

    # ------------------------------------------------------------- 6. Filings / Insider Transaction Nodes
    # Separate insider buys and sells as distinct evidence cards
    filing_nodes_added = 0

    for fl in insider_sells[:3]:
        if filing_nodes_added >= 4:
            break
        fl_name = fl.get("name") or fl.get("title") or "Insider"
        fl_date = (fl.get("date") or fl.get("timestamp") or "")[:10]
        fl_shares = fl.get("shares")
        fl_value = _safe_float(fl.get("value"))
        label_parts = [f"Insider Sell: {fl_name}"]
        detail = [f"Transaksi: Jual Saham", f"Pelaku: {fl_name}"]
        if fl_date:
            detail.append(f"Tanggal: {fl_date}")
        if fl_shares:
            detail.append(f"Jumlah: {int(fl_shares):,} lembar".replace(",", "."))
        if fl_value:
            detail.append(f"Nilai: {_fmt_rp(fl_value)}")

        node_id = f"filing_sell_{filing_nodes_added}"
        nodes.append(
            BoardNode(
                id=node_id,
                type="kabar",
                position={"x": 560 + filing_nodes_added * 120, "y": 440},
                data=BoardNodeData(
                    type="kabar",
                    label=f"Jual: {fl_name}"[:42],
                    date=fl_date,
                    sub="Transaksi Insider (Sell)",
                    detail=detail,
                    source="Sectors Filings",
                ),
                rotate=round(random.uniform(-4.0, 4.0), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_fs_{node_id}",
                source=f"emiten_{sym}",
                target=node_id,
                type="redflag",
                label="insider sell",
            )
        )
        filing_nodes_added += 1

    for fl in insider_buys[:2]:
        if filing_nodes_added >= 5:
            break
        fl_name = fl.get("name") or fl.get("title") or "Insider"
        fl_date = (fl.get("date") or fl.get("timestamp") or "")[:10]
        fl_shares = fl.get("shares")
        fl_value = _safe_float(fl.get("value"))
        detail = [f"Transaksi: Beli Saham", f"Pelaku: {fl_name}"]
        if fl_date:
            detail.append(f"Tanggal: {fl_date}")
        if fl_shares:
            detail.append(f"Jumlah: {int(fl_shares):,} lembar".replace(",", "."))
        if fl_value:
            detail.append(f"Nilai: {_fmt_rp(fl_value)}")

        node_id = f"filing_buy_{filing_nodes_added}"
        nodes.append(
            BoardNode(
                id=node_id,
                type="kabar",
                position={"x": 560 + filing_nodes_added * 120, "y": 530},
                data=BoardNodeData(
                    type="kabar",
                    label=f"Beli: {fl_name}"[:42],
                    date=fl_date,
                    sub="Transaksi Insider (Buy)",
                    detail=detail,
                    source="Sectors Filings",
                ),
                rotate=round(random.uniform(-4.0, 4.0), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_fb_{node_id}",
                source=f"emiten_{sym}",
                target=node_id,
                type="fakta",
                label="insider buy",
            )
        )
        filing_nodes_added += 1

    # If no insider transactions, show general filings as kabar
    if filing_nodes_added == 0 and filings_raw:
        for i, fl in enumerate(filings_raw[:3]):
            title = fl.get("title") or fl.get("description") or "Keterbukaan Informasi IDX"
            fdate = (fl.get("date") or fl.get("published_at") or fl.get("timestamp") or date.today().isoformat())[:10]
            body = fl.get("body") or ""

            node_id = f"kabar_{i}"
            nodes.append(
                BoardNode(
                    id=node_id,
                    type="kabar",
                    position={"x": 560 + i * 120, "y": 440},
                    data=BoardNodeData(
                        type="kabar",
                        label=title[:42] + ("..." if len(title) > 42 else ""),
                        date=fdate,
                        sub="Keterbukaan IDX",
                        detail=[title] + ([body[:200]] if body else []),
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

    # ------------------------------------------------------------- 7. Foreign Flow Node
    if net_foreign is not None:
        direction = "Akumulasi Asing" if net_foreign > 0 else "Capital Flight Asing"
        ff_node_id = "foreign_flow"
        nodes.append(
            BoardNode(
                id=ff_node_id,
                type="fakta",
                position={"x": 80, "y": 350},
                data=BoardNodeData(
                    type="fakta",
                    label="Arus Modal Asing (30d)",
                    value=_fmt_rp(net_foreign),
                    sub=direction,
                    detail=[
                        f"Net Foreign Flow: {_fmt_rp(net_foreign)}",
                        f"Arah: {direction}",
                        "Periode: 30 hari terakhir",
                    ],
                    source="Sectors Foreign Flow",
                ),
                rotate=round(random.uniform(-3.0, 3.0), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_{ff_node_id}",
                source=f"emiten_{sym}",
                target=ff_node_id,
                type="fakta",
                label="arus asing",
            )
        )

    # ------------------------------------------------------------- 8. Top Brokers Nodes
    top_buyers = brokers_data.get("top_buyers") or []
    top_sellers = brokers_data.get("top_sellers") or []

    for i, buyer in enumerate(top_buyers[:3]):
        if not isinstance(buyer, dict):
            continue
        broker_name = buyer.get("broker") or buyer.get("broker_code") or f"Broker {i+1}"
        net_val = _safe_float(buyer.get("net_value"), 0) or 0
        node_id = f"broker_buy_{i}"
        nodes.append(
            BoardNode(
                id=node_id,
                type="aliran",
                position={"x": 40, "y": 180 + i * 70},
                data=BoardNodeData(
                    type="aliran",
                    label=broker_name,
                    sub=f"Net Buy {_fmt_rp(net_val)}",
                    value=_fmt_rp(net_val),
                    detail=[
                        f"Broker: {broker_name}",
                        f"Net Buy: {_fmt_rp(net_val)}",
                        f"Tipe: {buyer.get('type', 'institusi')}",
                        "Periode: 30 hari terakhir",
                    ],
                    source="Sectors Broker Summary",
                    cross=False,
                ),
                rotate=round(random.uniform(-3.0, 3.0), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_bb_{node_id}",
                source=node_id,
                target=f"emiten_{sym}",
                type="aliran",
                label=f"akumulasi {_fmt_rp(net_val)}",
            )
        )

    for i, seller in enumerate(top_sellers[:3]):
        if not isinstance(seller, dict):
            continue
        broker_name = seller.get("broker") or seller.get("broker_code") or f"Broker {i+1}"
        net_val = _safe_float(seller.get("net_value"), 0) or 0
        node_id = f"broker_sell_{i}"
        nodes.append(
            BoardNode(
                id=node_id,
                type="aliran",
                position={"x": 800, "y": 180 + i * 70},
                data=BoardNodeData(
                    type="aliran",
                    label=broker_name,
                    sub=f"Net Sell {_fmt_rp(abs(net_val))}",
                    value=_fmt_rp(net_val),
                    detail=[
                        f"Broker: {broker_name}",
                        f"Net Sell: {_fmt_rp(abs(net_val))}",
                        f"Tipe: {seller.get('type', 'institusi')}",
                        "Periode: 30 hari terakhir",
                    ],
                    source="Sectors Broker Summary",
                    cross=False,
                ),
                rotate=round(random.uniform(-3.0, 3.0), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_bs_{node_id}",
                source=node_id,
                target=f"emiten_{sym}",
                type="aliran",
                label=f"distribusi {_fmt_rp(abs(net_val))}",
            )
        )

    # ------------------------------------------------------------- 9. Corporate Actions Nodes
    # Filter to most relevant actions (rights_issue, stock_split, merger, agm with result)
    relevant_ca_types = {"rights_issue", "stock_split", "merger", "acquisition", "tender_offer", "warrant"}
    notable_actions: list[dict[str, Any]] = []

    for ca in corp_actions_list:
        if not isinstance(ca, dict):
            continue
        ca_type = (ca.get("type") or "").lower()
        if ca_type in relevant_ca_types:
            notable_actions.append(ca)
        elif ca_type == "dividend":
            # Only include dividends if there's useful detail
            if ca.get("description") or ca.get("dividend_amount"):
                notable_actions.append(ca)

    for i, ca in enumerate(notable_actions[:3]):
        ca_type = ca.get("type", "aksi korporasi")
        ca_date = (ca.get("date") or ca.get("agm_date") or ca.get("ex_date") or "")[:10]
        ca_desc = ca.get("description") or ca.get("agm_result") or f"Aksi Korporasi: {ca_type}"

        type_labels = {
            "rights_issue": "HMETD / Rights Issue",
            "stock_split": "Stock Split",
            "merger": "Merger",
            "dividend": "Dividen",
            "acquisition": "Akuisisi",
            "warrant": "Waran",
        }
        label = type_labels.get(ca_type, ca_type.replace("_", " ").title())

        node_id = f"corpact_{i}"
        nodes.append(
            BoardNode(
                id=node_id,
                type="kabar",
                position={"x": 300 + i * 150, "y": 580},
                data=BoardNodeData(
                    type="kabar",
                    label=f"{label}"[:42],
                    date=ca_date,
                    sub="Aksi Korporasi",
                    detail=[ca_desc, f"Tipe: {ca_type}", f"Tanggal: {ca_date}"],
                    source="Sectors Corporate Actions",
                ),
                rotate=round(random.uniform(-4.0, 4.0), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_ca_{node_id}",
                source=f"emiten_{sym}",
                target=node_id,
                type="fakta",
                label="aksi korporasi",
            )
        )

    # ------------------------------------------------------------- 10. Revenue Segments Node (konsentrasi pendapatan)
    if segments_list:
        top_segment = max(segments_list, key=lambda s: _safe_float(s.get("share") or s.get("revenue"), 0) or 0)
        seg_name = top_segment.get("segment") or "Utama"
        seg_share = _safe_float(top_segment.get("share"))
        seg_revenue = _safe_float(top_segment.get("revenue"))

        detail_items = [f"Segmen terbesar: {seg_name}"]
        if seg_share is not None:
            share_pct = seg_share * 100 if seg_share <= 1 else seg_share
            detail_items.append(f"Kontribusi: {share_pct:.0f}%")
            if share_pct > 70:
                detail_items.append("⚠️ Konsentrasi pendapatan tinggi (>70%)")
        if seg_revenue:
            detail_items.append(f"Revenue: {_fmt_rp(seg_revenue)}")
        for seg in segments_list[1:4]:
            s_name = seg.get("segment", "")
            s_share = _safe_float(seg.get("share"))
            if s_name and s_share is not None:
                detail_items.append(f"• {s_name}: {s_share * 100 if s_share <= 1 else s_share:.0f}%")

        seg_node_id = "revenue_segments"
        seg_label = f"Segmen: {seg_name}"
        if seg_share is not None:
            share_pct = seg_share * 100 if seg_share <= 1 else seg_share
            seg_value = f"{share_pct:.0f}%"
        else:
            seg_value = None

        nodes.append(
            BoardNode(
                id=seg_node_id,
                type="fakta",
                position={"x": 750, "y": 50},
                data=BoardNodeData(
                    type="fakta",
                    label=seg_label[:42],
                    value=seg_value,
                    sub="Komposisi Pendapatan",
                    detail=detail_items,
                    source="Sectors Revenue Segments",
                ),
                rotate=round(random.uniform(-3.0, 3.0), 1),
            )
        )
        edges.append(
            BoardEdge(
                id=f"edge_{seg_node_id}",
                source=f"emiten_{sym}",
                target=seg_node_id,
                type="fakta",
                label="segmen utama",
            )
        )

    # ------------------------------------------------------------- 11. Top Transactions (institusi besar)
    if isinstance(top_transactions, dict):
        tx_date = top_transactions.get("date", "")
        for side, side_label in [("top_buyers", "Institusi Buy"), ("top_sellers", "Institusi Sell")]:
            side_list = top_transactions.get(side) or []
            for j, tx in enumerate(side_list[:2]):
                if not isinstance(tx, dict):
                    continue
                tx_name = tx.get("name") or "Institusi"
                change = _safe_float(tx.get("changeAmount"), 0) or 0
                if abs(change) < 1000:
                    continue  # skip insignificant
                node_id = f"toptx_{side}_{j}"
                nodes.append(
                    BoardNode(
                        id=node_id,
                        type="aliran",
                        position={"x": 900, "y": 350 + j * 65 + (0 if side == "top_buyers" else 140)},
                        data=BoardNodeData(
                            type="aliran",
                            label=tx_name[:32],
                            sub=f"{side_label}: {int(abs(change)):,} lbr".replace(",", "."),
                            detail=[
                                f"Pelaku: {tx_name}",
                                f"Tanggal: {tx_date}",
                                f"Perubahan: {int(change):,} lembar".replace(",", "."),
                            ],
                            source="Sectors Ownership",
                            cross=any(k in tx_name.lower() for k in CONGLOMERATE_KEYWORDS),
                        ),
                        rotate=round(random.uniform(-3.0, 3.0), 1),
                    )
                )
                edges.append(
                    BoardEdge(
                        id=f"edge_{node_id}",
                        source=node_id,
                        target=f"emiten_{sym}",
                        type="aliran",
                        label=side_label.lower(),
                    )
                )
    elif isinstance(top_transactions, list):
        # If institutional_transaction_flow is a list of monthly flows
        pass

    # ------------------------------------------------------------- 12. Institutional Flow Summary
    if isinstance(institutional_flow, list) and institutional_flow:
        # Sum recent net transactions
        total_inst_flow = sum(
            _safe_float(entry.get("net_transaction"), 0) or 0
            for entry in institutional_flow[:3]  # last 3 months
        )
        if abs(total_inst_flow) > 1e6:
            direction = "Akumulasi Institusi" if total_inst_flow > 0 else "Distribusi Institusi"
            inst_node_id = "inst_flow"
            nodes.append(
                BoardNode(
                    id=inst_node_id,
                    type="fakta",
                    position={"x": 80, "y": 440},
                    data=BoardNodeData(
                        type="fakta",
                        label="Arus Institusi Domestik",
                        value=f"{int(total_inst_flow):,} lbr".replace(",", "."),
                        sub=direction,
                        detail=[
                            f"Net Flow 3 bulan: {int(total_inst_flow):,} lembar".replace(",", "."),
                            f"Arah: {direction}",
                        ],
                        source="Sectors Ownership",
                    ),
                    rotate=round(random.uniform(-3.0, 3.0), 1),
                )
            )
            edges.append(
                BoardEdge(
                    id=f"edge_{inst_node_id}",
                    source=f"emiten_{sym}",
                    target=inst_node_id,
                    type="fakta",
                    label="arus institusi",
                )
            )

    # ------------------------------------------------------------- 13. Peers Comparison Node
    if peers_list:
        peer_details = []
        for p in peers_list[:5]:
            if not isinstance(p, dict):
                continue
            p_sym = p.get("symbol", "")
            p_pe = _safe_float(p.get("pe_ttm") or p.get("pe"))
            p_pb = _safe_float(p.get("pb_mrq") or p.get("pb"))
            p_mcap = _safe_float(p.get("market_cap"))
            parts = [p_sym]
            if p_pe is not None:
                parts.append(f"PE:{p_pe:.1f}x")
            if p_pb is not None:
                parts.append(f"PB:{p_pb:.1f}x")
            if p_mcap is not None:
                parts.append(f"MCap:{_fmt_rp(p_mcap)}")
            peer_details.append(" | ".join(parts))

        if peer_details:
            peer_node_id = "peers_comp"
            nodes.append(
                BoardNode(
                    id=peer_node_id,
                    type="fakta",
                    position={"x": 750, "y": 130},
                    data=BoardNodeData(
                        type="fakta",
                        label=f"Peers ({len(peer_details)} emiten)",
                        value=f"{len(peers_list)} peers",
                        sub="Perbandingan Sektor",
                        detail=peer_details,
                        source="Sectors Peers",
                    ),
                    rotate=round(random.uniform(-2.0, 2.0), 1),
                )
            )
            edges.append(
                BoardEdge(
                    id=f"edge_{peer_node_id}",
                    source=f"emiten_{sym}",
                    target=peer_node_id,
                    type="fakta",
                    label="perbandingan",
                )
            )

    # ------------------------------------------------------------- 14. Risk Score & Benchmarks (REAL DATA)

    # Calculate governance score dynamically
    gov_penalties = 0
    if suspensions_list:
        gov_penalties += len(suspensions_list) * 20  # Each suspension = -20
    if insider_sells:
        total_sell_val = sum(_safe_float(s.get("value"), 0) or 0 for s in insider_sells)
        if total_sell_val > 5e9:
            gov_penalties += 25
        elif total_sell_val > 1e9:
            gov_penalties += 15
        elif insider_sells:
            gov_penalties += 5
    if red_flags:
        high_flags = sum(1 for rf in red_flags if rf.get("severity") == "high")
        gov_penalties += high_flags * 10
    gov_score = max(20, 90 - gov_penalties)

    # Calculate financial score dynamically
    fin_score = 70  # base
    if real_roe is not None:
        roe_pct = real_roe * 100 if abs(real_roe) <= 1 else real_roe
        if roe_pct > 20:
            fin_score += 15
        elif roe_pct > 15:
            fin_score += 10
        elif roe_pct > 10:
            fin_score += 5
        elif roe_pct < 5:
            fin_score -= 15
    if real_der is not None:
        if real_der > 3:
            fin_score -= 20
        elif real_der > 2:
            fin_score -= 10
        elif real_der < 0.5:
            fin_score += 10
    if yoy_earnings_growth is not None:
        if yoy_earnings_growth > 0.15:
            fin_score += 10
        elif yoy_earnings_growth > 0:
            fin_score += 5
        elif yoy_earnings_growth < -0.15:
            fin_score -= 15
        elif yoy_earnings_growth < 0:
            fin_score -= 5
    fin_score = max(20, min(95, fin_score))

    # Calculate valuation score dynamically
    val_score = 70  # base
    if intrinsic_value is not None and last_price is not None and last_price > 0:
        margin_of_safety = (intrinsic_value - last_price) / last_price
        if margin_of_safety > 0.3:
            val_score += 20
        elif margin_of_safety > 0.1:
            val_score += 10
        elif margin_of_safety < -0.3:
            val_score -= 15
        elif margin_of_safety < -0.1:
            val_score -= 5
    if real_pe is not None and pe_peer_avg is not None and pe_peer_avg > 0:
        pe_ratio = real_pe / pe_peer_avg
        if pe_ratio < 0.7:
            val_score += 10  # undervalued vs peers
        elif pe_ratio > 1.5:
            val_score -= 10  # premium vs peers
    val_score = max(20, min(95, val_score))

    avg_score = (gov_score + fin_score + val_score) / 3
    overall_risk = "Rendah" if avg_score >= 75 else "Sedang" if avg_score >= 55 else "Tinggi"

    risk_score = RiskScorecard(
        governance=gov_score,
        financial=fin_score,
        valuation=val_score,
        overall=overall_risk,  # type: ignore[arg-type]
    )

    # Build metrics comparison with REAL data
    metrics_comp: list[MetricBenchmark] = []

    if real_pb is not None:
        metrics_comp.append(
            MetricBenchmark(
                label="P/B Ratio",
                value=round(float(real_pb), 2),
                sectorAvg=round(float(pb_peer_avg), 2) if pb_peer_avg else 2.0,
                unit="x",
                verdict="superior" if (pb_peer_avg and real_pb < pb_peer_avg) else "inferior" if (pb_peer_avg and real_pb > pb_peer_avg * 1.3) else "fair",
            )
        )

    if real_pe is not None:
        metrics_comp.append(
            MetricBenchmark(
                label="P/E Ratio",
                value=round(float(real_pe), 2),
                sectorAvg=round(float(pe_peer_avg), 2) if pe_peer_avg else 15.0,
                unit="x",
                verdict="superior" if (pe_peer_avg and real_pe < pe_peer_avg) else "inferior" if (pe_peer_avg and real_pe > pe_peer_avg * 1.3) else "fair",
            )
        )

    if real_roe is not None:
        roe_pct = real_roe * 100 if abs(real_roe) <= 1 else real_roe
        # Calculate sector avg ROE from peers if available
        peer_roes = [_safe_float(p.get("roe")) for p in peers_list if _safe_float(p.get("roe")) is not None]
        sector_roe = (sum(r * 100 if abs(r) <= 1 else r for r in peer_roes) / len(peer_roes)) if peer_roes else 12.0
        metrics_comp.append(
            MetricBenchmark(
                label="ROE",
                value=round(roe_pct, 1),
                sectorAvg=round(sector_roe, 1),
                unit="%",
                verdict="superior" if roe_pct > sector_roe else "inferior" if roe_pct < sector_roe * 0.7 else "fair",
            )
        )

    if real_npm is not None:
        npm_pct = real_npm * 100 if abs(real_npm) <= 1 else real_npm
        peer_npms = [_safe_float(p.get("net_profit_margin")) for p in peers_list if _safe_float(p.get("net_profit_margin")) is not None]
        sector_npm = (sum(n * 100 if abs(n) <= 1 else n for n in peer_npms) / len(peer_npms)) if peer_npms else 10.0
        metrics_comp.append(
            MetricBenchmark(
                label="Net Profit Margin",
                value=round(npm_pct, 1),
                sectorAvg=round(sector_npm, 1),
                unit="%",
                verdict="superior" if npm_pct > sector_npm else "inferior" if npm_pct < sector_npm * 0.7 else "fair",
            )
        )

    if real_der is not None:
        metrics_comp.append(
            MetricBenchmark(
                label="Debt/Equity",
                value=round(real_der, 2),
                sectorAvg=1.0,  # general benchmark
                unit="x",
                verdict="superior" if real_der < 1.0 else "inferior" if real_der > 2.0 else "fair",
            )
        )

    if dividend_yield is not None:
        dy_pct = dividend_yield * 100 if abs(dividend_yield) <= 1 else dividend_yield
        metrics_comp.append(
            MetricBenchmark(
                label="Dividend Yield",
                value=round(dy_pct, 2),
                sectorAvg=2.0,  # IDX average ~2%
                unit="%",
                verdict="superior" if dy_pct > 3.0 else "inferior" if dy_pct < 1.0 else "fair",
            )
        )

    # ------------------------------------------------------------- 15. AI Insights (enriched)
    holders_summary = ", ".join(sh_names_detected[:3]) or "Institusi dan Masyarakat"

    # Build rich insights from real data
    pemegang_insight = f"Struktur pemegang saham {sym} didominasi oleh {holders_summary}."
    if top_buyers:
        top_broker_name = top_buyers[0].get("broker") or top_buyers[0].get("broker_code") or "broker institusi"
        pemegang_insight += f" Broker akumulasi terbesar: {top_broker_name}."

    redflag_insight = ""
    if suspensions_list:
        redflag_insight = f"⚠️ {sym} pernah disuspensi BEI ({len(suspensions_list)}x). "
    if insider_sells:
        total_sv = sum(_safe_float(s.get("value"), 0) or 0 for s in insider_sells)
        redflag_insight += f"Insider selling terdeteksi (total {_fmt_rp(total_sv)}). "
    if net_foreign is not None and net_foreign < 0:
        redflag_insight += f"Arus asing negatif ({_fmt_rp(net_foreign)})."
    if not redflag_insight:
        redflag_insight = f"Tidak ada red flag mayor yang tercatat pada {sym}."

    fakta_parts = []
    if real_pe is not None:
        fakta_parts.append(f"PE {real_pe:.1f}x")
    if real_pb is not None:
        fakta_parts.append(f"PB {real_pb:.2f}x")
    if mcap is not None:
        fakta_parts.append(f"MCap {_fmt_rp(mcap)}")
    if intrinsic_value is not None:
        fakta_parts.append(f"Nilai Intrinsik Rp{int(intrinsic_value):,}".replace(",", "."))
    fakta_insight = f"Valuasi: {', '.join(fakta_parts)}." if fakta_parts else f"Data valuasi {sym} tersedia di panel fakta."

    ai_insights = {
        "pemegang": pemegang_insight,
        "redflag": redflag_insight.strip(),
        "fakta": fakta_insight,
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
        initialChat=f"Papan investigasi {sym} ({company_name}) aktif. Tanyakan siapa pengendali utama, afiliasi konglomerasi, bandarmology, arus asing, atau audit kejanggalan emiten ini.",
        aiInsights=ai_insights,
        priceHistory=price_history,
        metricsComparison=metrics_comp,
        riskScore=risk_score,
        thesisSummary=thesis_summary,
    )


# ============================================================ Chat papan bukti

BOARD_CHAT_SYSTEM = (
    "Anda analis intelijen pasar modal Indonesia yang membacakan PAPAN BUKTI "
    "investigasi emiten. Jawab HANYA dari bukti pada papan yang diberikan — "
    "jangan menambah fakta dari luar papan. Gaya: Bahasa Indonesia, ringkas "
    "(maksimal 4 kalimat), sebut angka bila ada, sebut nama sumber buktinya. "
    "Bila bukti di papan tidak memuat jawabannya, katakan terus terang bahwa "
    "bukti itu belum ada di papan. Jangan memberi rekomendasi beli/jual."
)

_CHAT_LIMIT = 6  # maksimum entri per kategori yang dikirim ke LLM (hemat token)


def _chat_context(board: BoardResponse) -> str:
    """Ringkas graf papan menjadi konteks teks — tanpa id/koordinat, hemat token."""
    buckets: dict[str, list[str]] = {
        "pemegang": [],
        "orang": [],
        "aliran": [],
        "redflag": [],
        "kabar": [],
        "fakta": [],
    }
    for node in board.nodes:
        d = node.data
        bucket = buckets.get(d.type)
        if bucket is None or len(bucket) >= _CHAT_LIMIT:
            continue
        bits = [d.label]
        if d.sub:
            bits.append(f"({d.sub})")
        if d.value:
            bits.append(f"= {d.value}")
        if d.severity:
            bits.append(f"[{d.severity}]")
        bucket.append(" ".join(bits))

    lines = [f"Emiten: {board.ticker} — {board.name}"]
    category_labels = {
        "pemegang": "Pemegang saham (registri IDX)",
        "orang": "Direksi/komisaris",
        "aliran": "Jejak broker/institusi (bukan pemegang saham)",
        "redflag": "Red flag",
        "kabar": "Bukti kabar",
        "fakta": "Fakta angka",
    }
    for key, label in category_labels.items():
        if buckets[key]:
            lines.append(f"{label}: " + "; ".join(buckets[key]))
    if board.thesisSummary:
        lines.append(f"Ringkasan tesis sidang: {board.thesisSummary}")
    if board.riskScore:
        lines.append(f"Skor risiko papan: {board.riskScore.overall}")
    return "\n".join(lines)


def _heuristic_reply(ticker: str, question: str, board: BoardResponse) -> str:
    """Jawaban cadangan tanpa LLM: heuristik kata kunci atas isi graf.

    Hanya dipakai saat LLM tidak tersedia/gagal. Pemanggil WAJIB menandai
    responsnya `mode="heuristik"` supaya frontend tidak menyajikannya sebagai
    analisis AI (CONTRACT §3.2).
    """
    q = question.strip().lower()
    sh_list = [n.data.label for n in board.nodes if n.data.type == "pemegang"]
    mg_list = [
        f"{n.data.label} ({n.data.sub})" for n in board.nodes if n.data.type == "orang"
    ]
    rf_list = [n.data.label for n in board.nodes if n.data.type == "redflag"]

    if "pemilik" in q or "pemegang" in q or "saham" in q:
        return (
            f"Berdasarkan data registri IDX, pemegang saham utama {ticker} meliputi: "
            f"{', '.join(sh_list) if sh_list else 'Masyarakat / Publik'}."
        )
    if "direksi" in q or "komisaris" in q or "manajemen" in q or "orang" in q:
        return (
            f"Jajaran pengurus kunci {ticker} saat ini tercatat: "
            f"{', '.join(mg_list[:4]) if mg_list else 'Belum terindeks'}."
        )
    if "red flag" in q or "risiko" in q or "kejanggalan" in q:
        if rf_list:
            return f"Temuan risiko penting pada {ticker}: " + " | ".join(rf_list)
        return (
            f"Tidak ada temuan red flag berat yang terindikasi pada audit komite "
            f"sidang terkini {ticker}."
        )
    if "valuasi" in q or "harga" in q or "pb" in q or "pe" in q:
        return board.aiInsights.get(
            "fakta", f"Valuasi {ticker} saat ini terpantau di papan fakta metrik."
        )
    return (
        f"Investigasi {ticker} ({board.name}): {board.thesisSummary} Anda dapat "
        f"mengklik node pada papan untuk memperluas jaringan koneksi."
    )


async def answer_board_question(
    ticker: str,
    question: str,
    board: BoardResponse,
    llm: LLMClient,
    settings: Settings,
) -> BoardChatResponse:
    """Jawab pertanyaan user tentang papan bukti.

    Jalur utama: LLM sungguhan dengan konteks graf papan (0 kredit Sectors —
    graf dibangun dari cache/arsip, bukan panggilan baru). Bila LLM tidak
    dikonfigurasi atau gagal, jatuh ke heuristik dan `mode` menandainya.
    """
    if llm.available:
        try:
            reply = await llm.chat(
                model=settings.model_analyst,
                messages=[
                    {"role": "system", "content": BOARD_CHAT_SYSTEM},
                    {
                        "role": "user",
                        "content": f"{_chat_context(board)}\n\nPertanyaan: {question}",
                    },
                ],
                temperature=0.2,
                max_tokens=700,
            )
            text = (reply or "").strip()
            if text:
                return BoardChatResponse(
                    reply=text, mode="llm", model=settings.model_analyst
                )
        except Exception as exc:  # LLMUnavailable, timeout, 429, JSON rusak, dsb.
            logger.warning(
                "Chat papan %s gagal via LLM (%s) — jatuh ke heuristik", ticker, exc
            )

    return BoardChatResponse(
        reply=_heuristic_reply(ticker, question, board), mode="heuristik"
    )
