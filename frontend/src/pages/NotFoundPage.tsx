import { Link } from 'react-router-dom';
import { GavelIcon, ScaleIcon } from '../components/icons';
import { useLang } from '../i18n';

export default function NotFoundPage() {
  const { t } = useLang();
  return (
    <div className="container py-8 pb-14">
      {/* Blok 404: tengah, berkartu, berbingkai, padding lega — bentuk yang
          sama dengan blok galat/kosong di halaman lain. */}
      <section className="card anim-scale mx-auto my-10 max-w-[560px] p-8 text-center">
        <span className="mx-auto mb-4 grid h-[50px] w-[50px] place-items-center rounded-pill border border-[rgba(217,180,109,0.34)] bg-[rgba(217,180,109,0.12)] text-brass-300">
          <ScaleIcon size={22} />
        </span>
        <h2 className="mb-2 text-[22px]">{t('notFound.title')}</h2>
        <p className="muted">{t('notFound.body')}</p>
        <Link to="/" className="btn btn-primary"><GavelIcon size={16} /> {t('notFound.cta')}</Link>
      </section>
    </div>
  );
}