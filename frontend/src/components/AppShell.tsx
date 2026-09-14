import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { GavelIcon } from './icons';
import { LANGS, LANG_LABEL, LANG_NAME, renderRich, useLang } from '../i18n';

/** Cincin fokus bersama. Sebelumnya tidak ada indikator fokus sama sekali —
 * pengguna keyboard tidak tahu sedang berada di kontrol mana. */
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0';

export default function AppShell() {
  const { pathname } = useLocation();
  const { t, lang, setLang } = useLang();

  const isCourt = pathname.startsWith('/trial/');
  const isMemo = pathname.startsWith('/memo/');

  const navLinkClass = (active: boolean) =>
    `rounded-xs text-[13.5px] transition-colors duration-200 ${FOCUS} ${
      active ? 'text-text-0' : 'text-text-2 hover:text-text-0'
    }`;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line-0 bg-[rgba(20,18,15,0.82)] backdrop-blur-[12px] print:hidden">
        <div className="container flex h-16 items-center justify-between gap-6">
          <Link
            to="/"
            className={`inline-flex items-center gap-2.5 rounded-xs font-display text-[20px] font-semibold tracking-[0.02em] text-text-0 ${FOCUS}`}
            aria-label={t('nav.brand')}
          >
            <GavelIcon size={22} className="text-brass-500" />
            <span>
              SIDANG<em className="italic text-brass-500">.</em>
            </span>
          </Link>

          {/* Tautan tengah disembunyikan di layar sempit.
           *
           * Kepala ini `h-16` — satu baris tetap, tidak boleh melipat. Isinya
           * (merek 121px + tiga tautan 193px + klaster kanan 148px + celah)
           * berjumlah ~510px, sedangkan di 390px hanya tersedia 332px. Karena
           * tidak ada yang boleh melipat, kelebihannya keluar sebagai luapan
           * horizontal seluruh dokumen — di semua rute, kedua bahasa. Tautan
           * yang sama tetap ada di kaki halaman, dan CTA `Berkas Perkara` sudah
           * menutup aksi utama, jadi tidak ada tujuan yang hilang di sini. */}
          <nav className="hidden items-center gap-[26px] sm:flex" aria-label={t('nav.aria')}>
            <NavLink to="/dashboard" className={({ isActive }) => navLinkClass(isActive && !isCourt && !isMemo)}>
              {t('nav.dashboard')}
            </NavLink>
            <NavLink to="/board" className={({ isActive }) => navLinkClass(isActive)}>
              {t('nav.board')}
            </NavLink>
            <NavLink to="/journal" className={({ isActive }) => navLinkClass(isActive)}>
              {t('nav.journal')}
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div
              role="group"
              aria-label={t('nav.langLabel')}
              className="inline-flex items-center overflow-hidden rounded-pill border border-brass-700"
            >
              {LANGS.map((code) => {
                const active = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    aria-pressed={active}
                    aria-label={t('nav.langSwitchTo', { lang: LANG_NAME[code] })}
                    title={LANG_NAME[code]}
                    className={`px-[9px] py-[5px] font-mono text-[11px] tracking-[0.06em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass-500 ${
                      active ? 'bg-brass-500 text-bg-1' : 'text-brass-400 hover:bg-[rgba(201,162,74,0.10)]'
                    }`}
                  >
                    {LANG_LABEL[code]}
                  </button>
                );
              })}
            </div>

            <Link
              to="/dashboard"
              className={`hidden rounded-pill border border-brass-700 px-4 py-2 font-mono text-[12px] tracking-[0.04em] text-brass-400 transition-colors duration-200 hover:border-brass-500 hover:bg-brass-500 hover:text-bg-1 sm:inline-block ${FOCUS}`}
            >
              {t('nav.cta')}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-14 border-t border-line-0 py-10 pb-12 print:hidden">
        <div className="container">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <span className="font-display text-[18px] font-medium text-text-0">
              SIDANG<em className="italic text-brass-500">.</em>
            </span>
            <nav className="flex gap-6 text-[13px] text-text-2">
              <Link to="/dashboard" className={`rounded-xs transition-colors hover:text-brass-400 ${FOCUS}`}>
                {t('nav.dashboard')}
              </Link>
              <Link to="/board" className={`rounded-xs transition-colors hover:text-brass-400 ${FOCUS}`}>
                {t('nav.board')}
              </Link>
              <Link to="/journal" className={`rounded-xs transition-colors hover:text-brass-400 ${FOCUS}`}>
                {t('nav.journal')}
              </Link>
            </nav>
          </div>
          <div className="rounded-[10px] border border-line-0 bg-bg-2 px-5 py-[18px] text-[12.5px] leading-[1.7] text-text-3">
            {renderRich(t('nav.disclaimer'), {
              b: (children) => <strong className="font-medium text-text-2">{children}</strong>,
              em: (children) => <span className="text-[#d9a441]">{children}</span>,
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
