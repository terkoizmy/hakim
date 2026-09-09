#!/usr/bin/env node
/* ============================================================
 * mock-replay-test.mjs — uji alur MOCK end-to-end (tanpa browser)
 *
 * Memuat modul asli lewat Vite SSR (createServer.ssrLoadModule) sehingga
 * `?raw` + `import.meta.env` terproses persis seperti dev server, lalu:
 *   1. replay penuh tr_mock_bbca01 → akhir memo_ready, memo masuk mockStore
 *   2. substitusi ticker pengguna (tr_mock_cuan01 → CUAN)
 *   3. penurunan event melalui trialReducer → state terminal benar
 *   4. resume idempoten (state dari replay bertahap = replay penuh)
 *   5. VITE_MOCK_DROP_ONCE → putus di tengah, resume dari seq terakhir,
 *      alur selesai tanpa loop
 *
 * Jalankan: `npm run mock:e2e`. Objek `config` dimutasi langsung supaya
 * kecepatan & skenario drop terkontrol (tak bergantung .env pengembang).
 * ============================================================ */
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`); }
  else { fail += 1; console.error(`  ✗ ${label}`); }
};

function replay(mockSseClient, trialId, opts = {}) {
  return new Promise((resolve, reject) => {
    const events = [];
    const statuses = [];
    const timer = setTimeout(() => reject(new Error(`timeout ${trialId}`)), 60000);
    mockSseClient.connect(
      trialId,
      {
        onEvent: (ev) => events.push(ev),
        onStatus: (s) => {
          statuses.push(s);
          if (s === 'closed' || s === 'error') {
            clearTimeout(timer);
            resolve({ events, statuses });
          }
        },
      },
      opts,
    );
  });
}

const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });

try {
  const { mockSseClient } = await server.ssrLoadModule('/src/api/mockSse.ts');
  const { mockStore } = await server.ssrLoadModule('/src/api/mockStore.ts');
  const { config } = await server.ssrLoadModule('/src/config.ts');
  const { trialReducer, initialTrialState, ANALYST_IDS } = await server.ssrLoadModule(
    '/src/state/trialReducer.ts',
  );

  config.mockSpeed = 60;         // replay ±0,6 dtk alih-alih 36 dtk
  config.mockDropOnce = false;   // drop hanya diaktifkan pada tes [4]

  const reduce = (events, from = undefined) => {
    let state = from ?? initialTrialState;
    for (const ev of events) state = trialReducer(state, { type: 'event', event: ev });
    return state;
  };

  /* ---------- 1. alur penuh BBCA ---------- */
  console.log('\n[1] Alur penuh tr_mock_bbca01');
  const full = await replay(mockSseClient, 'tr_mock_bbca01');
  const events = full.events;
  ok(events.length === 39, `39 event direplay (dapat ${events.length})`);
  ok(events[0].type === 'trial_started', 'event pertama trial_started');
  const last = events[events.length - 1];
  ok(last.type === 'memo_ready', 'event terakhir memo_ready');
  ok(last.payload.memo.ticker === 'BBCA', 'memo memakai ticker BBCA');
  ok(mockStore.memoByTrial.get('tr_mock_bbca01')?.memo_id === last.payload.memo.memo_id,
    'mockStore menyimpan memo di bawah tr_mock_bbca01');

  const st1 = reduce(events);
  ok(st1.terminal && st1.memo !== null, 'reducer: terminal + memo tersedia');
  ok(st1.completedCount === ANALYST_IDS.length, `semua analis selesai (${st1.completedCount})`);
  ok(Object.values(st1.analysts).every((a) => a.status === 'done'), 'status kelima analis "done"');
  ok(st1.debate.length === 4, `4 utterance debat (dapat ${st1.debate.length})`);
  ok(JSON.stringify(st1.roundsSeen) === '[1,2]', 'dua ronde tercatat (1,2)');
  ok(/LAYAK/.test(st1.memoText), 'teks hakim mengalir & memuat putusan');
  ok(st1.toolCallsByCache.hit === 3 && st1.toolCallsByCache.miss === 6,
    `cache tallies hit=3 miss=6 (dapat hit=${st1.toolCallsByCache.hit} miss=${st1.toolCallsByCache.miss})`);
  const totalEvidence = Object.values(st1.analysts).reduce((n, a) => n + a.evidence.length, 0);
  ok(totalEvidence === 6, `6 chip bukti (dapat ${totalEvidence})`);

  /* ---------- 2. substitusi ticker ---------- */
  console.log('\n[2] Substitusi ticker tr_mock_cuan01');
  const cuan = await replay(mockSseClient, 'tr_mock_cuan01');
  const cm = cuan.events[cuan.events.length - 1].payload.memo;
  ok(cm.ticker === 'CUAN', 'memo berticker CUAN');
  ok(cm.company_name === 'PT Petrindo Jaya Kreator Tbk', 'nama perusahaan CUAN benar');
  ok(cuan.events[0].payload.company_name === 'PT Petrindo Jaya Kreator Tbk',
    'trial_started ikut tersubstitusi');

  /* ---------- 3. resume idempoten ---------- */
  console.log('\n[3] Resume idempoten');
  const cut = 24; // henti di tengah fase debate
  const half = reduce(events.slice(0, cut));
  ok(!half.terminal, `state di seq ${cut} belum terminal`);
  const resumed = reduce(events.slice(cut), half);
  ok(JSON.stringify(resumed.memo) === JSON.stringify(st1.memo), 'state resume = state penuh');

  /* ---------- 4. drop lalu resume ---------- */
  console.log('\n[4] Koneksi putus → resume (tanpa loop)');
  config.mockDropOnce = true;
  const dropped = await replay(mockSseClient, 'tr_mock_bbca01');
  config.mockDropOnce = false;
  ok(dropped.statuses.includes('error'), 'koneksi terputus (status error) di tengah alur');
  const lastSeq = dropped.events[dropped.events.length - 1].seq;
  const resumedRun = await replay(mockSseClient, 'tr_mock_bbca01', { resumeFromSeq: lastSeq });
  ok(resumedRun.events.length > 0, 'alur lanjut dari seq yang di-resume');
  const rl = resumedRun.events[resumedRun.events.length - 1];
  ok(rl.type === 'memo_ready' && resumedRun.statuses.at(-1) === 'closed',
    'resume mencapai memo_ready lalu closed');
  const stDrop = reduce([...dropped.events, ...resumedRun.events]);
  ok(stDrop.terminal && stDrop.memo !== null, 'state akhir setelah drop = lengkap');
  ok(stDrop.memo.trial_id === st1.memo.trial_id, 'memo konsisten lintas reconnect');

} finally {
  await server.close();
}

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} lolos, ${fail} gagal.`);
process.exitCode = fail === 0 ? 0 : 1;
