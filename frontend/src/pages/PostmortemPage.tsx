import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { type PostmortemResponse, type PricePoint, type VerdictCategory } from '../types/contract';
import { formatPct, formatRupiah, formatDate } from '../utils/format';
import { renderRich, useLabels, useLang } from '../i18n';
import type { DictKey } from '../i18n/dict';
import VerdictBadge from '../components/VerdictBadge';
import { Markdown } from '../utils/md';
import { AlertIcon, SparkIcon, ArrowRightIcon } from '../components/icons';

/** Cincin fokus bersama — kelas yang sama persis dengan AppShell. */
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0';

/** Hasil evaluasi akurasi. Teksnya bukan di sini melainkan di kamus
 * (`postmortem.outcome.<kode>.{title,badge,desc}`) supaya ikut bahasa UI;
 * berkas ini hanya menyimpan logika kecocokan dan warnanya. */
type OutcomeCode =
  | 'noData'
  | 'hitUp'
  | 'hitDown'
  | 'hitFlat'
  | 'flagDown'
  | 'flagUp'
  | 'flagFlat'
  | 'cautionDown'
  | 'cautionUp';

const OUTCOME_TEXT: Record<OutcomeCode, { title: DictKey; badge: DictKey; desc: DictKey }> = {
  noData: {
    title: 'postmortem.outcome.noData.title',
    badge: 'postmortem.outcome.noData.badge',
    desc: 'postmortem.outcome.noData.desc',
  },
  hitUp: {
    title: 'postmortem.outcome.hitUp.title',
    badge: 'postmortem.outcome.hitUp.badge',
    desc: 'postmortem.outcome.hitUp.desc',
  },
  hitDown: {
    title: 'postmortem.outcome.hitDown.title',
    badge: 'postmortem.outcome.hitDown.badge',
    desc: 'postmortem.outcome.hitDown.desc',
  },
  hitFlat: {
    title: 'postmortem.outcome.hitFlat.title',
    badge: 'postmortem.outcome.hitFlat.badge',
    desc: 'postmortem.outcome.hitFlat.desc',
  },
  flagDown: {
    title: 'postmortem.outcome.flagDown.title',
    badge: 'postmortem.outcome.flagDown.badge',
    desc: 'postmortem.outcome.flagDown.desc',
  },
  flagUp: {
    title: 'postmortem.outcome.flagUp.title',
    badge: 'postmortem.outcome.flagUp.badge',
    desc: 'postmortem.outcome.flagUp.desc',
  },
  flagFlat: {
    title: 'postmortem.outcome.flagFlat.title',
    badge: 'postmortem.outcome.flagFlat.badge',
    desc: 'postmortem.outcome.flagFlat.desc',
  },
  cautionDown: {
    title: 'postmortem.outcome.cautionDown.title',
    badge: 'postmortem.outcome.cautionDown.badge',
    desc: 'postmortem.outcome.cautionDown.desc',
  },
  cautionUp: {
    title: 'postmortem.outcome.cautionUp.title',
    badge: 'postmortem.outcome.cautionUp.badge',
    desc: 'postmortem.outcome.cautionUp.desc',
  },
};

const OUTCOME_TONE: Record<OutcomeCode, string> = {
  noData: 'border-[#6f675a]/40 text-text-3 bg-bg-3',
  hitUp: 'border-[#7fb069]/40 text-[#7fb069] bg-[#7fb069]/10',
  hitDown: 'border-[#c96a5a]/40 text-[#c96a5a] bg-[#c96a5a]/10',
  hitFlat: 'border-brass-600/40 text-brass-300 bg-brass-500/10',
  flagDown: 'border-[#7fb069]/40 text-[#7fb069] bg-[#7fb069]/10',
  flagUp: 'border-[#d9a441]/40 text-[#d9a441] bg-[#d9a441]/10',
  flagFlat: 'border-brass-600/40 text-brass-300 bg-brass-500/10',
  cautionDown: 'border-[#d9a441]/40 text-[#d9a441] bg-[#d9a441]/10',
  cautionUp: 'border-brass-600/40 text-brass-300 bg-brass-500/10',
};

/** Evaluasi kecocokan akurasi putusan masa lalu vs realisasi pergerakan harga */
function outcomeCode(category: VerdictCategory, changePct: number | null): OutcomeCode {
  if (changePct == null) return 'noData';

  if (category === 'layak_diteliti_lanjut') {
    if (changePct >= 5) return 'hitUp';
    if (changePct <= -5) return 'hitDown';
    return 'hitFlat';
  } else if (category === 'red_flag_berat') {
    if (changePct <= -5) return 'flagDown';
    if (changePct >= 10) return 'flagUp';
    return 'flagFlat';
  }
  // perlu_kehati_hatian
  return changePct < 0 ? 'cautionDown' : 'cautionUp';
}

