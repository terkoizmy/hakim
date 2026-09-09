"""Deterministic evidence extraction from raw Sectors responses.

Each analyst turns raw JSON into a small set of Evidence chips (headline +
facts). Extraction is rule-based so numbers are grounded in the data — the
LLM only writes prose summaries, never fabricates figures.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional, Union

Num = Union[float, int, str, None]


@dataclass
class EvidenceFact:
    label: str
    value: Num = None
    unit: Optional[str] = None


@dataclass
class Evidence:
    evidence_id: str
    source_endpoint: str
    headline: str
    facts: list[EvidenceFact] = field(default_factory=list)


def _num(value: Any) -> Num:
    if value is None:
        return None
    if isinstance(value, (int, float, str)):
        return value
    return None


def _pct(value: Any) -> Optional[float]:
    """Normalize a ratio to a percentage number (0.12 -> 12.0)."""
    if value is None:
        return None
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return round(v * 100, 1) if abs(v) <= 1 else round(v, 1)


def _endpoint(name: str, symbol: str, params_summary: str = "") -> str:
    base = f"/v2/{name}/{symbol}/" if symbol else f"/v2/{name}/"
    return f"{base}?{params_summary}" if params_summary else base


# ---------------------------------------------------------------------------
# Fundamental
# ---------------------------------------------------------------------------

def extract_fundamental(data: dict[str, Any], symbol: str) -> list[Evidence]:
    evs: list[Evidence] = []
    cr = data.get("company_report", {})
    val = cr.get("valuation", {})
    fin = cr.get("financials", {})
    peers = cr.get("peers", {}).get("peers", [])
    div = cr.get("dividend", {})
    hist = fin.get("historical_financials", {}).get("2025", {})

    fpe = _num(val.get("forward_pe"))
    peer_avg = _num(val.get("historical_valuation", {}).get("2025", {}).get("pe_peer_avg"))
    if fpe is not None:
        facts = [EvidenceFact("forward_pe", fpe, "x")]
        if peer_avg is not None:
            facts.append(EvidenceFact("pe_peer_avg", peer_avg, "x"))
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("company/report", symbol, "sections=valuation"),
            headline=f"Forward PE {fpe}x vs peer {peer_avg or 'n/a'}x",
            facts=facts,
        ))

    iv = _num(val.get("intrinsic_value"))
    if iv is not None:
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("company/report", symbol, "sections=valuation"),
            headline=f"Nilai intrinsik {iv:,} vs harga {_num(val.get('close_price')) or 'n/a'}",
            facts=[EvidenceFact("intrinsic_value", iv, "Rp")],
        ))

    roe = _num(hist.get("roe"))
    npm = _num(hist.get("net_profit_margin"))
    if roe is not None or npm is not None:
        facts = []
        if roe is not None:
            facts.append(EvidenceFact("roe_ttm", _pct(roe), "%"))
        if npm is not None:
            facts.append(EvidenceFact("net_profit_margin", _pct(npm), "%"))
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("company/report", symbol, "sections=financials"),
            headline=f"ROE {_pct(roe) or 'n/a'}%, margin laba {_pct(npm) or 'n/a'}%",
            facts=facts,
        ))

    rev_growth = _num(fin.get("yoy_quarter_revenue_growth"))
    earn_growth = _num(fin.get("yoy_quarter_earnings_growth"))
    if rev_growth is not None or earn_growth is not None:
        facts = []
        if rev_growth is not None:
            facts.append(EvidenceFact("yoy_revenue_growth", _pct(rev_growth), "%"))
        if earn_growth is not None:
            facts.append(EvidenceFact("yoy_earnings_growth", _pct(earn_growth), "%"))
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("company/report", symbol, "sections=financials"),
            headline=f"Pertumbuhan YoY: pendapatan {_pct(rev_growth) or 'n/a'}%, laba {_pct(earn_growth) or 'n/a'}%",
            facts=facts,
        ))

    if peers:
        best = min(peers, key=lambda p: p.get("pe_ttm") or 1e18)
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("company/report", symbol, "sections=peers"),
            headline=f"Valuasi vs {len(peers)} peer subsector (contoh {best.get('symbol')} PE {best.get('pe_ttm')}x)",
            facts=[EvidenceFact("n_peers", len(peers), "emiten")],
        ))

    yield_ttm = _num(div.get("yield_ttm"))
    if yield_ttm is not None:
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("company/report", symbol, "sections=dividend"),
            headline=f"Dividend yield TTM {_pct(yield_ttm)}%",
            facts=[EvidenceFact("yield_ttm", _pct(yield_ttm), "%")],
        ))

    return evs


# ---------------------------------------------------------------------------
# Price / momentum
# ---------------------------------------------------------------------------

def extract_price(data: dict[str, Any], symbol: str) -> list[Evidence]:
    evs: list[Evidence] = []
    daily = data.get("daily_transaction", {}).get("data", [])
    index = data.get("index_daily", {}).get("data", [])
    movers = data.get("top_movers", {}).get("data", [])

    if daily:
        first, last = daily[0], daily[-1]
        f_close = _num(first.get("close"))
        l_close = _num(last.get("close"))
        if f_close and l_close:
            momentum = round((float(l_close) - float(f_close)) / float(f_close) * 100, 1)
            evs.append(Evidence(
                evidence_id="",
                source_endpoint=_endpoint("transaction/daily", symbol, "start=90d&end=today"),
                headline=f"Momentum 90 hari {momentum:+.1f}% (harga {l_close:,} → {f_close:,})",
                facts=[EvidenceFact("momentum_90d", momentum, "%")],
            ))
        last_change = _num(last.get("change_pct"))
        if last_change is not None:
            evs.append(Evidence(
                evidence_id="",
                source_endpoint=_endpoint("transaction/daily", symbol, "start=90d&end=today"),
                headline=f"Perubahan harga terakhir {last_change:+.1f}%",
                facts=[EvidenceFact("last_change_pct", last_change, "%")],
            ))

    if index:
        i_first, i_last = index[0], index[-1]
        if i_first.get("close") and i_last.get("close"):
            idx_mom = round((float(i_last["close"]) - float(i_first["close"])) / float(i_first["close"]) * 100, 1)
            evs.append(Evidence(
                evidence_id="",
                source_endpoint=_endpoint("transaction/index-daily", "", "index=IDXCOMPOSITE"),
                headline=f"IHSG momentum 90 hari {idx_mom:+.1f}%",
                facts=[EvidenceFact("index_momentum_90d", idx_mom, "%")],
            ))

    if movers:
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("ranking/top-changes", "", "start=7d&end=today"),
            headline=f"Konteks movers: {len(movers)} saham bergerak besar (contoh {movers[0].get('symbol')} {movers[0].get('change_pct')}%)",
            facts=[EvidenceFact("n_movers", len(movers), "saham")],
        ))

    return evs


# ---------------------------------------------------------------------------
# Smart money
# ---------------------------------------------------------------------------

def extract_smartmoney(data: dict[str, Any], symbol: str) -> list[Evidence]:
    evs: list[Evidence] = []
    brokers = data.get("top_brokers", {})
    ff = data.get("foreign_flow", {})

    buyers = brokers.get("top_buyers", [])
    sellers = brokers.get("top_sellers", [])
    net_buy = sum(float(b.get("net_value") or 0) for b in buyers)
    net_sell = sum(float(s.get("net_value") or 0) for s in sellers)
    net = net_buy + net_sell
    if buyers or sellers:
        direction = "akumulasi" if net > 0 else "distribusi"
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("broker/top-buyers-sellers", symbol, "start=30d&end=today"),
            headline=f"Broker institusi: net {direction} Rp{abs(net)/1e9:.1f} M",
            facts=[EvidenceFact("broker_net_flow", round(net / 1e9, 1), "Rp M")],
        ))

    nff = _num(ff.get("net_foreign_flow"))
    if nff is not None:
        direction = "akumulasi" if float(nff) > 0 else "distribusi"
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("foreign-flow", symbol, "period=30d"),
            headline=f"Arus asing net {direction} Rp{abs(float(nff))/1e9:.1f} M",
            facts=[EvidenceFact("foreign_net_flow", round(float(nff) / 1e9, 1), "Rp M")],
        ))

    return evs


# ---------------------------------------------------------------------------
# Insider
# ---------------------------------------------------------------------------

def extract_insider(data: dict[str, Any], symbol: str) -> list[Evidence]:
    evs: list[Evidence] = []
    filings = data.get("filings", {}).get("filings", [])
    cr = data.get("company_report", {})
    owners = cr.get("ownership", {}).get("major_shareholders", [])

    buys = [f for f in filings if f.get("type") == "buy"]
    sells = [f for f in filings if f.get("type") == "sell"]
    if filings:
        direction = "beli" if len(buys) >= len(sells) else "jual"
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("news/filings", symbol, "filter=insider"),
            headline=f"Transaksi insider: {len(buys)} beli, {len(sells)} jual (net {direction})",
            facts=[
                EvidenceFact("insider_buys", len(buys), "transaksi"),
                EvidenceFact("insider_sells", len(sells), "transaksi"),
            ],
        ))

    if owners:
        top = owners[0]
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("company/report", symbol, "sections=ownership"),
            headline=f"Pemegang saham utama {top.get('name')} {_pct(top.get('share_percentage'))}%",
            facts=[EvidenceFact("top_shareholder_pct", _pct(top.get("share_percentage")), "%")],
        ))

    return evs


# ---------------------------------------------------------------------------
# Anti-gorengan
# ---------------------------------------------------------------------------

def extract_antigorengan(data: dict[str, Any], symbol: str) -> list[Evidence]:
    evs: list[Evidence] = []
    susp = data.get("suspensions", {}).get("suspensions", [])
    actions = data.get("corporate_actions", {}).get("corporate_actions", [])
    screener = data.get("screener", {}).get("results", [])

    if susp:
        latest = susp[-1]
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("news/suspensions", symbol, ""),
            headline=f"Riwayat suspensi: {len(susp)}x (terakhir {latest.get('date')}: {latest.get('reason')})",
            facts=[EvidenceFact("n_suspensions", len(susp), "kali")],
        ))

    if screener:
        row = screener[0]
        ff = _num(row.get("free_float"))
        if ff is not None:
            level = "rendah" if float(ff) < 0.1 else "normal"
            evs.append(Evidence(
                evidence_id="",
                source_endpoint=_endpoint("companies", "", "where=symbol in [...]"),
                headline=f"Free float {_pct(ff)}% ({level})",
                facts=[EvidenceFact("free_float", _pct(ff), "%")],
            ))

    risky = [a for a in actions if a.get("type") in ("rights_issue", "stock_split", "bonus", "warrant")]
    if risky:
        evs.append(Evidence(
            evidence_id="",
            source_endpoint=_endpoint("company/corporate-actions", symbol, ""),
            headline=f"Aksi korporasi berisiko: {len(risky)} (contoh {risky[0].get('type')})",
            facts=[EvidenceFact("n_risky_actions", len(risky), "aksi")],
        ))

    return evs
