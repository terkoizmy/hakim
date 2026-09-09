import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { GavelIcon, RadioIcon } from './icons';
import { isMockMode } from '../api';

export default function AppShell() {
  const { pathname } = useLocation();

  const isCourt = pathname.startsWith('/trial/');
  const isMemo = pathname.startsWith('/memo/');

  const navLinkClass = (active: boolean) =>
    `text-[13.5px] transition-colors duration-200 ${
      active ? 'text-text-0' : 'text-text-2 hover:text-text-0'
    }`;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line-0 bg-[rgba(20,18,15,0.82)] backdrop-blur-[12px]">
        <div className="container flex h-16 items-center justify-between gap-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 font-display text-[20px] font-semibold tracking-[0.02em] text-text-0"
            aria-label="SIDANG — Beranda"
          >
            <GavelIcon size={22} className="text-brass-500" />
            <span>
              SIDANG<em className="italic text-brass-500">.</em>
            </span>
          </Link>

          <nav className="flex items-center gap-[26px]" aria-label="Navigasi utama">
            <NavLink to="/dashboard" className={({ isActive }) => navLinkClass(isActive && !isCourt && !isMemo)}>
              Berkas Perkara
            </NavLink>
            <NavLink to="/journal" className={({ isActive }) => navLinkClass(isActive)}>
              Jurnal
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-pill px-[11px] py-[5px] font-mono text-[11px] tracking-[0.03em] ${
                isMockMode
                  ? 'border border-brass-700 bg-[rgba(201,162,74,0.06)] text-brass-400'
                  : 'border border-[rgba(127,176,105,0.4)] bg-[rgba(127,176,105,0.06)] text-defend-400'
              }`}
              title={isMockMode ? 'Data fixture — tidak memakai kredit API' : 'Terhubung ke data Sectors'}
            >
              <RadioIcon size={12} />
              {isMockMode ? 'DEMO' : 'LIVE'}
            </span>
            <Link
              to="/dashboard"
              className="hidden rounded-pill border border-brass-700 px-4 py-2 font-mono text-[12px] tracking-[0.04em] text-brass-400 transition-colors duration-200 hover:border-brass-500 hover:bg-brass-500 hover:text-bg-1 sm:inline-block"
            >
              Daftar Perkara
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-14 border-t border-line-0 py-10 pb-12">
        <div className="container">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <span className="font-display text-[18px] font-medium text-text-0">
              SIDANG<em className="italic text-brass-500">.</em>
            </span>
            <nav className="flex gap-6 text-[13px] text-text-2">
              <Link to="/dashboard" className="transition-colors hover:text-brass-400">Berkas Perkara</Link>
              <Link to="/journal" className="transition-colors hover:text-brass-400">Jurnal</Link>
            </nav>
          </div>
          <div className="rounded-[10px] border border-line-0 bg-bg-2 px-5 py-[18px] text-[12.5px] leading-[1.7] text-text-3">
            <strong className="font-medium text-text-2">Disclaimer GLOBAL No. 10.</strong> SIDANG adalah alat bantu
            riset, bukan
            rekomendasi investasi. Seluruh putusan, kategori, dan konfidensi merupakan hasil analisis otomatis dari data
            arsip dan tidak menjamin akurasi prediksi. Harga yang tampil hanya berasal dari arsip sidang —{' '}
            <span className="text-[#d9a441]">tidak ada harga real-time</span>. Keputusan investasi sepenuhnya tanggung
            jawab Anda.
          </div>
        </div>
      </footer>
    </div>
  );
}