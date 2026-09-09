/**
 * Klien SSE nyata: GET /api/trials/{trial_id}/events → text/event-stream.
 *
 * - Dibangun di atas fetch + ReadableStream agar reconnect dapat membawa
 *   `Last-Event-ID` (resume dari `seq` terakhir) — sesuai kontrak §1.
 * - Heartbeat (±15 detik, type "heartbeat") diabaikan oleh reducer.
 * - Interface identik dengan mockSse.ts (lihat types.ts).
 */
import type { TrialEvent } from '../types/contract';
import type { StreamClient, StreamStatus } from './types';
import { config } from '../config';

const DEFAULT_RETRY_MS = 3000;

interface PendingEvent {
  type: 'event' | 'heartbeat';
  data: string;
}

export const sseClient: StreamClient = {
  connect(trialId, handlers, opts) {
    let aborted = false;
    let controller: AbortController | null = null;

    const url = `${config.apiBase}/api/trials/${encodeURIComponent(trialId)}/events`;

    async function read(resumeFromSeq?: number) {
      const headers: Record<string, string> = { Accept: 'text/event-stream' };
      if (resumeFromSeq !== undefined) {
        headers['Last-Event-ID'] = String(resumeFromSeq);
      }

      controller = new AbortController();
      let response: Response;
      try {
        response = await fetch(url, { headers, signal: controller.signal });
      } catch {
        if (!aborted) emitStatus('error');
        return;
      }
      if (aborted) return;

      if (!response.ok) {
        // 404 trials → sidang tidak dikenal; sisanya biarkan client coba lagi.
        emitStatus(response.status >= 500 ? 'error' : 'closed');
        return;
      }

      emitStatus('open');
      const reader = response.body?.getReader();
      if (!reader) {
        emitStatus('error');
        return;
      }

      const parser = new SseParser(onParsed);
      const decoder = new TextDecoder();

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (aborted || done) break;
          parser.push(decoder.decode(value, { stream: true }));
        }
        parser.push(decoder.decode());
      } catch {
        if (!aborted) emitStatus('error');
        return;
      }

      if (!aborted) {
        // Server menutup stream tanpa terminal-event → minta klien reconnect (resume).
        emitStatus('closed');
      }
    }

    function onParsed(event: PendingEvent) {
      if (aborted) return;
      if (event.type === 'heartbeat') return; // keep-alive proxy — abaikan
      try {
        const parsed = JSON.parse(event.data) as TrialEvent;
        handlers.onEvent(parsed);
      } catch {
        // Baris data bukan JSON valid — lewati, tidak boleh memutus alur.
      }
    }

    function emitStatus(status: StreamStatus) {
      if (!aborted) handlers.onStatus(status);
    }

    read(opts?.resumeFromSeq);

    return () => {
      aborted = true;
      controller?.abort();
    };
  },
};

/**
 * Parser minimal SSE: memecah byte stream menjadi event. Satu event terdiri
 * dari baris `data:` (+ baris `event:` / `id:`), diakhiri baris kosong.
 * Robust terhadap CRLF dan pemecahan tengah baris.
 */
class SseParser {
  private buffer = '';
  private data: string[] = [];
  private eventName = 'message';

  constructor(private onEvent: (e: PendingEvent) => void) {}

  push(chunk: string) {
    this.buffer += chunk;
    let nl: number;
    while ((nl = this.buffer.indexOf('\n')) !== -1) {
      let line = this.buffer.slice(0, nl).replace(/\r$/, '');
      this.buffer = this.buffer.slice(nl + 1);
      this.handleLine(line);
    }
  }

  private handleLine(line: string) {
    if (line === '') {
      this.dispatch();
      return;
    }
    if (line.startsWith(':')) return; // komentar
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');

    switch (field) {
      case 'data':
        this.data.push(value);
        break;
      case 'event':
        this.eventName = value || 'message';
        break;
      case 'id':
      case 'retry':
        // id dipakai klien via Last-Event-ID pada reconnect — diambil dari seq event.
        break;
      default:
        break;
    }
  }

  private dispatch() {
    if (this.data.length === 0) return;
    const payload = this.data.join('\n');
    this.data = [];
    const name = this.eventName;
    this.eventName = 'message';
    this.onEvent({ type: name as PendingEvent['type'], data: payload });
  }
}

/** Paparan retry default (dipakai hook reconnect bila server tidak kirim retry). */
export const SSE_DEFAULT_RETRY_MS = DEFAULT_RETRY_MS;
