import { Link } from 'react-router-dom';
import { GavelIcon, ScaleIcon } from '../components/icons';

export default function NotFoundPage() {
  return (
    <div className="container pad-page">
      <section className="memo-404 card card-pad anim-scale" style={{ maxWidth: 560, margin: '40px auto' }}>
        <span className="memo-404-ic"><ScaleIcon size={22} /></span>
        <h2>Ruang sidang ini tidak ditemukan</h2>
        <p className="muted">Halaman yang Anda tuju tidak tersedia — mungkin sidang sudah ditutup atau url salah.</p>
        <Link to="/" className="btn btn-primary"><GavelIcon size={16} /> Ke Beranda</Link>
      </section>
    </div>
  );
}
