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
} from '../types/contract';
import { JOURNAL_ITEMS, POSTMORTEMS } from '../mocks/journal';
import { ApiError, type RestClient, type TrialModeInput } from './types';
import { companyNameFor } from './mockData';
import { mockStore } from './mockStore';

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
    return pm;
  },

  async fetchHealth(): Promise<HealthResponse> {
    return { status: 'ok', sectors_mode: 'fixture', version: 'mock' };
  },
};
