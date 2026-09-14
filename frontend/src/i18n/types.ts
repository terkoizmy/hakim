/** Bahasa antarmuka yang didukung.
 *
 * Yang diterjemahkan HANYA chrome UI (menu, judul, tombol, header tabel,
 * pesan error milik frontend). Prosa hasil LLM, teks papan yang dibangun
 * backend, dan pesan error server tetap Bahasa Indonesia — cakupan
 * "antarmuka saja" (keputusan 2026-09-14).
 */
export type Lang = 'en' | 'id';

/** Default Inggris (keputusan user 2026-09-14). */
export const DEFAULT_LANG: Lang = 'en';

/** Urutan tampil di saklar bahasa. */
export const LANGS: readonly Lang[] = ['en', 'id'];

/** Kode bahasa adalah nama diri — tidak diterjemahkan. */
export const LANG_LABEL: Record<Lang, string> = { en: 'EN', id: 'ID' };

/** Nama panjang, dipakai di aria-label saklar. */
export const LANG_NAME: Record<Lang, string> = { en: 'English', id: 'Bahasa Indonesia' };

export const LANG_STORAGE_KEY = 'sidang.lang';

/** Dibaca lazy saat provider dipasang supaya halaman yang dimuat dengan
 * pilihan ID tidak berkedip EN lebih dulu. localStorage bisa melempar
 * (mode privat, storage diblokir) — selalu dibungkus try. */
export function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === 'en' || stored === 'id' ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function storeLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* penyimpanan tidak tersedia — pilihan tetap berlaku sampai reload */
  }
}
