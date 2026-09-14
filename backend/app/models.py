"""Pydantic models mirroring docs/CONTRACT.md (frozen, schema_version 1.0.0).

Field names and shapes MUST match the contract — do not rename.
"""

from __future__ import annotations

from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# MemoJSON (CONTRACT §2)
# ---------------------------------------------------------------------------

DISCLAIMER = (
    "Memo ini adalah alat bantu riset & analisis, bukan rekomendasi investasi. "
    "Keputusan investasi sepenuhnya tanggung jawab masing-masing investor."
)

SCHEMA_VERSION = "1.0.0"

DataMode = Literal["fixture", "live"]
InfoRichness = Literal["A", "B", "C"]
VerdictCategory = Literal["layak_diteliti_lanjut", "perlu_kehati_hatian", "red_flag_berat"]


class Fact(BaseModel):
    fact_id: str
    label: str
    value: Optional[Union[float, int, str]] = None
    unit: Optional[str] = None
    source_endpoint: str
    as_of_date: Optional[str] = None


class MemoPoint(BaseModel):
    point_id: str
    argument_md: str
    cites: list[str] = Field(default_factory=list)


class BullCase(BaseModel):
    title: str
    points: list[MemoPoint] = Field(default_factory=list)


class BearCase(BaseModel):
    title: str
    points: list[MemoPoint] = Field(default_factory=list)


class SmartMoneyFinding(BaseModel):
    finding_md: str
    direction: Literal["akumulasi", "distribusi", "netral"]
    cites: list[str] = Field(default_factory=list)


class InsiderFinding(BaseModel):
    finding_md: str
    direction: Literal["beli", "jual", "netral"]
    cites: list[str] = Field(default_factory=list)


class RedFlag(BaseModel):
    flag_md: str
    severity: Literal["low", "medium", "high"]
    cites: list[str] = Field(default_factory=list)


class Verdict(BaseModel):
    category: VerdictCategory
    confidence: float = Field(ge=0.0, le=1.0)
    rationale_md: str
    verification_questions: list[str] = Field(default_factory=list)


class Citation(BaseModel):
    cite_id: str
    source: str = "sectors_endpoint"
    endpoint: str
    params_summary: str
    retrieved_at: str
    cache: Literal["hit", "miss"]


class ToolCallAudit(BaseModel):
    """One REAL Sectors call made during the trial (audit table on the memo)."""

    agent_id: str
    tool: str
    endpoint: str
    params_summary: str = ""
    retrieved_at: str
    cache: Literal["hit", "miss"]


class MemoJSON(BaseModel):
    schema_version: str = SCHEMA_VERSION
    memo_id: str
    trial_id: str
    ticker: str
    company_name: str
    created_at: str
    data_mode: DataMode
    info_richness: InfoRichness
    executive_summary: str
    key_facts: list[Fact] = Field(default_factory=list)
    bull_case: BullCase
    bear_case: BearCase
    smart_money_findings: list[SmartMoneyFinding] = Field(default_factory=list)
    insider_findings: list[InsiderFinding] = Field(default_factory=list)
    red_flags: list[RedFlag] = Field(default_factory=list)
    verdict: Verdict
    citations: list[Citation] = Field(default_factory=list)
    tool_calls: list[ToolCallAudit] = Field(default_factory=list)
    disclaimer: str = DISCLAIMER


# ---------------------------------------------------------------------------
# SSE event envelope (CONTRACT §1)
# ---------------------------------------------------------------------------


class EventEnvelope(BaseModel):
    type: str
    trial_id: str
    seq: int
    ts: str
    payload: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# REST request/response bodies (CONTRACT §3)
# ---------------------------------------------------------------------------


class CreateTrialRequest(BaseModel):
    ticker: str
    mode: Literal["auto", "fixture"] = "auto"


class CreateTrialResponse(BaseModel):
    trial_id: str
    ticker: str
    company_name: str
    mode: str
    created_at: str


class JournalItem(BaseModel):
    memo_id: str
    trial_id: str
    ticker: str
    company_name: str
    verdict_category: VerdictCategory
    info_richness: InfoRichness
    price_at_trial: Optional[float] = None
    created_at: str


class JournalResponse(BaseModel):
    items: list[JournalItem]
    total: int


class PricePoint(BaseModel):
    date: str
    close: Union[int, float]
    volume: Optional[Union[int, float]] = None
    change_pct: Optional[Union[int, float]] = None


class PriceSeriesResponse(BaseModel):
    trial_id: str
    ticker: str
    points: Optional[list[PricePoint]] = None


class PostmortemResponse(BaseModel):
    memo: MemoJSON
    price_at_trial: float
    price_now: float
    change_pct: float
    days_elapsed: int
    price_series: Optional[list[PricePoint]] = None


class TickerItem(BaseModel):
    ticker: str
    company_name: str
    sector: Optional[str] = None


class TickerListResponse(BaseModel):
    items: list[TickerItem]
    total: int


class SectorStat(BaseModel):
    sector: str
    count: int


class SectorListResponse(BaseModel):
    items: list[SectorStat]
    total: int


class HealthResponse(BaseModel):
    status: str
    sectors_mode: str
    version: str


# ----------------------------------------------------------------- board models

class BoardNodeData(BaseModel):
    type: str  # 'emiten' | 'pemegang' | 'orang' | 'aliran' | 'redflag' | 'kabar' | 'fakta'
    label: str
    sub: Optional[str] = None
    value: Optional[str] = None
    verdict: Optional[str] = None
    severity: Optional[str] = None  # 'rendah' | 'sedang' | 'tinggi'
    date: Optional[str] = None
    detail: Optional[list[str]] = None
    source: Optional[str] = None
    cross: Optional[bool] = None
    retrievedAt: Optional[str] = None
    cache: Optional[str] = None  # 'hit' | 'miss' — data dari cache arsip vs ambil baru


class BoardNode(BaseModel):
    id: str
    type: str
    position: dict[str, float]
    data: BoardNodeData
    rotate: float = 0.0


class BoardEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str  # 'memegang' | 'menjabat' | 'aliran' | 'redflag' | 'fakta'
    label: Optional[str] = None


class MetricBenchmark(BaseModel):
    label: str
    value: float
    sectorAvg: float
    unit: str
    verdict: str  # 'superior' | 'fair' | 'inferior'


class RiskScorecard(BaseModel):
    governance: int
    financial: int
    valuation: int
    overall: str  # 'Rendah' | 'Sedang' | 'Tinggi'


class BoardResponse(BaseModel):
    ticker: str
    name: str
    nodes: list[BoardNode]
    edges: list[BoardEdge]
    initialChat: str
    aiInsights: dict[str, str]
    priceHistory: Optional[list[PricePoint]] = None
    metricsComparison: Optional[list[MetricBenchmark]] = None
    riskScore: Optional[RiskScorecard] = None
    thesisSummary: Optional[str] = None


class BoardChatRequest(BaseModel):
    message: str


class BoardChatResponse(BaseModel):
    reply: str
    # 'llm' = jawaban LLM dari konteks graf; 'heuristik' = jawaban cadangan saat
    # LLM tidak tersedia/gagal (FE tidak boleh menyebutnya analisis AI — §3.2).
    mode: str = "llm"
    model: Optional[str] = None
