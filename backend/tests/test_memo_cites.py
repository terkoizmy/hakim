"""Regression tests for memo fact-anchoring (CONTRACT §2 `cites`).

Defect under test: EVERY memo in backend/data/sidang.db had empty citation
arrays (`bull_case.points[*].cites`, `bear_case.points[*].cites`,
`smart_money_findings[*].cites`, `insider_findings[*].cites`,
`red_flags[*].cites`) while `key_facts` was populated — so the memo's
fact-anchoring was dead in practice.

Root cause (see orchestrator.py):

1. The judge system prompt enumerated the schema but never said what `cites`
   holds — no "cites = fact_id dari key_facts", no example, no ban on the
   `ev_...` evidence ids that the debate utterances (also fed to the judge)
   use. The judge was the only agent not told to cite.
2. `_finalize_memo` silently erased any cite that did not exactly equal a
   `fact_id` the judge itself had invented (`f1`, `fact_001`, `ev_3`, ...), so
   a namespace/spelling mismatch became `[]` instead of an error. Pydantic's
   `cites: list[str] = Field(default_factory=list)` then made the empty result
   validate cleanly.

These tests are hermetic: `sectors_mode="fixture"` (0 Sectors credits) and
`ollama_api_key=""` — the LLM is a stub returning canned JSON, so 0 tokens and
no network. Async style follows the rest of the repo: `asyncio.run(...)` inside
a sync test (no pytest-asyncio).
"""

from __future__ import annotations

import asyncio
import json
import logging
import re

from app.config import Settings
from app.db import Database
from app.eventbus import EventBus
from app.evidence import Evidence, EvidenceFact
from app.orchestrator import (
    AnalystResult,
    TrialContext,
    _canonical_fact_ids,
    _finalize_memo,
    _judge_messages,
    _remap_cites,
    _produce_memo,
)

# Fakta kanonik yang dipakai hampir semua tes di bawah.
PE = {"fact_id": "f_1", "label": "forward_pe", "value": 8.4, "unit": "x"}
ROE = {"fact_id": "f_2", "label": "roe_ttm", "value": 18.2, "unit": "%"}
ENDPOINT = "/v2/company/report/TEST/?sections=valuation"


class _StubLLM:
    """LLM palsu: mengembalikan JSON memo yang sudah disiapkan (0 token)."""

    def __init__(self, reply: str):
        self._reply = reply
        self.calls: list[dict] = []

    @property
    def available(self) -> bool:
        return True

    async def chat(self, model, messages, **kwargs):
        self.calls.append({"model": model, "messages": messages, **kwargs})
        return self._reply


def _settings(tmp_path) -> Settings:
    return Settings(
        sectors_mode="fixture",
        db_path=str(tmp_path / "test.db"),
        # Hermetic: backend/.env memuat kunci asli — jangan sampai terwarisi.
        ollama_api_key="",
        model_judge="model-uji",
        llm_fallback_template=True,
    )


def _ctx(tmp_path, llm) -> TrialContext:
    settings = _settings(tmp_path)
    db = Database(settings.db_path)
    return TrialContext(
        trial_id="tr_uji",
        ticker="TEST",
        company_name="PT Uji Coba Tbk",
        data_mode="fixture",
        db=db,
        bus=EventBus(db),
        sectors=None,  # type: ignore[arg-type]  # _produce_memo tidak menyentuh Sectors
        llm=llm,
        settings=settings,
    )


def _evidence_pool() -> list[Evidence]:
    return [
        Evidence(
            evidence_id="ev_1",
            source_endpoint=ENDPOINT,
            headline="Forward PE 8,4x vs peer 14,1x",
            facts=[EvidenceFact("forward_pe", 8.4, "x")],
        )
    ]


def _summaries() -> list[AnalystResult]:
    return [
        AnalystResult(
            agent_id="fundamental",
            display_name="Analisis Fundamental",
            summary_md="Valuasi murah.",
            data_richness="B",
            evidence=_evidence_pool(),
            model="model-uji",
        )
    ]


