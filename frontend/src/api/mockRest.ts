/**
 * Klien REST MOCK — tanpa backend sama sekali. Memvalidasi ticker, mengembalikan
 * trial mock, membaca memo dari mockStore (diisi mockSse saat memo_ready),
 * dan menyajikan jurnal + post-mortem dari data fixture.
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
import { JOURNAL_ITEMS, POSTMORTEMS } from '../mocks/journal';
import { ApiError, type RestClient, type TrialModeInput } from './types';
import { COMPANY_NAMES, companyNameFor } from './mockData';
import { mockStore } from './mockStore';

/** Sektor mock per ticker (kontrak 1.2.3) — cukup untuk demo dropdown. */
const MOCK_SECTOR_BY_TICKER: Record<string, string> = {
  BBCA: 'Financials',
  BBRI: 'Financials',
  CUAN: 'Energy',
  GOTO: 'Technology',
  BRMS: 'Basic Materials',
};

/** Daftar emiten mock (urutan stabil, cocok dengan COMPANY_NAMES). */
const MOCK_TICKERS = Object.entries(COMPANY_NAMES).map(([ticker, company_name]) => ({
  ticker,
  company_name,
  sector: MOCK_SECTOR_BY_TICKER[ticker] ?? null,
}));

/** Series harga sintetis untuk mock postmortem (12 titik mingguan). */
function mockPriceSeries(base: number | null): PriceSeriesResponse['points'] {
  if (base == null) return null;
  const points = [];
  const start = base * 0.94;
  for (let i = 0; i < 12; i++) {
    const close = Math.round(start + ((base - start) * i) / 11);
    points.push({ date: `2026-W${i + 1}`, close, volume: null, change_pct: null });
  }
  return points;
}

const TICKER_RE = /^[A-Za-z]{4}$/;

export const mockRestClient: RestClient = {
  async createTrial(ticker, _mode: TrialModeInput = 'auto'): Promise<CreateTrialResponse> {
    // mock selalu fixture (alur stream-BBCA.jsonl); tidak ada mode live tanpa backend.
    const up = ticker.trim().toUpperCase();
    if (!TICKER_RE.test(up)) {
      // Meniru 422 backend: "Ticker tidak dikenal".
      throw new ApiError(422, 'Ticker tidak dikenal');
    }
    return {
      // id turunan ticker supaya mockSse dapat menebus ticker dari route param:
      // BBCA → tr_mock_bbca01 (konsisten dgn trial_id di fixture jurnal).
      trial_id: `tr_mock_${up.toLowerCase()}01`,
      ticker: up,
      company_name: companyNameFor(up),
      mode: 'fixture',
      created_at: new Date().toISOString(),
    };
  },

  async fetchMemo(trialId): Promise<MemoJSON> {
    const memo = mockStore.memoByTrial.get(trialId);
    if (!memo) throw new ApiError(404, 'Memorandum belum siap');
    return memo;
  },

  async fetchJournal(limit = 50, offset = 0): Promise<JournalResponse> {
    const items = JOURNAL_ITEMS.slice(offset, offset + limit);
    return { items, total: JOURNAL_ITEMS.length };
  },

  async fetchPostmortem(memoId): Promise<PostmortemResponse> {
    const pm = POSTMORTEMS[memoId];
    if (!pm) throw new ApiError(404, 'Post-mortem tidak ditemukan');
    return { ...pm, price_series: mockPriceSeries(pm.price_now) };
  },

  async fetchHealth(): Promise<HealthResponse> {
    return { status: 'ok', sectors_mode: 'fixture', version: 'mock' };
  },

  async fetchPriceSeries(trialId): Promise<PriceSeriesResponse> {
    const ticker = trialId.replace(/^tr_mock_/, '').slice(0, 4).toUpperCase();
    const base = JOURNAL_ITEMS.find((j) => j.memo_id === trialId)?.price_at_trial ?? null;
    return { trial_id: trialId, ticker, points: mockPriceSeries(base) };
  },

  async listTickers(q, limit = 50, offset = 0, sector): Promise<TickersResponse> {
    const needle = (q ?? '').trim().toUpperCase();
    const sec = (sector ?? '').trim();
    const filtered = MOCK_TICKERS.filter(
      (t) =>
        (!needle || t.ticker.includes(needle) || t.company_name.toUpperCase().includes(needle)) &&
        (!sec || t.sector === sec),
    );
    return { items: filtered.slice(offset, offset + limit), total: filtered.length };
  },

  async fetchTickerSectors(): Promise<TickerSectorsResponse> {
    const counts = new Map<string, number>();
    for (const t of MOCK_TICKERS) {
      if (t.sector) counts.set(t.sector, (counts.get(t.sector) ?? 0) + 1);
    }
    const items = [...counts.entries()]
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count || a.sector.localeCompare(b.sector));
    return { items, total: items.length };
  },
};
