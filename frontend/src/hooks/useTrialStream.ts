/**
 * Hook inti halaman sidang: menghubungkan stream (SSE nyata / replay mock),
 * menurunkan event ke reducer, menangani reconnect dengan backoff exponential
 * dan resume via seq terakhir (Last-Event-ID), lalu menyatakan terminal ketika
 * memo_ready / trial_failed diterima.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { streamClient } from '../api';
import type { StreamStatus } from '../api';
import { initialTrialState, trialReducer, type TrialUiState } from '../state/trialReducer';

const MAX_BACKOFF_MS = 8000;

export interface TrialStream extends TrialUiState {
  status: StreamStatus;
  /** true bila reconnect sedang dicoba (tampilkan banner). */
  reconnecting: boolean;
  reconnectCount: number;
}

export function useTrialStream(trialId?: string): TrialStream {
  const [state, dispatch] = useReducer(trialReducer, undefined, () => initialTrialState);
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);

  const lastSeqRef = useRef<number | null>(null);
  const terminalRef = useRef(false);
  const retryRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!trialId) return;
    let disposed = false;

    terminalRef.current = false;
    retryRef.current = 0;
    setReconnecting(false);
    setReconnectCount(0);
    dispatch({ type: 'reset' });
    setStatus('connecting');

    const connect = (resumeFrom?: number) => {
      if (disposed) return;
      cleanupRef.current();

      cleanupRef.current = streamClient.connect(
        trialId,
        {
          onEvent: (ev) => {
            dispatch({ type: 'event', event: ev });
            lastSeqRef.current = ev.seq;
            if (ev.type === 'memo_ready' || ev.type === 'trial_failed') {
              terminalRef.current = true;
              setReconnecting(false);
            }
          },
          onStatus: (s) => {
            if (disposed) return;
            setStatus(s);
            if (s === 'open') {
              retryRef.current = 0;
              setReconnecting(false);
            }
            if (s === 'error' || (s === 'closed' && !terminalRef.current)) {
              if (disposed || terminalRef.current) return;
              const backoff = Math.min(1000 * 2 ** retryRef.current, MAX_BACKOFF_MS);
              retryRef.current += 1;
              setReconnecting(true);
              setReconnectCount((c) => c + 1);
              timerRef.current = window.setTimeout(() => connect(lastSeqRef.current ?? undefined), backoff);
            }
          },
        },
        resumeFrom !== undefined ? { resumeFromSeq: resumeFrom } : undefined,
      );
    };

    connect();

    return () => {
      disposed = true;
      cleanupRef.current();
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    };
  }, [trialId]);

  const value = useMemo<TrialStream>(
    () => ({ ...state, status, reconnecting, reconnectCount }),
    [state, status, reconnecting, reconnectCount],
  );

  return value;
}
