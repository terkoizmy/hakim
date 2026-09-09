import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { GavelIcon, BookIcon, RadioIcon, ScaleIcon, SearchIcon } from './icons';
import { isMockMode } from '../api';

/* Topbar height = var(--shell-topbar-h) = 64px */
const TOPBAR_H = 'h-16';

const navLinkClass = (active: boolean) =>
  `inline-flex items-center gap-[7px] rounded-md border px-3.5 py-2 text-sm font-medium transition-colors ${
    active
      ? 'border-[rgba(217,180,109,0.28)] bg-[rgba(217,180,109,0.1)] text-brass-200'
      : 'border-transparent text-text-1 hover:bg-bg-3 hover:text-text-0'
  }`;

export default function AppShell() {
  const { pathname } = useLocation();

  const isCourt = pathname.startsWith('/trial/');
  const isMemo = pathname.startsWith('/memo/');
  const isHome = pathname === '/';

  return (
    <div className="flex min-h-full flex-col">
      <header
        className={`${TOPBAR_H} sticky top-0 z-40 border-b border-line-1 bg-[rgba(9,11,14,0.82)] backdrop-blur-[14px]`}
      >
        <div className="container flex h-full items-center gap-6">
          <Link to="/" className="inline-flex items-center gap-3 text-text-0" aria-label="SIDANG — Beranda">
            <span className="grid h-9 w-9 place-items-center rounded-md border border-[rgba(217,180,109,0.4)] bg-[linear-gradient(160deg,rgba(217,180,109,0.22),rgba(217,180,109,0.06))] text-brass-300 shadow-1">
              <GavelIcon size={20} />
            </span>
            <span className="flex flex-col font-display text-[19px] font-bold leading-[1.05] tracking-[0.14em]">
              SIDANG
              <span className="font-sans text-[9.5px] font-medium uppercase tracking-[0.18em] text-text-2">
                Pasar Modal Indonesia
              </span>
            </span>
          </Link>

          <nav className="ml-4 flex gap-2" aria-label="Navigasi utama">
            <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive && !isCourt && !isMemo)}>
              <ScaleIcon size={15} /> Beranda
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => navLinkClass(isActive && !isCourt && !isMemo && !isHome)}
            >
              <SearchIcon size={15} /> Berkas Perkara
            </NavLink>
            <NavLink to="/journal" className={({ isActive }) => navLinkClass(isActive)}>
              <BookIcon size={15} /> Jurnal Sidang
            </NavLink>
          </nav>

          <div className="ml-auto">
            <span
              className={`inline-flex items-center gap-1.5 rounded-pill border px-[11px] py-[5px] text-[11px] font-semibold uppercase tracking-[0.08em] ${
                isMockMode
                  ? 'border-[rgba(217,180,109,0.4)] bg-[rgba(217,180,109,0.08)] text-brass-300'
                  : 'border-[rgba(76,201,143,0.4)] bg-[rgba(76,201,143,0.08)] text-defend-300'
              }`}
            >
              <RadioIcon size={13} />
              {isMockMode ? 'Mode Demo' : 'Live'}
            </span>
          </div>
        </div>
      </header>

      {/* Indikator kemajuan sidang (bar tipis di bawah topbar) */}
      {isCourt && (
        <div className="h-[3px] animate-strip-slide bg-[linear-gradient(90deg,transparent,var(--brass-500)_20%,var(--brass-400)_50%,var(--brass-500)_80%,transparent)] bg-[length:220%_100%] opacity-70" />
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line-1 bg-bg-0 py-6">
        <div className="container">
          <p className="muted small max-w-[720px]">
            <strong>SIDANG</strong> adalah alat bantu riset & analisis pasar modal berbasis data Sectors —{' '}
            <strong>bukan rekomendasi investasi.</strong> Seluruh keputusan investasi sepenuhnya tanggung jawab masing-masing investor.
          </p>
        </div>
      </footer>
    </div>
  );
}