def _judge_reply(fact_ids: list[str], cites: dict[str, list[str]]) -> str:
    """Canned judge answer: satu butir per bagian, `cites` per bagian.

    `fact_ids` sengaja bisa bukan ejaan kanonik — itulah yang terjadi di DB
    (`f1`, `fact_001`, `ev_3`).
    """
    payload = {
        "info_richness": "B",
        "executive_summary": "Ringkasan uji.",
        "key_facts": [
            {
                "fact_id": fid,
                "label": label,
                "value": 8.4,
                "unit": "x",
                "source_endpoint": ENDPOINT,
            }
            for fid, label in zip(fact_ids, ["forward_pe", "roe_ttm"])
        ],
        "bull_case": {
            "title": "Tesis Pembelaan",
            "points": [{"point_id": "bp_1", "argument_md": "Murah.", "cites": cites["bull"]}],
        },
        "bear_case": {
            "title": "Tesis Penuntutan",
            "points": [{"point_id": "br_1", "argument_md": "Melambat.", "cites": cites["bear"]}],
        },
        "smart_money_findings": [
            {"finding_md": "Akumulasi.", "direction": "akumulasi", "cites": cites["smart"]}
        ],
        "insider_findings": [
            {"finding_md": "Insider beli.", "direction": "beli", "cites": cites["insider"]}
        ],
        "red_flags": [
            {"flag_md": "Free float tipis.", "severity": "medium", "cites": cites["red"]}
        ],
        "verdict": {
            "category": "perlu_kehati_hatian",
            "confidence": 0.6,
            "rationale_md": "Uji.",
            "verification_questions": ["Apa katalisnya?"],
        },
    }
    return json.dumps(payload)


def _produce(tmp_path, reply: str):
    llm = _StubLLM(reply)
    ctx = _ctx(tmp_path, llm)
    memo = asyncio.run(_produce_memo(ctx, _summaries(), [], _evidence_pool()))
    return memo, llm


def _section_cites(memo) -> dict[str, list[str]]:
    """cites tiap bagian memo (satu butir per bagian pada payload uji)."""
    return {
        "bull": memo.bull_case.points[0].cites,
        "bear": memo.bear_case.points[0].cites,
        "smart": memo.smart_money_findings[0].cites,
        "insider": memo.insider_findings[0].cites,
        "red": memo.red_flags[0].cites,
    }


# --------------------------------------------------------------- prompt contract


def test_judge_prompt_defines_cites_as_fact_ids(tmp_path):
    """Prompt hakim harus menjelaskan ISI cites — inilah akar masalahnya.

    Prompt debat sudah lama menulis `"cites": ["ev_..."]` dan "Selalu sitasi
    evidence_id"; prompt hakim hanya menyebut nama field `cites` tanpa arti.
    """
    llm = _StubLLM("{}")
    system = _judge_messages(_ctx(tmp_path, llm), _summaries(), [], _evidence_pool())[0]["content"]

    assert "cites" in system
    # cites = fact_id dari key_facts, dan cites kosong dilarang.
    assert "fact_id" in system
    assert "f_1" in system
    assert "kosong" in system
    # Jangan sampai hakim menyalin namespace evidence dari utterance debat.
    assert "evidence_id" in system and "DILARANG" in system
    # Contoh butir konkret (model meniru contoh, jadi harus ada).
    assert '"cites": ["f_1"]' in system


def test_judge_prompt_examples_only_use_ids_that_always_exist(tmp_path):
    """Id di contoh prompt disalin apa adanya oleh model.

    Contoh yang memakai `f_9` berbahaya: memo dengan 3 fakta tidak punya `f_9`,
    sehingga cite hasil salinan tidak bisa dipetakan ke fakta mana pun dan
    hilang lagi — persis cacat yang sedang diperbaiki. Hanya `f_1`/`f_2` yang
    selalu ada di memo mana pun.
    """
    llm = _StubLLM("{}")
    system = _judge_messages(_ctx(tmp_path, llm), _summaries(), [], _evidence_pool())[0]["content"]

    cited = set(re.findall(r'"cites":\s*\[([^\]]*)\]', system))
    assert cited, "prompt tidak memuat contoh cites sama sekali"
    assert all(
        all(fid.strip('"') in {"f_1", "f_2"} for fid in entry.split(",") if fid.strip())
        for entry in cited
    ), f"contoh cites memakai fact_id yang belum tentu ada: {cited}"


# ------------------------------------------------------- cites dari LLM (happy path)


def test_llm_cites_are_parsed_and_preserved(tmp_path):
    """Cites kanonik dari hakim harus bertahan apa adanya sampai MemoJSON."""
    reply = _judge_reply(
        ["f_1", "f_2"],
        {
            "bull": ["f_1"],
            "bear": ["f_2"],
            "smart": ["f_1"],
            "insider": ["f_2"],
            "red": ["f_1", "f_2"],
        },
    )
    memo, llm = _produce(tmp_path, reply)

    assert llm.calls, "LLM hakim tidak dipanggil"
    assert llm.calls[0]["model"] == "model-uji"
    assert _section_cites(memo) == {
        "bull": ["f_1"],
        "bear": ["f_2"],
        "smart": ["f_1"],
        "insider": ["f_2"],
        "red": ["f_1", "f_2"],
    }
    assert [f.fact_id for f in memo.key_facts] == ["f_1", "f_2"]
    assert [c.cite_id for c in memo.citations] == ["f_1", "f_2"]


