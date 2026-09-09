import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { type JournalItem, type VerdictCategory } from '../types/contract';
import { formatDate } from '../utils/format';
import { GavelIcon } from '../components/icons';

const VERDICT_BADGE_LABEL: Record<VerdictCategory, string> = {
  layak_diteliti_lanjut: 'Layak diteliti lanjut',
  perlu_kehati_hatian: 'Perlu kehati-hatian',
  red_flag_berat: 'Red flag berat',
};

/** Badge putusan gaya mock — radius 6px, dot 6px, label sentence case. */
export function VerdictBadge({ category }: { category: VerdictCategory }) {
  const style =
    category === 'layak_diteliti_lanjut'
      ? { color: '#8fc07c', border: 'rgba(127,176,105,0.4)', bg: 'rgba(127,176,105,0.06)', dot: '#7fb069' }
      : category === 'perlu_kehati_hatian'
        ? { color: '#d9a441', border: 'rgba(217,164,65,0.4)', bg: 'rgba(217,164,65,0.06)', dot: '#d9a441' }
        : { color: '#c96a5a', border: 'rgba(201,106,90,0.4)', bg: 'rgba(201,106,90,0.06)', dot: '#c96a5a' };
  return (
    <span
      className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[6px] px-[10px] py-[5px] font-mono text-[11.5px] tracking-[0.3px]"
      style={{ color: style.color, borderColor: style.border, background: style.bg, borderStyle: 'solid', borderWidth: 1 }}
    >
      <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: style.dot }} aria-hidden="true" />
      {VERDICT_BADGE_LABEL[category]}
    </span>
  );
}

/** Badge "Info A/B" gaya .b-info mock. */
export function InfoBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[6px] border border-brass-600 bg-[rgba(201,162,74,0.06)] px-[10px] py-[5px] font-mono text-[11px] tracking-[0.3px] text-brass-300">
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-brass-500" aria-hidden="true" />
      {children}
    </span>
  );
}

// Mock jurnal-sidang: th mono di permukaan lebih gelap, td hairline.
const TH_CLS =
  'whitespace-nowrap border-b border-[#3a332a] bg-[#1a1713] px-[14px] py-3 text-left font-mono text-[10.5px] font-medium uppercase tracking-[1.2px] text-text-3';
const TD_CLS = 'border-b border-[#2a251e] px-[14px] py-[13px] align-middle';

/**
 * Jurnal Sidang (/journal) — arsip mock jurnal-sidang: kepala halaman
 * kicker + judul display, lalu satu tabel arsip seluruh putusan.
 */