export default function PostmortemPage() {
  const { memoId } = useParams<{ memoId: string }>();
  const { t } = useLang();
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
        setError(e instanceof ApiError ? e.message : t('postmortem.error.load'));
        setState('error');
      });
    return () => {
      alive = false;
    };
  }, [memoId]);

  return (
    <div className="pt-12">
      <div className="mx-auto w-full max-w-[980px] px-6 pb-14">
        {state === 'loading' ? (
          <PmSkeleton />
        ) : state === 'error' || !data ? (
          <section
            className="mx-auto my-10 max-w-[560px] rounded-[14px] border border-[#3a332a] bg-bg-2 p-8 text-center"
            role="alert"
          >
            <span className="mx-auto mb-4 grid h-[50px] w-[50px] place-items-center rounded-pill border border-brass-600 bg-[rgba(201,162,74,0.08)] text-brass-300">
              <AlertIcon size={22} />
            </span>
            <h2 className="mb-2 font-display text-[22px] font-medium text-text-0">
              {t('postmortem.error.title')}
            </h2>
            <p className="text-[14px] text-text-2">{error}</p>
            <div className="mt-5 flex justify-center">
              <Link
                to="/journal"
                className={`rounded-pill border border-brass-600 px-5 py-[10px] font-mono text-[12px] tracking-[0.5px] text-brass-400 transition-colors hover:bg-brass-500 hover:text-bg-1 ${FOCUS}`}
              >
                {t('postmortem.error.back')}
              </Link>
            </div>
          </section>
        ) : (
          <PmView data={data} />
        )}
      </div>
    </div>
  );
}

