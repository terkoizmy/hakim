/**
 * Konfigurasi runtime frontend, dibaca dari env Vite (lihat frontend/.env.example).
 */
export interface AppConfig {
  apiBase: string;
  /** VITE_USE_MOCK=1 → jalankan tanpa backend sama sekali (replay stream-BBCA.jsonl). */
  useMock: boolean;
  /** VITE_MOCK_DROP_ONCE=1 → simulasikan koneksi putus sekali saat mock, untuk demo reconnect. */
  mockDropOnce: boolean;
  /** VITE_MOCK_SPEED — pemercepat replay mock (1 = kecepatan demo, 2 = 2x lebih cepat). */
  mockSpeed: number;
}

function boolEnv(key: string): boolean {
  const value = import.meta.env[key];
  return value === '1' || value === 'true';
}

function numEnv(key: string, fallback: number): number {
  const value = import.meta.env[key];
  const n = Number(value);
  return value !== undefined && Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config: AppConfig = {
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8000',
  useMock: boolEnv('VITE_USE_MOCK'),
  mockDropOnce: boolEnv('VITE_MOCK_DROP_ONCE'),
  mockSpeed: numEnv('VITE_MOCK_SPEED', 1),
};
