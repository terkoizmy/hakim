import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTrialStream } from '../hooks/useTrialStream';
import {
  type AgentEvidencePayload,
  type AgentId,
  type CacheStatus,
  type DebateSide,
  type Phase,
  type TrialErrorCode,
} from '../types/contract';
import { renderRich, useLabels, useLang } from '../i18n';
import { ANALYST_META } from '../utils/analysts';
import { Markdown } from '../utils/md';
import { formatValue } from '../utils/format';
import type { AnalystUi, TrialUiState } from '../state/trialReducer';
import {
  AlertIcon,
  BookIcon,
  BoltIcon,
  BuildingIcon,
  ChartIcon,
  DatabaseIcon,
  FileIcon,
  FingerprintIcon,
  GavelIcon,
  RefreshIcon,
  ShieldAlertIcon,
  SparkIcon,
} from '../components/icons';

const PHASE_STEPS: { phase: Phase }[] = [
  { phase: 'evidence' },
  { phase: 'debate' },
  { phase: 'verdict' },
];

/* Warna hairline mock (solid, bukan rgba) — dipakai presisi di halaman sidang. */
const LINE = '#3a332a';

/** Cincin fokus bersama — tali yang sama dengan AppShell supaya kontrol
 * keyboard di halaman ini tidak jadi satu-satunya yang tanpa indikator. */
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0';

/** Bentuk bersama blok kosong/muat/galat: tengah, sudut 14px, berbingkai,
 * padding lega. Dipakai tiga tempat supaya ketiganya terbaca sebagai satu
 * keluarga, bukan tiga gaya yang kebetulan berdekatan. */
const NOTICE =
  'flex items-center justify-center gap-2.5 rounded-[14px] border border-line-2 bg-bg-2 px-5 py-7 text-center';

/** Segel lingkaran mock: 52px (casebar) / 46px (hakim), border brass-dim + radial hangat. */
function Seal({ size, children, className = '' }: { size: number; children: ReactNode; className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-[#8a6f33] text-brass-400 ${className}`}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 30% 30%, rgba(201,162,74,0.12), transparent 70%)',
      }}
    >
      {children}
    </span>
  );
}

