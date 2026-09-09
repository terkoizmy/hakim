import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { type PostmortemResponse, type PricePoint } from '../types/contract';
import { formatPct, formatRupiah } from '../utils/format';
import { MemoView } from './MemoPage';
import { VerdictBadge } from './JournalPage';
import { RichBadge } from './CourtroomPage';
import { AlertIcon, ArrowDownIcon, ArrowUpIcon, BookIcon, ScaleIcon } from '../components/icons';

const PCT_CLS = 'text-[clamp(30px,4.6vw,48px)] font-bold tracking-[-0.01em] leading-[1.1]';

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
      <div className="container pt-8 pb-14">
        <div className="flex flex-col gap-4">
          <span className="skeleton w-[320px] h-[22px]" />
          <div className="card card-pad skeleton h-[160px]" />
          <div className="card card-pad skeleton h-[200px]" />
        </div>
      </div>
    );
  }

  if (state === 'error' || !data) {
    return (
      <div className="container pt-8 pb-14">
        <section className="card p-8 text-center max-w-[560px] mx-auto my-10 anim-scale">
          <span className="w-[50px] h-[50px] mx-auto mb-4 grid place-items-center rounded-pill text-brass-300 bg-[rgba(217,180,109,0.12)] border border-[color:rgba(217,180,109,0.34)]">
            <AlertIcon size={22} />
          </span>
          <h2 className="text-[22px] mb-2">Rekap sidang tidak ditemukan</h2>
          <p className="muted">{error}</p>
          <div className="flex justify-center mt-4">
            <Link to="/journal" className="btn btn-primary"><BookIcon size={16} /> Kembali ke Jurnal</Link>
          </div>
        </section>
      </div>
    );
  }

  const { memo, price_at_trial, price_now, change_pct, days_elapsed, price_series } = data;
  const up = (change_pct ?? 0) >= 0;
  const hasPrice = change_pct != null && price_now != null;
  const hasSeries = price_series != null && price_series.length >= 2;

  return (
    <div>
      <div className="container pt-8 pb-14">
        <header className="flex justify-between items-start gap-5 mb-6 flex-wrap anim-in">
          <div>
            <div className="flex items-center gap-2 mb-2 small muted">
              <Link to="/journal" className="text-text-2 hover:text-brass-300">← Jurnal Sidang</Link>
              <span className="text-text-3">·</span>
              <span className="font-mono">{memo.memo_id}</span>
            </div>
            <h1 className="text-[clamp(26px,4vw,40px)]">
              Rekap Sidang <span className="text-brass-300 font-mono">{memo.ticker}</span>
            </h1>
            <p className="muted">{memo.company_name}</p>
          </div>
          <div className="flex gap-3 pt-2 flex-wrap">
            <VerdictBadge category={memo.verdict.category} />
            <RichBadge richness={memo.info_richness} />
          </div>
        </header>

        {/* Grafik harga — garis sejak memo, penanda vertikal di tanggal putusan */}
        <section className="card card-pad anim-in-slow mb-6">
          <div className="flex justify-between items-baseline gap-4 flex-wrap mb-4">
            <h2 className="section-title">Perjalanan <em className="italic text-brass-300">harga</em></h2>
            <span className="tiny muted font-mono">ARSIP · BUKAN REAL-TIME</span>
          </div>
          {hasSeries ? (
            <PostmortemChart points={price_series!} verdictDate={memo.created_at} />
          ) : (
            <p className="py-6 text-center muted">
              Seri harga belum tersedia — butuh setidaknya dua titik sejak memorandum untuk ticker ini.
            </p>
          )}
        </section>

        {/* Kartu perubahan harga */}
        <section className="card card-pad anim-in-slow grid grid-cols-[1.2fr_1fr] gap-6 items-center mb-6 bg-[linear-gradient(150deg,rgba(217,180,109,0.08),var(--bg-2)_60%)] max-[980px]:grid-cols-1">
          {hasPrice ? (
            <>
              <div className="flex items-center gap-5">
                <div className="w-[58px] h-[58px] flex-none grid place-items-center rounded-lg">
                  {up ? <ArrowUpIcon size={26} /> : <ArrowDownIcon size={26} />}
                </div>
                <div>
                  <div className="tiny muted uppercase tracking-[0.06em]">Pergerakan sejak memorandum</div>
                  <div className={`font-mono ${PCT_CLS} ${up ? 'up' : 'down'}`}>{formatPct(change_pct!)}</div>
                  <div className="muted small">
                    Sisi pembeli vs pembeli — perkiraan, bukan nasihat.
                  </div>
                </div>
              </div>
              <div className="flex gap-4 justify-end max-[980px]:justify-start">
                <PriceCol label="Harga saat sidang" value={price_at_trial != null ? formatRupiah(price_at_trial) : '—'} />
                <PriceCol label="Harga hari ini" value={formatRupiah(price_now!)} tone={up ? 'up' : 'down'} />
                <PriceCol label="Hari berlalu" value={`${days_elapsed} hari`} />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-5">
                <div className="w-[58px] h-[58px] flex-none grid place-items-center rounded-lg text-text-2 bg-bg-3 border border-line-1"><ScaleIcon size={22} /></div>
                <div>
                  <div className="tiny muted uppercase tracking-[0.06em]">Pergerakan sejak memorandum</div>
                  <div className={`font-mono ${PCT_CLS}`}>Belum tersedia</div>
                  <div className="muted small">
                    Data harga saat ini belum dapat diambil — bukan kesalahan memo.
                  </div>
                </div>
              </div>
              <div className="flex gap-4 justify-end max-[980px]:justify-start">
                <PriceCol label="Harga saat sidang" value={price_at_trial != null ? formatRupiah(price_at_trial) : '—'} />
                <PriceCol label="Harga hari ini" value="—" />
                <PriceCol label="Hari berlalu" value={`${days_elapsed} hari`} />
              </div>
            </>
          )}
        </section>

        {/* Ringkasan keputusan */}
        <section className="card card-pad anim-in flex justify-between items-center gap-4 mb-8 flex-wrap">
          <div>
            <span className="tiny muted font-mono">PUTUSAN SAAT ITU</span>
            <h2 className="text-[19px]">{memo.verdict.category === 'layak_diteliti_lanjut' ? 'Layak diteliti lanjut' : memo.verdict.category === 'perlu_kehati_hatian' ? 'Perlu kehati-hatian' : 'Red flag berat'}</h2>
          </div>
          <div className="muted small">
            Post-mortem membandingkan arah yang benar dari komite, bukan presisi angka.
          </div>
        </section>

        <MemoView memo={memo} />

        <div className="flex items-center justify-center my-6">
          <Link to="/journal" className="btn btn-ghost"><BookIcon size={16} /> Ke Jurnal Semua Sidang</Link>
        </div>
      </div>
    </div>
  );
}

