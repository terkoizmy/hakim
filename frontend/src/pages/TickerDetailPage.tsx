import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import PriceChart from '../components/PriceChart';
import { VerdictBadge } from './JournalPage';
import { RichBadge } from './CourtroomPage';
import { AlertIcon, BookIcon, GavelIcon } from '../components/icons';
import type { JournalItem, PriceSeriesResponse } from '../types/contract';

/**
 * Halaman detail emiten (/ticker/:ticker) — ala screener:
 * header besar, grafik harga (snapshot sidang terakhir, 0 kredit),
 * tombol buka sidang, dan riwayat persidangan di bawah grafik.
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
    <div className="pad-page detail">
      <div className="container">
        <nav className="detail-crumb">
          <Link to="/" className="detail-crumb-link">
            &larr; Daftar Perkara
          </Link>
        </nav>

        {/* Header emiten — ala screener */}
        <header className="detail-head">
          <div className="detail-head-main">
            <h1 className="detail-ticker mono">{ticker}</h1>
            <div className="detail-namewrap">
              <span className="detail-name">{companyName ?? 'Emiten IDX'}</span>
              {latest && (
                <>
                  <VerdictBadge category={latest.verdict_category} />
                  <RichBadge richness={latest.info_richness} />
                </>
              )}
            </div>
            {latest && (
              <p className="detail-pricenote muted small">
                Harga saat putusan terakhir:{' '}
                <strong className="mono">Rp {latest.price_at_trial?.toLocaleString('id-ID')}</strong>
                {' · '}
                {fmtDateTime(latest.created_at)}
              </p>
            )}
          </div>
          <div className="detail-head-cta">
            <button
              className="btn btn-primary btn-lg"
              onClick={startTrial}
              disabled={starting}
              title={`Mulai sidang untuk ${ticker}`}
            >
              {starting ? (
                <span className="spinner-glow" />
              ) : (
                <>
                  <GavelIcon size={18} /> Buka Sidang
                </>
              )}
            </button>
            <span className="tiny muted">Sidang &plusmn; 3 menit</span>
          </div>
        </header>

        {error && (
          <div className="ticker-error" role="alert">
            <AlertIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Grafik harga — snapshot dari sidang terakhir */}
        <section className="card card-pad detail-chart">
          <div className="detail-chart-head">
            <h2 className="section-title">Perjalanan harga</h2>
            <span className="tiny muted">
              {latest
                ? `snapshot data saat sidang ${fmtDate(latest.created_at)}`
                : 'menunggu sidang pertama'}
            </span>
          </div>
          {series ? (
            <PriceChart points={series.points} />
          ) : seriesMissing ? (
            <p className="detail-chart-empty muted">
              Seri harga belum tersedia untuk sidang ini — buka sidang baru untuk mengambil
              snapshot terkini.
            </p>
          ) : hasHistory ? (
            <p className="detail-chart-empty muted">Memuat seri harga…</p>
          ) : (
            <p className="detail-chart-empty muted">
              Belum ada grafik — {ticker} belum pernah diadili. Klik <strong>Buka Sidang</strong>{' '}
              untuk mengumpulkan bukti pertama.
            </p>
          )}
        </section>

        {/* Riwayat persidangan */}
        <section className="detail-history">
          <div className="docket-toolbar-title">
            <h2 className="section-title">Riwayat Persidangan</h2>
            {hasHistory && (
              <span className="muted small">
                {history!.length} kali {ticker} diadili
              </span>
            )}
          </div>

          {hasHistory ? (
            <div className="screen-table-wrap card">
              <table className="screen-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Putusan</th>
                    <th>Kekayaan Data</th>
                    <th className="num">Harga Saat Sidang</th>
                    <th className="num">Arsip</th>
                  </tr>
                </thead>
                <tbody>
                  {history!.map((j) => (
                    <tr key={j.memo_id}>
                      <td className="mono small">{fmtDateTime(j.created_at)}</td>
                      <td>
                        <VerdictBadge category={j.verdict_category} />
                      </td>
                      <td>
                        <RichBadge richness={j.info_richness} />
                      </td>
                      <td className="num mono">
                        {j.price_at_trial != null
                          ? `Rp ${j.price_at_trial.toLocaleString('id-ID')}`
                          : '—'}
                      </td>
                      <td className="num detail-links">
                        <Link to={`/memo/${j.memo_id}`} className="detail-link">
                          Memo
                        </Link>
                        <Link
                          to={`/journal/${j.memo_id}/postmortem`}
                          className="detail-link"
                          title="Post-mortem: harga sejak putusan"
                        >
                          Post-mortem
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="detail-empty card card-pad">
              <BookIcon size={20} />
              <p>
                {history === null
                  ? 'Memuat riwayat…'
                  : `${ticker} belum pernah diadili. Sidang pertama akan mengumpulkan bukti dari lima analis, lalu hakim menulis memorandum riset.`}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}