/**
 * Klien SSE MOCK: memutar src/mocks/stream-BBCA.jsonl (satu baris = satu
 * amplop event SSE) dengan jeda yang membuat sidang "dapat ditonton".
 *
 * Interface identik dengan sse.ts (StreamClient). Bedanya hanya sumber data:
 * file lokal, bukan HTTP. `VITE_USE_MOCK=1` → file ini dipakai, tanpa backend.
 *
 * Fitur tambahan mock:
 * - Substitusi ticker yang diketik → judul sidang tetap sesuai input pengguna.
 * - Resume (reconnect) dari `resumeFromSeq` untuk mendemonstrasikan alur pulih.
 * - `VITE_MOCK_DROP_ONCE=1` → sengaja memutus koneksi sekali di tengah alur.
 */
const streamRaw = '';
import { config } from '../config';
import type { MemoJSON, TrialEvent } from '../types/contract';
import type { StreamClient } from './types';
import { setMockMemo } from './mockStore';
import { companyNameFor } from './mockData';

function parseStream(raw: string): TrialEvent[] {
  const events: TrialEvent[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as TrialEvent);
    } catch {
      // Baris tidak valid → lewati (validasi lebih ketat lewat scripts/validate-mock.mjs).
    }
  }
  return events;
}

/**
 * Ekstrak ticker dari trial_id mock, mis. `tr_mock_bbca01` → `bbca`.
 * Pola id dibuat di mockRest.createTrial; fallback ke string polos.
 */
function tickerFromTrialId(trialId: string): string {
  return trialId.replace(/^tr_mock_/, '').replace(/01$/, '');
}

/**
 * Substitusi ticker & nama perusahaan pada event yang memuatnya, supaya mock
 * terasa merespons input pengguna walau datanya fixture BBCA. Memo yang
 * dihasilkan disimpan ke mockStore di bawah `trialId` (tidak memakai id fixture)
 * agar halaman /memo dan jurnal dapat membacanya lintas rute.
 */
function applyTicker(events: TrialEvent[], trialId: string): TrialEvent[] {
  const tickerUp = tickerFromTrialId(trialId).toUpperCase();
  if (!tickerUp) return events;
  const company = companyNameFor(tickerUp);
  return events.map((ev) => {
    if (ev.type === 'trial_started') {
      return { ...ev, payload: { ...ev.payload, ticker: tickerUp, company_name: company } };
    }
    if (ev.type === 'memo_ready') {
      const memo: MemoJSON = {
        ...ev.payload.memo,
        ticker: tickerUp,
        company_name: company,
      };
      setMockMemo(trialId, memo);
      return { ...ev, payload: { ...ev.payload, memo } };
    }
    return ev;
  });
}

/** Jeda antar-event (ms) — menentukan ritme demo. */
function delayFor(event: TrialEvent, resume: boolean): number {
  const s = resume ? 0.3 : 1;
  switch (event.type) {
    case 'trial_started':
      return 500 * s;
    case 'phase_started':
      return 1400 * s;
    case 'agent_started':
      return 340 * s;
    case 'agent_tool_call':
    case 'agent_evidence':
      return 430 * s;
    case 'agent_finished':
      return 1500 * s;
    case 'debate_utterance':
      return 2300 * s;
    case 'memo_token':
      return 920 * s;
    case 'memo_ready':
      return 1400 * s;
    default:
      return 300 * s;
  }
}

export const mockSseClient: StreamClient = {
  connect(trialId, handlers, opts) {
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!cancelled) fn();
      }, Math.max(0, Math.round(ms / config.mockSpeed)));
      timers.add(id);
    };

    const base = parseStream(streamRaw);
    const allEvents = applyTicker(base, trialId);
    const resumeFrom = opts?.resumeFromSeq ?? -1;
    const events = allEvents.filter((ev) => ev.seq > resumeFrom);

    handlers.onStatus('open');

    // Simulasi koneksi putus di tengah alur (untuk demo reconnect) — HANYA
    // pada koneksi awal; sesi resume dibiarkan tuntas supaya tidak loop.
    const dropAt =
      config.mockDropOnce && opts?.resumeFromSeq === undefined
        ? events[Math.floor(events.length * 0.55)]
        : null;

    let t = 0;
    for (const ev of events) {
      schedule(() => {
        if (dropAt && dropAt.seq === ev.seq) {
          handlers.onStatus('error'); // hook akan reconnect dari seq ini
          return;
        }
        handlers.onEvent(ev);
      }, t);
      t += delayFor(ev, opts?.resumeFromSeq !== undefined);
    }

    schedule(() => {
      if (!cancelled) handlers.onStatus('closed');
    }, t + 260);

    return () => {
      cancelled = true;
      timers.forEach((id) => clearTimeout(id));
    };
  },
};