/** Kepala seksi mock: kicker mono kuningan + judul display 22px + catatan mono kanan. */
function SecHead({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return (
    <div className="mt-11 mb-[18px] flex flex-wrap items-baseline justify-between gap-4">
      <div>
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[1.5px] text-brass-500">{kicker}</div>
        <h2 className="font-display text-[22px] font-medium leading-tight">{title}</h2>
      </div>
      {note && <span className="font-mono text-[12px] text-text-3">{note}</span>}
    </div>
  );
}

/** Tiga titik "menunggu" (setara .dotty). */
function Dots() {
  return (
    <span className="ml-1.5 inline-flex gap-[3px]">
      <i className="size-1 animate-dotty rounded-full bg-current" />
      <i className="size-1 animate-dotty rounded-full bg-current [animation-delay:150ms]" />
      <i className="size-1 animate-dotty rounded-full bg-current [animation-delay:300ms]" />
    </span>
  );
}

/** Badge status sidang di case-sub (setara .b-live / varian selesai-gagal). */
function TrialStatusBadge({ streaming, error }: { streaming: boolean; error: boolean }) {
  const { t } = useLang();
  const label = error
    ? t('courtroom.status.failed')
    : streaming
      ? t('courtroom.status.running')
      : t('courtroom.status.done');
  const tone = error || streaming
    ? 'border-[rgba(201,106,90,0.4)] bg-[rgba(201,106,90,0.06)] text-prosecute-400'
    : 'border-[rgba(127,176,105,0.4)] bg-[rgba(127,176,105,0.06)] text-defend-400';
  return (
    <span className={`inline-flex items-center gap-[7px] whitespace-nowrap rounded-[6px] border px-2.5 py-[5px] font-mono text-[11.5px] tracking-[0.3px] ${tone}`}>
      <span
        className={`size-[6px] rounded-full ${error ? 'bg-prosecute-400' : streaming ? 'animate-pulse-dot bg-prosecute-400' : 'bg-defend-400'}`}
      />
      {label}
    </span>
  );
}

export default function CourtroomPage() {
  const { trialId } = useParams<{ trialId: string }>();
  const stream = useTrialStream(trialId);
  const navigate = useNavigate();
  const { t } = useLang();
  const [elapsed, setElapsed] = useState(0);
  const [summaryId, setSummaryId] = useState<AgentId | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const evidenceTotal = useMemo(
    () => Object.values(stream.analysts).reduce((n, a) => n + a.evidence.length, 0),
    [stream.analysts],
  );

  const ticker = stream.trial?.ticker;
  const company = stream.trial?.company_name;
  const streaming = !stream.terminal && !stream.error && !!stream.trial;

  function skipToMemo() {
    if (stream.memo) {
      navigate(`/memo/${trialId}`);
      return;
    }
    const el = document.getElementById('verdict-anchor');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="pt-[34px] pb-[72px]">
      <div className="container">
        {/* ---------- CASE BAR ---------- */}
        <div className="crumb mb-5 flex items-center font-mono text-[12px] uppercase tracking-[1px] text-text-3">
          <Link to="/dashboard" className={`rounded-xs text-brass-500 transition-colors hover:text-brass-300 ${FOCUS}`}>{t('courtroom.crumb.cases')}</Link>
          <span className="mx-[6px] text-text-3">/</span>
          <Link to={`/ticker/${ticker ?? ''}`} className={`rounded-xs text-brass-500 transition-colors hover:text-brass-300 ${FOCUS}`}>{ticker ?? '…'}</Link>
          <span className="mx-[6px] text-text-3">/</span>
          <span>{t('courtroom.crumb.live')}</span>
        </div>

        <div className="anim-in flex flex-wrap items-center gap-5">
          <Seal size={52} className={stream.error ? '!border-[rgba(201,106,90,0.5)] !text-prosecute-300' : ''}>
            {stream.error ? <AlertIcon size={24} /> : <GavelIcon size={24} />}
          </Seal>
          <div className="flex min-w-[260px] flex-col">
            <div className="font-mono text-[clamp(30px,4.5vw,44px)] font-medium leading-none tracking-[2px] text-text-0">
              {ticker ?? '…'}
              {ticker && <span className="ml-[7px] text-brass-500">.</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {company && <span className="font-display text-[16px] text-text-2">{company}</span>}
              {stream.trial && <TrialStatusBadge streaming={streaming} error={stream.error != null} />}
              {stream.trial?.mode === 'fixture' && (
                /* Ditentukan oleh mode data sidang yang SEBENARNYA (dari
                   backend), bukan oleh konfigurasi frontend — supaya labelnya
                   tidak pernah bertentangan dengan memo. */
                <span
                  className="rounded-[6px] border border-line-1 px-2.5 py-[5px] font-mono text-[11.5px] text-text-2"
                  title={t('courtroom.mode.fixtureTitle')}
                >
                  {t('courtroom.mode.fixture')}
                </span>
              )}
              <span
                className="font-mono text-[12px] tracking-[0.5px] text-text-3"
                title={
                  stream.trial
                    ? t('courtroom.committee', {
                        analyst: stream.trial.models.analyst,
                        debate: stream.trial.models.debate,
                        judge: stream.trial.models.judge,
                      })
                    : undefined
                }
              >
                {stream.trial
                  ? t('courtroom.caseNo', { id: stream.trial.trial_id })
                  : t('courtroom.connectingShort')}
              </span>
            </div>
          </div>
        </div>

        {/* ---------- STATS BAND ---------- */}
        <div className="mt-6 flex flex-wrap overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2">
          <Stat label={t('courtroom.stats.evidence')}>
            {evidenceTotal} <small>EV</small>
          </Stat>
          <Stat label={t('courtroom.stats.analysts')}>
            {stream.completedCount}{' '}
            <small>{t('courtroom.stats.analystsOf', { total: 5 })}</small>
          </Stat>
          <Stat label={t('courtroom.stats.data')}>
            {stream.toolCallsByCache.fixture > 0 ? (
              /* Mode demo: seluruh payload dari berkas contoh — 0 kredit, jadi
                 "0 / 0 hit/miss" hanya akan membingungkan. */
              <>
                <span className="text-[color:var(--cache-fixture)]">
                  {stream.toolCallsByCache.fixture}
                </span>{' '}
                <small>{t('courtroom.stats.dataFixture')}</small>
              </>
            ) : (
              <>
                <span className="text-[color:var(--defend-400)]">{stream.toolCallsByCache.hit}</span>
                <span className="text-text-2"> / </span>
                <span className="text-prosecute-400">{stream.toolCallsByCache.miss}</span>{' '}
                <small>hit/miss</small>
              </>
            )}
          </Stat>
          <Stat label={t('courtroom.stats.duration')} last>
            {mmss(elapsed)} <small>{t('courtroom.stats.minutes')}</small>
          </Stat>
        </div>

        {/* ---------- STEPPER ---------- */}
        <PhaseStepper phase={stream.phase} round={stream.round} terminal={stream.terminal} error={stream.error != null} />

        {stream.reconnecting && (
          <div
            className="anim-fade mt-4 flex items-center gap-2.5 rounded-[6px] border border-[rgba(201,162,74,0.34)] bg-[rgba(201,162,74,0.08)] px-4 py-2.5 text-[13.5px] text-brass-200"
            role="status"
          >
            <RefreshIcon size={16} className="animate-spin-slow" />
            <span>
              {t('courtroom.reconnecting')}
              <Dots />
            </span>
          </div>
        )}

        {stream.error ? (
          <TrialErrorPanel error={stream.error} onRetry={() => navigate('/')} />
        ) : (
          <>
            <AnalystDeck state={stream} onOpenSummary={setSummaryId} openSummaryId={summaryId} />
            {(stream.debate.length > 0 || stream.phase === 'debate' || stream.phase === 'verdict') && (
              <DebatePanel debate={stream.debate} rounds={stream.roundsSeen} state={stream} phase={stream.phase} />
            )}
            {(stream.memoText || stream.memo) && <VerdictPanel stream={stream} />}
            {stream.memo && <MemoReadyBanner trialId={trialId!} ticker={ticker} />}
            {!stream.trial && <ConnectingSkeleton />}
          </>
        )}
      </div>

      {/* Modal kesimpulan analis (satu untuk semua kartu) */}
      {(() => {
        const summaryMeta = ANALYST_META.find((m) => m.id === summaryId);
        return summaryMeta ? (
          <SummaryModal
            meta={summaryMeta}
            analyst={stream.analysts[summaryMeta.id]}
            onClose={() => setSummaryId(null)}
          />
        ) : null;
      })()}

      {/* Pintu keluar: penonton tidak boleh terjebak menonton */}
      {!stream.memo && !stream.error && stream.trial && (
        <button
          type="button"
          className={`fixed bottom-[22px] right-[22px] z-50 inline-flex cursor-pointer items-center gap-2 rounded-pill border border-[rgba(201,162,74,0.42)] bg-[rgba(20,18,15,0.88)] px-4 py-2.5 text-[13px] font-semibold text-brass-200 shadow-2 backdrop-blur-[10px] transition-[border-color,background,transform] duration-[160ms] hover:-translate-y-px hover:border-brass-300 hover:bg-[rgba(38,33,26,0.94)] ${FOCUS}`}
          onClick={skipToMemo}
          title={stream.memoText ? t('courtroom.skip.typing') : t('courtroom.skip.waiting')}
        >
          <BookIcon size={15} /> {t('courtroom.skip.label')}
          {stream.memoText ? (
            <span className="inline-block size-[7px] animate-pulse-dot rounded-full bg-brass-300 shadow-[0_0_8px_var(--brass-glow)]" />
          ) : (
            <span className="inline-block size-[7px] rounded-full bg-text-3" />
          )}
        </button>
      )}
    </div>
  );
}

/* ---------------- stats band (setara .stats/.stat mock) ---------------- */
function Stat({ label, last, children }: { label: string; last?: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex min-w-[150px] flex-1 flex-col gap-1 px-5 py-4 ${last ? '' : 'border-r border-[#2a251e]'}`}
    >
      <span className="font-mono text-[10.5px] uppercase tracking-[1.2px] text-text-3">{label}</span>
      <span className="font-mono text-[20px] font-medium tabular-nums text-text-0 [&_small]:text-[12px] [&_small]:font-normal [&_small]:text-text-2">
        {children}
      </span>
    </div>
  );
}

function mmss(t: number) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ---------------- stepper (setara .stepper mock: node-row + rel di bawah) ---------------- */
function PhaseStepper({
  phase,
  round,
  terminal,
  error,
}: {
  phase: Phase | null;
  round: number | null;
  terminal: boolean;
  error: boolean;
}) {
  const labels = useLabels();
  const { t } = useLang();
  const phaseIndex = phase ? PHASE_STEPS.findIndex((s) => s.phase === phase) : -1;

  return (
    <div className="mt-[30px] flex items-start" aria-label={t('courtroom.stepper.aria')}>
      {PHASE_STEPS.map((step, i) => {
        const isDone = (phaseIndex > i || (terminal && !error)) && phase !== null;
        const isActive = phase === step.phase && !terminal;
        const lit = isDone || isActive;
        return (
          <div key={step.phase} className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[11px] transition-all duration-300 ${
                  lit
                    ? error && isActive
                      ? 'border-prosecute-400 bg-prosecute-400 text-[#14120f]'
                      : 'border-brass-500 bg-brass-500 text-[#14120f]'
                    : 'border-[#3a332a] bg-bg-2 text-text-3'
                } ${isActive && !error ? 'shadow-[0_0_0_4px_rgba(201,162,74,0.18)]' : ''}`}
              >
                {i + 1}
              </span>
              <span
                className={`whitespace-nowrap font-mono text-[11.5px] uppercase tracking-[0.5px] transition-colors duration-300 ${
                  lit ? (error && isActive ? 'text-prosecute-300' : 'text-text-0') : 'text-text-3'
                }`}
              >
                {labels.phase[step.phase]}
              </span>
              {step.phase === 'debate' && (phase === 'debate' || isDone) && !error && (
                <span className="self-start whitespace-nowrap rounded-pill border border-[#8a6f33] px-2 py-[2px] font-mono text-[10.5px] text-brass-500">
                  {t('courtroom.round', { r: round ?? 1 })}
                </span>
              )}
            </div>
            <div className="relative h-[2px] w-full overflow-hidden bg-[#3a332a]">
              <div
                className={`h-full w-full origin-left transition-transform duration-500 ease-out ${
                  lit ? 'scale-x-100' : 'scale-x-0'
                } ${error && isActive ? 'bg-prosecute-400' : 'bg-brass-500'}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- dek analis (setara .analysts/.analyst mock) ---------------- */
function AnalystDeck({
  state,
  onOpenSummary,
  openSummaryId,
}: {
  state: TrialUiState;
  onOpenSummary: (id: AgentId) => void;
  openSummaryId: AgentId | null;
}) {
  const { t } = useLang();
  return (
    <section>
      <SecHead
        kicker={t('courtroom.panel.kicker')}
        title={t('courtroom.panel.title')}
        note={t('courtroom.panel.note')}
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-[14px] min-[1100px]:grid-cols-5">
        {ANALYST_META.map((meta, i) => (
          <AnalystCard
            key={meta.id}
            meta={meta}
            analyst={state.analysts[meta.id]}
            index={i}
            summaryOpen={openSummaryId === meta.id}
            onOpenSummary={() => onOpenSummary(meta.id)}
          />
        ))}
      </div>
    </section>
  );
}

function AnalystCard({
  meta,
  analyst,
  index,
  summaryOpen,
  onOpenSummary,
}: {
  meta: (typeof ANALYST_META)[number];
  analyst?: AnalystUi;
  index: number;
  summaryOpen: boolean;
  onOpenSummary: () => void;
}) {
  const labels = useLabels();
  const { t } = useLang();
  const [showAll, setShowAll] = useState(false);
  if (!analyst) return null;
  const status = analyst.status;
  const Icon = ANALYST_ICONS[meta.id];
  const evShown = showAll ? analyst.evidence : analyst.evidence.slice(0, 3);
  const evHidden = Math.max(0, analyst.evidence.length - 3);

  return (
    <article
      className={`anim-in flex flex-col gap-3 rounded-[14px] border border-t-2 bg-bg-2 p-4 transition-colors duration-300 ${
        status === 'queued' ? 'border-dashed' : ''
      }`}
      data-agent={meta.id}
      style={{
        animationDelay: `${Math.min(index * 60, 300)}ms`,
        borderColor: LINE,
        borderTopColor: 'rgba(var(--agent),1)',
        borderTopStyle: 'solid',
        borderTopWidth: 2,
      }}
    >
      <header className="flex items-center gap-2.5">
        <span
          className="grid size-[34px] shrink-0 place-items-center rounded-[9px] text-[#14120f]"
          style={{ background: 'rgba(var(--agent),1)' }}
        >
          {status === 'queued' ? <span className="text-[13px] font-bold">?</span> : Icon ? <Icon size={18} /> : meta.monogram}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] font-semibold leading-[1.2] text-text-0">{labels.analyst[meta.id].name}</span>
          <span className="text-[11px] leading-[1.3] text-text-3">{labels.analyst[meta.id].tagline}</span>
        </div>
        <span
          className={`ml-auto size-[9px] shrink-0 rounded-full ${
            status === 'working'
              ? 'animate-pulse-dot bg-[#d9a441]'
              : status === 'done'
                ? 'bg-[#7fb069]'
                : 'bg-text-3'
          }`}
          aria-hidden="true"
        />
      </header>

      {status === 'queued' && (
        <div className="flex flex-1 items-start">
          <span className="text-[12px] text-text-3">{t('courtroom.analyst.queued')}</span>
        </div>
      )}

      {status === 'working' && (
        <div className="flex flex-1 flex-col gap-2">
          {analyst.toolCalls.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {analyst.toolCalls.map((tc, i) => (
                <div
                  key={i}
                  className="anim-fade flex items-center gap-2 rounded-[8px] border border-[#2a251e] px-[9px] py-[5px] text-[11px]"
                  style={{ animationDelay: `${Math.min(i * 90, 400)}ms` }}
                >
                  <span className="font-mono flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-text-2">
                    {tc.tool}
                  </span>
                  <CacheBadge cache={tc.cache} />
                </div>
              ))}
            </div>
          )}
          {evShown.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {evShown.map((ev) => (
                <EvidenceChip key={ev.evidence_id} evidence={ev} />
              ))}
            </div>
          )}
          <span className="mt-auto inline-flex items-center text-[12px] text-text-2">
            {t('courtroom.analyst.working')}
            <Dots />
          </span>
        </div>
      )}

      {status === 'done' && (
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            {evShown.map((ev) => (
              <EvidenceChip key={ev.evidence_id} evidence={ev} />
            ))}
          </div>
          {evHidden > 0 && (
            <button
              type="button"
              className={`w-full cursor-pointer rounded-[7px] border border-[#8a6f33] px-2.5 py-[7px] text-center font-mono text-[11px] text-brass-500 transition-colors duration-150 hover:bg-brass-500 hover:text-[#14120f] ${FOCUS}`}
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
            >
              {showAll ? t('courtroom.analyst.showLess') : t('courtroom.analyst.more', { n: evHidden })}
            </button>
          )}
          <div className="mt-auto flex flex-col gap-2 border-t border-[#2a251e] pt-2.5">
            {/* `flex-wrap`: di lebar 5 kolom, "Summary — N evidence" + badge
                richness tidak muat sebaris — tanpa wrap, badge-nya meluber
                keluar kartu dan tertimpa kartu sebelah. Badge `ml-auto`
                (lihat RichBadge) supaya tetap menempel ke kanan, baik saat
                sebaris maupun saat turun ke barisnya sendiri. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="min-w-0 text-[12px] text-text-2">
                {renderRich(t('courtroom.analyst.summary', { n: analyst.evidence.length }), {
                  b: (c) => <b className="font-semibold text-text-0">{c}</b>,
                })}
              </span>
              {analyst.dataRichness && <RichBadge richness={analyst.dataRichness} />}
            </div>
            {analyst.summaryMd && (
              <button
                type="button"
                className={`w-full cursor-pointer rounded-[7px] border border-[#8a6f33] px-2.5 py-[7px] text-center font-mono text-[11px] text-brass-500 transition-colors duration-150 hover:bg-brass-500 hover:text-[#14120f] ${FOCUS}`}
                onClick={onOpenSummary}
                aria-haspopup="dialog"
                aria-expanded={summaryOpen}
              >
                {t('courtroom.analyst.readSummary')}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export function RichBadge({ richness }: { richness: 'A' | 'B' | 'C' }) {
  const labels = useLabels();
  const { t } = useLang();
  const label = labels.richness[richness];
  return (
    <span
      className="ml-auto inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-[6px] border border-[#8a6f33] bg-[rgba(201,162,74,0.06)] px-[5px] font-mono text-[11.5px] tracking-[0.3px] text-[#e0c27a]"
      data-rich={richness}
      title={t('enum.richness.title', { grade: label })}
    >
      <span className="size-[6px] rounded-full bg-brass-500" />
      {label}
    </span>
  );
}

/** Modal kesimpulan analis — terbuka dari tombol "Baca kesimpulan" kartu.
 *  Tutup: klik backdrop, tombol ✕, atau Escape. */
function SummaryModal({
  meta,
  analyst,
  onClose,
}: {
  meta: (typeof ANALYST_META)[number];
  analyst?: AnalystUi;
  onClose: () => void;
}) {
  const labels = useLabels();
  const { t } = useLang();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const Icon = ANALYST_ICONS[meta.id];

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-5"
      role="dialog"
      aria-modal="true"
      aria-label={t('courtroom.summary.aria', { name: labels.analyst[meta.id].name })}
    >
      <div
        className="anim-fade absolute inset-0 bg-[rgba(10,9,7,0.72)] backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        className="anim-scale relative flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-y-auto rounded-[14px] border border-[#3a332a] bg-bg-2 p-6 shadow-2"
        data-agent={meta.id}
      >
        <div className="mb-4 flex items-center gap-3">
          <span
            className="grid size-[38px] shrink-0 place-items-center rounded-[9px] text-[#14120f]"
            style={{ background: 'rgba(var(--agent),1)' }}
          >
            {Icon ? <Icon size={20} /> : meta.monogram}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-[17px] font-medium leading-tight">{labels.analyst[meta.id].name}</span>
            <span className="font-mono text-[11px] tracking-[0.5px] text-text-3">{labels.analyst[meta.id].tagline}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`ml-auto grid size-8 shrink-0 cursor-pointer place-items-center rounded-[7px] border border-line-1 text-[14px] text-text-2 transition-colors duration-150 hover:border-[#3a332a] hover:bg-[#1a1713] hover:text-text-0 ${FOCUS}`}
            aria-label={t('courtroom.summary.close')}
          >
            ✕
          </button>
        </div>
        {analyst?.summaryMd ? (
          <Markdown source={analyst.summaryMd} className="md md-sm" />
        ) : (
          <p className={`${NOTICE} text-[13px] text-text-2`}>{t('courtroom.summary.empty')}</p>
        )}
      </div>
    </div>
  );
}

export function CacheBadge({ cache }: { cache: CacheStatus }) {
  const { t } = useLang();
  if (cache === 'hit') {
    return (
      <span className="badge badge-cache-hit">
        <BoltIcon size={11} /> {t('courtroom.cache.hit')}
      </span>
    );
  }
  if (cache === 'fixture') {
    // Netral, bukan hijau/merah: ini bukan cache dan bukan kredit.
    return (
      <span className="badge badge-cache-fixture" title={t('courtroom.cache.fixtureTitle')}>
        <FileIcon size={11} /> {t('courtroom.cache.fixture')}
      </span>
    );
  }
  return (
    <span className="badge badge-cache-miss">
      <RefreshIcon size={11} /> {t('courtroom.cache.miss')}
    </span>
  );
}

/** Baris bukti (setara .ev mock): id kuningan + judul ellipsis + pil nilai fakta. */
function EvidenceChip({ evidence }: { evidence: AgentEvidencePayload }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const first = evidence.facts[0];
  const pillValue = first
    ? formatFactValue(first.value, first.unit)
    : String(evidence.facts.length);
  return (
    <button
      type="button"
      className={`anim-scale block w-full cursor-pointer rounded-[8px] border border-[#2a251e] px-[9px] py-[7px] text-left transition-colors duration-150 hover:border-[#3a332a] hover:bg-[#1a1713] ${
        open ? 'border-[#3a332a] bg-[#1a1713]' : ''
      } ${FOCUS}`}
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      title={open ? t('courtroom.evidence.collapse') : t('courtroom.evidence.expand')}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 font-mono text-[10.5px] text-brass-500">{evidence.evidence_id}</span>
        <span
          className={`min-w-0 flex-1 overflow-hidden text-ellipsis text-[12.5px] leading-[1.35] text-text-2 ${
            open ? 'whitespace-normal' : 'whitespace-nowrap'
          }`}
        >
          {evidence.headline}
        </span>
        <span className="shrink-0 rounded-[5px] border border-[#2a251e] px-[6px] py-[1px] font-mono text-[10px] text-text-3">
          {pillValue}
        </span>
      </span>
      {open && evidence.facts.length > 0 && (
        <span className="mt-[7px] flex flex-wrap gap-[5px]">
          {evidence.facts.map((f) => (
            <span
              key={f.label}
              className="rounded-[5px] border border-[#2a251e] bg-[#1a1713] px-[7px] py-0.5 font-mono text-[10.5px] text-text-2"
            >
              <b className="mr-1 font-semibold text-brass-300">{formatFactValue(f.value, f.unit)}</b> {f.label}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

function formatFactValue(value: number, unit: string) {
  // Pembulatan satu desimal tetap urusan di sini; penyajian angkanya ikut
  // bahasa antarmuka lewat formatValue (dulu dikunci 'id-ID').
  const rounded = Math.round(value * 10) / 10;
  return formatValue(rounded, unit ?? '');
}

/* ---------------- podium debat (setara .podium mock) ---------------- */
function DebatePanel({
  debate,
  rounds,
  state,
  phase,
}: {
  debate: TrialUiState['debate'];
  rounds: number[];
  state: TrialUiState;
  phase: Phase | null;
}) {
  const { t } = useLang();
  return (
    <section>
      <SecHead
        kicker={t('courtroom.debate.kicker')}
        title={t('courtroom.debate.title')}
        note={t('courtroom.debate.note')}
      />

      {debate.length === 0 && phase === 'debate' && (
        <div className={`${NOTICE} text-[13.5px] text-text-1`}>
          <span className="status-dot working shrink-0" /> {t('courtroom.debate.opening')}
        </div>
      )}

      <div className="flex flex-col gap-9">
        {rounds.map((round) => (
          <div key={round}>
            <div className="mb-4 flex justify-center">
              <span className="whitespace-nowrap rounded-[6px] border border-[#8a6f33] bg-bg-1 px-3 py-1 font-mono text-[11px] tracking-[1px] text-brass-500">
                {t('courtroom.roundTitle', { r: round })}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-[14px] min-[900px]:grid-cols-2">
              <PodiumSide side="prosecution" round={round} debate={debate} state={state} />
              <PodiumSide side="defense" round={round} debate={debate} state={state} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Satu sisi podium untuk satu ronde (kartu Jaksa / Pembela). */
function PodiumSide({
  side,
  round,
  debate,
  state,
}: {
  side: DebateSide;
  round: number;
  debate: TrialUiState['debate'];
  state: TrialUiState;
}) {
  const isDefense = side === 'defense';
  const { t } = useLang();
  const u = debate.find((d) => d.round === round && d.side === side);
  return (
    <div
      className="flex flex-col gap-[14px] rounded-[14px] border border-t-2 bg-bg-2 p-5"
      style={{
        borderColor: LINE,
        borderTopColor: isDefense ? '#7fb069' : '#c96a5a',
        borderTopStyle: 'solid',
        borderTopWidth: 2,
      }}
    >
      <div className="flex items-center gap-3">
        <span className="font-display text-[18px] font-medium">
          {isDefense ? t('courtroom.side.defender') : t('courtroom.side.prosecutor')}
        </span>
        <span
          className={`rounded-[6px] border px-[9px] py-[3px] font-mono text-[11px] uppercase tracking-[1px] ${
            isDefense
              ? 'border-[rgba(127,176,105,0.4)] bg-[rgba(127,176,105,0.06)] text-defend-400'
              : 'border-[rgba(201,106,90,0.4)] bg-[rgba(201,106,90,0.06)] text-prosecute-400'
          }`}
        >
          {isDefense ? t('courtroom.side.bull') : t('courtroom.side.bear')}
        </span>
      </div>
      <UtteranceCard side={side} utterance={u} state={state} />
    </div>
  );
}

/** Buang baris pertama argument_md bila duplikat judul (artefak template fallback backend).
 *  Baris pertama boleh ber-suffix "(ronde N)" — dianggap sama dengan judul. */
function stripTitleEcho(title: string, md: string): string {
  const cleanTitle = title.trim().toLowerCase();
  if (!cleanTitle || !md.trim()) return md;
  const lines = md.trimStart().split('\n');
  const first = (lines[0] ?? '')
    .replace(/^#+\s*/, '')
    .replace(/\*/g, '')
    .replace(/\s*\((?:ronde|putaran|round)[^)]*\)\s*$/i, '')
    .trim();
  if (first.toLowerCase() === cleanTitle) {
    return lines.slice(1).join('\n').trimStart();
  }
  return md;
}

function UtteranceCard({
  side,
  utterance,
  state,
}: {
  side: DebateSide;
  utterance?: TrialUiState['debate'][number];
  state: TrialUiState;
}) {
  const isDefense = side === 'defense';
  const { t } = useLang();
  if (!utterance) {
    return (
      <div className="inline-flex items-center gap-2 rounded-[6px] border border-dashed border-line-2 px-3 py-2 text-[12.5px] text-text-3">
        {isDefense
          ? t('courtroom.utterance.defenderPreparing')
          : t('courtroom.utterance.prosecutorPreparing')}
        <Dots />
      </div>
    );
  }

  return (
    <article className="anim-scale flex flex-col gap-2">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-[6px] border border-line-1 px-2 py-[3px] font-mono text-[10.5px]">
        <span className="font-medium text-text-0">
          {isDefense ? t('courtroom.utterance.defenderTag') : t('courtroom.utterance.prosecutorTag')}
        </span>
        <span className="text-text-3">·</span>
        <span className={isDefense ? 'text-defend-400' : 'text-prosecute-400'}>{isDefense ? 'bull' : 'bear'}</span>
        {utterance.rebuts && (
          <>
            <span className="text-text-3">·</span>
            <span className="text-brass-400">{t('courtroom.utterance.reply')}</span>
          </>
        )}
      </span>
      <h4 className="text-[15px] font-semibold leading-[1.4] text-text-0">{utterance.title}</h4>
      <div className="text-[13.5px] leading-[1.6] text-text-2">
        <Markdown source={stripTitleEcho(utterance.title, utterance.argument_md)} className="md" />
      </div>
      {utterance.cites.length > 0 && (
        <div className="mt-0.5 flex flex-wrap gap-2">
          {utterance.cites.map((c) => (
            <EvidenceRef key={c} evidenceId={c} state={state} />
          ))}
        </div>
      )}
    </article>
  );
}

function EvidenceRef({ evidenceId, state }: { evidenceId: string; state: TrialUiState }) {
  const evidence = findEvidence(state, evidenceId);
  return (
    <span
      className="cursor-default rounded-[6px] border border-[#8a6f33] px-[9px] py-[3px] font-mono text-[11px] text-brass-500 transition-colors duration-150 hover:border-brass-500 hover:bg-brass-500 hover:text-[#14120f]"
      title={evidence?.headline ?? evidenceId}
    >
      {evidenceId}
    </span>
  );
}

export function findEvidence(state: TrialUiState, evidenceId: string): AgentEvidencePayload | undefined {
  for (const analyst of Object.values(state.analysts)) {
    const found = analyst.evidence.find((e) => e.evidence_id === evidenceId);
    if (found) return found;
  }
  return undefined;
}

/* ---------------- putusan (setara .verdict/.judge mock) ---------------- */
function VerdictPanel({ stream }: { stream: ReturnType<typeof useTrialStream> }) {
  const labels = useLabels();
  const { t } = useLang();
  const streaming = !stream.memo && !stream.memoText;
  const ticker = stream.trial?.ticker ?? '';
  const memoMd = stream.memoText || stream.memo?.verdict.rationale_md || ' ';
  return (
    <section id="verdict-anchor" className="verdict">
      <SecHead
        kicker={t('courtroom.verdict.kicker')}
        title={t('courtroom.verdict.title')}
        note={streaming ? t('courtroom.verdict.noteLive') : t('courtroom.verdict.noteFinal')}
      />
      <div className="relative overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2 p-[30px]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_80%_0%,rgba(201,162,74,0.05),transparent_60%)]"
          aria-hidden="true"
        />
        <div className="relative mb-[22px] flex items-center gap-3.5">
          <Seal size={46}>
            <GavelIcon size={20} />
          </Seal>
          <div className="flex flex-col">
            <span className="font-display text-[17px] font-medium">{t('courtroom.verdict.judge')}</span>
            <span className="font-mono text-[11px] tracking-[0.5px] text-text-3">
              {t('courtroom.verdict.meta', { ticker })}
            </span>
          </div>
        </div>
        <div className="relative grid grid-cols-1 gap-8 min-[1000px]:grid-cols-[minmax(0,1fr)_230px]">
          <div className="max-w-[70ch]">
            <Markdown
              source={memoMd}
              className={`md font-display text-[clamp(17px,2.4vw,21px)] leading-[1.7] ${
                streaming ? 'text-text-1' : 'text-text-0'
              }`}
            />
            {streaming && (
              <span className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-blink bg-brass-500 align-text-bottom" />
            )}
          </div>
          {stream.memo ? (
            <aside className="flex h-fit flex-col gap-3.5 rounded-[10px] border border-[#2a251e] bg-bg-3 p-5">
              <span className="font-mono text-[10.5px] uppercase tracking-[1.2px] text-text-3">
                {t('courtroom.verdict.outcome')}
              </span>
              <span className="font-display text-[19px] font-medium leading-snug">
                {labels.verdict[stream.memo.verdict.category]}
              </span>
              <div>
                <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-text-3">
                  <span>{t('courtroom.verdict.confidence')}</span>
                  <span className="tabular-nums">{Math.round(stream.memo.verdict.confidence * 100)}%</span>
                </div>
                <div className="h-[6px] overflow-hidden rounded-pill bg-[#2a251e]">
                  <div
                    className="h-full rounded-pill bg-brass-500"
                    style={{ width: `${Math.round(stream.memo.verdict.confidence * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-[12px] leading-[1.5] text-text-2">
                {t('courtroom.verdict.factsCites', {
                  facts: stream.memo.key_facts.length,
                  cites: stream.memo.citations.length,
                })}
              </span>
            </aside>
          ) : (
            <aside className="flex h-fit flex-col gap-2 rounded-[10px] border border-dashed border-line-2 p-5">
              <span className="font-mono text-[10.5px] uppercase tracking-[1.2px] text-text-3">
                {t('courtroom.verdict.outcome')}
              </span>
              <span className="inline-flex items-center text-[12.5px] text-text-2">
                {t('courtroom.verdict.summarising')}
                <Dots />
              </span>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- memo siap → CTA (setara .final-banner mock) ---------------- */
function MemoReadyBanner({ trialId, ticker }: { trialId: string; ticker?: string }) {
  const { t } = useLang();
  return (
    <div
      className="anim-scale mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-[#8a6f33] bg-[linear-gradient(180deg,rgba(201,162,74,0.08),rgba(201,162,74,0.02))] px-[22px] py-[18px]"
      role="status"
    >
      <div className="flex items-center gap-3">
        <BookIcon size={22} className="shrink-0 text-brass-500" />
        <div className="flex flex-col">
          <span className="font-display text-[17px] font-medium">{t('courtroom.memo.title')}</span>
          <span className="text-[12.5px] text-text-2">
            {t('courtroom.memo.body', {
              ticker: ticker ?? t('courtroom.memo.tickerFallback'),
            })}
          </span>
        </div>
      </div>
      <Link to={`/memo/${trialId}`} className="btn btn-primary">
        <BookIcon size={16} /> {t('courtroom.memo.cta')}
      </Link>
    </div>
  );
}

/* ---------------- trial_failed ---------------- */
function TrialErrorPanel({
  error,
  onRetry,
}: {
  error: { error_code: string; message: string; phase: string; agent_id?: string | null };
  onRetry: () => void;
}) {
  const labels = useLabels();
  const { t } = useLang();
  return (
    <section
      className="anim-scale mt-11 max-w-[620px] rounded-[14px] border border-[rgba(201,106,90,0.4)] bg-[linear-gradient(180deg,rgba(201,106,90,0.08),var(--bg-2))] px-8 py-8 text-center"
      role="alert"
    >
      <div className="mx-auto mb-4 grid size-[52px] place-items-center rounded-full border border-[rgba(201,106,90,0.4)] bg-[rgba(201,106,90,0.16)] text-prosecute-300">
        <AlertIcon size={22} />
      </div>
      <h2 className="mb-3 font-display text-2xl">{t('courtroom.error.title')}</h2>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="badge badge-prosecute font-mono">{error.error_code}</span>
        <span className="muted small">
          {renderRich(
            t('courtroom.error.phase', { phase: labels.phase[error.phase as Phase] ?? error.phase }),
          )}
          {error.agent_id ? t('courtroom.error.agent', { agent: error.agent_id }) : ''}
        </span>
      </div>
      <p className="mb-5 mt-3 text-text-1">
        {labels.error[error.error_code as TrialErrorCode] ?? error.error_code}: {error.message}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button className="btn btn-primary" onClick={onRetry}>
          <GavelIcon size={16} /> {t('courtroom.error.newTrial')}
        </button>
        <Link to="/journal" className={`btn btn-ghost ${FOCUS}`}>
          <BookIcon size={16} /> {t('courtroom.error.journal')}
        </Link>
      </div>
    </section>
  );
}

/* ---------------- skeleton koneksi ---------------- */
function ConnectingSkeleton() {
  const { t } = useLang();
  return (
    <div aria-hidden="false" role="status">
      <div className="mb-6 flex items-center gap-4">
        <Seal size={52}>
          <GavelIcon size={24} />
        </Seal>
        <div className="flex flex-col gap-2">
          <span className="skeleton block" style={{ width: 260, height: 20 }} />
          <span className="skeleton block" style={{ width: 340, height: 12 }} />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-[14px] min-[1100px]:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-[14px] border border-[#3a332a] bg-bg-2 p-4" style={{ height: 120 }}>
            <div className="flex items-center gap-2.5">
              <span className="skeleton block" style={{ width: 34, height: 34, borderRadius: 9 }} />
              <div className="flex flex-1 flex-col gap-2">
                <span className="skeleton block" style={{ width: '65%', height: 13 }} />
                <span className="skeleton block" style={{ width: '85%', height: 10 }} />
              </div>
            </div>
            <span className="skeleton mt-4 block" style={{ width: '100%', height: 10 }} />
            <span className="skeleton mt-2 block" style={{ width: '80%', height: 10 }} />
          </div>
        ))}
      </div>
      <div className={`${NOTICE} mt-5 text-[12.5px] text-text-2`}>
        <span className="status-dot working shrink-0" /> {t('courtroom.loading.connecting')}
      </div>
    </div>
  );
}

/* ikon analis dipetakan dari meta */
export const ANALYST_ICONS: Record<string, FC<{ size?: number; className?: string }>> = {
  fundamental: DatabaseIcon,
  price: ChartIcon,
  smartmoney: BuildingIcon,
  insider: FingerprintIcon,
  gorengan: ShieldAlertIcon,
  judge: GavelIcon,
  verdict: SparkIcon,
};