/** Metadata tetap 5 analis — dipakai kartu LiveFeed.
 *
 * Nama dan tagline TIDAK ada di sini: keduanya bergantung bahasa dan tinggal
 * di kamus (`enum.analyst.<id>.name|tagline`, dibaca lewat `useLabels()`).
 * Yang tersisa di sini murni visual — monogram dan ikon — supaya berkas ini
 * tetap bebas bahasa.
 */
import type { AgentId } from '../types/contract';

export interface AnalystMeta {
  id: AgentId;
  /** Monogram pada avatar (1–2 huruf). */
  monogram: string;
  /** Ikon (key ikon set icons.tsx). */
  icon: 'fundamental' | 'price' | 'smartmoney' | 'insider' | 'gorengan';
}

export const ANALYST_META: AnalystMeta[] = [
  { id: 'fundamental', monogram: 'FD', icon: 'fundamental' },
  { id: 'price', monogram: 'PR', icon: 'price' },
  { id: 'smartmoney', monogram: 'SM', icon: 'smartmoney' },
  { id: 'insider', monogram: 'IN', icon: 'insider' },
  { id: 'antigorengan', monogram: 'AG', icon: 'gorengan' },
];
