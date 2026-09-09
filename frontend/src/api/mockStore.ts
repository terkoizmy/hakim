/**
 * Store dalam-modul untuk mode mock. Menyimpan memo dari stream terakhir
 * agar halaman MemoPage/Jurnal tetap bisa dibaca lintas navigasi tanpa backend.
 */
import type { MemoJSON } from '../types/contract';

export const mockStore = {
  memoByTrial: new Map<string, MemoJSON>(),
};

export function setMockMemo(trialId: string, memo: MemoJSON) {
  mockStore.memoByTrial.set(trialId, memo);
}
