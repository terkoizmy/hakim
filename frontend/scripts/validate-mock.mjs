#!/usr/bin/env node
/* ============================================================
 * validate-mock.mjs — validasi alur SSE mock (stream-*.jsonl)
 *
 * Memeriksa setiap baris JSONL:
 *   - baris kosong dilewati
 *   - envelope `{ type, trial_id, seq, ts, payload }`
 *   - seq angka, naik-monoton (duplikat/gap-mundur = error)
 *   - ts valid ISO 8601 & tidak mundur
 *   - trial_id konsisten dengan event pertama
 *   - type dikenal & payload memenuhi kebutuhan ringan per-type
 *   - event akhir adalah `memo_ready` atau `trial_failed`
 *
 * Pemakaian: `node scripts/validate-mock.mjs [berkas.jsonl...]`
 * Dijalankan `npm run mock:check`.
 * ============================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const MOCK_DIR = join(__dirname, '..', 'src', 'mocks');

const EVENT_TYPES = new Set([
  'trial_started',
  'phase_started',
  'agent_started',
  'agent_tool_call',
  'agent_evidence',
  'agent_finished',
  'debate_utterance',
  'memo_token',
  'memo_ready',
  'trial_failed',
]);

// Validasi payload ringan per-type — hanya field wajib.
// (Validasi mendalam struktur MemoJSON dilakukan test lain; di sini cukup memastikan tidak cacat.)
const REQUIRED_PAYLOAD = {
  trial_started: ['ticker'],
  phase_started: ['phase'],
  agent_started: ['agent_id', 'agent_role'],
  agent_tool_call: ['agent_id', 'tool', 'endpoint', 'cache'],
  agent_evidence: ['agent_id', 'evidence_id', 'source_endpoint', 'headline'],
  agent_finished: ['agent_id'],
  debate_utterance: ['round', 'side'],
  memo_token: ['text'],
  memo_ready: ['memo'],
  trial_failed: ['code'],
};

let failures = 0;

function fail(file, lineNo, msg) {
  failures += 1;
  console.error(`  ✗ ${file}:${lineNo} — ${msg}`);
}

function validateFile(path) {
  const file = path.split(/[/\\]/).pop();
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/);
  console.log(`\n  ${file} — ${lines.length} baris`);

  let seq = 0;
  let prevTs = 0;
  let trialId = null;
  let index = 0;
  let lastType = null;

  for (const [i, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lineNo = i + 1;
    index += 1;

    let ev;
    try {
      ev = JSON.parse(trimmed);
    } catch (e) {
      fail(file, lineNo, `tidak bisa di-parse sebagai JSON: ${e.message}`);
      continue;
    }

    if (typeof ev !== 'object' || ev === null || Array.isArray(ev)) {
      fail(file, lineNo, 'event bukan objek');
      continue;
    }

    // envelope umum
    const hasEnvelope = 'type' in ev && 'trial_id' in ev && 'seq' in ev && 'ts' in ev && 'payload' in ev;
    if (!hasEnvelope) {
      fail(file, lineNo, `envelope kurang field (yang ada: ${Object.keys(ev).join(', ')})`);
      continue;
    }

    if (typeof ev.type !== 'string' || !EVENT_TYPES.has(ev.type)) {
      fail(file, lineNo, `type "${ev.type}" tidak dikenal`);
      continue;
    }
    lastType = ev.type;

    if (trialId === null) trialId = ev.trial_id;
    if (ev.trial_id !== trialId) {
      fail(file, lineNo, `trial_id "${ev.trial_id}" berbeda dari "${trialId}"`);
      continue;
    }

    // seq
    const s = ev.seq;
    if (!Number.isInteger(s) || s < 1) {
      fail(file, lineNo, `seq "${s}" bukan bilangan bulat positif`);
      continue;
    }
    if (s <= seq) {
      fail(file, lineNo, `seq ${s} tidak naik-monoton (sebelumnya ${seq})`);
      continue;
    }
    seq = s;

    // ts
    const t = Date.parse(ev.ts);
    if (Number.isNaN(t)) {
      fail(file, lineNo, `ts "${ev.ts}" bukan ISO 8601 valid`);
      continue;
    }
    if (t < prevTs) {
      fail(file, lineNo, `ts mundur dari event ${index - 1}`);
      continue;
    }
    prevTs = t;

    // payload per-type
    const req = REQUIRED_PAYLOAD[ev.type];
    if (req) {
      for (const f of req) {
        if (!(f in ev.payload)) {
          fail(file, lineNo, `payload.${f} kurang untuk type "${ev.type}"`);
        }
      }
      if (ev.type === 'memo_ready' && typeof ev.payload.memo !== 'object') {
        fail(file, lineNo, 'payload.memo bukan objek');
      }
    }
  }

  if (index === 0) {
    fail(file, '<file>', 'tidak ada satu pun event');
    return;
  }

  if (lastType !== 'memo_ready' && lastType !== 'trial_failed') {
    fail(file, '<akhir>', `alur berakhir dengan "${lastType}", seharusnya memo_ready / trial_failed`);
  }

  console.log(`  ✓ ${index} event divalidasi (seq 1..${seq}, trial_id ${trialId})`);
}

const args = process.argv.slice(2);
const files =
  args.length > 0 ? args.map((p) => (p.includes('mocks') ? p : join(MOCK_DIR, p))) : readdirSync(MOCK_DIR).filter((f) => f.endsWith('.jsonl')).map((f) => join(MOCK_DIR, f));

if (files.length === 0) {
  console.log('Tidak ada *.jsonl di src/mocks untuk divalidasi.');
  process.exit(0);
}

for (const f of files) validateFile(f);

if (failures > 0) {
  console.error(`\n✗ ${failures} masalah ditemukan.`);
  process.exit(1);
}
console.log('\n✓ Semua berkas mock valid.');
