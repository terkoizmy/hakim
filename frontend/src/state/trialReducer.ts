/**
 * Reducer pure: event SSE (atau replay mock) → state UI sidang (useReducer).
 * Dapat diuji tanpa DOM.
 */
import type {
  AgentEvidencePayload,
  AgentFinishedPayload,
  AgentId,
  AgentStartedPayload,
  AgentToolCallPayload,
  CacheStatus,
  DataRichness,
  DebateSide,
  DebateUtterancePayload,
  MemoJSON,
  Phase,
  TrialEvent,
  TrialFailedPayload,
  TrialStartedPayload,
} from '../types/contract';
import { AGENT_LABEL } from '../types/contract';

export interface AnalystUi {
  agentId: string;
  displayName: string;
  status: 'queued' | 'working' | 'done';
  dataRichness?: DataRichness;
  summaryMd?: string;
  toolCalls: AgentToolCallPayload[];
  evidence: AgentEvidencePayload[];
  model?: string;
}

export interface DebateUi extends DebateUtterancePayload {
  /** id lokal utk animasi — tetap utk event dg rebuts ke utterance yg sama. */
  key: string;
  /** waktu utterance masuk stream (dari amplop event). */
  ts: string;
}

export interface TrialFailedUi extends TrialFailedPayload {}

export interface TrialUiState {
  trial:
    | (TrialStartedPayload & { trial_id: string })
    | null;
  phase: Phase | null;
  /** Round saat ini (hanya fase debate). */
  round: number | null;
  /** Semua round yang pernah tercatat (untuk penanda ronde di panel debat). */
  roundsSeen: number[];
  analysts: Record<string, AnalystUi>;
  /** Analis selesai, urut selesai → untuk indikator kemajuan. */
  completedCount: number;
  toolCallsByCache: { hit: number; miss: number };
  debate: DebateUi[];
  /** Teks hakim yang di-streaming (memo_token). */
  memoText: string;
  memo: MemoJSON | null;
  error: TrialFailedUi | null;
  terminal: boolean;
}

export const ANALYST_IDS = ['fundamental', 'price', 'smartmoney', 'insider', 'antigorengan'] as const;

const initialAnalyst = (id: string): AnalystUi => ({
  agentId: id,
  displayName: AGENT_LABEL[id] ?? id,
  status: 'queued',
  toolCalls: [],
  evidence: [],
});

export const initialTrialState: TrialUiState = {
  trial: null,
  phase: null,
  round: null,
  roundsSeen: [],
  analysts: Object.fromEntries(ANALYST_IDS.map((id) => [id, initialAnalyst(id)])),
  completedCount: 0,
  toolCallsByCache: { hit: 0, miss: 0 },
  debate: [],
  memoText: '',
  memo: null,
  error: null,
  terminal: false,
};

export type TrialAction = { type: 'event'; event: TrialEvent } | { type: 'reset' };

let debateKeySeq = 0;
function nextDebateKey(rebuts: string | null): string {
  return rebuts ?? `ut_open_${++debateKeySeq}`;
}

export function trialReducer(state: TrialUiState, action: TrialAction): TrialUiState {
  if (action.type === 'reset') return initialTrialState;
  const ev = action.event;

  switch (ev.type) {
    case 'trial_started': {
      const p = ev.payload as TrialStartedPayload;
      return { ...state, trial: { ...p, trial_id: ev.trial_id } };
    }

    case 'phase_started': {
      const phase = (ev.payload as { phase: Phase }).phase;
      const round = phase === 'debate' ? ((ev.payload as { round?: number }).round ?? 1) : null;
      return {
        ...state,
        phase,
        round,
        roundsSeen: round && !state.roundsSeen.includes(round) ? [...state.roundsSeen, round] : state.roundsSeen,
      };
    }

    case 'agent_started': {
      const p = ev.payload as AgentStartedPayload;
      if (p.agent_role === 'analyst') {
        const current = state.analysts[p.agent_id] ?? initialAnalyst(p.agent_id);
        return {
          ...state,
          analysts: {
            ...state.analysts,
            [p.agent_id]: { ...current, status: 'working', model: p.model, displayName: p.display_name },
          },
        };
      }
      return state; // prosecutor/defender/judge tidak punya kartu analis
    }

    case 'agent_tool_call': {
      const p = ev.payload as AgentToolCallPayload;
      const analyst = state.analysts[p.agent_id];
      if (!analyst) return state;
      return {
        ...state,
        analysts: {
          ...state.analysts,
          [p.agent_id]: { ...analyst, status: 'working', toolCalls: [...analyst.toolCalls, p] },
        },
        toolCallsByCache: {
          hit: state.toolCallsByCache.hit + (p.cache === 'hit' ? 1 : 0),
          miss: state.toolCallsByCache.miss + (p.cache === 'miss' ? 1 : 0),
        },
      };
    }

    case 'agent_evidence': {
      const p = ev.payload as AgentEvidencePayload;
      const analyst = state.analysts[p.agent_id];
      if (!analyst) return state;
      return {
        ...state,
        analysts: {
          ...state.analysts,
          [p.agent_id]: { ...analyst, evidence: [...analyst.evidence, p] },
        },
      };
    }

    case 'agent_finished': {
      const p = ev.payload as AgentFinishedPayload;
      const analyst = state.analysts[p.agent_id];
      if (!analyst) return state;
      return {
        ...state,
        analysts: {
          ...state.analysts,
          [p.agent_id]: {
            ...analyst,
            status: 'done',
            dataRichness: p.data_richness,
            summaryMd: p.summary_md,
          },
        },
        completedCount: state.completedCount + 1,
      };
    }

    case 'debate_utterance': {
      const p = ev.payload as DebateUtterancePayload;
      return {
        ...state,
        debate: [...state.debate, { ...p, key: nextDebateKey(p.rebuts), ts: ev.ts }],
      };
    }

    case 'memo_token': {
      const text = (ev.payload as { text: string }).text;
      return { ...state, memoText: (state.memoText + text).replace(/\s\s+/g, ' ') };
    }

    case 'memo_ready': {
      const memo = (ev.payload as { memo: MemoJSON }).memo;
      return { ...state, memo, terminal: true, phase: 'verdict' };
    }

    case 'trial_failed': {
      return { ...state, error: ev.payload as TrialFailedUi, terminal: true };
    }

    default:
      return state; // heartbeat dkk diabaikan
  }
}

export function getAnalystStatusSummary(state: TrialUiState) {
  const total = ANALYST_IDS.length;
  return { done: state.completedCount, total };
}

export type { AgentId, DebateSide, CacheStatus };
