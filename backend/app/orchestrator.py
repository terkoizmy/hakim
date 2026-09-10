"""SIDANG orchestrator: 5 analysts gather evidence in parallel, prosecutor vs
defender debate 2 rounds, the chief judge writes a MemoJSON (validated with
pydantic, repaired once on failure).

Every step emits SSE events via the EventBus (CONTRACT §1). Domain failures
emit `trial_failed`; the trial status is persisted to SQLite.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import secrets
from dataclasses import dataclass, field
from typing import Any, Optional

from pydantic import ValidationError

from .analysts import ANALYSTS, AnalystSpec
from .config import Settings, get_settings
from .db import Database
from .evidence import Evidence
from .eventbus import EventBus, now_iso
from .llm import LLMClient
from .llm import templates
from .models import DISCLAIMER, MemoJSON
from .price_series import build_price_series
from .sectors import SectorsClient

logger = logging.getLogger(__name__)

TERMINAL_EVENTS = {"memo_ready", "trial_failed"}


class TrialFailed(Exception):
    """Carries the error_code for trial_failed (CONTRACT §3.1)."""

    def __init__(self, error_code: str, message: str, phase: Optional[str] = None, agent_id: Optional[str] = None):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
        self.phase = phase
        self.agent_id = agent_id


@dataclass
class AnalystResult:
    agent_id: str
    display_name: str
    summary_md: str
    data_richness: str
    evidence: list[Evidence]
    model: str


@dataclass
class TrialContext:
    trial_id: str
    ticker: str
    company_name: str
    data_mode: str
    db: Database
    bus: EventBus
    sectors: SectorsClient
    llm: LLMClient
    settings: Settings
    shared: dict[str, Any] = field(default_factory=dict)
    # Real Sectors calls made during the trial — feeds the memo's audit table
    # (memo.tool_calls). The judge's own source_endpoint strings are prose and
    # are NOT used for the audit.
    tool_calls: list[dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------

def _parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # strip markdown fences / surrounding prose
    match = re.search(r"\{.*\}", text, re.S)
    if match:
        return json.loads(match.group(0))
    raise ValueError("Tidak dapat mengurai JSON dari respons LLM")


# ---------------------------------------------------------------------------
# Analysts
# ---------------------------------------------------------------------------

async def _run_analyst(ctx: TrialContext, spec: AnalystSpec, evidence_counter: list[int]) -> AnalystResult:
    await ctx.bus.publish(
        ctx.trial_id,
        "agent_started",
        {
            "agent_id": spec.agent_id,
            "agent_role": "analyst",
            "display_name": spec.display_name,
            "model": ctx.settings.model_analyst,
        },
    )
    try:
        gathered = await spec.gather(ctx)
        for tc in gathered.tool_calls:
            record = {
                "agent_id": spec.agent_id,
                "tool": tc.tool,
                "endpoint": tc.endpoint,
                "params_summary": tc.params_summary,
                "cache": tc.cache,
                "retrieved_at": now_iso(),
            }
            ctx.tool_calls.append(record)
            await ctx.bus.publish(ctx.trial_id, "agent_tool_call", record)
        evidence = spec.extract(gathered.data, ctx.ticker)
        for ev in evidence:
            evidence_counter[0] += 1
            ev.evidence_id = f"ev_{evidence_counter[0]}"
            await ctx.bus.publish(
                ctx.trial_id,
                "agent_evidence",
                {
                    "agent_id": spec.agent_id,
                    "evidence_id": ev.evidence_id,
                    "source_endpoint": ev.source_endpoint,
                    "headline": ev.headline,
                    "facts": [{"label": f.label, "value": f.value, "unit": f.unit} for f in ev.facts],
                },
            )
        summary_md, richness = await _summarize(ctx, spec, evidence)
        await ctx.bus.publish(
            ctx.trial_id,
            "agent_finished",
            {
                "agent_id": spec.agent_id,
                "summary_md": summary_md,
                "data_richness": richness,
                "evidence_ids": [ev.evidence_id for ev in evidence],
            },
        )
        return AnalystResult(
            agent_id=spec.agent_id,
            display_name=spec.display_name,
            summary_md=summary_md,
            data_richness=richness,
            evidence=evidence,
            model=ctx.settings.model_analyst,
        )
    except Exception as exc:  # one analyst failing must not sink the trial
        logger.warning("Analis %s gagal: %s", spec.agent_id, exc)
        degraded = f"**{spec.display_name}** — gagal mengumpulkan data ({exc})."
        await ctx.bus.publish(
            ctx.trial_id,
            "agent_finished",
            {
                "agent_id": spec.agent_id,
                "summary_md": degraded,
                "data_richness": "C",
                "evidence_ids": [],
            },
        )
        return AnalystResult(
            agent_id=spec.agent_id,
            display_name=spec.display_name,
            summary_md=degraded,
            data_richness="C",
            evidence=[],
            model=ctx.settings.model_analyst,
        )


async def _summarize(ctx: TrialContext, spec: AnalystSpec, evidence: list[Evidence]) -> tuple[str, str]:
    if ctx.llm.available:
        try:
            evidence_json = [
                {
                    "evidence_id": ev.evidence_id,
                    "headline": ev.headline,
                    "facts": [{"label": f.label, "value": f.value, "unit": f.unit} for f in ev.facts],
                }
                for ev in evidence
            ]
            messages = [
                {"role": "system", "content": spec.system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Ticker: {ctx.ticker} ({ctx.company_name}).\n\n"
                        f"Bukti dari Sectors API:\n{json.dumps(evidence_json, ensure_ascii=False, indent=2)}\n\n"
                        'Keluarkan JSON: {"summary_md": "...", "data_richness": "A|B|C"}'
                    ),
                },
            ]
            content = await ctx.llm.chat(ctx.settings.model_analyst, messages, json_mode=True, max_tokens=2500)
            data = _parse_json(content)
            return str(data["summary_md"]), str(data.get("data_richness", "B"))
        except Exception as exc:
            logger.warning("LLM analis gagal, fallback template: %s", exc)
            if not ctx.settings.llm_fallback_template:
                raise
    return templates.template_analyst_summary(spec.display_name, evidence)


# ---------------------------------------------------------------------------
# Debate
# ---------------------------------------------------------------------------

async def _utterance(
    ctx: TrialContext,
    side: str,
    round_no: int,
    summaries: list[AnalystResult],
    evidence_pool: list[Evidence],
    rebuts_id: Optional[str],
    utterance_id: str,
    prior_utterances: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    if ctx.llm.available:
        try:
            if side == "prosecution":
                role = (
                    "Kamu adalah Jaksa (penuntut, sisi bear) dalam sidang saham IDX. "
                    "Bangun argumen penuntutan terkuat (inversi Munger: jalur kegagalan)."
                )
            else:
                role = (
                    "Kamu adalah Pembela (sisi bull) dalam sidang saham IDX. "
                    "Bangun argumen pembelaan terkuat."
                )
            system = (
                role
                + " Sitasi bukti dengan evidence_id. Bahasa Indonesia. "
                + "Batas ketat: judul (title) maksimal 6 kata. "
                + "argument_md SANGAT ringkas: maksimal 3 kalimat pendek ATAU maksimal 3 bullet — "
                + "tanpa basa-basi pembuka/penutup, tanpa mengulang judul di dalam argument_md. "
                + "Selalu sitasi evidence_id."
            )
            user = _debate_user_prompt(
                ctx, summaries, evidence_pool, side, round_no, rebuts_id, prior_utterances
            )
            content = await ctx.llm.chat(ctx.settings.model_debate, [{"role": "system", "content": system}, {"role": "user", "content": user}], json_mode=True, max_tokens=900)
            data = _parse_json(content)
            return {
                "round": round_no,
                "side": side,
                "title": str(data.get("title", "Argumen")),
                "argument_md": str(data.get("argument_md", "")),
                "cites": [c for c in data.get("cites", []) if c in {ev.evidence_id for ev in evidence_pool}],
                "rebuts": rebuts_id,
            }
        except Exception as exc:
            logger.warning("LLM debat gagal, fallback template: %s", exc)
            if not ctx.settings.llm_fallback_template:
                raise
    return templates.template_debate_utterance(
        side, round_no, [s.__dict__ for s in summaries], evidence_pool, rebuts_id
    )


def _debate_user_prompt(
    ctx: TrialContext,
    summaries: list[AnalystResult],
    evidence_pool: list[Evidence],
    side: str,
    round_no: int,
    rebuts_id: Optional[str],
    prior_utterances: Optional[list[dict[str, Any]]] = None,
) -> str:
    parts = [f"Ticker: {ctx.ticker} ({ctx.company_name}). Ronde {round_no}, sisi {side}."]
    parts.append("\nRangkuman analis:\n" + "\n".join(f"- [{s.agent_id}] {s.summary_md}" for s in summaries))
    parts.append(
        "\nBukti:\n"
        + json.dumps(
            [{"evidence_id": ev.evidence_id, "headline": ev.headline} for ev in evidence_pool],
            ensure_ascii=False,
        )
    )
    if round_no == 1:
        parts.append(
            "\nRONDE 1 (pembukaan): sampaikan argumen terkuatmu dengan ANGKA SPESIFIK "
            "dari bukti (mis. PE 8,4x, net akumulasi Rp3,3 miliar). Pilih 1-2 tema saja."
        )
    else:
        parts.append(
            "\nRONDE 2 (bantahan): WAJIB membalas argumen lawan di bawah ini secara langsung "
            "dan memakai bukti/angka yang BELUM dipakai di ronde 1. "
            "DILARANG mengulang poin, angka, atau tema argumenmu sendiri di ronde 1 — "
            "kalau poinmu sudah cukup kuat, perkuat dengan sudut pandang baru."
        )
        for u in prior_utterances or []:
            tag = "argumen lawan" if u["side"] != side else "argumenmu (ronde 1)"
            parts.append(f"\n[{tag} · ronde {u['round']} · {u['title']}]\n{u['argument_md']}")
    if rebuts_id:
        parts.append(f"\nSet \"rebuts\" = \"{rebuts_id}\".")
    parts.append(
        '\nKeluarkan JSON: {"title": "...", "argument_md": "...", "cites": ["ev_..."]} '
        "(argument_md maksimal 3 kalimat/bullet)"
    )
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Judge
# ---------------------------------------------------------------------------

async def _produce_memo(
    ctx: TrialContext,
    summaries: list[AnalystResult],
    utterances: list[dict[str, Any]],
    evidence_pool: list[Evidence],
) -> MemoJSON:
    memo_id = "mm_" + secrets.token_hex(6)
    created_at = now_iso()
    base = {
        "memo_id": memo_id,
        "trial_id": ctx.trial_id,
        "ticker": ctx.ticker,
        "company_name": ctx.company_name,
        "created_at": created_at,
        "data_mode": ctx.data_mode,
    }

    memo_data: Optional[dict[str, Any]] = None
    if ctx.llm.available:
        try:
            content = await ctx.llm.chat(
                ctx.settings.model_judge,
                _judge_messages(ctx, summaries, utterances, evidence_pool),
                json_mode=True,
                max_tokens=8000,
            )
            memo_data = _parse_json(content)
        except Exception as exc:
            logger.warning("LLM hakim gagal, fallback template: %s", exc)
            if not ctx.settings.llm_fallback_template:
                raise

    if memo_data is None:
        memo_data = templates.template_memo(
            ctx.trial_id, memo_id, ctx.ticker, ctx.company_name, created_at, ctx.data_mode,
            [s.__dict__ for s in summaries], evidence_pool,
        )

    memo_data = _finalize_memo(memo_data, base, ctx.tool_calls)
    try:
        return MemoJSON(**memo_data)
    except ValidationError as first_err:
        # 1x repair loop (CONTRACT §2)
        if not ctx.llm.available:
            raise TrialFailed("llm_error", f"Memo invalid: {first_err}", phase="verdict")
        try:
            repair = _judge_messages(ctx, summaries, utterances, evidence_pool)
            repair.append({"role": "assistant", "content": json.dumps(memo_data, ensure_ascii=False)})
            repair.append(
                {
                    "role": "user",
                    "content": f"Memo di atas tidak valid. Perbaiki sesuai skema. Error: {first_err}",
                }
            )
            content = await ctx.llm.chat(ctx.settings.model_judge, repair, json_mode=True, max_tokens=8000)
            memo_data = _finalize_memo(_parse_json(content), base, ctx.tool_calls)
            return MemoJSON(**memo_data)
        except Exception as exc:
            raise TrialFailed("llm_error", f"Memo invalid setelah repair: {exc}", phase="verdict")


def _finalize_memo(
    data: dict[str, Any], base: dict[str, Any], tool_calls: list[dict[str, Any]]
) -> dict[str, Any]:
    """Fill required fields, rebuild citations from key_facts, drop dangling cites.

    `tool_calls` are the REAL Sectors calls recorded during the trial — they
    become memo.tool_calls (the audit table). Fact citations stay keyed to
    key_facts; their cache flag is upgraded to `hit` when an identical real
    call was served from cache.
    """
    data.update(base)
    data.setdefault("schema_version", "1.0.0")
    data.setdefault("disclaimer", DISCLAIMER)
    data.setdefault("info_richness", "C")
    data.setdefault("executive_summary", "")
    data.setdefault("key_facts", [])
    data.setdefault("bull_case", {"title": "", "points": []})
    data.setdefault("bear_case", {"title": "", "points": []})
    data.setdefault("smart_money_findings", [])
    data.setdefault("insider_findings", [])
    data.setdefault("red_flags", [])
    data.setdefault("verdict", {"category": "perlu_kehati_hatian", "confidence": 0.5, "rationale_md": "", "verification_questions": []})

    for i, f in enumerate(data["key_facts"], start=1):
        f.setdefault("fact_id", f"f_{i}")
        f.setdefault("label", "fakta")
        f.setdefault("source_endpoint", "")
    valid_ids = {f["fact_id"] for f in data["key_facts"]}

    data["tool_calls"] = tool_calls
    data["citations"] = [
        {
            "cite_id": f["fact_id"],
            "source": "sectors_endpoint",
            "endpoint": f["source_endpoint"],
            "params_summary": f["source_endpoint"].split("?", 1)[1] if "?" in f["source_endpoint"] else "",
            "retrieved_at": base["created_at"],
            "cache": "hit"
            if any(tc["endpoint"] == f["source_endpoint"] and tc["cache"] == "hit" for tc in tool_calls)
            else "miss",
        }
        for f in data["key_facts"]
    ]

    for section in ("bull_case", "bear_case"):
        for p in data.get(section, {}).get("points", []):
            p["cites"] = [c for c in p.get("cites", []) if c in valid_ids]
    for section in ("smart_money_findings", "insider_findings", "red_flags"):
        for item in data.get(section, []):
            item["cites"] = [c for c in item.get("cites", []) if c in valid_ids]
    return data


def _judge_messages(
    ctx: TrialContext,
    summaries: list[AnalystResult],
    utterances: list[dict[str, Any]],
    evidence_pool: list[Evidence],
) -> list[dict[str, str]]:
    real_endpoints = sorted({tc["endpoint"] for tc in ctx.tool_calls})
    system = (
        "Kamu adalah Hakim Ketua dalam sidang saham IDX. Rumuskan memorandum riset "
        "(MemoJSON) berdasarkan semua bukti dan debat. Setiap fakta kunci harus "
        "bersumber dari bukti yang diberikan. Bahasa Indonesia. Keluarkan JSON sesuai "
        "skema: schema_version, memo_id, trial_id, ticker, company_name, created_at, "
        "data_mode, info_richness (A/B/C), executive_summary, key_facts[{fact_id,label,value,unit,source_endpoint,as_of_date}], "
        "bull_case{title,points[{point_id,argument_md,cites}]}, "
        "bear_case{title,points[...]}, "
        "smart_money_findings[{finding_md,direction(akumulasi/distribusi/netral),cites}], "
        "insider_findings[{finding_md,direction(beli/jual/netral),cites}], "
        "red_flags[{flag_md,severity(low/medium/high),cites}], "
        "verdict{category(layak_diteliti_lanjut/perlu_kehati_hatian/red_flag_berat),confidence(0-1),rationale_md,verification_questions[]}, "
        "citations[], disclaimer. "
        "PENTING: source_endpoint setiap key_fact WAJIB salah satu endpoint Sectors "
        f"yang benar-benar dipanggil sidang ini: {real_endpoints}. Jangan mengarang "
        "nama endpoint lain."
    )
    user = (
        f"Ticker: {ctx.ticker} ({ctx.company_name}).\n\n"
        "Rangkuman analis:\n"
        + "\n".join(f"- [{s.agent_id}] {s.summary_md}" for s in summaries)
        + "\n\nDebat:\n"
        + json.dumps(utterances, ensure_ascii=False)
        + "\n\nBukti:\n"
        + json.dumps(
            [
                {
                    "evidence_id": ev.evidence_id,
                    "headline": ev.headline,
                    "facts": [{"label": f.label, "value": f.value, "unit": f.unit} for f in ev.facts],
                }
                for ev in evidence_pool
            ],
            ensure_ascii=False,
        )
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


# ---------------------------------------------------------------------------
# Main flow
# ---------------------------------------------------------------------------

async def run_trial(ctx: TrialContext) -> MemoJSON:
    """Run the full trial. Emits events; returns the final MemoJSON."""
    models = {
        "analyst": ctx.settings.model_analyst,
        "debate": ctx.settings.model_debate,
        "judge": ctx.settings.model_judge,
    }
    await ctx.bus.publish(
        ctx.trial_id,
        "trial_started",
        {
            "ticker": ctx.ticker,
            "company_name": ctx.company_name,
            "mode": ctx.data_mode,
            "models": models,
        },
    )

    # ---- evidence phase ---------------------------------------------------
    await ctx.bus.publish(ctx.trial_id, "phase_started", {"phase": "evidence", "round": 1})
    evidence_counter = [0]
    results = await asyncio.gather(
        *(_run_analyst(ctx, spec, evidence_counter) for spec in ANALYSTS),
        return_exceptions=True,
    )
    analyst_results: list[AnalystResult] = []
    for r in results:
        if isinstance(r, AnalystResult):
            analyst_results.append(r)
        elif isinstance(r, BaseException):
            logger.error("Analis gagal total: %s", r)
    evidence_pool: list[Evidence] = [ev for r in analyst_results for ev in r.evidence]

    if not evidence_pool:
        raise TrialFailed("sectors_error", "Tidak ada data Sectors yang berhasil dikumpulkan", phase="evidence")

    # ---- debate phase -----------------------------------------------------
    utterances: list[dict[str, Any]] = []
    for round_no in (1, 2):
        await ctx.bus.publish(ctx.trial_id, "phase_started", {"phase": "debate", "round": round_no})
        for side in ("prosecution", "defense"):
            rebuts_id = utterances[-1]["id"] if utterances else None
            ut_id = f"ut_{len(utterances) + 1}"
            payload = await _utterance(
                ctx, side, round_no, analyst_results, evidence_pool, rebuts_id, ut_id,
                prior_utterances=utterances,
            )
            payload["id"] = ut_id
            utterances.append(payload)
            await ctx.bus.publish(ctx.trial_id, "debate_utterance", payload)

    # ---- verdict phase ----------------------------------------------------
    await ctx.bus.publish(ctx.trial_id, "phase_started", {"phase": "verdict", "round": 1})
    memo = await _produce_memo(ctx, analyst_results, utterances, evidence_pool)

    price_at_trial = _price_at_trial(ctx)
    await ctx.bus.publish(ctx.trial_id, "memo_ready", {"memo": memo.model_dump()})
    ctx.db.save_memo(memo.model_dump(), price_at_trial)
    # Snapshot the price series so postmortem/price-series keep historical data
    # even after the Sectors cache expires (CONTRACT 1.1.0).
    price_series = build_price_series(ctx.shared.get("daily_transaction", {}))
    if price_series:
        ctx.db.save_price_series(ctx.trial_id, ctx.ticker, price_series, now_iso())
    ctx.db.update_trial_status(
        ctx.trial_id, "succeeded", price_at_trial=price_at_trial, finished_at=now_iso()
    )
    return memo


def _price_at_trial(ctx: TrialContext) -> Optional[float]:
    cr = ctx.shared.get("company_report", {})
    price = cr.get("last_close_price") or cr.get("valuation", {}).get("close_price")
    try:
        return float(price) if price is not None else None
    except (TypeError, ValueError):
        return None
