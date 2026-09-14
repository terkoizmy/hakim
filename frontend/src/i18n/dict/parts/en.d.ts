/** Bagian kamus: Ruang Sidang (/trial/:id) — halaman terbesar, jadi berdiri
 * sendiri supaya bisa disusun tanpa berebut berkas.
 *
 * Kunci di sini WAJIB berprefiks `courtroom.`.
 *
 * Catatan: prosa yang DIHASILKAN LLM (putusan hakim, argumen jaksa/pembela,
 * ringkasan analis) tidak boleh masuk kamus — backend hanya berbahasa
 * Indonesia, jadi teks itu tetap apa adanya di kedua mode bahasa.
 */
export const enD = {
  // -- remah roti & kepala perkara -----------------------------------------
  'courtroom.crumb.cases': 'Case Files',
  'courtroom.crumb.live': 'Trial in session',
  'courtroom.status.failed': 'Trial failed',
  'courtroom.status.running': 'Trial in progress',
  'courtroom.status.done': 'Trial complete',
  // Anggota komite: tiga nama model, dipisah titik tengah.
  'courtroom.committee': 'Committee: {analyst} · {debate} · {judge}',
  'courtroom.caseNo': 'CASE No. {id}',
  'courtroom.connectingShort': 'Contacting the courtroom…',

  // -- pita statistik --------------------------------------------------------
  // Label pendek: pita ini empat kolom bersebelahan, lebar tiap kolom 150px.
  'courtroom.stats.evidence': 'Evidence',
  'courtroom.stats.analysts': 'Analysts',
  'courtroom.stats.analystsOf': '/ {total} done',
  'courtroom.stats.data': 'Data',
  'courtroom.stats.dataFixture': 'fixture',
  'courtroom.stats.duration': 'Duration',
  'courtroom.stats.minutes': 'min',

  // -- stepper fase ----------------------------------------------------------
  'courtroom.stepper.aria': 'Trial phases',
  // Pil ronde menempel pada label fase yang `whitespace-nowrap` — jaga pendek.
  'courtroom.round': 'ROUND {r}/2',
  'courtroom.reconnecting': 'Trial connection lost — reconnecting',

  // -- dek analis ------------------------------------------------------------
  'courtroom.panel.kicker': 'Panel',
  'courtroom.panel.title': 'Five analysts',
  'courtroom.panel.note': 'Click an evidence row to open details',
  'courtroom.analyst.queued': 'Waiting for its turn…',
  'courtroom.analyst.working': 'Investigating…',
  'courtroom.analyst.more': '+{n} more evidence',
  'courtroom.analyst.showLess': 'Show less',
  'courtroom.analyst.summary': 'Summary — <b>{n} evidence</b>',
  'courtroom.analyst.readSummary': 'Read the summary',

  // -- label asal-usul payload (badge cache) ---------------------------------
  // Istilah `hit`/`miss`/`fixture` tetap literal: itu istilah teknis API dan
  // pasangan istilahnya muncul di kolom tabel audit memo.
  'courtroom.cache.hit': 'cache hit',
  'courtroom.cache.miss': 'fresh',
  'courtroom.cache.fixture': 'fixture',
  'courtroom.cache.fixtureTitle':
    'Sample data from demo mode (bundled file) — no network call, 0 credits',

  // -- penanda mode sidang ---------------------------------------------------
  // Menggantikan badge DEMO/LIVE lama: dulu ditentukan konfigurasi frontend,
  // sekarang dari `mode` sidang yang dilaporkan backend — jadi labelnya tidak
  // pernah bertentangan dengan isi memo.
  'courtroom.mode.fixture': 'fixture',
  'courtroom.mode.fixtureTitle':
    'This trial runs on sample data (backend fixture mode) — no Sectors network call, 0 credits',

  // -- baris bukti -----------------------------------------------------------
  'courtroom.evidence.expand': 'Open evidence details',
  'courtroom.evidence.collapse': 'Close evidence details',

  // -- modal kesimpulan ------------------------------------------------------
  'courtroom.summary.aria': 'Summary for {name}',
  'courtroom.summary.close': 'Close',
  'courtroom.summary.empty': 'Summary is not available yet.',

  // -- podium debat ----------------------------------------------------------
  'courtroom.debate.kicker': 'Debate',
  'courtroom.debate.title': 'Prosecutor vs Defence Counsel',
  'courtroom.debate.note': 'Streamed live · no black box',
  'courtroom.debate.opening': 'The prosecutor is preparing the first round of the charge…',
  'courtroom.roundTitle': 'ROUND {r} / 2',
  'courtroom.side.prosecutor': 'Prosecutor',
  'courtroom.side.defender': 'Defence Counsel',
  'courtroom.side.bull': 'Bull thesis',
  'courtroom.side.bear': 'Bear thesis',
  'courtroom.utterance.prosecutorPreparing': 'The prosecutor is preparing the charge',
  'courtroom.utterance.defenderPreparing': 'Defence counsel is preparing the defence',
  'courtroom.utterance.prosecutorTag': 'PROSECUTOR',
  'courtroom.utterance.defenderTag': 'DEFENCE',
  'courtroom.utterance.reply': '↩ reply',

  // -- memorandum hakim ------------------------------------------------------
  'courtroom.verdict.kicker': 'Verdict',
  'courtroom.verdict.title': 'Judge’s memorandum',
  'courtroom.verdict.noteLive': 'Typing live',
  'courtroom.verdict.noteFinal': 'Final',
  'courtroom.verdict.judge': 'Judge',
  'courtroom.verdict.meta': 'RESEARCH MEMORANDUM · TRIAL {ticker}',
  'courtroom.verdict.outcome': 'Verdict outcome',
  'courtroom.verdict.confidence': 'Confidence',
  'courtroom.verdict.factsCites': '{facts} key facts · {cites} citations',
  'courtroom.verdict.summarising': 'The judge is summarising…',

  // -- memo siap -------------------------------------------------------------
  'courtroom.memo.title': 'The trial memorandum is final.',
  'courtroom.memo.body': 'The verdict has been filed under {ticker}.',
  // Cadangan saat ticker belum diketahui.
  'courtroom.memo.tickerFallback': 'this issuer',
  'courtroom.memo.cta': 'Read the memorandum',

  // -- sidang gagal ----------------------------------------------------------
  'courtroom.error.title': 'The trial could not run',
  'courtroom.error.phase': 'at phase <b>{phase}</b>',
  // Sisipan setelah nama fase — awalan pemisah ikut di dalam string.
  'courtroom.error.agent': ' · agent {agent}',
  'courtroom.error.newTrial': 'New trial',
  'courtroom.error.journal': 'Trial journal',

  // -- skeleton koneksi ------------------------------------------------------
  'courtroom.loading.connecting':
    'Contacting the courtroom and waiting for the analysts to take their seats…',

  // -- pintu keluar ----------------------------------------------------------
  'courtroom.skip.label': 'Skip to Memo',
  'courtroom.skip.typing': 'Jump to the verdict as it is being typed',
  'courtroom.skip.waiting': 'The verdict has not started — the trial is still running',
};
