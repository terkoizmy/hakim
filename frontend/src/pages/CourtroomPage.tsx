import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTrialStream } from '../hooks/useTrialStream';
import {
  ERROR_LABEL,
  PHASE_LABEL,
  type AgentEvidencePayload,
  type DebateSide,
  type Phase,
} from '../types/contract';
import { ANALYST_META } from '../utils/analysts';
import { formatTime } from '../utils/format';
import { Markdown } from '../utils/md';
import { isMockMode } from '../api';
import type { AnalystUi, TrialUiState } from '../state/trialReducer';
import {
  AlertIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  BookIcon,
  BoltIcon,
  BuildingIcon,
  ChartIcon,
  CheckIcon,
  DatabaseIcon,
  FingerprintIcon,
  GavelIcon,
  LinkIcon,
  RadioIcon,
  RefreshIcon,
  ScaleIcon,
  ShieldAlertIcon,
  SparkIcon,
} from '../components/icons';

const PHASE_STEPS: { phase: Phase; key: Phase }[] = [
  { phase: 'evidence', key: 'evidence' },
  { phase: 'debate', key: 'debate' },
  { phase: 'verdict', key: 'verdict' },
];

/* ---- kelas bersama (setara primitif app.css ruang sidang) ---- */
const SEAL_BASE =
  'grid size-11 shrink-0 place-items-center rounded-md border shadow-brass';
const SEAL_TONE = {
  brass:
    'border-[rgba(217,180,109,0.42)] bg-[linear-gradient(160deg,rgba(217,180,109,0.2),rgba(217,180,109,0.04))] text-brass-300',
  done: 'border-[rgba(76,201,143,0.5)] bg-[rgba(76,201,143,0.1)] text-defend-300',
  error: 'border-[rgba(217,72,59,0.5)] bg-[rgba(217,72,59,0.1)] text-prosecute-300',
} as const;

const DECK_HEAD =
  'mb-4 flex flex-wrap items-baseline justify-between gap-4';
const ANALYST_GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4 min-[1100px]:grid-cols-5';

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

/** Segel 44px (setara .case-seal). */
function CaseSeal({ tone = 'brass', children }: { tone?: keyof typeof SEAL_TONE; children: ReactNode }) {
  return <span className={`${SEAL_BASE} ${SEAL_TONE[tone]}`}>{children}</span>;
}

