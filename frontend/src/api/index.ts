/**
 * Pintu keluar tunggal lapisan API.
 *
 * Hanya ada satu implementasi: klien HTTP/SSE sungguhan ke backend SIDANG.
 * Antarmuka `RestClient`/`StreamClient` dipertahankan supaya halaman tidak
 * pernah tahu bagaimana datanya diambil.
 */
import { config } from '../config';
import { restClient } from './rest';
import { sseClient } from './sse';
import type { RestClient, StreamClient } from './types';

export type { StreamClient, StreamHandlers, StreamStatus, RestClient, TrialModeInput } from './types';
export type * from '../types/contract';

export const streamClient: StreamClient = sseClient;

export const api: RestClient = restClient;

export { ApiError } from './types';

if (import.meta.env.DEV) {
  console.info(`[sidang] api base=${config.apiBase}`);
}
