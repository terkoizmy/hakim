"""Deterministic template fallbacks for analyst/debate/judge outputs.

Used when the LLM is not configured or unreachable (settings.llm_fallback_template).
Produces valid MemoJSON so the pipeline still completes in fixture demos.
"""

from __future__ import annotations

from typing import Any

from ..evidence import Evidence


def template_analyst_summary(display_name: str, evidence: list[Evidence]) -> tuple[str, str]:
    """Return (summary_md, data_richness)."""
    if not evidence:
        return (
            f"**{display_name}** — tidak ada data yang cukup untuk dianalisis.",
            "C",
        )
    lines = [f"**{display_name}** — ringkasan berbasis data (mode template):"]
    for ev in evidence:
        lines.append(f"- {ev.headline}")
    richness = "A" if len(evidence) >= 4 else ("B" if len(evidence) >= 2 else "C")
    return "\n".join(lines), richness


def template_debate_utterance(
    side: str,
    round_no: int,
    summaries: list[dict[str, Any]],
    evidence_pool: list[Evidence],
    rebuts_id: str | None,
) -> dict[str, Any]:
    """Return a debate_utterance payload dict."""
    if side == "prosecution":
        title = "Penuntutan: jalur kegagalan paling mungkin"
        picks = [ev for ev in evidence_pool if _is_bearish(ev)]
        fallback = "Data terbatas — verifikasi mandiri diperlukan sebelum membeli."
    else:
        title = "Pembelaan: mengapa saham ini layak diteliti lebih lanjut"
        picks = [ev for ev in evidence_pool if _is_bullish(ev)]
        fallback = "Data terbatas — namun tidak ditemukan red flag berat."

    cites = [ev.evidence_id for ev in picks[:3]]
    body = "\n".join(f"- {ev.headline}" for ev in picks[:3]) or fallback
    argument_md = (
        f"**{title}** (ronde {round_no})\n\n{body}\n\n"
        f"Bukti: {', '.join(cites) if cites else 'belum ada bukti terverifikasi'}."
    )
    return {
        "round": round_no,
        "side": side,
        "title": title,
        "argument_md": argument_md,
        "cites": cites,
        "rebuts": rebuts_id,
    }


def _is_bullish(ev: Evidence) -> bool:
    labels = {f.label for f in ev.facts}
    return bool(labels & {"forward_pe", "roe_ttm", "yield_ttm", "momentum_90d", "broker_net_flow", "foreign_net_flow", "insider_buys"})


def _is_bearish(ev: Evidence) -> bool:
    labels = {f.label for f in ev.facts}
    return bool(labels & {"n_suspensions", "free_float", "n_risky_actions", "insider_sells", "yoy_earnings_growth", "yoy_revenue_growth"})


