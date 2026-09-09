import { useEffect, useMemo, useState, type FC } from 'react';
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
    <div className="court">
      {/* Kepala perkara */}
      <div className="container">
        <div className="case-bar card anim-in">
          <div className="case-bar-left">
            <span className={`case-seal ${stream.terminal ? 'done' : stream.error ? 'error' : ''}`}>
              {stream.error ? <AlertIcon size={18} /> : <GavelIcon size={18} />}
            </span>
            <div className="case-meta">
              <div className="case-title-row">
                <h1 className="case-ticker mono">{ticker ?? '…'}</h1>
                <span className="badge badge-brass">{company ?? 'Memuat perkara…'}</span>
                {isMockMode && <span className="badge badge-neutral">fixture</span>}
              </div>
              <div className="case-sub muted small">
                {stream.trial ? (
                  <>
                    Perkara No. <span className="mono">{stream.trial?.trial_id}</span> &middot; komite:{' '}
                    <span className="mono">{stream.trial?.models.analyst}</span> ·{' '}
                    <span className="mono">{stream.trial?.models.debate}</span> ·{' '}
                    <span className="mono">{stream.trial?.models.judge}</span>
                  </>
                ) : (
                  'Menghubungi ruang sidang…'
                )}
              </div>
            </div>
          </div>

          <div className="case-bar-right">
            <div className="case-stats">
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
          <div className="reconnect-banner anim-fade" role="status">
            <RefreshIcon size={16} className="spin" />
            <span>
              Koneksi sidang terputus — mencoba menyambungkan kembali
              <span className="dotty"><i /><i /><i /></span>
            </span>
          </div>
        )}
      </div>

      <div className="container court-body">
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
          className="skip-memo-btn"
          onClick={skipToMemo}
          title={stream.memoText ? 'Lompat ke putusan yang sedang diketik' : 'Putusan belum dimulai — sidang masih berjalan'}
        >
          <BookIcon size={15} /> Skip ke Memo
          {stream.memoText ? <span className="skip-dot live" /> : <span className="skip-dot wait" />}
        </button>
      )}
    </div>
  );
}

