/** Metadata tetap 5 analis — dipakai kartu LiveFeed. */
import type { AgentId } from '../types/contract';

export interface AnalystMeta {
  id: AgentId;
  /** Monogram pada avatar (1–2 huruf). */
  monogram: string;
  /** Satu baris tagline fungsi analis. */
  tagline: string;
  /** Ikon (key ikon set icons.tsx). */
  icon: 'fundamental' | 'price' | 'smartmoney' | 'insider' | 'gorengan';
}

export const ANALYST_META: AnalystMeta[] = [
  { id: 'fundamental', monogram: 'FD', tagline: 'Esensi bisnis, parit & valuasi vs peers', icon: 'fundamental' },
  { id: 'price', monogram: 'PR', tagline: 'Momentum, relatif indeks, likuiditas', icon: 'price' },
  { id: 'smartmoney', monogram: 'SM', tagline: 'Arus broker institusi & asing', icon: 'smartmoney' },
  { id: 'insider', monogram: 'IN', tagline: 'Transaksi direksi & pemegang besar', icon: 'insider' },
  { id: 'antigorengan', monogram: 'AG', tagline: 'Suspensi, free float, aksi korporasi', icon: 'gorengan' },
];
