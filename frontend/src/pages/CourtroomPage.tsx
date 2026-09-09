import { Fragment, useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
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
  RadioIcon,
  RefreshIcon,
  ShieldAlertIcon,
  SparkIcon,
} from '../components/icons';

const PHASE_STEPS: { phase: Phase }[] = [
  { phase: 'evidence' },
  { phase: 'debate' },
  { phase: 'verdict' },
];

/* ---- segel lingkaran (setara .case-seal mock) ---- */
const SEAL_BASE = 'grid size-11 shrink-0 place-items-center rounded-full border';
const SEAL_TONE = {
  brass: 'border-[rgba(201,162,74,0.4)] bg-[rgba(201,162,74,0.08)] text-brass-300',
  done: 'border-[rgba(127,176,105,0.45)] bg-[rgba(127,176,105,0.1)] text-defend-300',
  error: 'border-[rgba(201,106,90,0.45)] bg-[rgba(201,106,90,0.1)] text-prosecute-300',
} as const;

/** Kepala seksi: kicker mono + judul (setara .sec-head mock). */
function SecHead({ kicker, title, aside }: { kicker: string; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-brass-500">{kicker}</div>
        <h2 className="text-[19px] font-semibold leading-tight">{title}</h2>
      </div>
      {aside && <div className="muted small pb-0.5">{aside}</div>}
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

/** Segel 44px lingkaran. */
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
      {/* Case bar: crumb + identitas perkara + strip statistik terbagi */}
      <div className="container">
        <div className="crumb mb-5 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.08em] text-text-3">
          <Link to="/dashboard" className="text-brass-400 transition-colors hover:text-brass-200">Daftar Perkara</Link>
          <span className="text-text-3">/</span>
          <Link to={`/ticker/${ticker ?? ''}`} className="text-brass-400 transition-colors hover:text-brass-200">{ticker ?? '…'}</Link>
          <span className="text-text-3">/</span>
          <span className="text-text-2">Sidang Berlangsung</span>
        </div>

        <div className="anim-in flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="flex min-w-[280px] items-center gap-4">
            <CaseSeal tone={stream.terminal ? 'done' : stream.error ? 'error' : 'brass'}>
              {stream.error ? <AlertIcon size={18} /> : <GavelIcon size={18} />}
            </CaseSeal>
            <div>
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
                <h1 className="font-mono text-[clamp(30px,4.5vw,44px)] font-semibold leading-none tracking-[0.02em] text-text-0">
                  {ticker ?? '…'}
                  {ticker && <span className="text-brass-500">.</span>}
                </h1>
                {company && <span className="badge badge-brass">{company}</span>}
                {isMockMode && <span className="badge badge-neutral">fixture</span>}
                {!stream.error && stream.trial && !stream.terminal && (
                  <span className="inline-flex items-center gap-1.5 rounded-pill border border-[rgba(201,162,74,0.32)] bg-[rgba(201,162,74,0.07)] px-2.5 py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-brass-300">
                    <span className="size-[6px] animate-pulse-dot rounded-full bg-brass-400" /> live
                  </span>
                )}
              </div>
              <div
                className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-text-3"
                title={stream.trial ? `Komite: ${stream.trial.models.analyst} · ${stream.trial.models.debate} · ${stream.trial.models.judge}` : undefined}
              >
                {stream.trial ? (
                  <>
                    Perkara No. <span className="text-text-2">{stream.trial.trial_id}</span>
                    <span className="mx-2 text-line-2">·</span>
                    Komite {company ? company.split(' ')[0] : ticker}
                  </>
                ) : (
                  'Menghubungi ruang sidang…'
                )}
              </div>
            </div>
          </div>

          <div className="flex divide-x divide-line-1 overflow-hidden rounded-[10px] border border-line-1 bg-bg-2/70">
            <Stat label="Bukti" value={String(evidenceTotal)} />
            <Stat label="Analis" value={`${stream.completedCount}/5`} />
            <Stat
              label="Data"
              value={
                <>
                  <span className="text-[color:var(--cache-hit)]">{stream.toolCallsByCache.hit}</span>
                  <span className="mx-0.5 text-text-3">/</span>
                  <span className="text-[color:var(--cache-miss)]">{stream.toolCallsByCache.miss}</span>
                </>
              }
            />
            <Stat label="Durasi" value={mmss(elapsed)} />
          </div>
        </div>

        <PhaseStepper phase={stream.phase} round={stream.round} terminal={stream.terminal} error={stream.error != null} />

        {stream.reconnecting && (
          <div
            className="anim-fade my-4 flex items-center gap-2.5 rounded-[10px] border border-[rgba(201,162,74,0.34)] bg-[rgba(201,162,74,0.08)] px-4 py-2.5 text-[13.5px] text-brass-200"
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

      <div className="container mt-4">
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
          className="fixed bottom-[22px] right-[22px] z-50 inline-flex cursor-pointer items-center gap-2 rounded-pill border border-[rgba(201,162,74,0.42)] bg-[rgba(20,18,15,0.88)] px-4 py-2.5 text-[13px] font-semibold text-brass-200 shadow-2 backdrop-blur-[10px] transition-[border-color,background,transform] duration-[160ms] hover:-translate-y-px hover:border-brass-300 hover:bg-[rgba(38,33,26,0.94)]"
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

/* ---------------- strip statistik (sel terbagi, setara .stat mock) ---------------- */
function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-[84px] flex-col gap-[1px] px-4 py-2.5">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-3">{label}</span>
      <span className="font-mono text-[20px] font-semibold leading-tight text-text-0">{value}</span>
    </div>
  );
}

function mmss(t: number) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ---------------- stepper fase: node bernomor + rel (setara .stepper mock) ---------------- */
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
  const showRound = phase === 'debate' && !terminal;

  return (
    <div className="my-7 flex items-center gap-2.5 overflow-x-auto" aria-label="Fase sidang">
      {PHASE_STEPS.map((step, i) => {
        const isDone = (phaseIndex > i || (terminal && !error)) && phase !== null;
        const isActive = phase === step.phase && !terminal;
        const nodeTone = isDone
          ? 'border-[rgba(127,176,105,0.45)] bg-[rgba(127,176,105,0.12)] text-defend-300'
          : isActive
            ? error
              ? 'border-[rgba(201,106,90,0.5)] bg-[rgba(201,106,90,0.12)] text-prosecute-300'
              : 'border-transparent bg-[linear-gradient(180deg,var(--brass-300),var(--brass-500))] text-[#1c1407] shadow-[0_0_0_4px_var(--brass-glow-soft)]'
            : 'border-line-2 bg-bg-2 text-text-3';
        const labelTone = isDone
          ? 'text-text-2'
          : isActive
            ? error
              ? 'text-prosecute-300'
              : 'text-brass-200'
            : 'text-text-3';
        return (
          <Fragment key={step.phase}>
            <div className="flex shrink-0 items-center gap-2.5">
              <span
                className={`grid size-6 place-items-center rounded-pill border font-mono text-[11px] font-bold transition-all duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${nodeTone}`}
              >
                {i + 1}
              </span>
              <span className={`whitespace-nowrap text-[13px] font-semibold transition-colors duration-[280ms] ${labelTone}`}>
                {PHASE_LABEL[step.phase]}
              </span>
              {step.phase === 'debate' && (showRound || isActive) && (
                <span className="whitespace-nowrap rounded-pill border border-line-1 bg-bg-2 px-2.5 py-[3px] font-mono text-[10.5px] font-semibold tracking-[0.1em] text-brass-300">
                  RONDE {round ?? 1}/2
                </span>
              )}
            </div>
            {i < PHASE_STEPS.length - 1 && (
              <div className="h-[2px] w-[64px] shrink-0 overflow-hidden rounded-[2px] bg-line-1 min-[720px]:w-[92px]">
                <div
                  className={`h-full w-full origin-left bg-brass-500 transition-transform duration-[520ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isDone ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ---------------- dek analis ---------------- */
function AnalystDeck({ state }: { state: TrialUiState }) {
  return (
    <section className="mb-9">
      <SecHead
        kicker="Pemeriksaan bukti"
        title="Panel Analis"
        aside="Bukti dari data Sectors — tiap angka bersitasi"
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4 min-[1100px]:grid-cols-5">
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
      ? 'animate-acard-pulse border-[color:rgba(var(--agent),0.4)]'
      : status === 'done'
        ? 'border-line-1'
        : 'border-dashed border-line-2 opacity-60';

  return (
    <article
      className={`anim-in relative flex flex-col gap-3 overflow-hidden rounded-[14px] border border-t-2 bg-bg-2 p-3.5 transition-[border-color,box-shadow,transform,opacity] duration-[280ms] ${cardTone}`}
      data-agent={meta.id}
      style={{
        animationDelay: `${Math.min(index * 60, 300)}ms`,
        borderTopColor: 'rgba(var(--agent),0.65)',
      }}
    >
      <header className="flex items-center gap-2.5">
        <span
          className="grid size-[34px] shrink-0 place-items-center rounded-[9px] text-[#14120f] transition-shadow duration-[280ms]"
          style={{
            background: 'rgba(var(--agent),1)',
            boxShadow: status === 'working' ? '0 0 0 4px rgba(var(--agent),0.14)' : 'none',
          }}
        >
          {status === 'queued' ? <span className="font-bold">?</span> : Icon ? <Icon size={18} /> : meta.monogram}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14.5px] font-semibold leading-[1.25]">{analyst.displayName}</h3>
          <p className="tiny muted truncate">{meta.tagline}</p>
        </div>
        <span
          className={`status-dot !size-[9px] ${
            status === 'working' ? 'working' : status === 'done' ? 'done' : 'idle'
          }`}
          aria-hidden="true"
        />
      </header>

      {status === 'queued' && (
        <div className="flex flex-1 flex-col gap-3">
          <div className="tiny muted flex items-center gap-2 pb-1">Analis menunggu giliran sidang.</div>
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
            <div className="flex flex-col gap-1.5">
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
        <div className="flex flex-1 flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] font-semibold text-defend-300">
              <CheckIcon size={13} /> Ringkasan
              <span className="font-mono text-[11px] font-medium tracking-[0.02em] text-text-2">
                {analyst.evidence.length} bukti
              </span>
            </span>
            {analyst.dataRichness && <RichBadge richness={analyst.dataRichness} />}
          </div>
          <div className="flex flex-col gap-1.5">
            {evShown.map((ev) => (
              <EvidenceChip key={ev.evidence_id} evidence={ev} />
            ))}
            {analyst.evidence.length > 3 && (
              <span className="tiny muted block px-0.5 pt-0.5">+{analyst.evidence.length - 3} bukti lainnya</span>
            )}
          </div>
          {analyst.summaryMd && (
            <details className="group">
              <summary className="tiny inline-flex cursor-pointer select-none list-none items-center gap-1.5 rounded-pill border border-line-0 px-[11px] py-[5px] font-medium text-text-2 transition-colors duration-[160ms] hover:border-[rgba(201,162,74,0.35)] hover:bg-[rgba(201,162,74,0.06)] hover:text-brass-200 [&::-webkit-details-marker]:hidden">
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

/** Baris bukti (setara .ev mock): id aksen + judul ellipsis + pil hitungan; diklik → pil fakta. */
function EvidenceChip({ evidence }: { evidence: AgentEvidencePayload }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className={`anim-scale block w-full cursor-pointer rounded-sm border border-line-0 bg-bg-3 px-[9px] py-[7px] text-left transition-colors duration-[160ms] hover:border-line-1 hover:bg-bg-4 ${
        open ? 'border-line-1 bg-bg-4' : ''
      }`}
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      title={open ? 'Tutup detail bukti' : 'Buka detail bukti'}
    >
      <span className="flex min-w-0 items-center gap-[7px]">
        <span className="font-mono shrink-0 text-[10.5px] font-semibold tracking-[0.05em] text-[color:rgba(var(--agent),1)]">
          {evidence.evidence_id}
        </span>
        <span
          className={`min-w-0 flex-1 overflow-hidden text-ellipsis text-xs leading-[1.4] text-text-1 ${
            open ? 'whitespace-normal' : 'whitespace-nowrap'
          }`}
        >
          {evidence.headline}
        </span>
        <span
          className="shrink-0 rounded-pill border px-[7px] py-[1px] font-mono text-[10px] text-[color:rgba(var(--agent),1)]"
          style={{ borderColor: 'rgba(var(--agent),0.35)', background: 'rgba(var(--agent),0.08)' }}
        >
          {evidence.facts.length}
        </span>
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
  return (
    <section className="mb-9">
      <SecHead kicker="Persidangan" title="Jaksa vs Pembela" aside="Dua ronde singkat, bukti yang sama" />

      {debate.length === 0 && phase === 'debate' && (
        <div className="flex items-center gap-2.5 py-4 text-[13.5px] text-text-1">
          <span className="status-dot working" /> Jaksa sedang menyiapkan dakwaan putaran pertama…
        </div>
      )}

      <div className="relative grid grid-cols-1 gap-5 min-[900px]:grid-cols-2">
        <span className="absolute -top-[14px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-pill border border-[rgba(201,162,74,0.4)] bg-bg-1 px-4 py-1 font-mono text-[10.5px] font-bold tracking-[0.14em] text-brass-300">
          RONDE {rounds[rounds.length - 1] ?? 1}/2
        </span>
        <div className="flex flex-col gap-4 rounded-[14px] border border-line-1 border-t-2 border-t-prosecute-400 bg-bg-2 px-5 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <span className="font-display text-[17px] font-semibold text-prosecute-100">Jaksa</span>
            <span className="mono rounded-pill border border-[rgba(201,106,90,0.38)] bg-[rgba(201,106,90,0.1)] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.08em] text-prosecute-300">
              bear
            </span>
          </div>
          {rounds.map((round) => {
            const u = debate.find((d) => d.round === round && d.side === 'prosecution');
            return u ? <UtteranceCard key={round} side="prosecution" utterance={u} state={state} /> : null;
          })}
        </div>
        <div className="flex flex-col gap-4 rounded-[14px] border border-line-1 border-t-2 border-t-defend-400 bg-bg-2 px-5 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <span className="font-display text-[17px] font-semibold text-defend-100">Pembela</span>
            <span className="mono rounded-pill border border-[rgba(127,176,105,0.38)] bg-[rgba(127,176,105,0.1)] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.08em] text-defend-300">
              bull
            </span>
          </div>
          {rounds.map((round) => {
            const u = debate.find((d) => d.round === round && d.side === 'defense');
            return u ? <UtteranceCard key={round} side="defense" utterance={u} state={state} /> : null;
          })}
        </div>
      </div>
    </section>
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
  prosecution: 'JAKSA',
  defense: 'PEMBELA',
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
      <div className="inline-flex items-center gap-2 rounded-md border border-dashed border-line-2 px-4 py-3 text-[12.5px] text-text-3">
        {isDefense ? 'Pembela sedang menyiapkan pembelaan' : 'Jaksa sedang menyiapkan dakwaan'}
        <Dots />
      </div>
    );
  }

  return (
    <article className="anim-scale">
      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        <span
          className={`whitespace-nowrap font-mono text-[10.5px] font-bold tracking-[0.12em] ${
            isDefense ? 'text-defend-300' : 'text-prosecute-300'
          }`}
        >
          {SPEAKER_LABEL[side]}
        </span>
        <span className="mono text-[10.5px] uppercase tracking-[0.08em] text-text-3">
          {isDefense ? 'bull' : 'bear'}
        </span>
        {utterance.rebuts && <span className="tiny font-medium text-text-3">↩ balasan</span>}
        <span className="font-mono text-[11px] text-text-3">{formatTime(utterance.ts)}</span>
      </div>
      <h4 className={`mb-1.5 text-[15px] font-semibold leading-[1.3] ${isDefense ? 'text-defend-100' : 'text-prosecute-100'}`}>
        {utterance.title}
      </h4>
      <Markdown source={stripTitleEcho(utterance.title, utterance.argument_md)} className="md md-sm text-[13.5px]" />
      {utterance.cites.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
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
      className="cursor-default rounded-pill border border-line-1 px-2 py-[2px] font-mono text-[10.5px] text-brass-300 transition-colors duration-[160ms] hover:border-brass-500 hover:bg-brass-500 hover:text-bg-1"
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

/* ---------------- putusan (streaming hakim, setara .judge mock) ---------------- */
function VerdictPanel({ stream }: { stream: ReturnType<typeof useTrialStream> }) {
  const streaming = !stream.memo;
  const ticker = stream.trial?.ticker ?? '';
  return (
    <section
      id="verdict-anchor"
      className="anim-in relative mb-9 rounded-[14px] border border-line-1 bg-bg-2 px-6 py-7 min-[720px]:px-8"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[14px] bg-[radial-gradient(640px_220px_at_14%_0%,var(--brass-glow-soft),transparent_72%)]"
        aria-hidden="true"
      />
      <div className="relative mb-5 flex flex-wrap items-center gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[rgba(201,162,74,0.4)] bg-[rgba(201,162,74,0.08)] text-brass-300">
          <GavelIcon size={16} />
        </span>
        <div>
          <h2 className="font-display text-[18px] font-semibold">Hakim</h2>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-3">
            Memorandum riset · Sidang {ticker}
          </p>
        </div>
        <span className={`badge ml-auto ${streaming ? 'badge-brass' : 'badge-defend'}`}>
          {streaming ? <><RadioIcon size={11} /> sidang berlangsung</> : <><CheckIcon size={11} /> memorandum final</>}
        </span>
      </div>
      <div className="relative max-w-[760px]">
        <Markdown
          source={stream.memoText || ' '}
          className={`md font-display text-[17px] leading-[1.7] min-[640px]:text-[19px] min-[900px]:text-[21px] ${
            streaming ? 'text-text-1' : 'text-text-0'
          }`}
        />
        {streaming && (
          <span className="ml-0.5 inline-block h-[1.05em] w-[2px] animate-blink bg-brass-400 align-[-3px]" />
        )}
      </div>
    </section>
  );
}

/* ---------------- memo siap → CTA ---------------- */
function MemoReadyBanner({ trialId }: { trialId: string }) {
  return (
    <div
      className="anim-scale flex flex-wrap items-center gap-5 rounded-[14px] border border-[rgba(201,162,74,0.4)] bg-[linear-gradient(160deg,rgba(201,162,74,0.12),rgba(201,162,74,0.03))] px-6 py-6 shadow-brass"
      role="status"
    >
      <div className="grid size-[54px] place-items-center rounded-[14px] bg-[linear-gradient(180deg,var(--brass-300),var(--brass-500))] text-[#1c1407]">
        <BookIcon size={22} />
      </div>
      <div className="min-w-[220px] flex-1">
        <h2 className="mb-1 text-[22px]">Memorandum sidang telah final.</h2>
        <p className="muted small">Ringkasan eksekutif, fakta kunci, dua tesis, dan pertanyaan verifikasi — lengkap dengan sitasi data.</p>
      </div>
      <Link to={`/memo/${trialId}`} className="btn btn-primary btn-lg">
        Baca memorandum <ArrowRightIcon size={18} />
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
      className="anim-scale mx-auto my-8 max-w-[620px] rounded-[14px] border border-[rgba(201,106,90,0.4)] bg-[linear-gradient(180deg,rgba(201,106,90,0.08),var(--bg-2))] px-8 py-8 text-center"
      role="alert"
    >
      <div className="mx-auto mb-4 grid size-[52px] place-items-center rounded-pill border border-[rgba(201,106,90,0.4)] bg-[rgba(201,106,90,0.16)] text-prosecute-300">
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4 min-[1100px]:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-[14px] border border-line-1 bg-bg-2 p-3.5" style={{ height: 120 }}>
            <div className="flex items-center gap-3">
              <span className="skeleton block" style={{ width: 34, height: 34, borderRadius: 9 }} />
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