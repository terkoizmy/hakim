/** Kerangka bersama untuk tabel data — Jurnal, Profil Ticker, Berkas Perkara,
 * dan tabel Fakta/Audit di Memorandum.
 *
 * Sebelum ini keempat halaman mendeklarasikan `TH_CLS`/`TD_CLS` sendiri-sendiri
 * dengan isi yang nyaris sama tapi tidak persis: ukuran huruf header 10.5px vs
 * 11px, tracking 1.2px vs 1px, padding sel 14/13 vs 18/15. Empat tabel yang
 * sama-sama "tabel data SIDANG" jadi punya empat ritme berbeda tanpa alasan.
 * Yang dipindahkan ke sini hanya bagian yang TIDAK boleh berbeda antar halaman
 * (garis, permukaan header, tipografi mono). Padding tetap disuplai halaman,
 * karena tabel fakta memo butuh `align-top` sementara tabel arsip butuh
 * `align-middle`, dan kolom pertama/terakhir Jurnal punya padding sendiri
 * supaya sejajar dengan sudut kartu.
 */

/** Header tabel: satu baris, tidak boleh melipat. */
export const TH_BASE =
  'whitespace-nowrap border-b border-[#3a332a] bg-[#1a1713] text-left font-mono text-[10.5px] font-medium uppercase tracking-[1.2px] text-text-3';

/** Header tabel yang BOLEH melipat dua baris.
 *
 * Dipakai tabel daftar emiten di Berkas Perkara: enam kolom di dalam kolom
 * `1fr` tidak muat kalau judul seperti "JML SIDANG" dipaksa satu baris. */
export const TH_WRAP =
  'border-b border-[#3a332a] bg-[#1a1713] text-left font-mono text-[10.5px] font-medium uppercase leading-[1.5] tracking-[1.2px] text-text-3';

/** Sel tabel: hanya garis rambut pemisah. */
export const TD_BASE = 'border-b border-[#2a251e]';
