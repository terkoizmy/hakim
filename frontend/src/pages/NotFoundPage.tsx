import { Link } from 'react-router-dom';
import { GavelIcon, ScaleIcon } from '../components/icons';

export default function NotFoundPage() {
  return (
    <div className="container py-8 pb-14">
      <section className="card anim-scale mx-auto my-10 max-w-[560px] p-8 text-center">
        <span className="mx-auto mb-4 grid h-[50px] w-[50px] place-items-center rounded-pill border border-[rgba(217,180,109,0.34)] bg-[rgba(217,180,109,0.12)] text-brass-300">
          <ScaleIcon size={22} />
        </span>
        <h2 className="mb-2 text-[22px]">Ruang sidang ini tidak ditemukan</h2>
        <p className="muted">Halaman yang Anda tuju tidak tersedia — mungkin sidang sudah ditutup atau url salah.</p>
        <Link to="/" className="btn btn-primary"><GavelIcon size={16} /> Ke Beranda</Link>
      </section>
    </div>
  );
}