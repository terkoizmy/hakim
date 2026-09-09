/**
 * Pintu keluar tunggal lapisan API. Memilih implementasi nyata vs mock
 * berdasarkan VITE_USE_MOCK (frontend/.env.example). Kedua implementasi
 * ber-interface identik, jadi seluruh komponen UI tidak peduli mode berjalan.
 */
import { config } from '../config';
import { restClient } from './rest';
import { mockRestClient } from './mockRest';
import { sseClient } from './sse';
import { mockSseClient } from './mockSse';
import type { RestClient, StreamClient } from './types';

export type { StreamClient, StreamHandlers, StreamStatus, RestClient, TrialModeInput } from './types';
export type * from '../types/contract';

const modeBadge = config.useMock ? 'mock' : 'live';

export const streamClient: StreamClient = config.useMock ? mockSseClient : sseClient;

export const api: RestClient = config.useMock ? mockRestClient : restClient;

export const isMockMode = config.useMock;

export { ApiError } from './types';

if (import.meta.env.DEV) {
  console.info(`[sidang] api mode=${modeBadge} base=${config.apiBase} mockSpeed=${config.mockSpeed}`);
}
