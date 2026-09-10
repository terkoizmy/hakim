import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import PriceChart from '../components/PriceChart';
import { VerdictBadge } from './JournalPage';
import { GavelIcon } from '../components/icons';
import type { JournalItem, PriceSeriesResponse } from '../types/contract';

// Mock berkas-emiten: th mono di permukaan lebih gelap, td hairline.
const TH_CLS =
  'whitespace-nowrap border-b border-[#3a332a] bg-[#1a1713] px-[18px] py-[14px] text-left font-mono text-[11px] font-medium uppercase tracking-[1px] text-text-3';
const TD_CLS = 'whitespace-nowrap border-b border-[#2a251e] px-[18px] py-[15px] align-middle';

/** Kepala seksi gaya mock: kicker brass + h2 display, catatan mono kanan. */
function KickerHead({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
      <div>
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[1.5px] text-brass-500">{kicker}</p>
        <h2 className="font-display text-[20px] font-medium text-text-0">{title}</h2>
      </div>
      {note && <span className="font-mono text-[12px] text-text-3">{note}</span>}
    </div>
  );
}

/** Badge "Info A/B" gaya .b-info mock. */
function InfoBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[6px] border border-brass-600 bg-[rgba(201,162,74,0.06)] px-[10px] py-[5px] font-mono text-[11.5px] tracking-[0.3px] text-brass-300">
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-brass-500" aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Halaman detail emiten (/ticker/:ticker) — dossier mock berkas-emiten:
 * kepala emiten besar, tombol Buka Sidang, kartu grafik harga arsip
 * (snapshot sidang terakhir, 0 kredit), dan riwayat persidangan.
 */
