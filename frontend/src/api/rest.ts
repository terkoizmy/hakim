/**
 * Klien REST nyata (FastAPI backend). Kontrak endpoint: docs/CONTRACT.md §3.
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
} from '../types/contract';
import { config } from '../config';
import { ApiError, type RestClient } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      // body bukan JSON — pakai status saja.
    }
    throw new ApiError(res.status, detail || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export const restClient: RestClient = {
  createTrial(ticker, mode = 'auto') {
    return request<CreateTrialResponse>('/api/trials', {
      method: 'POST',
      body: JSON.stringify({ ticker: ticker.toUpperCase(), mode }),
    });
  },

  fetchMemo(trialId) {
    return request<MemoJSON>(`/api/trials/${encodeURIComponent(trialId)}/memo`);
  },

  fetchJournal(limit = 50, offset = 0) {
    return request<JournalResponse>(
      `/api/journal?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(
        String(offset),
      )}`,
    );
  },

  fetchPostmortem(memoId) {
    return request<PostmortemResponse>(`/api/journal/${encodeURIComponent(memoId)}/postmortem`);
  },

  fetchHealth() {
    return request<HealthResponse>('/api/health');
  },

  fetchPriceSeries(trialId) {
    return request<PriceSeriesResponse>(
      `/api/trials/${encodeURIComponent(trialId)}/price-series`,
    );
  },

  listTickers(q, limit = 50, offset = 0, sector) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (q) params.set('q', q);
    if (sector) params.set('sector', sector);
    return request<TickersResponse>(`/api/tickers?${params.toString()}`);
  },

  fetchTickerSectors() {
    return request<TickerSectorsResponse>('/api/tickers/sectors');
  },
};
