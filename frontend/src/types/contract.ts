/**
 * src/types/contract.ts
 *
 * Transkripsi 1:1 dari docs/CONTRACT.md — kontrak Backend ↔ Frontend SIDANG (FROZEN).
 * SUMBER KEBENARAN TUNGGAL untuk: amplop event SSE, payload tiap event,
 * MemoJSON, response REST, dan kode error `trial_failed`.
 *
 * Jangan ubah tipe apa pun di sini tanpa bump `schema_version` oleh orkestrator.
 */

export const SCHEMA_VERSION = '1.0.0';

/* ================================================================== */
/* 1. Amplop event SSE                                                  */
/* ================================================================== */

export type EventType =
  | 'trial_started'
  | 'phase_started'
  | 'agent_started'
  | 'agent_tool_call'
  | 'agent_evidence'
  | 'agent_finished'
  | 'debate_utterance'
  | 'memo_token'
  | 'memo_ready'
  | 'trial_failed'
  | 'heartbeat';

/** Amplop dasar untuk setiap baris `data:` pada stream `text/event-stream`. */
export interface Envelope {
  type: EventType;
  trial_id: string;
  /** Integer monotonik naik per trial — dipakai resume via Last-Event-ID. */
  seq: number;
  /** ISO-8601 UTC. */
  ts: string;
}

/* -------- payload per tipe -------------------------------------------- */

export type TrialMode = 'fixture' | 'live';

export interface TrialStartedPayload {
  ticker: string;
  company_name: string;
  mode: TrialMode;
  models: {
    analyst: string;
    debate: string;
    judge: string;
  };
}

export type Phase = 'evidence' | 'debate' | 'verdict';

export interface PhaseStartedPayload {
  phase: Phase;
  /** Hanya ada saat `phase = debate`. */
  round?: number;
}

export type AgentRole = 'analyst' | 'prosecutor' | 'defender' | 'judge';

/** 5 analis tetap: fundamental, price, smartmoney, insider, antigorengan. */
export type AgentId =
  | 'fundamental'
  | 'price'
  | 'smartmoney'
  | 'insider'
  | 'antigorengan'
  | (string & {});

export interface AgentStartedPayload {
  agent_id: string;
  agent_role: AgentRole;
  display_name: string;
  model: string;
}

export type CacheStatus = 'hit' | 'miss';

export interface AgentToolCallPayload {
  agent_id: string;
  tool: string;
  endpoint: string;
  /** Ringkasan param hasil panggilan sebenarnya + cache (bagian dari transparansi data). */
  params_summary: string;
  cache: CacheStatus;
}

export interface EvidenceFact {
  label: string;
  value: number;
  unit: string;
}

/** Chip bukti di live feed — milik stream, BUKAN milik memo. */
export interface AgentEvidencePayload {
  agent_id: string;
  evidence_id: string;
  source_endpoint: string;
  headline: string;
  facts: EvidenceFact[];
}

export type DataRichness = 'A' | 'B' | 'C';

export interface AgentFinishedPayload {
  agent_id: string;
  summary_md: string;
  data_richness: DataRichness;
  evidence_ids: string[];
}

export type DebateSide = 'prosecution' | 'defense';

export interface DebateUtterancePayload {
  round: number;
  side: DebateSide;
  title: string;
  argument_md: string;
  /** Merujuk `evidence_id` dari stream untuk chip bukti pada argumen. */
  cites: string[];
  /** id utterance `ut_…` yang dibalas; null = pembuka ronde. */
  rebuts: string | null;
}

export interface MemoTokenPayload {
  text: string;
}

export interface MemoReadyPayload {
  memo: MemoJSON;
}

export type TrialErrorCode =
  | 'ticker_not_found'
  | 'sectors_error'
  | 'llm_error'
  | 'timeout';

export interface TrialFailedPayload {
  error_code: TrialErrorCode;
  message: string;
  phase: Phase;
  agent_id: string | null;
}

export interface HeartbeatPayload {
  /** selalu empty object per kontrak */
}

/** Union payload terdiskriminasi oleh `type`. */
export type EventPayloadMap = {
  trial_started: TrialStartedPayload;
  phase_started: PhaseStartedPayload;
  agent_started: AgentStartedPayload;
  agent_tool_call: AgentToolCallPayload;
  agent_evidence: AgentEvidencePayload;
  agent_finished: AgentFinishedPayload;
  debate_utterance: DebateUtterancePayload;
  memo_token: MemoTokenPayload;
  memo_ready: MemoReadyPayload;
  trial_failed: TrialFailedPayload;
  heartbeat: HeartbeatPayload;
};

/** Union lengkap amplop + payload (semua tipe). */
export type TrialEvent = {
  [K in EventType]: Envelope & { type: K; payload: EventPayloadMap[K] };
}[EventType];

/** Helper pencarian tipe — pakai untuk narrowing payload di reducer. */
export function isEventOfType<T extends EventType>(
  event: TrialEvent,
  type: T,
): event is Extract<TrialEvent, { type: T }> {
  return event.type === type;
}

/* ================================================================== */
/* 2. MemoJSON                                                          */
/* ================================================================== */

export type VerdictCategory =
  | 'layak_diteliti_lanjut'
  | 'perlu_kehati_hatian'
  | 'red_flag_berat';

export interface KeyFact {
  fact_id: string;
  label: string;
  value: number;
  unit: string;
  source_endpoint: string;
  as_of_date: string;
}

export interface ArgumentPoint {
  point_id: string;
  argument_md: string;
  /** Merujuk `fact_id` pada array `key_facts` memo ini sendiri. */
  cites: string[];
}