function PriceCol({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="flex flex-col gap-[2px] pl-5 border-l border-line-1">
      <span className="tiny muted uppercase tracking-[0.06em]">{label}</span>
      <span className={`font-mono text-[18px] font-semibold text-text-0 ${tone ?? ''}`}>{value}</span>
    </div>
  );
}

const PM_W = 900;
const PM_H = 260;
const PM_PAD_X = 10;
const PM_PAD_TOP = 30;
const PM_PAD_BOTTOM = 30;

/** Grafik harga post-mortem: garis brass + area, penanda vertikal di tanggal putusan. */
function PostmortemChart({ points, verdictDate }: { points: PricePoint[]; verdictDate: string }) {
  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || Math.max(1, max * 0.01);
  const innerW = PM_W - PM_PAD_X * 2;
  const innerH = PM_H - PM_PAD_TOP - PM_PAD_BOTTOM;

  const x = (i: number) => PM_PAD_X + (innerW * i) / (points.length - 1);
  const y = (v: number) => PM_PAD_TOP + innerH * (1 - (v - min) / span);

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.close).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${PM_PAD_TOP + innerH} L${PM_PAD_X},${PM_PAD_TOP + innerH} Z`;

  // Penanda putusan: titik terdekat dengan tanggal memo.
  const vIdx = nearestIndex(points, verdictDate);
  const vX = x(vIdx);
  const vY = y(points[vIdx].close);

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <svg
      className="w-full h-[260px] block overflow-visible max-[640px]:h-[220px]"
      viewBox={`0 0 ${PM_W} ${PM_H}`}
      role="img"
      aria-label={`Grafik harga ${first.date} sampai ${last.date} dengan penanda tanggal putusan`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="pm-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(217,180,109,0.18)" />
          <stop offset="100%" stopColor="rgba(217,180,109,0.02)" />
        </linearGradient>
      </defs>

      <line className="stroke-line-1 [stroke-width:1]" x1={PM_PAD_X} y1={y(max)} x2={PM_W - PM_PAD_X} y2={y(max)} />
      <line className="stroke-line-1 [stroke-width:1]" x1={PM_PAD_X} y1={y(min)} x2={PM_W - PM_PAD_X} y2={y(min)} />
      <text className="font-mono text-[10.5px] fill-text-3" x={PM_PAD_X + 2} y={y(max) - 6}>
        {fmt(max)}
      </text>
      <text className="font-mono text-[10.5px] fill-text-3" x={PM_PAD_X + 2} y={y(min) - 6}>
        {fmt(min)}
      </text>

      <path d={area} fill="url(#pm-fill)" />
      <path d={line} className="fill-none stroke-brass-400 [stroke-width:2] [stroke-linecap:round] [stroke-linejoin:round]" />

      <line className="stroke-brass-300 [stroke-width:1.5] [stroke-dasharray:4_4]" x1={vX} y1={PM_PAD_TOP - 8} x2={vX} y2={PM_H - PM_PAD_BOTTOM + 8} />
      <circle className="fill-brass-300" cx={vX} cy={vY} r="4" />
      <text className="font-mono text-[10px] fill-brass-300 tracking-[0.5px]" x={vX + 8} y={vY - 8}>
        PUTUSAN
      </text>
      <text className="font-mono text-[10.5px] fill-brass-300" x={vX + 8} y={vY + 12}>
        {fmt(points[vIdx].close)}
      </text>

      <text className="font-mono text-[10.5px] fill-text-3" x={PM_PAD_X} y={PM_H - 8}>
        {fmtDate(first.date)}
      </text>
      <text className="font-mono text-[10.5px] fill-text-3 [text-anchor:end]" x={PM_W - PM_PAD_X} y={PM_H - 8} textAnchor="end">
        kini
      </text>
    </svg>
  );
}

function nearestIndex(points: PricePoint[], target: string): number {
  const t = new Date(target).getTime();
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = Math.abs(new Date(points[i].date).getTime() - t);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  return best;
}

function fmt(v: number): string {
  return v.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}