/* ---------------- stat kecil ---------------- */
function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value mono ${mono ? '' : ''}`}>{value}</span>
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
    <div className={`phase-stepper ${error ? 'has-error' : ''}`} aria-label="Fase sidang">
      {PHASE_STEPS.map((step, i) => {
        const isDone = (phaseIndex > i || (terminal && !error)) && phase !== null;
        const isActive = phase === step.phase && !terminal;
        const stepRound = step.phase === 'debate' && isActive ? ` · R ${round ?? 1}` : '';
        return (
          <div key={step.phase} className={`phase-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
            <div className="phase-ic">
              {isDone ? <CheckIcon size={15} /> : <PhaseIcon phase={step.phase} />}
            </div>
            <div className="phase-label">
              {PHASE_LABEL[step.phase]}
              <span className="phase-round mono">{stepRound}</span>
            </div>
            {i < PHASE_STEPS.length - 1 && (
              <div className={`phase-line ${isDone ? 'done' : ''}`}>
                <div className="phase-line-fill" />
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
    <section className="deck">
      <div className="deck-head">
        <h2 className="section-title">Panel Analis</h2>
        <span className="muted small">Bukti dari data Sectors — tiap angka bersitasi</span>
      </div>
      <div className="analyst-grid">
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
  const statusLabel =
    status === 'queued' ? 'Menunggu giliran' : status === 'working' ? 'Menyelidiki data' : 'Sidang selesai';

  return (
    <article
      className={`acard card card-pad anim-in status-${status}`}
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      <header className="acard-head">
        <span className={`avatar avatar-${meta.icon} ${status}`}>
          {status === 'queued' ? <span className="avatar-question">?</span> : meta.monogram}
        </span>
        <div className="acard-title">
          <h3>{analyst.displayName}</h3>
          <p className="tiny muted">{meta.tagline}</p>
        </div>
        <span className={`status-dot ${status === 'done' ? 'done' : status === 'working' ? 'working' : 'idle'}`} />
      </header>

      {status === 'queued' && (
        <div className="acard-body">
          <div className="queued-hint tiny muted">Analis menunggu giliran sidang.</div>
        </div>
      )}

      {status === 'working' && (
        <div className="acard-body">
          <div className="acard-live tiny">
            <span className="acard-live-label">{statusLabel}</span>
            <span className="acard-live-model mono">via {analyst.model}</span>
          </div>
          {analyst.toolCalls.length > 0 && (
            <div className="tool-list">
              {analyst.toolCalls.map((tc, i) => (
                <div key={i} className="tool-row anim-fade" style={{ animationDelay: `${Math.min(i * 90, 400)}ms` }}>
                  <span className="tool-name mono">{tc.tool}</span>
                  <CacheBadge cache={tc.cache} />
                </div>
              ))}
            </div>
          )}
          <div className="ev-chip-wrap">
            {analyst.evidence.slice(0, 3).map((ev) => (
              <EvidenceChip key={ev.evidence_id} evidence={ev} />
            ))}
            {analyst.evidence.length > 3 && (
              <span className="ev-more tiny muted">+{analyst.evidence.length - 3} bukti lainnya</span>
            )}
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="acard-body">
          <div className="acard-done-row">
            <span className="acard-done-label">
              <CheckIcon size={13} /> Ringkasan
            </span>
            {analyst.dataRichness && <RichBadge richness={analyst.dataRichness} />}
          </div>
          <div className="ev-chip-wrap">
            {analyst.evidence.slice(0, 3).map((ev) => (
              <EvidenceChip key={ev.evidence_id} evidence={ev} />
            ))}
            {analyst.evidence.length > 3 && (
              <span className="ev-more tiny muted">+{analyst.evidence.length - 3} bukti lainnya</span>
            )}
          </div>
          {analyst.summaryMd && (
            <details className="summary-fold">
              <summary className="tiny">
                Baca kesimpulan <ArrowDownIcon size={11} />
              </summary>
              <Markdown source={analyst.summaryMd} className="md md-sm" />
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

function EvidenceChip({ evidence }: { evidence: AgentEvidencePayload }) {
  return (
    <div className="ev-chip anim-scale">
      <div className="ev-chip-head">
        <LinkIcon size={12} />
        <span className="ev-chip-id mono">{evidence.evidence_id}</span>
      </div>
      <p className="ev-chip-headline">{evidence.headline}</p>
      <div className="ev-facts">
        {evidence.facts.map((f) => (
          <span key={f.label} className="ev-fact mono">
            <b>{formatFactValue(f.value, f.unit)}</b> {f.label}
          </span>
        ))}
      </div>
    </div>
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
    <section className="debate">
      <div className="deck-head">
        <h2 className="section-title">Perdebatan — Jaksa vs Pembela</h2>
        <span className="muted small">Dua ronde adversarial di atas bukti yang sama</span>
      </div>

      <div className="debate-podium">
        <div className="podium prosecutor">
          <ScaleIcon size={16} />
          <div>
            <b>Jaksa</b>
            <span className="tiny muted">Tesis bear · jalur kegagalan</span>
          </div>
        </div>
        <div className="podium-mid tiny mono">VS</div>
        <div className="podium defender">
          <div className="podium-txt">
            <b>Pembela</b>
            <span className="podium-txt tiny muted">Tesis bull · tahan banting</span>
          </div>
          <ScaleIcon size={16} />
        </div>
      </div>

      {debate.length === 0 && phase === 'debate' && (
        <div className="debate-waiting">
          <span className="status-dot working" /> Jaksa sedang menyiapkan dakwaan putaran pertama…
        </div>
      )}

      <div className="debate-rows">
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
  const roundLabel = round === 1 ? 'Putaran pertama' : 'Putaran kedua';

  return (
    <div className="round-block">
      <div className="round-marker anim-fade">
        <span className="round-marker-line" />
        <span className="round-pill mono">RONDE {round} · {roundLabel}</span>
        <span className="round-marker-line" />
      </div>
      <div className="debate-flow">
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
  prosecution: 'JAKSA PENUNTUT · tesis bear',
  defense: 'PEMBELA · tesis bull',
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
  if (!utterance) {
    return (
      <div className={`debate-turn ${side === 'defense' ? 'defense' : ''}`}>
        <div className="speaker-chip speaker-chip-empty">
          {side === 'defense' ? 'Pembela sedang menyiapkan pembelaan' : 'Jaksa sedang menyiapkan dakwaan'}
          <span className="dotty"><i /><i /><i /></span>
        </div>
      </div>
    );
  }

  return (
    <div className={`debate-turn ${side === 'defense' ? 'defense' : ''} anim-in`}>
      <article className={`utt anim-scale utt-${side}`}>
        <div className="utt-speaker-row">
          <span className={`speaker-chip speaker-${side}`}>{SPEAKER_LABEL[side]}</span>
          {utterance.rebuts && <span className="utt-rebut tiny">↩ membalas argumen lawan</span>}
          <span className="utt-time mono tiny">{formatTime(utterance.ts)}</span>
        </div>
        <header className="utt-head">
          <h4>{utterance.title}</h4>
        </header>
        <Markdown source={stripTitleEcho(utterance.title, utterance.argument_md)} className="md md-sm" />
        {utterance.cites.length > 0 && (
          <div className="utt-cites">
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
    <span className="badge badge-neutral evidence-ref" title={evidence.headline}>
      <LinkIcon size={11} /> {evidenceId}
    </span>
  ) : (
    <span className="badge badge-neutral evidence-ref"><LinkIcon size={11} /> {evidenceId}</span>
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
    <section id="verdict-anchor" className="verdict card anim-in">
      <div className="verdict-head">
        <span className="case-seal judge"><GavelIcon size={16} /></span>
        <div>
          <h2 className="section-title">Putusan Hakim Ketua</h2>
          <p className="tiny muted">Memorandum dirumuskan saat sidang berlangsung</p>
        </div>
        <span className={`badge ${streaming ? 'badge-brass' : 'badge-defend'}`}>
          {streaming ? <><RadioIcon size={11} /> sidang berlangsung</> : <><CheckIcon size={11} /> memorandum final</>}
        </span>
      </div>
      <div className="verdict-text">
        <Markdown source={stream.memoText || ' '} className={`md judge-stream ${streaming ? 'typing' : ''}`} />
        {streaming && <span className="caret" />}
      </div>
    </section>
  );
}

/* ---------------- memo siap → CTA ---------------- */
function MemoReadyBanner({ trialId }: { trialId: string }) {
  return (
    <div className="memo-ready anim-scale" role="status">
      <div className="memo-ready-ic"><BookIcon size={22} /></div>
      <div className="memo-ready-txt">
        <h2>Memorandum sidang telah final.</h2>
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
    <section className="trial-error card anim-scale" role="alert">
      <div className="trial-error-ic"><AlertIcon size={22} /></div>
      <h2>Sidang gagal berjalan</h2>
      <div className="trial-error-detail">
        <span className="badge badge-prosecute mono">{error.error_code}</span>
        <span className="muted small">pada fase <b>{PHASE_LABEL[error.phase as Phase] ?? error.phase}</b>{error.agent_id ? ` · agen ${error.agent_id}` : ''}</span>
      </div>
      <p>{ERROR_LABEL[error.error_code as keyof typeof ERROR_LABEL] ?? error.error_code}: {error.message}</p>
      <div className="trial-error-actions">
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
    <div className="connecting" aria-hidden="false" role="status">
      <div className="connecting-head">
        <span className="case-seal judge"><GavelIcon size={18} /></span>
        <div className="stack-sm">
          <span className="skeleton" style={{ width: 260, height: 20 }} />
          <span className="skeleton" style={{ width: 340, height: 12 }} />
        </div>
      </div>
      <div className="analyst-grid">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="acard card card-pad" style={{ height: 120 }}>
            <div className="row row-gap-3">
              <span className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
              <div className="stack-sm" style={{ flex: 1 }}>
                <span className="skeleton" style={{ width: '65%', height: 14 }} />
                <span className="skeleton" style={{ width: '85%', height: 10 }} />
              </div>
            </div>
            <span className="skeleton" style={{ width: '100%', height: 10, marginTop: 16 }} />
            <span className="skeleton" style={{ width: '80%', height: 10, marginTop: 8 }} />
          </div>
        ))}
      </div>
      <div className="connecting-caption muted small">
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
