import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { VerdictBadge } from './JournalPage';
import {
  AlertIcon,
  ArrowRightIcon,
  BookIcon,
  BuildingIcon,
  GavelIcon,
  ScaleIcon,
  SearchIcon,
  SparkIcon,
} from '../components/icons';
import type { JournalItem, TickerListItem } from '../types/contract';

const EXAMPLES = ['BBCA', 'CUAN', 'GOTO', 'BRMS', 'BBRI'];
const TICKER_RE = /^[A-Za-z]{4}$/;

const SEARCH_DEBOUNCE_MS = 250;

export default function HomePage() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Berkas perkara — daftar emiten dari backend (kontrak 1.2.0).
  const [docket, setDocket] = useState<TickerListItem[]>(
    EXAMPLES.map((t) => ({ ticker: t, company_name: '' })),
  );
  const [docketFallback, setDocketFallback] = useState(true); // fallback daftar contoh
  const [query, setQuery] = useState('');
  const [docketLoading, setDocketLoading] = useState(false);
  const [recent, setRecent] = useState<JournalItem[]>([]);

  // Sidang terakhir untuk kolom samping.
  useEffect(() => {
    let alive = true;
    api
      .fetchJournal(4, 0)
      .then((res) => {
        if (alive) setRecent(res.items.slice(0, 4));
      })
      .catch(() => undefined); // jurnal kosong / backend belum jalan — biarkan kolom tersembunyi
    return () => {
      alive = false;
    };
  }, []);

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

  const ticker = value.trim().toUpperCase();
  const validTicker = TICKER_RE.test(ticker);

  function onTickerChange(raw: string) {
    const cleaned = raw.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4);
    setValue(cleaned);
    if (error) setError(null);
  }

  async function startTrial(t: string) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const trial = await api.createTrial(t, 'auto');
      navigate(`/trial/${trial.trial_id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Gagal memulai sidang. Coba lagi.';
      setError(msg);
      setSubmitting(false);
    }
  }

  const showRecent = recent.length > 0;
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <div className="home">
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <div className="hero-badge anim-in">
              <GavelIcon size={14} />
              Multi-Agent · Data Sectors · Bahasa Indonesia
            </div>

            <h1 className="hero-title anim-in">
              Sebelum beli,
              <br />
              <span className="hero-title-accent">aduli dulu.</span>
            </h1>
            <p className="hero-sub anim-in-slow">
              Pilih saham dari berkas perkara, lima analis menggali bukti dari data Sectors, jaksa{' '}
              <em>bear</em> berhadapan dengan pembela <em>bull</em> selama dua ronde, lalu hakim
              mengetuk putusan.{' '}
              <strong>Hasilnya: memorandum riset yang jujur, bersitasi, dan sepenuhnya milik Anda.</strong>
            </p>

            <ul className="hero-points anim-in-slow" style={{ animationDelay: '90ms' }}>
              <li>Debat adversarial ditayangkan langsung — bukan kotak hitam.</li>
              <li>Tiap angka bersitasi ke endpoint data, lengkap dengan peringkat kekayaan informasi A/B/C.</li>
              <li>Semua putusan terarsip di jurnal, bisa di-post-mortem kapan pun.</li>
            </ul>
          </div>

          <div className="ticker-panel anim-scale" style={{ animationDelay: '120ms' }}>
            <div className="docket-head">
              <span className="docket-stamp mono">BERKAS PERKARA</span>
              <span className="tiny muted">Sidang &plusmn; 3 menit</span>
            </div>
            <div className="ticker-input-row">
              <div className="ticker-field">
                <span className="ticker-field-label">Kode saham IDX</span>
                <input
                  className={`input ticker-input ${error ? 'error' : ''}`}
                  value={value}
                  onChange={(e) => onTickerChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') startTrial(ticker);
                  }}
                  placeholder="BBCA"
                  inputMode="text"
                  aria-label="Kode saham IDX (4 huruf)"
                  autoFocus
                />
                <span className="ticker-hint mono">{value.length}/4 &middot; huruf besar otomatis</span>
              </div>
              <button
                className="btn btn-primary btn-lg start-btn"
                onClick={() => startTrial(ticker)}
                disabled={!validTicker || submitting}
              >
                {submitting ? (
                  <span className="spinner-glow" />
                ) : (
                  <>
                    Mulai Sidang <ArrowRightIcon size={18} />
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="ticker-error" role="alert">
                <AlertIcon size={16} />
                <span>{error} — pastikan 4 huruf kode emiten IDX.</span>
              </div>
            )}
            {!validTicker && value.length === 4 && (
              <div className="ticker-error" role="alert">
                <AlertIcon size={16} />
                <span>Kode harus 4 huruf (contoh: BBCA, CUAN).</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="docket">
        <div className="container">
          <div className="docket-toolbar">
            <div className="docket-toolbar-title">
              <h2 className="section-title">Daftar Perkara</h2>
              <span className="muted small">
                {docketFallback ? 'contoh ticker — backend daftar emiten belum tersedia' : `${docket.length} emiten terdaftar`}
              </span>
            </div>
            <label className="docket-search">
              <SearchIcon size={15} />
              <input
                ref={searchRef}
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kode atau nama emiten…"
                aria-label="Cari emiten"
              />
            </label>
          </div>

          <div className={`docket-grid ${showRecent ? 'has-recent' : ''}`}>
            <div className={`docket-list ${docketLoading ? 'is-loading' : ''}`}>
              {docket.map((t) => (
                <button
                  key={t.ticker}
                  type="button"
                  className="docket-card card"
                  onClick={() => startTrial(t.ticker)}
                  disabled={submitting}
                  title={`Mulai sidang untuk ${t.ticker}`}
                >
                  <span className="docket-ticker mono">{t.ticker}</span>
                  <span className="docket-name">{t.company_name || 'Emiten IDX'}</span>
                  <span className="docket-go" aria-hidden="true">
                    <ArrowRightIcon size={14} />
                  </span>
                </button>
              ))}
              {docket.length === 0 && !docketLoading && (
                <p className="muted small">Tidak ada emiten yang cocok dengan “{query}”.</p>
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
                <button type="button" className="btn btn-ghost recent-all" onClick={() => navigate('/journal')}>
                  Jurnal Sidang <ArrowRightIcon size={14} />
                </button>
              </aside>
            )}
          </div>
        </div>
      </section>

      <section className="howto">
        <div className="container">
          <div className="howto-head">
            <h2 className="section-title">Bagaimana sidang berjalan</h2>
          </div>
          <div className="howto-grid">
            <div className="howto-card card card-pad anim-in">
              <span className="howto-icon"><BuildingIcon size={20} /></span>
              <h3>1 · Pengumpulan bukti</h3>
              <p>
                Lima analis — fundamental, harga, smart money, insider, anti-gorengan —{' '}<strong>memakai alat
                (tools) ke data Sectors</strong>{' '}dan merangkum bukti, setiap angka bersitasi.
              </p>
            </div>
            <div className="howto-card card card-pad anim-in" style={{ animationDelay: '70ms' }}>
              <span className="howto-icon"><ScaleIcon size={20} /></span>
              <h3>2 · Jaksa vs pembela</h3>
              <p>
                Dua ronde perdebatan adversarial: jalur kegagalan Munger dihadapi tesis parit Buffett.{' '}
                <strong>Debat terlihat langsung, bukan kotak hitam.</strong>
              </p>
            </div>
            <div className="howto-card card card-pad anim-in" style={{ animationDelay: '140ms' }}>
              <span className="howto-icon"><SparkIcon size={20} /></span>
              <h3>3 · Putusan komite</h3>
              <p>
                Hakim ketua merumuskan <strong>memorandum riset</strong>: kategori layak diteliti / perlu
                kehati-hatian / red flag, plus daftar pertanyaan yang harus Anda jawab sendiri.
              </p>
            </div>
          </div>

          <div className="journal-cta card card-pad anim-in" style={{ animationDelay: '180ms' }}>
            <span className="howto-icon"><BookIcon size={20} /></span>
            <div className="journal-cta-text">
              <h3>Semua sidang tersimpan di Jurnal</h3>
              <p className="muted">
                Bandingkan memorandum lama dengan pergerakan harga hari ini — komite yang bisa
                dipertanggungjawabkan.
              </p>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate('/journal')}>
              Buka Jurnal Sidang <ArrowRightIcon size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}