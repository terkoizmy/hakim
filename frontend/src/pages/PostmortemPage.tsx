import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { type PostmortemResponse } from '../types/contract';
import { formatPct, formatRupiah } from '../utils/format';
import { MemoView } from './MemoPage';
import { VerdictBadge } from './JournalPage';
import { RichBadge } from './CourtroomPage';
import { AlertIcon, ArrowDownIcon, ArrowUpIcon, BookIcon, ScaleIcon } from '../components/icons';

export default function PostmortemPage() {
  const { memoId } = useParams<{ memoId: string }>();
  const [data, setData] = useState<PostmortemResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setState('loading');
    api
      .fetchPostmortem(memoId ?? '')
      .then((d) => {
        if (!alive) return;
        setData(d);
        setState('ready');
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : 'Rekap tidak ditemukan.');
        setState('error');
      });
    return () => {
      alive = false;
    };
  }, [memoId]);

  if (state === 'loading') {
    return (
      <div className="container pad-page">
        <div className="stack-md">
          <span className="skeleton" style={{ width: 320, height: 22 }} />
          <div className="card card-pad skeleton" style={{ height: 160 }} />
          <div className="card card-pad skeleton" style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  if (state === 'error' || !data) {
    return (
      <div className="container pad-page">
        <section className="memo-404 card card-pad anim-scale">
          <span className="memo-404-ic"><AlertIcon size={22} /></span>
          <h2>Rekap sidang tidak ditemukan</h2>
          <p className="muted">{error}</p>
          <Link to="/journal" className="btn btn-primary"><BookIcon size={16} /> Kembali ke Jurnal</Link>
        </section>
      </div>
    );
  }

  const { memo, price_at_trial, price_now, change_pct, days_elapsed } = data;
  const up = (change_pct ?? 0) >= 0;
  const hasPrice = change_pct != null && price_now != null;

  return (
    <div className="postmortem">
      <div className="container pad-page">
        <header className="pm-head anim-in">
          <div>
            <div className="pm-kicker small muted">
              <Link to="/journal" className="back-link">← Jurnal Sidang</Link>
              <span className="dot-sep">·</span>
              <span className="mono">{memo.memo_id}</span>
            </div>
            <h1 className="pm-title">
              Rekap Sidang <span className="pm-ticker mono">{memo.ticker}</span>
            </h1>
            <p className="muted">{memo.company_name}</p>
          </div>
          <div className="pm-badges">
            <VerdictBadge category={memo.verdict.category} />
            <RichBadge richness={memo.info_richness} />
          </div>
        </header>

        {/* Kartu perubahan harga */}
        <section className="pm-price card card-pad anim-in-slow">
          {hasPrice ? (
            <>
              <div className="pm-price-main">
                <div className="pm-change-ic">
                  {up ? <ArrowUpIcon size={26} /> : <ArrowDownIcon size={26} />}
                </div>
                <div>
                  <div className="tiny muted">Pergerakan sejak memorandum</div>
                  <div className={`pm-change-pct mono ${up ? 'up' : 'down'}`}>{formatPct(change_pct!)}</div>
                  <div className="muted small">
                    Sisi pembeli vs pembeli — perkiraan, bukan nasihat.
                  </div>
                </div>
              </div>
              <div className="pm-price-cols">
                <PriceCol label="Harga saat sidang" value={price_at_trial != null ? formatRupiah(price_at_trial) : '—'} />
                <PriceCol label="Harga hari ini" value={formatRupiah(price_now!)} tone={up ? 'up' : 'down'} />
                <PriceCol label="Hari berlalu" value={`${days_elapsed} hari`} />
              </div>
            </>
          ) : (
            <>
              <div className="pm-price-main">
                <div className="pm-change-ic pm-change-ic--muted"><ScaleIcon size={22} /></div>
                <div>
                  <div className="tiny muted">Pergerakan sejak memorandum</div>
                  <div className="pm-change-pct mono">Belum tersedia</div>
                  <div className="muted small">
                    Data harga saat ini belum dapat diambil — bukan kesalahan memo.
                  </div>
                </div>
              </div>
              <div className="pm-price-cols">
                <PriceCol label="Harga saat sidang" value={price_at_trial != null ? formatRupiah(price_at_trial) : '—'} />
                <PriceCol label="Harga hari ini" value="—" />
                <PriceCol label="Hari berlalu" value={`${days_elapsed} hari`} />
              </div>
            </>
          )}
        </section>

        {/* Ringkasan keputusan */}
        <section className="pm-callout card card-pad anim-in">
          <div className="pm-callout-txt">
            <span className="tiny muted mono">PUTUSAN SAAT ITU</span>
            <h2>{memo.verdict.category === 'layak_diteliti_lanjut' ? 'Layak diteliti lanjut' : memo.verdict.category === 'perlu_kehati_hatian' ? 'Perlu kehati-hatian' : 'Red flag berat'}</h2>
          </div>
          <div className="pm-callout-note muted small">
            Post-mortem membandingkan arah yang benar dari komite, bukan presisi angka.
          </div>
        </section>

        <MemoView memo={memo} />

        <div className="pm-cta row" style={{ justifyContent: 'center', margin: 'var(--sp-6) 0' }}>
          <Link to="/journal" className="btn btn-ghost"><BookIcon size={16} /> Ke Jurnal Semua Sidang</Link>
        </div>
      </div>
    </div>
  );
}

function PriceCol({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="pm-price-col">
      <span className="tiny muted">{label}</span>
      <span className={`pm-price-col-val mono ${tone ?? ''}`}>{value}</span>
    </div>
  );
}
