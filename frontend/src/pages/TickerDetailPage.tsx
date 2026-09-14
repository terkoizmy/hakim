import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import PriceChart from '../components/PriceChart';
import VerdictBadge from '../components/VerdictBadge';
import InfoBadge from '../components/InfoBadge';
import { TD_BASE, TH_BASE } from '../components/table';
import { GavelIcon } from '../components/icons';
import { renderRich, useLabels, useLang } from '../i18n';
import { formatDate, formatRupiah } from '../utils/format';
import type { JournalItem, PriceSeriesResponse } from '../types/contract';

/** Cincin fokus bersama — pola yang sama dengan AppShell. */
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0';

// Mock berkas-emiten: th mono di permukaan lebih gelap, td hairline.
const TH_CLS = `${TH_BASE} px-[14px] py-3`;
const TD_CLS = `${TD_BASE} whitespace-nowrap px-[14px] py-[13px] align-middle`;

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

/**
 * Halaman detail emiten (/ticker/:ticker) — dossier mock berkas-emiten:
 * kepala emiten besar, tombol Buka Sidang, kartu grafik harga arsip
 * (snapshot sidang terakhir, 0 kredit), dan riwayat persidangan.
 */
export default function TickerDetailPage() {
  const { ticker: rawTicker } = useParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const labels = useLabels();
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
      // Pesan ApiError datang dari lapisan api; hanya galat milik frontend yang
      // lewat kamus, dan teksnya diambil saat render supaya ikut berganti bahasa.
      setError(e instanceof ApiError ? e.message : '');
      setStarting(false);
    }
  }

  const latest = history && history.length > 0 ? history[0] : null;
  const hasHistory = history !== null && history.length > 0;

  return (
    <div className="pb-[72px] pt-10">
      <div className="container">
        <nav className="mb-[22px] font-mono text-[12px] uppercase tracking-[1px] text-text-3">
          <Link
            to="/dashboard"
            className={`rounded-xs text-brass-500 transition-colors hover:text-brass-300 ${FOCUS}`}
          >
            {t('nav.dashboard')}
          </Link>
          <span className="mx-[6px]">/</span>
          <span>{t('ticker.crumb.current')}</span>
        </nav>

        {/* ---------- DOSSIER HEAD ---------- */}
        <header className="anim-in flex flex-col">
          <div className="font-mono text-[clamp(40px,6vw,64px)] font-medium leading-none tracking-[2px] text-text-0">
            {ticker}
            <em className="not-italic text-brass-500">.</em>
          </div>
          <div className="mt-[6px] font-display text-[clamp(20px,3vw,28px)] font-normal text-text-2">
            {companyName ?? t('ticker.issuerFallback')}
          </div>
          {latest && (
            <div className="mt-4 flex flex-wrap gap-[10px]">
              <VerdictBadge category={latest.verdict_category} />
              <InfoBadge title={t('enum.richness.title', { grade: latest.info_richness })}>
                {labels.richness[latest.info_richness]}
              </InfoBadge>
            </div>
          )}
          {latest && (
            <p className="mt-[18px] font-mono text-[13.5px] text-text-2">
              {renderRich(
                t('ticker.lastVerdict.line', {
                  price:
                    latest.price_at_trial == null ? '—' : formatRupiah(latest.price_at_trial),
                  date: formatDate(latest.created_at),
                }),
                {
                  b: (c) => <b className="font-medium tabular-nums text-text-0">{c}</b>,
                  em: (c) => <span className="text-text-3">{c}</span>,
                },
              )}
            </p>
          )}
        </header>

        {/* ---------- CTA ---------- */}
        <div className="anim-in mt-[26px]">
          <button
            className={`inline-flex items-center gap-[10px] rounded-[10px] border border-brass-500 bg-brass-500 px-[26px] py-[14px] font-mono text-[14px] font-medium tracking-[0.5px] text-[#14120f] transition-colors hover:border-brass-400 hover:bg-brass-400 ${FOCUS}`}
            onClick={startTrial}
            disabled={starting}
            title={t('ticker.cta.title', { ticker })}
          >
            {starting ? (
              <span className="spinner-glow" />
            ) : (
              <>
                <GavelIcon size={17} /> {t('ticker.cta.start')}{' '}
                <span className="text-[11px] tracking-[0.3px] text-[rgba(20,18,15,0.6)]">
                  {t('ticker.cta.duration')}
                </span>
              </>
            )}
          </button>
        </div>

        {error !== null && (
          <p className="mt-4 text-[13.5px] text-[#c96a5a]" role="alert">
            {error || t('ticker.error.start')}
          </p>
        )}

        {hasHistory ? (
          <>
            {/* ---------- CHART ---------- */}
            <section className="anim-in mt-[34px] rounded-[14px] border border-[#3a332a] bg-bg-2 px-6 pb-5 pt-6">
              <KickerHead
                kicker={t('ticker.kicker.archive')}
                title={t('ticker.chart.title')}
                note={latest ? t('ticker.chart.note', { n: history!.length }) : undefined}
              />
              {series ? (
                <PriceChart points={series.points} />
              ) : seriesMissing ? (
                <p className="rounded-[14px] border border-dashed border-[#3a332a] px-6 py-8 text-center text-[13px] text-text-2">
                  {t('ticker.chart.missing')}
                </p>
              ) : (
                <p className="rounded-[14px] border border-dashed border-[#3a332a] px-6 py-8 text-center text-[13px] text-text-2">
                  {t('ticker.chart.loading')}
                </p>
              )}
              {series && latest && (
                <p className="mt-[14px] text-[12.5px] leading-[1.6] text-text-3">
                  {renderRich(
                    t('ticker.chart.foot', {
                      min: fmtSeriesMin(series),
                      max: fmtSeriesMax(series),
                    }),
                    { b: (c) => <b className="font-medium text-text-2">{c}</b> },
                  )}
                </p>
              )}
            </section>

            {/* ---------- HISTORY ---------- */}
            <section className="anim-in mt-10">
              <KickerHead kicker={t('ticker.kicker.archive')} title={t('ticker.history.title')} />
              <div className="overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-[14px]">
                    <thead>
                      <tr>
                        <th className={TH_CLS}>{t('ticker.table.date')}</th>
                        <th className={TH_CLS}>{t('ticker.table.verdict')}</th>
                        <th className={TH_CLS}>{t('ticker.table.richness')}</th>
                        <th className={`${TH_CLS} text-right`}>{t('ticker.table.price')}</th>
                        <th className={TH_CLS}>{t('ticker.table.docs')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history!.map((j) => (
                        <tr key={j.memo_id} className="[&:last-child>td]:border-b-0">
                          <td className={`${TD_CLS} font-mono text-[13px] text-text-2`}>{formatDate(j.created_at)}</td>
                          <td className={TD_CLS}>
                            <VerdictBadge category={j.verdict_category} />
                          </td>
                          <td className={TD_CLS}>
                            <InfoBadge title={t('enum.richness.title', { grade: j.info_richness })}>
                              {labels.richness[j.info_richness]}
                            </InfoBadge>
                          </td>
                          <td className={`${TD_CLS} text-right font-mono text-[13px] tabular-nums text-text-0`}>
                            {j.price_at_trial != null ? formatRupiah(j.price_at_trial) : '—'}
                          </td>
                          <td className={TD_CLS}>
                            <span className="flex gap-4 text-[13px]">
                              <Link
                                to={`/memo/${j.trial_id ?? j.memo_id}`}
                                className={`rounded-xs text-brass-500 transition-colors hover:text-brass-300 ${FOCUS}`}
                              >
                                {t('ticker.action.memo')}
                              </Link>
                              <Link
                                to={`/journal/${j.memo_id}/postmortem`}
                                className={`rounded-xs text-brass-500 transition-colors hover:text-brass-300 ${FOCUS}`}
                                title={t('ticker.action.postmortemTitle')}
                              >
                                {t('ticker.action.postmortem')}
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
              {history === null ? t('ticker.empty.loading') : t('ticker.empty.title', { ticker })}
            </h2>
            <p className="mx-auto mb-6 max-w-[46ch] text-[14.5px] text-text-2">
              {t('ticker.empty.body', { ticker })}
            </p>
            <div className="flex justify-center">
              <button
                className={`inline-flex items-center gap-[10px] rounded-[10px] border border-brass-500 bg-brass-500 px-[26px] py-[14px] font-mono text-[14px] font-medium tracking-[0.5px] text-[#14120f] transition-colors hover:border-brass-400 hover:bg-brass-400 ${FOCUS}`}
                onClick={startTrial}
                disabled={starting}
              >
                <GavelIcon size={17} /> {t('ticker.cta.start')}
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
  return closes.length ? formatRupiah(Math.min(...closes)) : '—';
}

function fmtSeriesMax(s: PriceSeriesResponse): string {
  const closes = (s.points ?? []).map((p) => p.close);
  return closes.length ? formatRupiah(Math.max(...closes)) : '—';
}