export default function CourtroomPage() {
  const { trialId } = useParams<{ trialId: string }>();
  const stream = useTrialStream(trialId);
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

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

  function skipToMemo() {
    if (stream.memo) {
      navigate(`/memo/${trialId}`);
      return;
    }
    const el = document.getElementById('verdict-anchor');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="pt-6 pb-18">
      {/* Kepala perkara */}
      <div className="container">
        <div className="card anim-in flex flex-wrap items-center justify-between gap-5 px-6 py-5">
          <div className="flex min-w-[260px] items-center gap-4">
            <CaseSeal tone={stream.terminal ? 'done' : stream.error ? 'error' : 'brass'}>
              {stream.error ? <AlertIcon size={18} /> : <GavelIcon size={18} />}
            </CaseSeal>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-[26px] tracking-[0.12em]">{ticker ?? '…'}</h1>
                <span className="badge badge-brass">{company ?? 'Memuat perkara…'}</span>
                {isMockMode && <span className="badge badge-neutral">fixture</span>}
              </div>
              <div className="muted small mt-[3px]">
                {stream.trial ? (
                  <>
                    Perkara No. <span className="font-mono">{stream.trial?.trial_id}</span> &middot; komite:{' '}
                    <span className="font-mono">{stream.trial?.models.analyst}</span> ·{' '}
                    <span className="font-mono">{stream.trial?.models.debate}</span> ·{' '}
                    <span className="font-mono">{stream.trial?.models.judge}</span>
                  </>
                ) : (
                  'Menghubungi ruang sidang…'
                )}
              </div>
            </div>
          </div>

          <div className="ml-auto w-full max-[980px]:ml-0">
            <div className="flex gap-6 max-[980px]:justify-start max-[640px]:gap-4">
              <Stat label="Bukti" value={String(evidenceTotal)} />
              <Stat label="Analis" value={`${stream.completedCount}/5`} />
              <Stat
                label="Data"
                value={`${stream.toolCallsByCache.hit}H/${stream.toolCallsByCache.miss}M`}
              />
              <Stat label="Durasi" value={mmss(elapsed)} mono />
            </div>
          </div>
        </div>

        <PhaseStepper phase={stream.phase} round={stream.round} terminal={stream.terminal} error={stream.error != null} />

        {stream.reconnecting && (
          <div
            className="anim-fade my-4 flex items-center gap-2.5 rounded-md border border-[rgba(216,167,92,0.34)] bg-[rgba(216,167,92,0.1)] px-4 py-2.5 text-[13.5px] text-brass-200"
            role="status"
          >
            <RefreshIcon size={16} className="animate-spin-slow" />
            <span>
              Koneksi sidang terputus — mencoba menyambungkan kembali
              <Dots />
            </span>
          </div>
        )}
      </div>

      <div className="container mt-5">
        {stream.error ? (
          <TrialErrorPanel error={stream.error} onRetry={() => navigate('/')} />
        ) : (
          <>
            <AnalystDeck state={stream} />
            {(stream.debate.length > 0 || stream.phase === 'debate' || stream.phase === 'verdict') && (
              <DebatePanel debate={stream.debate} rounds={stream.roundsSeen} state={stream} phase={stream.phase} />
            )}
            {stream.memoText && <VerdictPanel stream={stream} />}
            {stream.memo && <MemoReadyBanner trialId={trialId!} />}
            {!stream.trial && <ConnectingSkeleton />}
          </>
        )}
      </div>

      {/* Pintu keluar: penonton tidak boleh terjebak menonton */}
      {!stream.memo && !stream.error && stream.trial && (
        <button
          type="button"
          className="fixed bottom-[22px] right-[22px] z-50 inline-flex cursor-pointer items-center gap-2 rounded-pill border border-[rgba(217,180,109,0.42)] bg-[rgba(20,24,30,0.88)] px-4 py-2.5 text-[13px] font-semibold text-brass-200 shadow-2 backdrop-blur-[10px] transition-[border-color,background,transform] duration-[160ms] hover:-translate-y-px hover:border-brass-300 hover:bg-[rgba(30,35,43,0.94)]"
          onClick={skipToMemo}
          title={stream.memoText ? 'Lompat ke putusan yang sedang diketik' : 'Putusan belum dimulai — sidang masih berjalan'}
        >
          <BookIcon size={15} /> Skip ke Memo
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

/* ---------------- stat kecil ---------------- */
function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col items-end gap-[1px]">
      <span className="text-[10.5px] uppercase tracking-[0.08em] text-text-3">{label}</span>
      <span className={`font-mono text-base font-semibold text-text-0 ${mono ? '' : ''}`}>{value}</span>
    </div>
  );
}

function mmss(t: number) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ---------------- stepper fase ---------------- */
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
  const phaseIndex = phase ? PHASE_STEPS.findIndex((s) => s.phase === phase) : -1;

  return (
    <div
      className="my-6 flex items-center gap-1.5 overflow-x-auto rounded-lg border border-line-1 bg-bg-2 px-3.5 py-2.5"
      aria-label="Fase sidang"
    >
      {PHASE_STEPS.map((step, i) => {
        const isDone = (phaseIndex > i || (terminal && !error)) && phase !== null;
        const isActive = phase === step.phase && !terminal;
        const stepRound = step.phase === 'debate' && isActive ? ` · R ${round ?? 1}` : '';
        const icTone = isDone
          ? 'border-[rgba(76,201,143,0.45)] bg-[rgba(76,201,143,0.12)] text-defend-300'
          : isActive
            ? error
              ? 'text-prosecute-300'
              : 'border-transparent bg-[linear-gradient(180deg,var(--brass-300),var(--brass-500))] text-[#1c1407] shadow-[0_0_0_4px_var(--brass-glow-soft)]'
            : '';
        const labelTone = isDone
          ? 'text-text-1'
          : isActive
            ? error
              ? 'text-prosecute-300'
              : 'text-brass-200'
            : 'text-text-3';
        return (
          <div key={step.phase} className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5">
            <div
              className={`grid size-[30px] shrink-0 place-items-center rounded-pill border border-line-1 bg-bg-3 transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${icTone}`}
            >
              {isDone ? <CheckIcon size={15} /> : <PhaseIcon phase={step.phase} />}
            </div>
            <div className={`whitespace-nowrap text-[13px] font-semibold transition-colors duration-[280ms] ${labelTone}`}>
              {PHASE_LABEL[step.phase]}
              <span className="font-mono font-semibold text-brass-400">{stepRound}</span>
            </div>
            {i < PHASE_STEPS.length - 1 && (
              <div className="h-0.5 w-[46px] shrink-0 overflow-hidden rounded-[2px] bg-line-1 max-[860px]:hidden">
                <div
                  className={`h-full w-full origin-left bg-brass-500 transition-transform duration-[520ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isDone ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PhaseIcon({ phase }: { phase: Phase }) {
  switch (phase) {
    case 'evidence':
      return <DatabaseIcon size={15} />;
    case 'debate':
      return <ScaleIcon size={15} />;
    case 'verdict':
      return <GavelIcon size={15} />;
  }
}

/* ---------------- dek analis ---------------- */
function AnalystDeck({ state }: { state: TrialUiState }) {
  return (
    <section className="mb-8">
      <div className={DECK_HEAD}>
        <h2 className="section-title">Panel Analis</h2>
        <span className="muted small">Bukti dari data Sectors — tiap angka bersitasi</span>
      </div>
      <div className={ANALYST_GRID}>
        {ANALYST_META.map((meta, i) => (
          <AnalystCard key={meta.id} meta={meta} analyst={state.analysts[meta.id]} index={i} />
        ))}
      </div>
    </section>
  );
}

function AnalystCard({ meta, analyst, index }: { meta: (typeof ANALYST_META)[number]; analyst?: AnalystUi; index: number }) {
  if (!analyst) return null;
  const status = analyst.status;
  const Icon = ANALYST_ICONS[meta.id];
  const evShown = analyst.evidence.slice(0, 6);

  const cardTone =
    status === 'working'
      ? 'animate-acard-pulse border-[color:rgba(var(--agent),0.5)]'
      : status === 'done'
        ? 'border-[rgba(76,201,143,0.3)] before:opacity-55'
        : 'border-dashed opacity-60 before:opacity-25';

  const avatarTone =
    status === 'working'
      ? 'shadow-[0_0_0_4px_var(--brass-glow-soft)] after:animate-pulse-dot after:bg-brass-400'
      : status === 'done'
        ? 'shadow-[0_0_0_4px_rgba(76,201,143,0.1)] after:bg-defend-400'
        : '';

  return (
    <article
      className={`card card-pad anim-in relative flex flex-col gap-3 overflow-hidden before:pointer-events-none before:absolute before:left-4 before:right-4 before:top-0 before:h-0.5 before:rounded-b-[2px] before:bg-[linear-gradient(90deg,rgba(var(--agent),0.65),rgba(var(--agent),0.08))] before:content-[''] before:opacity-90 transition-[border-color,box-shadow,transform,opacity] duration-[280ms] ${cardTone}`}
      data-agent={meta.id}
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      <header className="flex items-center gap-3">
        <span
          className={`relative grid size-11 shrink-0 place-items-center rounded-md border border-[color:rgba(var(--agent),0.34)] bg-[rgba(var(--agent),0.12)] font-mono text-[13px] font-bold text-[color:rgba(var(--agent),1)] transition-shadow duration-[280ms] after:pointer-events-none after:absolute after:-right-[3px] after:-top-[3px] after:size-2.5 after:rounded-full after:border-2 after:border-bg-1 after:bg-text-3 after:content-[''] ${avatarTone}`}
        >
          {status === 'queued' ? <span className="font-bold">?</span> : Icon ? <Icon size={20} /> : meta.monogram}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-[15px] font-semibold leading-[1.25]">{analyst.displayName}</h3>
          <p className="tiny muted">{meta.tagline}</p>
        </div>
      </header>

      {status === 'queued' && (
        <div className="flex flex-1 flex-col gap-3">
          <div className="tiny muted flex items-center gap-2 pb-1.5">
            <span className="status-dot idle" /> Analis menunggu giliran sidang.
          </div>
        </div>
      )}

      {status === 'working' && (
        <div className="flex flex-1 flex-col gap-3">
          <div className="tiny flex items-center justify-between gap-2">
            <span className="inline-flex items-center font-semibold text-brass-300">
              Menyelidiki data
              <Dots />
            </span>
            <span className="font-mono text-[11px] text-text-3">via {analyst.model}</span>
          </div>
          <div
            className="relative -mt-1 mb-0.5 h-[3px] overflow-hidden rounded-[2px] bg-[color:rgba(var(--agent),0.14)] after:absolute after:inset-y-0 after:left-0 after:w-[42%] after:animate-livebar after:rounded-[2px] after:bg-[linear-gradient(90deg,transparent,rgba(var(--agent),0.8),transparent)] after:content-['']"
            aria-hidden="true"
          />
          {analyst.toolCalls.length > 0 && (
            <div className="flex flex-col gap-[5px]">
              {analyst.toolCalls.map((tc, i) => (
                <div
                  key={i}
                  className="anim-fade flex items-center gap-2 rounded-sm border border-line-0 bg-bg-3 px-[9px] py-[5px] text-[11.5px]"
                  style={{ animationDelay: `${Math.min(i * 90, 400)}ms` }}
                >
                  <span
                    className="size-[5px] shrink-0 rounded-pill bg-[color:rgba(var(--agent),0.8)]"
                    aria-hidden="true"
                  />
                  <span className="font-mono flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-text-1">
                    {tc.tool}
                  </span>
                  <CacheBadge cache={tc.cache} />
                </div>
              ))}
            </div>
          )}
          {evShown.length > 0 && (
            <div className="flex flex-col gap-2">
              {evShown.map((ev) => (
                <EvidenceChip key={ev.evidence_id} evidence={ev} />
              ))}
              {analyst.evidence.length > 3 && (
                <span className="tiny muted block px-0.5 pt-0.5">+{analyst.evidence.length - 3} bukti lainnya</span>
              )}
            </div>
          )}
        </div>
      )}

      {status === 'done' && (
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-defend-300">
              <CheckIcon size={13} /> Ringkasan
              <span className="font-mono text-[11px] font-medium tracking-[0.02em] text-text-2">
                {analyst.evidence.length} bukti
              </span>
            </span>
            {analyst.dataRichness && <RichBadge richness={analyst.dataRichness} />}
          </div>
          <div className="flex flex-col gap-2">
            {evShown.map((ev) => (
              <EvidenceChip key={ev.evidence_id} evidence={ev} />
            ))}
            {analyst.evidence.length > 3 && (
              <span className="tiny muted block px-0.5 pt-0.5">+{analyst.evidence.length - 3} bukti lainnya</span>
            )}
          </div>
          {analyst.summaryMd && (
            <details className="group">
              <summary className="tiny inline-flex cursor-pointer select-none list-none items-center gap-1.5 rounded-pill border border-line-0 px-[11px] py-[5px] font-medium text-text-2 transition-colors duration-[160ms] hover:border-[rgba(217,180,109,0.35)] hover:bg-[rgba(217,180,109,0.06)] hover:text-brass-200 [&::-webkit-details-marker]:hidden">
                Baca kesimpulan{' '}
                <ArrowDownIcon
                  size={11}
                  className="transition-transform duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-180"
                />
              </summary>
              <Markdown source={analyst.summaryMd} className="md md-sm mt-2 border-t border-line-0 pt-2" />
            </details>
          )}
        </div>
      )}
    </article>
  );
}

export function RichBadge({ richness }: { richness: 'A' | 'B' | 'C' }) {
  const label = richness === 'A' ? 'Data kaya' : richness === 'B' ? 'Data cukup' : 'Data minim';
  return (
    <span className="badge badge-rich" data-rich={richness} title={`Kekayaan informasi: ${label}`}>
      Info {richness}
    </span>
  );
}

export function CacheBadge({ cache }: { cache: 'hit' | 'miss' }) {
  return cache === 'hit' ? (
    <span className="badge badge-cache-hit"><BoltIcon size={11} /> cache&thinsp;hit</span>
  ) : (
    <span className="badge badge-cache-miss"><RefreshIcon size={11} /> fresh</span>
  );
}

/** Chip bukti: ringkas satu baris (EV_1 + judul); diklik → detail + pill fakta terbuka. */
function EvidenceChip({ evidence }: { evidence: AgentEvidencePayload }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className={`anim-scale block w-full cursor-pointer rounded-sm border border-line-0 border-l-2 border-l-[color:rgba(var(--agent),0.45)] bg-bg-2 px-[9px] py-1.5 text-left transition-colors duration-[160ms] ${
        open
          ? 'border-l-[color:rgba(var(--agent),0.9)] bg-bg-3'
          : 'hover:border-line-1 hover:border-l-[color:rgba(var(--agent),0.9)] hover:bg-bg-3'
      }`}
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      title={open ? 'Tutup detail bukti' : 'Buka detail bukti'}
    >
      <span className="flex min-w-0 items-center gap-[7px]">
        <LinkIcon size={11} className="shrink-0 text-[color:rgba(var(--agent),1)]" />
        <span className="font-mono shrink-0 text-[10.5px] font-semibold tracking-[0.05em] text-[color:rgba(var(--agent),1)]">
          {evidence.evidence_id}
        </span>
        <span
          className={`min-w-0 flex-1 overflow-hidden text-ellipsis text-xs leading-[1.4] text-text-0 ${
            open ? 'whitespace-normal' : 'whitespace-nowrap'
          }`}
        >
          {evidence.headline}
        </span>
        <ArrowDownIcon
          size={11}
          className={`shrink-0 text-text-2 transition-transform duration-[160ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? 'rotate-180' : ''
          }`}
        />
      </span>
      {open && (
        <span className="mt-[7px] flex flex-wrap gap-[5px]">
          {evidence.facts.map((f) => (
            <span
              key={f.label}
              className="rounded-pill border border-line-0 bg-bg-0 px-[7px] py-0.5 font-mono text-[10.5px] text-text-1"
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
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString('id-ID')} ${unit ?? ''}`.trim();
}

/* ---------------- panel debat ---------------- */
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
  return (
    <section className="mb-8">
      <div className={DECK_HEAD}>
        <h2 className="section-title">Perdebatan — Jaksa vs Pembela</h2>
        <span className="muted small">Dua ronde singkat, bukti yang sama</span>
      </div>

      <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <div className="flex items-center gap-3 rounded-md border border-[rgba(217,72,59,0.32)] bg-[linear-gradient(160deg,var(--prosecute-950),rgba(217,72,59,0.06))] px-4 py-2.5 text-prosecute-300">
          <ScaleIcon size={16} />
          <div>
            <b className="block text-[14.5px]">Jaksa</b>
            <span className="tiny muted block">tesis bear</span>
          </div>
        </div>
        <div className="tiny mono self-center rounded-pill border border-line-1 bg-bg-3 px-[11px] py-1.5 font-bold text-text-3">
          VS
        </div>
        <div className="flex items-center gap-3 rounded-md border border-[rgba(47,168,119,0.32)] bg-[linear-gradient(160deg,var(--defend-950),rgba(47,168,119,0.06))] px-4 py-2.5 text-defend-300">
          <div>
            <b className="block text-right text-[14.5px]">Pembela</b>
            <span className="tiny muted block text-right">tesis bull</span>
          </div>
          <ScaleIcon size={16} />
        </div>
      </div>

      {debate.length === 0 && phase === 'debate' && (
        <div className="flex items-center gap-2.5 py-4 text-[13.5px] text-text-1">
          <span className="status-dot working" /> Jaksa sedang menyiapkan dakwaan putaran pertama…
        </div>
      )}

      <div className="flex flex-col gap-6">
        {rounds.map((round) => (
          <RoundBlock key={round} round={round} debate={debate} state={state} />
        ))}
      </div>
    </section>
  );
}

function RoundBlock({
  round,
  debate,
  state,
}: {
  round: number;
  debate: TrialUiState['debate'];
  state: TrialUiState;
}) {
  const prosecution = debate.find((d) => d.round === round && d.side === 'prosecution');
  const defense = debate.find((d) => d.round === round && d.side === 'defense');

  return (
    <div>
      <div className="anim-fade mb-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-line-1" />
        <span className="mono rounded-pill border border-[rgba(217,180,109,0.32)] bg-[rgba(217,180,109,0.07)] px-3.5 py-[5px] text-[11px] font-bold tracking-[0.14em] text-brass-200">
          RONDE {round}
        </span>
        <span className="h-px flex-1 bg-line-1" />
      </div>
      <div className="flex flex-col gap-4">
        <UtteranceCard side="prosecution" utterance={prosecution} state={state} />
        <UtteranceCard side="defense" utterance={defense} state={state} />
      </div>
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

const SPEAKER_LABEL: Record<DebateSide, string> = {
  prosecution: 'JAKSA · bear',
  defense: 'PEMBELA · bull',
};

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
  if (!utterance) {
    return (
      <div className={`max-w-[min(94%,820px)] ${isDefense ? 'ml-auto max-[860px]:ml-0 max-[860px]:max-w-full' : ''}`}>
        <div className="inline-flex items-center gap-2 rounded-md border border-dashed border-line-2 bg-bg-1 px-4 py-3 text-[12.5px] text-text-3">
          {isDefense ? 'Pembela sedang menyiapkan pembelaan' : 'Jaksa sedang menyiapkan dakwaan'}
          <Dots />
        </div>
      </div>
    );
  }

  return (
    <div className={`anim-in max-w-[min(94%,820px)] ${isDefense ? 'ml-auto max-[860px]:ml-0 max-[860px]:max-w-full' : ''}`}>
      <article
        className={`anim-scale rounded-lg border border-line-1 bg-[linear-gradient(180deg,var(--bg-3),var(--bg-2))] px-6 py-5 ${
          isDefense
            ? 'border-r-[3px] border-r-defend-500 max-[860px]:border-l-[3px] max-[860px]:border-l-defend-500'
            : 'border-l-[3px] border-l-prosecute-500'
        }`}
      >
        <div className={`mb-3 flex items-center gap-3 ${isDefense ? 'justify-end max-[860px]:justify-start' : ''}`}>
          <span
            className={`whitespace-nowrap rounded-pill px-[11px] py-1 text-[10.5px] font-bold tracking-[0.12em] ${
              isDefense
                ? 'border border-[rgba(47,168,119,0.38)] bg-[rgba(47,168,119,0.12)] text-defend-300'
                : 'border border-[rgba(217,72,59,0.38)] bg-[rgba(217,72,59,0.12)] text-prosecute-300'
            }`}
          >
            {SPEAKER_LABEL[side]}
          </span>
          {utterance.rebuts && <span className="tiny font-medium text-text-3">↩ balasan</span>}
          <span className="font-mono text-[11px] text-text-3">{formatTime(utterance.ts)}</span>
        </div>
        <header className="mb-2 flex items-baseline gap-3">
          <h4 className={`font-display text-[17px] font-semibold leading-[1.3] ${isDefense ? 'text-defend-100' : 'text-prosecute-100'}`}>
            {utterance.title}
          </h4>
        </header>
        <Markdown source={stripTitleEcho(utterance.title, utterance.argument_md)} className="md md-sm" />
        {utterance.cites.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {utterance.cites.map((c) => (
              <EvidenceRef key={c} evidenceId={c} state={state} />
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

function EvidenceRef({ evidenceId, state }: { evidenceId: string; state: TrialUiState }) {
  const evidence = findEvidence(state, evidenceId);
  return evidence ? (
    <span className="badge badge-neutral font-mono" title={evidence.headline}>
      <LinkIcon size={11} /> {evidenceId}
    </span>
  ) : (
    <span className="badge badge-neutral font-mono"><LinkIcon size={11} /> {evidenceId}</span>
  );
}

export function findEvidence(state: TrialUiState, evidenceId: string): AgentEvidencePayload | undefined {
  for (const analyst of Object.values(state.analysts)) {
    const found = analyst.evidence.find((e) => e.evidence_id === evidenceId);
    if (found) return found;
  }
  return undefined;
}

/* ---------------- putusan (streaming hakim) ---------------- */
function VerdictPanel({ stream }: { stream: ReturnType<typeof useTrialStream> }) {
  const streaming = !stream.memo;
  return (
    <section
      id="verdict-anchor"
      className="card anim-in relative mb-8 rounded-lg border-[rgba(217,180,109,0.34)] px-8 py-8 shadow-[var(--shadow-2),inset_0_0_0_1px_rgba(217,180,109,0.05)] before:pointer-events-none before:absolute before:inset-0 before:rounded-lg before:bg-[radial-gradient(640px_220px_at_14%_0%,var(--brass-glow-soft),transparent_72%)] before:content-['']"
    >
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <CaseSeal>
          <GavelIcon size={16} />
        </CaseSeal>
        <div>
          <h2 className="section-title">Putusan Hakim Ketua</h2>
          <p className="tiny muted">Memorandum dirumuskan saat sidang berlangsung</p>
        </div>
        <span className={`badge ${streaming ? 'badge-brass' : 'badge-defend'}`}>
          {streaming ? <><RadioIcon size={11} /> sidang berlangsung</> : <><CheckIcon size={11} /> memorandum final</>}
        </span>
      </div>
      <div className="relative max-w-[760px]">
        <Markdown
          source={stream.memoText || ' '}
          className={`md md-sm text-[17px] leading-[1.8] ${streaming ? 'text-text-1' : ''}`}
        />
        {streaming && (
          <span className="ml-0.5 inline-block h-[1.05em] w-0.5 animate-blink bg-brass-300 align-[-3px]" />
        )}
      </div>
    </section>
  );
}

/* ---------------- memo siap → CTA ---------------- */
function MemoReadyBanner({ trialId }: { trialId: string }) {
  return (
    <div
      className="anim-scale flex flex-wrap items-center gap-5 rounded-xl border border-[rgba(217,180,109,0.4)] bg-[linear-gradient(160deg,rgba(217,180,109,0.14),rgba(217,180,109,0.03))] px-6 py-6 shadow-brass"
      role="status"
    >
      <div className="grid size-[54px] place-items-center rounded-md bg-[linear-gradient(180deg,var(--brass-300),var(--brass-500))] text-[#1c1407]">
        <BookIcon size={22} />
      </div>
      <div className="min-w-[220px] flex-1">
        <h2 className="mb-1 text-[22px]">Memorandum sidang telah final.</h2>
        <p className="muted small">Ringkasan eksekutif, fakta kunci, dua tesis, dan pertanyaan verifikasi — lengkap dengan sitasi data.</p>
      </div>
      <Link to={`/memo/${trialId}`} className="btn btn-primary btn-lg">
        Baca Memorandum <ArrowRightIcon size={18} />
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
  return (
    <section
      className="card anim-scale mx-auto my-8 max-w-[620px] rounded-lg border-[rgba(217,72,59,0.4)] bg-[linear-gradient(180deg,rgba(217,72,59,0.08),var(--bg-2))] px-8 py-8 text-center"
      role="alert"
    >
      <div className="mx-auto mb-4 grid size-[52px] place-items-center rounded-pill border border-[rgba(217,72,59,0.4)] bg-[rgba(217,72,59,0.16)] text-prosecute-300">
        <AlertIcon size={22} />
      </div>
      <h2 className="mb-3 text-2xl">Sidang gagal berjalan</h2>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="badge badge-prosecute font-mono">{error.error_code}</span>
        <span className="muted small">
          pada fase <b>{PHASE_LABEL[error.phase as Phase] ?? error.phase}</b>
          {error.agent_id ? ` · agen ${error.agent_id}` : ''}
        </span>
      </div>
      <p className="mb-5 mt-3 text-text-1">
        {ERROR_LABEL[error.error_code as keyof typeof ERROR_LABEL] ?? error.error_code}: {error.message}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button className="btn btn-primary" onClick={onRetry}>
          <GavelIcon size={16} /> Sidang Baru
        </button>
        <Link to="/journal" className="btn btn-ghost"><BookIcon size={16} /> Jurnal Sidang</Link>
      </div>
    </section>
  );
}

/* ---------------- skeleton koneksi ---------------- */
function ConnectingSkeleton() {
  return (
    <div aria-hidden="false" role="status">
      <div className="mb-6 flex items-center gap-4">
        <CaseSeal>
          <GavelIcon size={18} />
        </CaseSeal>
        <div className="flex flex-col gap-2">
          <span className="skeleton block" style={{ width: 260, height: 20 }} />
          <span className="skeleton block" style={{ width: 340, height: 12 }} />
        </div>
      </div>
      <div className={ANALYST_GRID}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card card-pad" style={{ height: 120 }}>
            <div className="flex items-center gap-3">
              <span className="skeleton block" style={{ width: 40, height: 40, borderRadius: 12 }} />
              <div className="flex flex-1 flex-col gap-2">
                <span className="skeleton block" style={{ width: '65%', height: 14 }} />
                <span className="skeleton block" style={{ width: '85%', height: 10 }} />
              </div>
            </div>
            <span className="skeleton block" style={{ width: '100%', height: 10, marginTop: 16 }} />
            <span className="skeleton block" style={{ width: '80%', height: 10, marginTop: 8 }} />
          </div>
        ))}
      </div>
      <div className="muted small mt-5 flex items-center gap-2.5">
        <span className="status-dot working" /> Menghubungi ruang sidang &amp; menunggu para analis mengambil tempat…
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