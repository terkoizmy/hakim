/**
 * Konfigurasi runtime frontend, dibaca dari env Vite (lihat frontend/.env.example).
 */
export interface AppConfig {
  apiBase: string;
}

export const config: AppConfig = {
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8000',
};
