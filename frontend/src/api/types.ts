/**
 * Interface API klien frontend — implementasi nyata (SSE/REST) dan mock
 * (mockSse/mockRest) WAJIB identik. Tugas orkestrasi memilih implementasi
 * berdasarkan VITE_USE_MOCK.
 */
import type {
  CreateTrialResponse,
  HealthResponse,
  JournalResponse,
  MemoJSON,
  PostmortemResponse,
  PriceSeriesResponse,
  TickerSectorsResponse,
  TickersResponse,
  TrialEvent,
} from '../types/contract';

export type TrialModeInput = 'auto' | 'fixture';

/* ---------------- Stream (SSE / mock replay) ------------- */

export type StreamStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface StreamConnectOptions {
  /** Resume stream dari seq ini (reconnect). Di backend → header Last-Event-ID. */
  resumeFromSeq?: number;
}

export interface StreamHandlers {
  onEvent: (event: TrialEvent) => void;
  onStatus: (status: StreamStatus) => void;
}

/** Satu sumber event sidang; interface identik antara sse.ts dan mockSse.ts. */
export interface StreamClient {
  connect(trialId: string, handlers: StreamHandlers, opts?: StreamConnectOptions): () => void;
}

/* ---------------- REST ------------- */

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface RestClient {
  createTrial(ticker: string, mode?: TrialModeInput): Promise<CreateTrialResponse>;
  fetchMemo(trialId: string): Promise<MemoJSON>;
  fetchJournal(limit?: number, offset?: number): Promise<JournalResponse>;
  fetchPostmortem(memoId: string): Promise<PostmortemResponse>;
  fetchHealth(): Promise<HealthResponse>;
  /** Kontrak 1.1.0 — null bila series tidak tersedia (HTTP 200 + points null). */
  fetchPriceSeries(trialId: string): Promise<PriceSeriesResponse>;
  /** Kontrak 1.2.0 — daftar emiten untuk dashboard. */
  listTickers(
    q?: string,
    limit?: number,
    offset?: number,
    sector?: string,
  ): Promise<TickersResponse>;
  /** Kontrak 1.2.3 — daftar sektor registry untuk dropdown filter. */
  fetchTickerSectors(): Promise<TickerSectorsResponse>;
  /** Papan Detektif Investigasi & Relasi Konglomerasi */
  fetchBoard(ticker: string): Promise<any>;
  chatBoard(ticker: string, message: string): Promise<{ reply: string }>;
}

