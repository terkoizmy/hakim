import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { VerdictBadge } from './JournalPage';
import { ArrowRightIcon, BookIcon, SearchIcon } from '../components/icons';
import type { JournalItem, TickerListItem } from '../types/contract';

const EXAMPLES = ['BBCA', 'CUAN', 'GOTO', 'BRMS', 'BBRI'];

const SEARCH_DEBOUNCE_MS = 250;

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
    <div className="pad-page dash">
      <div className="container">
        <div className="dash-head">
          <div>
            <h1 className="dash-title">Berkas Perkara</h1>
            <p className="muted small dash-sub">
              Semua emiten terdaftar IDX — klik baris untuk membuka berkas, lalu adili.
            </p>
          </div>
          <label className="docket-search">
            <SearchIcon size={15} />
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kode atau nama emiten…"
              aria-label="Cari emiten"
              autoFocus
            />
          </label>
        </div>

        <div className={`docket-grid ${showRecent ? 'has-recent' : ''}`}>
          <div className={`screen-table-wrap card ${docketLoading ? 'is-loading' : ''}`}>
            <table className="screen-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Emiten</th>
                  <th>Putusan Terakhir</th>
                  <th className="num">Jml Sidang</th>
                  <th className="num">Terakhir Diadili</th>
                  <th className="num">Harga Saat Sidang</th>
                </tr>
              </thead>
              <tbody>
                {docket.map((t) => {
                  const hist = historyByTicker.get(t.ticker);
                  const last = hist?.[0];
                  return (
                    <tr
                      key={t.ticker}
                      className="screen-row"
                      onClick={() => navigate(`/ticker/${t.ticker}`)}
                      title={`Buka detail ${t.ticker}`}
                    >
                      <td className="screen-ticker mono">{t.ticker}</td>
                      <td className="screen-name">{t.company_name || 'Emiten IDX'}</td>
                      <td>
                        {last ? (
                          <VerdictBadge category={last.verdict_category} />
                        ) : (
                          <span className="muted tiny">Belum diadili</span>
                        )}
                      </td>
                      <td className="num mono">{hist ? hist.length : '—'}</td>
                      <td className="num small muted">{last ? fmtDate(last.created_at) : '—'}</td>
                      <td className="num mono">
                        {last?.price_at_trial != null
                          ? `Rp ${last.price_at_trial.toLocaleString('id-ID')}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
                {docket.length === 0 && !docketLoading && (
                  <tr>
                    <td colSpan={7} className="muted small screen-empty">
                      Tidak ada emiten yang cocok dengan “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {docketFallback && (
              <p className="tiny muted dash-fallback">
                Menampilkan contoh ticker — daftar emiten backend belum tersedia.
              </p>
            )}
          </div>

          {showRecent && (
            <aside className="recent-panel card card-pad anim-in">
              <div className="recent-head">
                <BookIcon size={16} />
                <h3>Sidang Terakhir</h3>
              </div>
              {recent.map((j) => (
                <button
                  key={j.memo_id}
                  type="button"
                  className="recent-row"
                  onClick={() => navigate(`/memo/${j.memo_id}`)}
                  title={`Buka memorandum ${j.ticker}`}
                >
                  <VerdictBadge category={j.verdict_category} />
                  <span className="recent-ticker mono">{j.ticker}</span>
                  <span className="recent-arrow" aria-hidden="true">
                    <ArrowRightIcon size={13} />
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="btn btn-ghost recent-all"
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