/** Metadata tetap 5 analis — dipakai kartu LiveFeed. */
import type { AgentId } from '../types/contract';

export interface AnalystMeta {
  id: AgentId;
  /** Nama pendek pada kartu (mock: "Fundamental", "Harga", …). */
  name: string;
  /** Monogram pada avatar (1–2 huruf). */
  monogram: string;
  /** Satu baris tagline fungsi analis. */
  tagline: string;
  /** Ikon (key ikon set icons.tsx). */
  icon: 'fundamental' | 'price' | 'smartmoney' | 'insider' | 'gorengan';
}

export const ANALYST_META: AnalystMeta[] = [
  { id: 'fundamental', name: 'Fundamental', monogram: 'FD', tagline: 'Laba & valuasi', icon: 'fundamental' },
  { id: 'price', name: 'Harga', monogram: 'PR', tagline: 'Momentum & volume', icon: 'price' },
  { id: 'smartmoney', name: 'Smart Money', monogram: 'SM', tagline: 'Arus institusi', icon: 'smartmoney' },
  { id: 'insider', name: 'Insider', monogram: 'IN', tagline: 'Transaksi direksi', icon: 'insider' },
  { id: 'antigorengan', name: 'Anti-Gorengan', monogram: 'AG', tagline: 'Deteksi manipulasi', icon: 'gorengan' },
];