export default function TickerDetailPage() {
  const { ticker: rawTicker } = useParams();
  const navigate = useNavigate();
  const ticker = (rawTicker ?? '').toUpperCase().slice(0, 4);

  const [history, setHistory] = useState<JournalItem[] | null>(null);
  const [series, setSeries] = useState<PriceSeriesResponse | null>(null);
  const [seriesMissing, setSeriesMissing] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Riwayat persidangan ticker ini dari jurnal.
  useEffect(() => {
    let alive = true;
    setHistory(null);
    api
      .fetchJournal(100, 0)
      .then((res) => {
        if (!alive) return;
        const items = res.items
          .filter((j) => j.ticker.toUpperCase() === ticker)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        setHistory(items);
        if (items[0]?.company_name) setCompanyName(items[0].company_name);
      })
      .catch(() => {
        if (alive) setHistory([]);
      });
    return () => {
      alive = false;
    };
  }, [ticker]);

  // Nama emiten dari daftar ticker backend (bila jurnal kosong / nama kosong).
  useEffect(() => {
    if (companyName) return;
    let alive = true;
    api
      .listTickers(ticker, 1, 0)
      .then((res) => {
        if (alive && res.items[0]?.ticker === ticker && res.items[0].company_name) {
          setCompanyName(res.items[0].company_name);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [ticker, companyName]);

  // Seri harga: snapshot sidang terakhir — endpoint DB, 0 kredit.
  // trial_id ada sejak kontrak 1.2.1; mode mock menebus dari memo_id.
  useEffect(() => {
    const latest = history?.[0];
    const seriesId = latest?.trial_id ?? latest?.memo_id;
    if (!seriesId) return;
    let alive = true;
    setSeries(null);
    setSeriesMissing(false);
    api
      .fetchPriceSeries(seriesId)
      .then((res) => {
        if (!alive) return;
        if (res.points && res.points.length >= 2) setSeries(res);
        else setSeriesMissing(true);
      })
      .catch(() => {
        if (alive) setSeriesMissing(true);
      });
    return () => {
      alive = false;
    };
  }, [history]);

  async function startTrial() {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const trial = await api.createTrial(ticker, 'auto');
      navigate(`/trial/${trial.trial_id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Gagal memulai sidang. Coba lagi.';
      setError(msg);
      setStarting(false);
    }
  }

  const latest = history && history.length > 0 ? history[0] : null;
  const hasHistory = history !== null && history.length > 0;

  return (
    <div className="pb-[72px] pt-10">
      <div className="container">
        <nav className="mb-[22px] font-mono text-[12px] uppercase tracking-[1px] text-text-3">
          <Link to="/dashboard" className="text-brass-500 transition-colors hover:text-brass-300">
            Daftar Perkara
          </Link>
          <span className="mx-[6px]">/</span>
          <span>Berkas Emiten</span>
        </nav>

        {/* ---------- DOSSIER HEAD ---------- */}
        <header className="anim-in flex flex-col">
          <div className="font-mono text-[clamp(40px,6vw,64px)] font-medium leading-none tracking-[2px] text-text-0">
            {ticker}
            <em className="not-italic text-brass-500">.</em>
          </div>
          <div className="mt-[6px] font-display text-[clamp(20px,3vw,28px)] font-normal text-text-2">
            {companyName ?? 'Emiten IDX'}
          </div>
          {latest && (
            <div className="mt-4 flex flex-wrap gap-[10px]">
              <VerdictBadge category={latest.verdict_category} />
              <InfoBadge>Info {latest.info_richness}</InfoBadge>
            </div>
          )}
          {latest && (
            <p className="mt-[18px] font-mono text-[13.5px] text-text-2">
              Harga saat putusan terakhir:{' '}
              <b className="font-medium tabular-nums text-text-0">
                Rp {latest.price_at_trial?.toLocaleString('id-ID') ?? '—'}
              </b>{' '}
              <span className="text-text-3">· {fmtDate(latest.created_at)}</span>
            </p>
          )}
        </header>

        {/* ---------- CTA ---------- */}
        <div className="anim-in mt-[26px]">
          <button
            className="inline-flex items-center gap-[10px] rounded-[10px] border border-brass-500 bg-brass-500 px-[26px] py-[14px] font-mono text-[14px] font-medium tracking-[0.5px] text-[#14120f] transition-colors hover:border-brass-400 hover:bg-brass-400"
            onClick={startTrial}
            disabled={starting}
            title={`Mulai sidang untuk ${ticker}`}
          >
            {starting ? (
              <span className="spinner-glow" />
            ) : (
              <>
                <GavelIcon size={17} /> Buka Sidang <span className="text-[11px] tracking-[0.3px] text-[rgba(20,18,15,0.6)]">· ±3 menit</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-[13.5px] text-[#c96a5a]" role="alert">
            {error}
          </p>
        )}

        {hasHistory ? (
          <>
            {/* ---------- CHART ---------- */}
            <section className="anim-in mt-[34px] rounded-[14px] border border-[#3a332a] bg-bg-2 px-6 pb-5 pt-6">
              <KickerHead
                kicker="Arsip"
                title="Perjalanan harga"
                note={latest ? `SEJAK MEMO TERAKHIR · ${history!.length} SIDANG` : undefined}
              />
              {series ? (
                <PriceChart points={series.points} />
              ) : seriesMissing ? (
                <p className="rounded-[10px] border border-dashed border-[#3a332a] px-4 py-6 text-center text-[13px] text-text-2">
                  Seri harga belum tersedia untuk sidang ini — buka sidang baru untuk mengambil
                  snapshot terkini.
                </p>
              ) : (
                <p className="rounded-[10px] border border-dashed border-[#3a332a] px-4 py-6 text-center text-[13px] text-text-2">
                  Memuat seri harga…
                </p>
              )}
              {series && latest && (
                <p className="mt-[14px] text-[12.5px] leading-[1.6] text-text-3">
                  Harga diambil dari arsip sidang, bukan real-time.{' '}
                  <b className="font-medium text-text-2">
                    Min {fmtSeriesMin(series)} · Max {fmtSeriesMax(series)}
                  </b>{' '}
                  sejak memo terakhir.
                </p>
              )}
            </section>

            {/* ---------- HISTORY ---------- */}
            <section className="anim-in mt-10">
              <KickerHead kicker="Arsip" title="Riwayat persidangan" />
              <div className="overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-[14px]">
                    <thead>
                      <tr>
                        <th className={TH_CLS}>Tanggal</th>
                        <th className={TH_CLS}>Putusan</th>
                        <th className={TH_CLS}>Kekayaan Data</th>
                        <th className={`${TH_CLS} text-right`}>Harga Saat Sidang</th>
                        <th className={TH_CLS}>Dokumen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history!.map((j) => (
                        <tr key={j.memo_id} className="[&:last-child>td]:border-b-0">
                          <td className={`${TD_CLS} font-mono text-[13px] text-text-2`}>{fmtDate(j.created_at)}</td>
                          <td className={TD_CLS}>
                            <VerdictBadge category={j.verdict_category} />
                          </td>
                          <td className={TD_CLS}>
                            <InfoBadge>Info {j.info_richness}</InfoBadge>
                          </td>
                          <td className={`${TD_CLS} text-right font-mono text-[13px] tabular-nums text-text-0`}>
                            {j.price_at_trial != null ? `Rp ${j.price_at_trial.toLocaleString('id-ID')}` : '—'}
                          </td>
                          <td className={TD_CLS}>
                            <span className="flex gap-4 text-[13px]">
                              <Link to={`/memo/${j.trial_id ?? j.memo_id}`} className="text-brass-500 transition-colors hover:text-brass-300">
                                Memo
                              </Link>
                              <Link
                                to={`/journal/${j.memo_id}/postmortem`}
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
            </section>
          </>
        ) : (
          /* ---------- EMPTY STATE ---------- */
          <section className="anim-in mt-[34px] rounded-[14px] border border-dashed border-[#3a332a] bg-bg-2 px-6 py-14 text-center">
            <span className="mx-auto mb-[18px] block w-[34px] text-brass-600">
              <GavelIcon size={34} />
            </span>
            <h2 className="mb-2 font-display text-[22px] font-medium text-text-0">
              {history === null ? 'Memuat riwayat…' : `${ticker} belum pernah diadili`}
            </h2>
            <p className="mx-auto mb-6 max-w-[46ch] text-[14.5px] text-text-2">
              Sidang pertama akan mengumpulkan bukti dari lima analis, lalu hakim menulis
              memorandum riset lengkap untuk {ticker}.
            </p>
            <div className="flex justify-center">
              <button
                className="inline-flex items-center gap-[10px] rounded-[10px] border border-brass-500 bg-brass-500 px-[26px] py-[14px] font-mono text-[14px] font-medium tracking-[0.5px] text-[#14120f] transition-colors hover:border-brass-400 hover:bg-brass-400"
                onClick={startTrial}
                disabled={starting}
              >
                <GavelIcon size={17} /> Buka Sidang
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function fmtSeriesMin(s: PriceSeriesResponse): string {
  const closes = (s.points ?? []).map((p) => p.close);
  return closes.length ? `Rp ${Math.min(...closes).toLocaleString('id-ID')}` : '—';
}

function fmtSeriesMax(s: PriceSeriesResponse): string {
  const closes = (s.points ?? []).map((p) => p.close);
  return closes.length ? `Rp ${Math.max(...closes).toLocaleString('id-ID')}` : '—';
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}