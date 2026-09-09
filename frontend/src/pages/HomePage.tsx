import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import {
  AlertIcon,
  ArrowRightIcon,
  BookIcon,
  BuildingIcon,
  GavelIcon,
  ScaleIcon,
  SparkIcon,
} from '../components/icons';

const TICKER_RE = /^[A-Za-z]{4}$/;

/** Landing page (/) — pitch, alur sidang, dan pintu masuk ke dashboard. */
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
              Lima analis menggali bukti dari data Sectors, jaksa <em>bear</em> berhadapan dengan
              pembela <em>bull</em> selama dua ronde, lalu hakim mengetuk putusan.{' '}
              <strong>Hasilnya: memorandum riset yang jujur, bersitasi, dan sepenuhnya milik Anda.</strong>
            </p>

            <ul className="hero-points anim-in-slow" style={{ animationDelay: '90ms' }}>
              <li>Debat adversarial ditayangkan langsung — bukan kotak hitam.</li>
              <li>Tiap angka bersitasi ke endpoint data, lengkap dengan peringkat kekayaan informasi A/B/C.</li>
              <li>Semua putusan terarsip di jurnal, bisa di-post-mortem kapan pun.</li>
            </ul>

            <div className="hero-cta-row anim-in-slow" style={{ animationDelay: '140ms' }}>
              <Link to="/dashboard" className="btn btn-ghost">
                Lihat Daftar Perkara <ArrowRightIcon size={15} />
              </Link>
              <Link to="/journal" className="btn btn-ghost">
                Jurnal Sidang
              </Link>
            </div>
          </div>

          <div className="ticker-panel anim-scale" style={{ animationDelay: '120ms' }}>
            <div className="docket-head">
              <span className="docket-stamp mono">SIDANG KILAT</span>
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
            <p className="tiny muted ticker-panel-foot">
              Ingin memilih dari daftar? <Link to="/dashboard">Buka berkas perkara</Link>.
            </p>
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