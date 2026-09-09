import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { AlertIcon, BookIcon, BuildingIcon, ScaleIcon, SparkIcon } from '../components/icons';

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
            <h1 className="hero-title">Sebelum beli, aduli dulu.</h1>
            <p className="hero-sub">
              Lima analis menggali bukti dari data Sectors. Jaksa dan pembela berdebat dua ronde,
              lalu hakim menuliskan putusannya &mdash; terbuka dari awal sampai akhir.
            </p>

            <div className="hero-cta-row">
              <Link to="/dashboard" className="btn btn-ghost">Lihat daftar perkara</Link>
              <Link to="/journal" className="btn btn-ghost">Jurnal sidang</Link>
            </div>
            <p className="tiny muted hero-note">
              Tiap angka bersitasi ke sumber datanya. Bukan rekomendasi investasi.
            </p>
          </div>

          <div className="ticker-panel">
            <div className="docket-head">
              <span className="docket-stamp mono">SIDANG KILAT</span>
              <span className="tiny muted">&plusmn; 3 menit</span>
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
                {submitting ? <span className="spinner-glow" /> : 'Mulai sidang'}
              </button>
            </div>

            {error && (
              <div className="ticker-error" role="alert">
                <AlertIcon size={16} />
                <span>{error} &mdash; pastikan 4 huruf kode emiten IDX.</span>
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
            <h2 className="section-title">Alur sidang</h2>
          </div>
          <div className="howto-grid">
            <div className="howto-card card card-pad">
              <span className="howto-icon"><BuildingIcon size={20} /></span>
              <h3>Bukti dikumpulkan</h3>
              <p>
                Lima analis meneliti fundamental, harga, arus dana, insider, dan cek gorengan
                &mdash; semuanya dari data Sectors.
              </p>
            </div>
            <div className="howto-card card card-pad">
              <span className="howto-icon"><ScaleIcon size={20} /></span>
              <h3>Dua pihak berdebat</h3>
              <p>Jaksa mencari jalur kegagalan, pembela menahannya. Dua ronde, tayang langsung.</p>
            </div>
            <div className="howto-card card card-pad">
              <span className="howto-icon"><SparkIcon size={20} /></span>
              <h3>Hakim memutus</h3>
              <p>Kategori riset, alasannya, dan pertanyaan verifikasi yang Anda jawab sendiri.</p>
            </div>
          </div>

          <div className="journal-cta card card-pad">
            <span className="howto-icon"><BookIcon size={20} /></span>
            <div className="journal-cta-text">
              <h3>Semua putusan terarsip</h3>
              <p className="muted">Bandingkan memorandum lama dengan harga hari ini.</p>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate('/journal')}>
              Buka jurnal
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}