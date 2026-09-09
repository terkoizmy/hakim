import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { GavelIcon, BookIcon, RadioIcon, ScaleIcon } from './icons';
import { isMockMode } from '../api';

export default function AppShell() {
  const { pathname } = useLocation();

  const isCourt = pathname.startsWith('/trial/');
  const isMemo = pathname.startsWith('/memo/');

  return (
    <div className="shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand" aria-label="SIDANG — Beranda">
            <span className="brand-ic"><GavelIcon size={20} /></span>
            <span className="brand-name">
              SIDANG
              <span className="brand-sub">Pasar Modal Indonesia</span>
            </span>
          </Link>

          <nav className="topnav" aria-label="Navigasi utama">
            <NavLink to="/" end className={({ isActive }) => 'navlink' + (isActive && !isCourt && !isMemo ? ' active' : '')}>
              <ScaleIcon size={15} /> Sidang Baru
            </NavLink>
            <NavLink to="/journal" className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
              <BookIcon size={15} /> Jurnal Sidang
            </NavLink>
          </nav>

          <div className="topbar-right">
            <span className={`live-badge ${isMockMode ? 'mock' : 'live'}`}>
              <RadioIcon size={13} />
              {isMockMode ? 'Mode Demo' : 'Live'}
            </span>
          </div>
        </div>
      </header>

      {/* Indikator kemajuan sidang (bar tipis di bawah topbar) */}
      {isCourt && <div className="court-progress-strip" />}

      <main className="shell-main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <p className="muted small">
            <strong>SIDANG</strong> adalah alat bantu riset & analisis pasar modal berbasis data Sectors —{' '}
            <strong>bukan rekomendasi investasi.</strong> Seluruh keputusan investasi sepenuhnya tanggung jawab masing-masing investor.
          </p>
        </div>
      </footer>
    </div>
  );
}