export default function JournalPage() {
  const [items, setItems] = useState<JournalItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .fetchJournal(100, 0)
      .then((res) => alive && setItems(res.items))
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : 'Jurnal tidak dapat dimuat.');
        setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const list = useMemo(() => items ?? [], [items]);

  return (
    <div className="pt-12">
      <div className="mx-auto w-full max-w-[1080px] px-6 pb-14">
        <nav className="mb-[22px] font-mono text-[12px] uppercase tracking-[1px] text-text-3">
          <Link to="/" className="text-brass-500 transition-colors hover:text-brass-300">Beranda</Link>
          <span className="mx-[6px]">/</span>
          <span>Jurnal Sidang</span>
        </nav>

        {/* ---------- PAGE HEAD ---------- */}
        <header className="anim-in mb-[30px] border-b border-[#3a332a] pb-[28px]">
          <p className="mb-[10px] font-mono text-[11px] uppercase tracking-[2px] text-brass-500">Arsip</p>
          <h1 className="font-display text-[clamp(30px,4.5vw,44px)] font-medium leading-[1.1] text-text-0">
            Jurnal <em className="italic text-brass-300">Sidang</em>
          </h1>
          <p className="mt-3 max-w-[52ch] text-[14.5px] text-text-2">
            Semua putusan yang pernah diputuskan komite, terarsip.
          </p>
        </header>

        {items === null ? (
          <JournalSkeleton />
        ) : error ? (
          <div className="anim-fade rounded-[14px] border border-[#3a332a] bg-bg-2 px-6 py-10 text-center text-text-2" role="alert">
            {error}
          </div>
        ) : list.length === 0 ? (
          /* ---------- EMPTY STATE ---------- */
          <section className="anim-in flex flex-col items-center gap-[18px] rounded-[14px] border border-dashed border-[#3a332a] bg-bg-2 px-6 py-[72px] text-center">
            <span className="block w-[44px] text-brass-600">
              <GavelIcon size={44} />
            </span>
            <h2 className="font-display text-[22px] font-medium text-text-0">Belum ada sidang.</h2>
            <p className="max-w-[40ch] text-[14px] text-text-2">
              Komite belum memutuskan perkara apa pun. Mulai sidang pertama dari daftar emiten.
            </p>
            <Link
              to="/dashboard"
              className="rounded-pill border border-brass-600 px-5 py-[10px] font-mono text-[12px] tracking-[0.5px] text-brass-400 transition-colors hover:bg-brass-500 hover:text-bg-1"
            >
              Ke Daftar Perkara
            </Link>
          </section>
        ) : (
          /* ---------- ARCHIVE TABLE ---------- */
          <div className="anim-fade overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className={TH_CLS}>Tanggal</th>
                    <th className={TH_CLS}>Ticker</th>
                    <th className={TH_CLS}>Emiten</th>
                    <th className={TH_CLS}>Putusan</th>
                    <th className={TH_CLS}>Kekayaan Data</th>
                    <th className={`${TH_CLS} text-right`}>Harga Saat Sidang</th>
                    <th className={`${TH_CLS} text-right`} aria-label="aksi">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((it) => (
                    <tr key={it.memo_id} className="transition-colors hover:bg-[#1a1713] [&:last-child>td]:border-b-0">
                      <td className={`${TD_CLS} whitespace-nowrap font-mono text-[12.5px] text-text-3`}>{formatDate(it.created_at)}</td>
                      <td className={`${TD_CLS} whitespace-nowrap font-mono text-[13px] font-medium tracking-[0.5px] text-text-0`}>
                        {it.ticker}
                        <em className="not-italic text-brass-500">.</em>
                      </td>
                      <td className={`${TD_CLS} whitespace-nowrap text-[13px] text-text-2`}>
                        <div className="max-w-[190px] truncate">{it.company_name}</div>
                      </td>
                      <td className={TD_CLS}><VerdictBadge category={it.verdict_category} /></td>
                      <td className={TD_CLS}><InfoBadge>Info {it.info_richness}</InfoBadge></td>
                      <td className={`${TD_CLS} text-right font-mono text-[12.5px] tabular-nums text-brass-400`}>
                        {it.price_at_trial == null ? '—' : `Rp ${it.price_at_trial.toLocaleString('id-ID')}`}
                      </td>
                      <td className={`${TD_CLS} whitespace-nowrap text-right`}>
                        <span className="flex justify-end gap-3 text-[12.5px]">
                          <Link to={`/memo/${it.memo_id}`} className="text-brass-500 transition-colors hover:text-brass-300">
                            Memo
                          </Link>
                          <Link
                            to={`/journal/${it.memo_id}/postmortem`}
                            className="text-brass-500 transition-colors hover:text-brass-300"
                            title="Post-mortem: harga sejak putusan"
                          >
                            Post-mortem
                          </Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JournalSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-[#3a332a] bg-bg-2 px-6 py-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div className="flex flex-1 flex-col gap-2">
            <span className="skeleton" style={{ width: '50%', height: 14 }} />
            <span className="skeleton" style={{ width: '70%', height: 10 }} />
          </div>
          <span className="skeleton" style={{ width: 90, height: 22 }} />
        </div>
      ))}
    </div>
  );
}