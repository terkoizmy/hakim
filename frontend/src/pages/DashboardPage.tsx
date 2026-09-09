import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { VerdictBadge } from './JournalPage';
import { ArrowRightIcon, BookIcon, SearchIcon } from '../components/icons';
import type { JournalItem, TickerListItem } from '../types/contract';

const EXAMPLES = ['BBCA', 'CUAN', 'GOTO', 'BRMS', 'BBRI'];

const SEARCH_DEBOUNCE_MS = 250;

const TH =
  'whitespace-nowrap border-b border-line-1 px-3 py-[11px] text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-2 first:pl-4';
const TH_NUM = `${TH} text-right`;
const TD = 'whitespace-nowrap border-b border-line-0 px-3 py-[11px] align-middle first:pl-4 last:pr-4';

/**
 * Dashboard "Berkas Perkara" (/dashboard) — tabel screener seluruh emiten
 * IDX; klik baris membuka halaman detail emiten.
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [docket, setDocket] = useState<TickerListItem[]>(
    EXAMPLES.map((t) => ({ ticker: t, company_name: '' })),
  );
  const [docketFallback, setDocketFallback] = useState(true); // fallback daftar contoh
  const [query, setQuery] = useState('');
  const [docketLoading, setDocketLoading] = useState(false);
  const [recent, setRecent] = useState<JournalItem[]>([]);
  const [journal, setJournal] = useState<JournalItem[]>([]);

  // Jurnal: agregat per ticker untuk tabel + kolom samping.
  useEffect(() => {
    let alive = true;
    api
      .fetchJournal(50, 0)
      .then((res) => {
        if (!alive) return;
        setJournal(res.items);
        setRecent(res.items.slice(0, 4));
      })
      .catch(() => undefined); // jurnal kosong / backend belum jalan — biarkan kolom tersembunyi
    return () => {
      alive = false;
    };
  }, []);

  // Riwayat per ticker, terurut terbaru dulu.
  const historyByTicker = useMemo(() => {
    const m = new Map<string, JournalItem[]>();
    for (const j of journal) {
      const list = m.get(j.ticker) ?? [];
      list.push(j);
      m.set(j.ticker, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return m;
  }, [journal]);

  // Daftar emiten: dari backend bila tersedia; gagal → pakai daftar contoh.
  useEffect(() => {
    let alive = true;
    setDocketLoading(true);
    const t = setTimeout(() => {
      api
        .listTickers(query.trim() || undefined, 60, 0)
        .then((res) => {
          if (!alive) return;
          if (res.items.length > 0) {
            setDocket(res.items);
            setDocketFallback(false);
          }
        })
        .catch(() => {
          if (!alive) return;
          setDocketFallback(true);
          const q = query.trim().toUpperCase();
          setDocket(
            EXAMPLES.filter((t) => (q ? t.includes(q) : true)).map((t) => ({
              ticker: t,
              company_name: '',
            })),
          );
        })
        .finally(() => {
          if (alive) setDocketLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  const showRecent = recent.length > 0;

  return (
    <div className="flex flex-col gap-5 py-8 pb-14">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-bold tracking-[0.02em] text-text-0">
              Berkas <em aria-hidden="true" className="font-medium italic text-brass-300">Perkara</em>
            </h1>
            <p className="muted small mt-1">
              Semua emiten terdaftar IDX — klik baris untuk membuka berkas, lalu adili.
            </p>
          </div>
          <label className="flex h-10 min-w-[280px] items-center gap-2 rounded-md border border-line-2 bg-bg-3 px-3.5 text-text-3 transition-colors focus-within:border-brass-500 focus-within:text-brass-300">
            <SearchIcon size={15} />
            <input
              className="input h-auto border-0 bg-transparent p-0 text-[13.5px] focus:shadow-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kode atau nama emiten…"
              aria-label="Cari emiten"
              autoFocus
            />
          </label>
        </div>

        <div
          className={`grid grid-cols-1 items-start gap-5 ${
            showRecent ? 'min-[1021px]:grid-cols-[minmax(0,1fr)_260px]' : ''
          }`}
        >
          <div className={`card overflow-x-auto transition-opacity ${docketLoading ? 'opacity-[0.55]' : ''}`}>
            <table className="w-full min-w-[680px] border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className={TH}>Ticker</th>
                  <th className={TH}>Emiten</th>
                  <th className={TH}>Putusan Terakhir</th>
                  <th className={TH_NUM}>Jml Sidang</th>
                  <th className={TH_NUM}>Terakhir Diadili</th>
                  <th className={TH_NUM}>Harga Saat Sidang</th>
                </tr>
              </thead>
              <tbody>
                {docket.map((t) => {
                  const hist = historyByTicker.get(t.ticker);
                  const last = hist?.[0];
                  return (
                    <tr
                      key={t.ticker}
                      className="group cursor-pointer transition-colors hover:bg-[rgba(236,224,200,0.04)] [&:last-child>td]:border-b-0"
                      onClick={() => navigate(`/ticker/${t.ticker}`)}
                      title={`Buka detail ${t.ticker}`}
                    >
                      <td
                        className={`${TD} mono text-[14px] font-bold tracking-[0.1em] text-brass-200 transition-colors group-hover:text-brass-100`}
                      >
                        {t.ticker}
                      </td>
                      <td className={`${TD} max-w-[190px] overflow-hidden text-ellipsis text-text-1`}>
                        {t.company_name || 'Emiten IDX'}
                      </td>
                      <td className={`${TD} [&_.badge]:px-2 [&_.badge]:text-[9.5px]`}>
                        {last ? (
                          <VerdictBadge category={last.verdict_category} />
                        ) : (
                          <span className="muted tiny">Belum diadili</span>
                        )}
                      </td>
                      <td className={`${TD} mono text-right`}>{hist ? hist.length : '—'}</td>
                      <td className={`${TD} small muted text-right`}>
                        {last ? fmtDate(last.created_at) : '—'}
                      </td>
                      <td className={`${TD} mono text-right`}>
                        {last?.price_at_trial != null
                          ? `Rp ${last.price_at_trial.toLocaleString('id-ID')}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
                {docket.length === 0 && !docketLoading && (
                  <tr>
                    <td colSpan={7} className="muted small px-4 py-5">
                      Tidak ada emiten yang cocok dengan “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {docketFallback && (
              <p className="tiny muted m-0 border-t border-line-0 px-4 py-2.5">
                Menampilkan contoh ticker — daftar emiten backend belum tersedia.
              </p>
            )}
          </div>

          {showRecent && (
            <aside className="card anim-in flex max-[1020px]:-order-1 flex-col gap-2 px-6 py-5">
              <div className="mb-2 flex items-center gap-2 text-brass-300">
                <BookIcon size={16} />
                <h3 className="text-[14px] tracking-[0.04em]">Sidang Terakhir</h3>
              </div>
              {recent.map((j) => (
                <button
                  key={j.memo_id}
                  type="button"
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent bg-transparent px-2.5 py-2 text-left transition-colors hover:border-line-1 hover:bg-bg-3"
                  onClick={() => navigate(`/memo/${j.memo_id}`)}
                  title={`Buka memorandum ${j.ticker}`}
                >
                  <VerdictBadge category={j.verdict_category} />
                  <span className="mono flex-1 text-[13px] font-semibold text-text-0">{j.ticker}</span>
                  <span className="text-text-3" aria-hidden="true">
                    <ArrowRightIcon size={13} />
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="btn btn-ghost mt-2 text-[12.5px]"
                onClick={() => navigate('/journal')}
              >
                Jurnal Sidang <ArrowRightIcon size={14} />
              </button>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}