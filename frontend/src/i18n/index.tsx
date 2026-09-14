import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setFormatLocale } from '../utils/format';
import { DICTS, type DictKey } from './dict';
import { buildLabels, type Labels } from './labels';
import { readStoredLang, storeLang, type Lang } from './types';

export type { Lang } from './types';
export { DEFAULT_LANG, LANGS, LANG_LABEL, LANG_NAME } from './types';
export { renderRich } from './rich';
export { severityKey, type AgentLabelKey, type Labels, type Severity } from './labels';

/** Nilai yang disisipkan ke placeholder `{nama}` di string kamus. */
export type TranslateParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: DictKey, params?: TranslateParams) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // Bahasa dan locale pemformat diubah PADA SAAT YANG SAMA, bukan lewat efek
  // terpisah: kalau locale menyusul satu render, angka dan tanggal sempat
  // tampil dengan pemisah bahasa yang salah.
  const [lang, setLangState] = useState<Lang>(() => {
    const initial = readStoredLang();
    setFormatLocale(initial);
    return initial;
  });

  const setLang = useCallback((next: Lang) => {
    setFormatLocale(next);
    storeLang(next);
    setLangState(next);
  }, []);

  // Yang menyentuh DOM (atribut lang, judul tab, meta description) memang
  // efek — bukan bagian dari perhitungan render.
  useEffect(() => {
    const dict = DICTS[lang];
    document.documentElement.lang = lang;
    document.title = dict['meta.title'];
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', dict['meta.description']);
  }, [lang]);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang(lang === 'en' ? 'id' : 'en'),
      t: (key, params) => {
        const out = interpolate(DICTS[lang][key], params);
        if (import.meta.env.DEV && !params && /\{\w+\}/.test(out)) {
          console.warn(`[i18n] "${key}" masih memuat placeholder — parameternya belum diisi.`);
        }
        return out;
      },
    }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang harus dipakai di dalam <LangProvider>');
  return ctx;
}

/** Tabel label (fase, putusan, agen, keparahan, …) untuk bahasa aktif.
 * Dibangun ulang hanya saat bahasa berganti. */
export function useLabels(): Labels {
  const { lang } = useLang();
  return useMemo(() => buildLabels(lang), [lang]);
}