def template_memo(
    trial_id: str,
    memo_id: str,
    ticker: str,
    company_name: str,
    created_at: str,
    data_mode: str,
    summaries: list[dict[str, Any]],
    evidence_pool: list[Evidence],
) -> dict[str, Any]:
    """Build a complete MemoJSON dict from the evidence pool."""
    key_facts: list[dict[str, Any]] = []
    fact_by_label: dict[str, str] = {}
    for i, ev in enumerate(evidence_pool, start=1):
        for fact in ev.facts:
            fid = f"f_{len(key_facts) + 1}"
            key_facts.append(
                {
                    "fact_id": fid,
                    "label": fact.label,
                    "value": fact.value,
                    "unit": fact.unit,
                    "source_endpoint": ev.source_endpoint,
                    "as_of_date": None,
                }
            )
            fact_by_label.setdefault(fact.label, fid)

    def _point(pid: str, text: str, labels: list[str]) -> dict[str, Any]:
        cites = [fact_by_label[l] for l in labels if l in fact_by_label]
        return {"point_id": pid, "argument_md": text, "cites": cites}

    bull_points = [
        _point("bp_1", "Valuasi relatif menarik (PE di bawah rata-rata peer) — ruang untuk re-rating.", ["forward_pe"]),
        _point("bp_2", "Profitabilitas sehat (ROE/margin laba positif) menandakan kualitas bisnis.", ["roe_ttm", "net_profit_margin"]),
        _point("bp_3", "Arus dana institusi/asing menunjukkan akumulasi.", ["broker_net_flow", "foreign_net_flow"]),
    ]
    bear_points = [
        _point("br_1", "Pertumbuhan pendapatan/laba melambat — risiko penurunan momentum.", ["yoy_revenue_growth", "yoy_earnings_growth"]),
        _point("br_2", "Aktivitas insider/red flag perlu diverifikasi sebelum mengambil posisi.", ["insider_sells", "n_suspensions", "free_float"]),
    ]

    smart_money: list[dict[str, Any]] = []
    insider: list[dict[str, Any]] = []
    red_flags: list[dict[str, Any]] = []
    for ev in evidence_pool:
        labels = {f.label for f in ev.facts}
        if labels & {"broker_net_flow", "foreign_net_flow"}:
            net = next((f.value for f in ev.facts if f.label in ("broker_net_flow", "foreign_net_flow")), 0)
            direction = "akumulasi" if (net or 0) >= 0 else "distribusi"
            smart_money.append({"finding_md": ev.headline, "direction": direction, "cites": [fact_by_label.get(f.label, "") for f in ev.facts if f.label in fact_by_label]})
        if labels & {"insider_buys", "insider_sells", "top_shareholder_pct"}:
            buys = next((f.value for f in ev.facts if f.label == "insider_buys"), 0) or 0
            sells = next((f.value for f in ev.facts if f.label == "insider_sells"), 0) or 0
            if buys or sells:
                direction = "beli" if buys > sells else ("jual" if sells > buys else "netral")
            else:
                direction = "netral"
            insider.append({"finding_md": ev.headline, "direction": direction, "cites": [fact_by_label.get(f.label, "") for f in ev.facts if f.label in fact_by_label]})
        if labels & {"n_suspensions", "free_float", "n_risky_actions"}:
            severity = "high" if "n_suspensions" in labels else ("medium" if "free_float" in labels else "low")
            red_flags.append({"flag_md": ev.headline, "severity": severity, "cites": [fact_by_label.get(f.label, "") for f in ev.facts if f.label in fact_by_label]})

    has_red = any(rf["severity"] == "high" for rf in red_flags)
    category = "red_flag_berat" if has_red else ("perlu_kehati_hatian" if red_flags else "layak_diteliti_lanjut")
    confidence = 0.55 if category == "layak_diteliti_lanjut" else (0.6 if category == "perlu_kehati_hatian" else 0.7)

    _richness_level = {"A": 3, "B": 2, "C": 1}
    richness = max(
        (s.get("data_richness", "C") for s in summaries),
        key=lambda r: _richness_level.get(r, 1),
        default="C",
    )

    citations = [
        {
            "cite_id": f["fact_id"],
            "source": "sectors_endpoint",
            "endpoint": f["source_endpoint"],
            "params_summary": f["source_endpoint"].split("?", 1)[1] if "?" in f["source_endpoint"] else "",
            "retrieved_at": created_at,
            "cache": "miss",
        }
        for f in key_facts
    ]

    return {
        "schema_version": "1.0.0",
        "memo_id": memo_id,
        "trial_id": trial_id,
        "ticker": ticker,
        "company_name": company_name,
        "created_at": created_at,
        "data_mode": data_mode,
        "info_richness": richness,
        "executive_summary": (
            f"Memorandum riset {ticker} ({company_name}) disusun dari data Sectors "
            f"dengan {len(key_facts)} fakta kunci. Kategori putusan: {category} "
            f"(keyakinan {confidence:.0%}). Verifikasi mandiri tetap diperlukan."
        ),
        "key_facts": key_facts,
        "bull_case": {"title": "Tesis Pembelaan (Bull)", "points": [p for p in bull_points if p["cites"]]},
        "bear_case": {"title": "Tesis Penuntutan (Bear)", "points": [p for p in bear_points if p["cites"]]},
        "smart_money_findings": smart_money,
        "insider_findings": insider,
        "red_flags": red_flags,
        "verdict": {
            "category": category,
            "confidence": confidence,
            "rationale_md": (
                f"Berdasarkan {len(key_facts)} fakta dari Sectors, komite menilai {ticker} "
                f"masuk kategori **{category}**. "
                + ("Ditemukan red flag berat yang wajib diverifikasi." if has_red else "Tidak ada red flag berat, namun tetap perlu kehati-hatian.")
            ),
            "verification_questions": [
                "Apa katalis terdekat yang bisa mengubah fundamental perusahaan?",
                "Bagaimana posisi kas dan leverage perusahaan dalam 2 kuartal ke depan?",
                "Apakah ada aksi korporasi atau perubahan regulasi yang belum tercermin di harga?",
            ],
        },
        "citations": citations,
        "disclaimer": "Memo ini adalah alat bantu riset & analisis, bukan rekomendasi investasi. Keputusan investasi sepenuhnya tanggung jawab masing-masing investor.",
    }