export interface SmartMoneyFinding {
  finding_md: string;
  direction: 'akumulasi' | 'distribusi' | 'netral';
  cites: string[];
}

export interface InsiderFinding {
  finding_md: string;
  direction: 'beli' | 'jual' | 'netral';
  cites: string[];
}

export interface RedFlag {
  flag_md: string;
  severity: 'low' | 'medium' | 'high';
  cites: string[];
}

export interface Verdict {
  category: VerdictCategory;
  /** 0.0 – 1.0 */
  confidence: number;
  rationale_md: string;
  verification_questions: string[];
}

export interface Citation {
  cite_id: string;
  source: 'sectors_endpoint';
  endpoint: string;
  params_summary: string;
  retrieved_at: string;
  cache: CacheStatus;
}

/** Satu panggilan Sectors NYATA selama sidang (tabel audit memo). */
export interface ToolCallAudit {
  agent_id: string;
  tool: string;
  endpoint: string;
  params_summary: string;
  retrieved_at: string;
  cache: CacheStatus;
}

/**
 * MemoJSON — self-contained. Semua sitasi (bull/bear/smart money/insider/
 * red flags) merujuk `key_facts`/`citations` memo ini, BUKAN `evidence_id` stream.
 */
export interface MemoJSON {
  schema_version: string;
  memo_id: string;
  trial_id: string;
  ticker: string;
  company_name: string;
  created_at: string;
  data_mode: TrialMode;
  info_richness: DataRichness;
  executive_summary: string;
  key_facts: KeyFact[];
  bull_case: {
    title: string;
    points: ArgumentPoint[];
  };
  bear_case: {
    title: string;
    points: ArgumentPoint[];
  };
  smart_money_findings: SmartMoneyFinding[];
  insider_findings: InsiderFinding[];
  red_flags: RedFlag[];
  verdict: Verdict;
  citations: Citation[];
  /** Panggilan Sectors nyata; memo lama (pra-audit) tidak memilikinya. */
  tool_calls?: ToolCallAudit[];
  disclaimer: string;
}

/* ================================================================== */
/* 3. Endpoint REST                                                     */
/* ================================================================== */

/** POST /api/trials → 202 */
export interface CreateTrialResponse {
  trial_id: string;
  ticker: string;
  company_name: string;
  mode: TrialMode;
  created_at: string;
}

/** GET /api/trials/{id}/memo → 200 MemoJSON (bila sudah memo_ready). */

/** GET /api/journal?limit=&offset= → 200 */
export interface JournalItem {
  memo_id: string;
  /** trial_id asal memo — dikirim backend sejak kontrak 1.2.1 (untuk /price-series). */
  trial_id?: string;
  ticker: string;
  company_name: string;
  verdict_category: VerdictCategory;
  info_richness: DataRichness;
  /** Bisa null bila harga saat sidang tidak tersedia (mis. mode fixture). */
  price_at_trial: number | null;
  created_at: string;
}

export interface JournalResponse {
  items: JournalItem[];
  total: number;
}

/** GET /api/journal/{memo_id}/postmortem → 200 */
export interface PostmortemResponse {
  memo: MemoJSON;
  /** Harga pada saat memo ditulis (dari memo/data saat itu). Bisa null di mode fixture. */
  price_at_trial: number | null;
  /** Harga saat ini. Bisa null bila data harga tidak tersedia. */
  price_now: number | null;
  /** Persen perubahan, mis. -5.95 berarti turun 5,95%. Bisa null bila harga tidak tersedia. */
  change_pct: number | null;
  /** Jumlah hari antara memo dibuat dan sekarang. */
  days_elapsed: number;
  /** Kontrak 1.1.0 — snapshot harga ascending (2–52 titik); null bila data tidak cukup. */
  price_series: PricePoint[] | null;
}

/** Kontrak 1.1.0 — satu titik harga (daily_transaction snapshot). */
export interface PricePoint {
  date: string;
  close: number;
  volume: number | null;
  change_pct: number | null;
}

/** GET /api/trials/{trial_id}/price-series → 200 (points bisa null bila < 2 titik). */
export interface PriceSeriesResponse {
  trial_id: string;
  ticker: string;
  points: PricePoint[] | null;
}

/** Kontrak 1.2.0 — item daftar emiten (dashboard "Berkas Perkara"). */
export interface TickerListItem {
  ticker: string;
  company_name: string;
  /** Kontrak 1.2.3 — klasifikasi sektor IDX-IC (Financials, Energy, dst.). */
  sector?: string | null;
}

/** GET /api/tickers?q=&limit=&offset=&sector= → 200 */
export interface TickersResponse {
  items: TickerListItem[];
  total: number;
}

/** Kontrak 1.2.3 — GET /api/tickers/sectors → 200 */
export interface TickerSectorsResponse {
  items: { sector: string; count: number }[];
  total: number;
}

/** GET /api/health → 200 */
export interface HealthResponse {
  status: 'ok' | string;
  sectors_mode: TrialMode;
  version: string;
}

/** 422 body dari POST /api/trials (detail validasi / ticker tak dikenal). */
export interface ValidationErrorBody {
  detail: string;
}

/* Label & copy UI pindah ke kamus bahasa (src/i18n), bukan lagi konstanta
   Bahasa Indonesia di berkas tipe. Lihat `useLabels()` — tabel di sana tetap
   dikunci ke union tipe di berkas ini, jadi menambah `Phase` atau `VerdictCategory`
   baru tetap akan menggagalkan typecheck sampai labelnya diisi. */
