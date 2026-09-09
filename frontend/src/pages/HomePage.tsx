import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { AlertIcon, ArrowRightIcon, BookIcon, GavelIcon, ScaleIcon, SparkIcon } from '../components/icons';

const EXAMPLES = ['BBCA', 'CUAN', 'GOTO', 'BRMS', 'BBRI'];
const TICKER_RE = /^[A-Za-z]{4}$/;

export default function HomePage() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ticker = value.trim().toUpperCase();
  const validTicker = TICKER_RE.test(ticker);

  function onTickerChange(raw: string) {
    const cleaned = raw.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4);
    setValue(cleaned);
    if (error) setError(null);
  }

  async function startTrial() {
    if (!validTicker || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const trial = await api.createTrial(ticker, 'auto');
      navigate(`/trial/${trial.trial_id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Gagal memulai sidang. Coba lagi.';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="container hero-inner">
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
            Tiga &plusmn; menit: lima analis memeriksa bukti dari data Sectors, jaksa (bear) berhadapan dengan
            pembela (bull), dan hakim ketua mengetuk putusan —{' '}
            <strong>memorandum riset yang jujur, bersitasi, sepenuhnya milik Anda.</strong>
          </p>

          <div className="ticker-panel anim-scale" style={{ animationDelay: '120ms' }}>
            <div className="ticker-input-row">
              <div className="ticker-field">
                <span className="ticker-field-label">Kode saham IDX</span>
                <input
                  className={`input ticker-input ${error ? 'error' : ''}`}
                  value={value}
                  onChange={(e) => onTickerChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') startTrial();
                  }}
                  placeholder="Contoh: BBCA"
                  inputMode="text"
                  aria-label="Kode saham IDX (4 huruf)"
                  autoFocus
                />
                <span className="ticker-hint mono">{value.length}/4 &middot; huruf besar otomatis</span>
              </div>
              <button
                className="btn btn-primary btn-lg start-btn"
                onClick={startTrial}
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

            <div className="ticker-examples">
              <span className="muted small">Coba ticker:</span>
              {EXAMPLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="ticker-pill mono"
                  onClick={() => {
                    setValue(t);
                    setError(null);
                  }}
                >
                  {t}
                </button>
              ))}
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

      <section className="howto">
        <div className="container">
          <div className="howto-head">
            <h2 className="section-title">Bagaimana sidang berjalan</h2>
          </div>
          <div className="howto-grid">
            <div className="howto-card card card-pad anim-in">
              <span className="howto-icon"><SearchIconSm /></span>
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

function SearchIconSm() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20.5 20.5L16 16" />
    </svg>
  );
}