function PmView({ data }: { data: PostmortemResponse }) {
  const labels = useLabels();
  const { t } = useLang();
  const { memo, price_at_trial, price_now, change_pct, days_elapsed, price_series } = data;
  const up = (change_pct ?? 0) >= 0;
  const hasPrice = change_pct != null && price_now != null;
  const hasSeries = price_series != null && price_series.length >= 2;
  const vLabel = labels.verdictDoc[memo.verdict.category];
  const code = outcomeCode(memo.verdict.category, change_pct);
  const outcome = {
    title: t(OUTCOME_TEXT[code].title),
    badge: t(OUTCOME_TEXT[code].badge),
    badgeColor: OUTCOME_TONE[code],
    // Angka masuk sebagai parameter, bukan dirangkai di luar kalimat, supaya
    // urutan kata versi Inggris bisa berbeda dari Indonesia.
    description: renderRich(
      t(OUTCOME_TEXT[code].desc, {
        pct: change_pct != null ? formatPct(change_pct) : '',
        verdict: labels.verdict[memo.verdict.category],
      }),
      { em: (children) => <em className="not-italic font-medium text-brass-300">{children}</em> },
    ),
  };

  return (
    <div>
      <nav className="anim-in mb-[22px] font-mono text-[12px] uppercase tracking-[1px] text-text-3">
        <Link
          to="/journal"
          className={`text-brass-500 transition-colors hover:text-brass-300 ${FOCUS}`}
        >
          {t('postmortem.crumb.journal')}
        </Link>
        <span className="mx-[6px]">/</span>
        <span>{t('postmortem.crumb.here')}</span>
      </nav>

      {/* ---------- HEAD ---------- */}
      <header className="anim-in mb-[30px] flex flex-wrap items-end justify-between gap-5 border-b border-[#3a332a] pb-[26px]">
        <div>
          <p className="mb-[10px] font-mono text-[11px] uppercase tracking-[2px] text-brass-500">
            {t('postmortem.kicker')}
          </p>
          <h1 className="font-display text-[clamp(30px,4.5vw,44px)] font-medium leading-[1.1] text-text-0">
            {memo.ticker}
            <em className="not-italic text-brass-300">.</em>{' '}
            <span className="text-[0.55em] text-text-2">{memo.company_name}</span>
          </h1>
          <div className="mt-[10px] flex flex-wrap items-center gap-[10px] text-[13.5px] text-text-2">
            <span>
              {renderRich(t('postmortem.head.verdictOn', { date: formatDate(memo.created_at) }), {
                b: (children) => <span className="font-mono text-text-0">{children}</span>,
              })}
            </span>
            <VerdictBadge category={memo.verdict.category} />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={`/ticker/${memo.ticker}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-brass-600/50 bg-brass-500/10 px-3.5 py-2 font-mono text-[12px] font-semibold text-brass-300 transition-all hover:bg-brass-500 hover:text-[#14120f] ${FOCUS}`}
          >
            <SparkIcon size={14} />
            <span>{t('postmortem.head.newTrial')}</span>
          </Link>
        </div>
      </header>

      {/* ---------- OUTCOME EVALUATION CARD (VONIS AKURASI) ---------- */}
      <section className="anim-in-slow mb-[30px] rounded-[14px] border border-[#3a332a] bg-bg-2 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-brass-500">
              {t('postmortem.outcome.kicker')}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-mono text-[11.5px] font-medium ${outcome.badgeColor}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {outcome.badge}
          </span>
        </div>
        <h3 className="mt-3 font-serif text-[20px] font-medium text-text-0">
          {outcome.title}
        </h3>
        <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-text-2">
          {outcome.description}
        </p>
      </section>

      {/* ---------- CHART ---------- */}
      <section className="anim-in mb-[30px] rounded-[14px] border border-[#3a332a] bg-bg-2 px-[22px] pb-[18px] pt-[22px]">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-[19px] font-medium text-text-0">
            {renderRich(t('postmortem.chart.title'), {
              em: (children) => <em className="italic text-brass-300">{children}</em>,
            })}
          </h2>
          <span className="font-mono text-[11px] tracking-[0.5px] text-text-3">
            {t('postmortem.chart.archiveNote')}
          </span>
        </div>
        {hasSeries ? (
          <PostmortemChart points={price_series!} verdictDate={memo.created_at} priceAtTrial={price_at_trial} />
        ) : (
          <p className="rounded-[14px] border border-dashed border-[#3a332a] px-6 py-8 text-center text-[13px] text-text-2">
            {t('postmortem.chart.empty')}
          </p>
        )}
      </section>

      {/* ---------- SUMMARY ROW ---------- */}
      <section className="anim-in mb-[30px] grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-[#3a332a] bg-[#2a251e] min-[640px]:grid-cols-3">
        <SumCell
          label={t('postmortem.sum.priceAtTrial')}
          value={price_at_trial != null ? formatRupiah(price_at_trial) : '—'}
          sub={formatDate(memo.created_at)}
        />
        <SumCell
          label={t('postmortem.sum.priceNow')}
          value={price_now != null ? formatRupiah(price_now) : '—'}
          sub={t('postmortem.sum.latestArchive')}
        />
        <SumCell
          label={t('postmortem.sum.delta')}
          value={hasPrice ? formatPct(change_pct!) : '—'}
          tone={hasPrice ? (up ? 'up' : 'down') : undefined}
          sub={
            days_elapsed != null
              ? t('postmortem.sum.sinceVerdictDays', { n: days_elapsed })
              : t('postmortem.sum.sinceVerdict')
          }
        />
      </section>

      {/* ---------- OLD VERDICT CARD ---------- */}
      <section className="anim-in mb-[30px] rounded-[14px] border border-[#3a332a] bg-bg-2 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[1.5px] text-brass-500">
            {t('postmortem.verdict.kicker', { date: formatDate(memo.created_at) })}
          </span>
          <Link
            to={`/memo/${memo.trial_id ?? memo.memo_id}`}
            className={`font-mono text-[11px] uppercase tracking-[1px] text-brass-500 transition-colors hover:text-brass-300 ${FOCUS}`}
          >
            {t('postmortem.verdict.openMemo')}
          </Link>
        </div>
        <h2 className="mb-[6px] font-display text-[22px] font-medium text-text-0">
          {renderRich(vLabel, {
            em: (children) => <em className="italic text-brass-300">{children}</em>,
          })}
        </h2>
        <div className="max-w-[62ch] text-[14.5px] leading-[1.6] text-text-2 [&>*:last-child]:mb-0 [&_p]:mb-0">
          <Markdown source={memo.verdict.rationale_md} />
        </div>
        {memo.verdict.verification_questions.length > 0 && (
          <div className="mt-[18px]">
            <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[1px] text-text-3">
              {t('postmortem.verdict.questions')}
            </p>
            <div className="flex flex-wrap">
              {memo.verdict.verification_questions.map((q) => (
                <span
                  key={q}
                  className="mb-[6px] mr-[6px] inline-block rounded-pill border border-brass-600 bg-[rgba(201,162,74,0.05)] px-3 py-[5px] font-mono text-[11px] text-brass-500"
                >
                  {q}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ---------- NEXT ACTIONS ---------- */}
      <section className="anim-in border-t border-[#3a332a] pt-8">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[1.5px] text-brass-500">
          {t('postmortem.next.title')}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to={`/memo/${memo.trial_id ?? memo.memo_id}`}
            className={`group flex flex-col justify-between rounded-xl border border-[#3a332a] bg-bg-2 p-4 transition-all hover:border-brass-500 hover:bg-[#1a1713] ${FOCUS}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-brass-400">
                  {t('postmortem.next.memo.kicker')}
                </span>
                <ArrowRightIcon className="h-4 w-4 text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-brass-400" />
              </div>
              <h4 className="mt-2 font-serif text-[15px] font-medium text-text-1">
                {t('postmortem.next.memo.title')}
              </h4>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-3">
                {t('postmortem.next.memo.desc')}
              </p>
            </div>
            <div className="mt-4 font-mono text-[11.5px] text-brass-400">
              {t('postmortem.next.memo.cta')}
            </div>
          </Link>

          <Link
            to={`/ticker/${memo.ticker}`}
            className={`group flex flex-col justify-between rounded-xl border border-[#3a332a] bg-bg-2 p-4 transition-all hover:border-accent hover:bg-[#1a1713] ${FOCUS}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-accent">
                  {t('postmortem.next.retrial.kicker')}
                </span>
                <ArrowRightIcon className="h-4 w-4 text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </div>
              <h4 className="mt-2 font-serif text-[15px] font-medium text-text-1">
                {t('postmortem.next.retrial.title', { ticker: memo.ticker })}
              </h4>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-3">
                {t('postmortem.next.retrial.desc')}
              </p>
            </div>
            <div className="mt-4 font-mono text-[11.5px] text-accent">
              {t('postmortem.next.retrial.cta')}
            </div>
          </Link>

          <Link
            to="/board"
            className={`group flex flex-col justify-between rounded-xl border border-[#3a332a] bg-bg-2 p-4 transition-all hover:border-[#d4a373] hover:bg-[#1a1713] ${FOCUS}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#d4a373]">
                  {t('postmortem.next.board.kicker')}
                </span>
                <ArrowRightIcon className="h-4 w-4 text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-[#d4a373]" />
              </div>
              <h4 className="mt-2 font-serif text-[15px] font-medium text-text-1">
                {t('postmortem.next.board.title')}
              </h4>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-3">
                {t('postmortem.next.board.desc')}
              </p>
            </div>
            <div className="mt-4 font-mono text-[11.5px] text-[#d4a373]">
              {t('postmortem.next.board.cta')}
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Sel ringkasan gaya .sum mock — label mono faint, nilai mono 22px, sub kecil. */
function SumCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'up' | 'down';
}) {
  return (
    <div className="bg-bg-2 px-5 py-[18px]">
      <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[1.2px] text-text-3">
        {label}
      </div>
      <div
        className={`font-mono text-[22px] font-medium tabular-nums ${
          tone === 'up' ? 'text-[#7fb069]' : tone === 'down' ? 'text-[#c96a5a]' : 'text-text-0'
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-[12px] text-text-2">{sub}</div>}
    </div>
  );
}

function PmSkeleton() {
  return (
    <div className="flex flex-col gap-[30px]">
      <span className="skeleton h-[120px] w-full" />
      <span className="skeleton h-[300px] w-full" />
      <span className="skeleton h-[110px] w-full" />
      <span className="skeleton h-[180px] w-full" />
    </div>
  );
}

// Mock postmortem: viewBox 900x260, gridline tetap di 40/130/220,
// label min/max faint di kiri, penanda putusan dashed + titik brass-soft.
const W = 900;
const H = 260;
const TOP = 40;
const MID = 130;
const BOT = 220;

/** Grafik harga post-mortem: garis brass + area, penanda vertikal di tanggal putusan, serta tooltip interaktif saat hover. */
function PostmortemChart({
  points,
  verdictDate,
  priceAtTrial,
}: {
  points: PricePoint[];
  verdictDate: string;
  priceAtTrial?: number | null;
}) {
  const { t } = useLang();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || Math.max(1, max * 0.01);

  const x = (i: number) => (W * i) / (points.length - 1);
  const y = (v: number) => 44 + (206 - 44) * (1 - (v - min) / span);

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.close).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${W},${BOT} L0,${BOT} Z`;

  // Penanda putusan: titik terdekat dengan tanggal memo.
  const vIdx = nearestIndex(points, verdictDate);
  const vX = x(vIdx);
  const vY = y(points[vIdx].close);
  const flip = vIdx > (points.length - 1) * 0.72;

  const first = points[0];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(
      points.length - 1,
      Math.max(0, Math.round(relX * (points.length - 1)))
    );
    setHoverIdx(idx);
  };

  const handleMouseLeave = () => {
    setHoverIdx(null);
  };

  const activeIdx = hoverIdx;
  const activePt = activeIdx != null ? points[activeIdx] : null;
  const activeX = activeIdx != null ? x(activeIdx) : 0;
  const activeY = activePt != null ? y(activePt.close) : 0;
  const activeFlip = activeIdx != null && activeIdx > (points.length - 1) * 0.68;

  const baselinePrice = priceAtTrial ?? points[vIdx].close;
  const hoverDiffPct =
    activePt != null && baselinePrice > 0
      ? ((activePt.close - baselinePrice) / baselinePrice) * 100
      : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        className="block h-[260px] w-full cursor-crosshair overflow-visible max-[640px]:h-[220px]"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('postmortem.chart.aria', {
          from: formatDate(first.date),
          to: formatDate(points[points.length - 1].date),
        })}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* gridline tetap */}
        {[TOP, MID, BOT].map((gy) => (
          <line key={gy} stroke="#2a251e" strokeWidth={1} x1={0} y1={gy} x2={W} y2={gy} />
        ))}

        <path d={area} fill="rgba(201,162,74,0.08)" />
        <path
          d={line}
          fill="none"
          stroke="#c9a24a"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* penanda putusan */}
        <line
          stroke="#e0c27a"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          x1={vX}
          y1={20}
          x2={vX}
          y2={240}
        />
        <circle cx={vX} cy={vY} r={4} fill="#e0c27a" />
        <text
          className="font-mono text-[10.5px]"
          fill="#e0c27a"
          x={flip ? vX - 12 : vX + 12}
          y={vY - 8}
          textAnchor={flip ? 'end' : 'start'}
        >
          {formatRupiah(points[vIdx].close)}
        </text>
        <text
          className="font-mono text-[10px] tracking-[0.5px]"
          fill="#e0c27a"
          x={flip ? vX - 12 : vX + 12}
          y={vY + 12}
          textAnchor={flip ? 'end' : 'start'}
        >
          {t('postmortem.chart.marker')}
        </text>

        {/* hover cursor line & dot */}
        {activePt && activeIdx !== vIdx && (
          <g>
            <line
              stroke="rgba(236,231,221,0.4)"
              strokeWidth={1.2}
              strokeDasharray="2 2"
              x1={activeX}
              y1={20}
              x2={activeX}
              y2={240}
            />
            <circle cx={activeX} cy={activeY} r={5} fill="#f7ecd7" stroke="#0f0d0a" strokeWidth={2} />
          </g>
        )}

        {/* label nilai & axis */}
        <text className="font-mono text-[10.5px]" fill="#6f675a" x={0} y={TOP - 6}>
          {formatRupiah(max)}
        </text>
        <text className="font-mono text-[10.5px]" fill="#6f675a" x={0} y={BOT - 6}>
          {formatRupiah(min)}
        </text>
        <text className="font-mono text-[10.5px]" fill="#6f675a" x={0} y={255}>
          {formatDate(first.date)}
        </text>
        <text className="font-mono text-[10.5px]" fill="#6f675a" x={W} y={255} textAnchor="end">
          {t('postmortem.chart.now')}
        </text>
      </svg>

      {/* Floating Tooltip saat user hover titik data */}
      {activePt && (
        <div
          className="pointer-events-none absolute top-3 rounded-lg border border-[#3a332a] bg-bg-3 px-3 py-2 shadow-2 transition-all font-mono text-[12px] z-10"
          style={{
            left: activeFlip ? `max(10px, calc(${activeX / W * 100}% - 170px))` : `min(calc(100% - 180px), calc(${activeX / W * 100}% + 12px))`,
          }}
        >
          <div className="text-text-3 text-[10.5px]">{formatDate(activePt.date)}</div>
          <div className="text-text-0 font-medium text-[13px] mt-0.5">
            {formatRupiah(activePt.close)}
          </div>
          {hoverDiffPct != null && activeIdx !== vIdx && (
            <div
              className={`text-[11px] mt-0.5 ${
                hoverDiffPct >= 0 ? 'text-[#7fb069]' : 'text-[#c96a5a]'
              }`}
            >
              {t('postmortem.chart.vsTrial', { pct: formatPct(hoverDiffPct, 1) })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function nearestIndex(points: PricePoint[], target: string): number {
  const targetMs = new Date(target).getTime();
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = Math.abs(new Date(points[i].date).getTime() - targetMs);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  return best;
}