def test_cites_written_as_labels_map_to_fact_ids(tmp_path):
    """Hakim boleh menyitasi label fakta; kode memetakannya ke fact_id.

    Pemetaan label→fact_id diambil dari key_facts memo itu sendiri, jadi
    deterministik — bukan tebakan.
    """
    reply = _judge_reply(
        ["f_1", "f_2"],
        {
            "bull": ["forward_pe"],
            "bear": ["roe_ttm"],
            "smart": ["forward_pe", "roe_ttm"],
            "insider": ["roe_ttm"],
            "red": ["forward_pe"],
        },
    )
    memo, _ = _produce(tmp_path, reply)

    assert _section_cites(memo) == {
        "bull": ["f_1"],
        "bear": ["f_2"],
        "smart": ["f_1", "f_2"],
        "insider": ["f_2"],
        "red": ["f_1"],
    }


def test_cites_in_model_id_spellings_are_resolved(tmp_path):
    """Ejaan id buatan hakim (`f1`, `fact_002`, `f_2`) tetap menemukan faktanya.

    Inilah bentuk nyata di DB: fact_id `f1`/`fact_001`/`ev_1` dengan cites yang
    dulu dihapus diam-diam karena tidak persis sama dengan fact_id.
    """
    reply = _judge_reply(
        ["f1", "fact_002"],
        {
            "bull": ["f1"],
            "bear": ["fact_002"],
            "smart": ["F1"],
            "insider": ["fact002"],
            "red": ["f_2"],  # ejaan kanonik untuk fakta ke-2
        },
    )
    memo, _ = _produce(tmp_path, reply)

    # fact_id dinormalkan ke ejaan kontrak (CONTRACT §2 memakai `f_1`).
    assert [f.fact_id for f in memo.key_facts] == ["f_1", "f_2"]
    assert [c.cite_id for c in memo.citations] == ["f_1", "f_2"]
    assert _section_cites(memo) == {
        "bull": ["f_1"],
        "bear": ["f_2"],
        "smart": ["f_1"],
        "insider": ["f_2"],
        "red": ["f_2"],
    }


def test_evidence_ids_used_as_fact_ids_still_resolve(tmp_path):
    """Kasus nyata DB: hakim menamai key_facts dengan `ev_*` dan menyitasinya.

    Selama id itu ada di key_facts memo, cites harus ikut — jangan dibuang.
    """
    reply = _judge_reply(
        ["ev_1", "ev_2"],
        {"bull": ["ev_1"], "bear": ["ev_2"], "smart": ["ev_1"], "insider": ["ev_2"], "red": ["ev_1"]},
    )
    memo, _ = _produce(tmp_path, reply)

    assert [f.fact_id for f in memo.key_facts] == ["f_1", "f_2"]
    assert _section_cites(memo) == {
        "bull": ["f_1"],
        "bear": ["f_2"],
        "smart": ["f_1"],
        "insider": ["f_2"],
        "red": ["f_1"],
    }


# ----------------------------------------------------------------- pure helpers


def test_remap_cites_drops_only_unknown_cites():
    aliases = _canonical_fact_ids([dict(PE), dict(ROE)])
    assert _remap_cites(["f_2", "tidak_ada", "", None, 7], aliases) == ["f_2"]
    assert _remap_cites([], aliases) == []
    assert _remap_cites(None, aliases) == []
    # Duplikat tidak digandakan.
    assert _remap_cites(["f_1", "f_1", "F_1"], aliases) == ["f_1"]
    # Label → fact_id.
    assert _remap_cites(["roe_ttm"], aliases) == ["f_2"]


def test_canonical_fact_ids_renumbers_and_keeps_original_aliases():
    facts = [dict(PE), dict(ROE)]
    aliases = _canonical_fact_ids(facts)

    assert [f["fact_id"] for f in facts] == ["f_1", "f_2"]
    assert aliases["f_1"] == "f_1"
    assert aliases["f1"] == "f_1"  # ejaan padat
    assert aliases["forward_pe"] == "f_1"  # label
    assert aliases["roe_ttm"] == "f_2"
    assert aliases["f_2"] == "f_2"


def test_finalize_logs_warning_when_cites_stay_empty(caplog):
    """Cites kosong tidak boleh lewat diam-diam lagi (dulu senyap total)."""
    facts = [dict(PE), dict(ROE)]
    data = {
        "key_facts": facts,
        "bull_case": {"title": "B", "points": [{"point_id": "bp_1", "argument_md": "x", "cites": ["ev_9"]}]},
        "bear_case": {"title": "S", "points": [{"point_id": "br_1", "argument_md": "y"}]},
    }
    base = {"memo_id": "mm_uji", "trial_id": "tr_uji", "ticker": "TEST", "company_name": "PT Uji",
            "created_at": "2026-09-14T00:00:00Z", "data_mode": "fixture"}

    with caplog.at_level(logging.WARNING, logger="app.orchestrator"):
        out = _finalize_memo(data, base, [])

    assert out["bull_case"]["points"][0]["cites"] == []  # cite asing dibuang
    assert out["bear_case"]["points"][0]["cites"] == []  # cites yang hilang tetap []
    assert "cites kosong" in caplog.text


def test_settings_are_hermetic(tmp_path):
    """Jaring pengaman: tes tidak boleh mewarisi kunci LLM asli dari .env."""
    settings = _settings(tmp_path)
    assert settings.ollama_api_key == ""
    assert settings.sectors_mode == "fixture"


# ---------------------------------------------------------------------------
# Provenance sitasi (Lampiran B: kolom "Diambil" & label cache)
# ---------------------------------------------------------------------------


def test_citations_inherit_the_real_fetch_date_and_cache_label():
    """Kolom "Diambil" harus tanggal payload BENAR-BENAR diambil.

    Dulu `retrieved_at` sitasi diisi `created_at` memo, jadi payload arsip
    yang diambil lima hari lalu dicap "diambil hari ini" — dan label cache
    sitasi hanya dihitung "hit kalau ada endpoint yang hit, selain itu miss",
    sehingga memo mode demo bisa mengaku memakai kredit padahal 0.
    """
    archived = "/v2/company/report/TEST/?sections=valuation"
    data = {
        "key_facts": [
            {"fact_id": "f_1", "label": "forward_pe", "value": 8.4, "unit": "x",
             "source_endpoint": archived},
            {"fact_id": "f_2", "label": "roe_ttm", "value": 18.2, "unit": "%",
             "source_endpoint": "/v2/daily/TEST/"},
        ]
    }
    base = {"memo_id": "mm_uji", "trial_id": "tr_uji", "ticker": "TEST", "company_name": "PT Uji",
            "created_at": "2026-09-14T10:00:00Z", "data_mode": "live"}
    tool_calls = [
        {"agent_id": "fundamental", "tool": "company_report", "endpoint": archived,
         "params_summary": "sections=valuation", "cache": "hit", "retrieved_at": "2026-09-09"},
    ]

    out = _finalize_memo(data, base, tool_calls)

    by_endpoint = {c["endpoint"]: c for c in out["citations"]}
    # Fakta dari endpoint yang dilayani arsip 9 Sep ditulis 9 Sep, bukan hari ini.
    assert by_endpoint[archived]["cache"] == "hit"
    assert by_endpoint[archived]["retrieved_at"] == "2026-09-09"
    # Fakta tanpa panggilan yang cocok jatuh ke created_at (perkiraan terbaik).
    assert by_endpoint["/v2/daily/TEST/"]["retrieved_at"] == base["created_at"]


def test_fixture_trial_never_claims_credits():
    """Mode demo: tidak ada label yang boleh terbaca sebagai "kredit terpakai"."""
    data = {
        "key_facts": [
            {"fact_id": "f_1", "label": "forward_pe", "value": 8.4, "unit": "x",
             "source_endpoint": ENDPOINT},
        ]
    }
    base = {"memo_id": "mm_demo", "trial_id": "tr_demo", "ticker": "TEST", "company_name": "PT Uji",
            "created_at": "2026-09-14T10:00:00Z", "data_mode": "fixture"}
    tool_calls = [
        {"agent_id": "fundamental", "tool": "company_report", "endpoint": ENDPOINT,
         "params_summary": "sections=valuation", "cache": "fixture", "retrieved_at": "2026-09-14"},
    ]

    out = _finalize_memo(data, base, tool_calls)

    assert out["tool_calls"][0]["cache"] == "fixture"
    assert out["citations"][0]["cache"] == "fixture"
