import type { enD } from './en.d';

/** Terjemahan Indonesia untuk bagian ./en.d.ts.
 *
 * Naskahnya sengaja disalin apa adanya dari halaman sebelum i18n supaya mode
 * Indonesia tampil persis seperti sebelumnya. */
export const idD = {
  // -- remah roti & kepala perkara -----------------------------------------
  'courtroom.crumb.cases': 'Daftar Perkara',
  'courtroom.crumb.live': 'Sidang Berlangsung',
  'courtroom.status.failed': 'Sidang gagal',
  'courtroom.status.running': 'Sidang berlangsung',
  'courtroom.status.done': 'Sidang selesai',
  'courtroom.committee': 'Komite: {analyst} · {debate} · {judge}',
  'courtroom.caseNo': 'PERKARA No. {id}',
  'courtroom.connectingShort': 'Menghubungi ruang sidang…',

  // -- pita statistik --------------------------------------------------------
  'courtroom.stats.evidence': 'Bukti',
  'courtroom.stats.analysts': 'Analis',
  'courtroom.stats.analystsOf': '/ {total} selesai',
  'courtroom.stats.data': 'Data',
  'courtroom.stats.duration': 'Durasi',
  'courtroom.stats.minutes': 'menit',

  // -- stepper fase ----------------------------------------------------------
  'courtroom.stepper.aria': 'Fase sidang',
  'courtroom.round': 'RONDE {r}/2',
  'courtroom.reconnecting': 'Koneksi sidang terputus — mencoba menyambungkan kembali',

  // -- dek analis ------------------------------------------------------------
  'courtroom.panel.kicker': 'Panel',
  'courtroom.panel.title': 'Lima analis',
  'courtroom.panel.note': 'Klik baris bukti untuk membuka detail',
  'courtroom.analyst.queued': 'Menunggu giliran…',
  'courtroom.analyst.working': 'Menyelidiki…',
  'courtroom.analyst.more': '+{n} bukti lainnya',
  'courtroom.analyst.showLess': 'Tampilkan lebih sedikit',
  'courtroom.analyst.summary': 'Ringkasan — <b>{n} bukti</b>',
  'courtroom.analyst.readSummary': 'Baca kesimpulan',

  // -- baris bukti -----------------------------------------------------------
  'courtroom.evidence.expand': 'Buka detail bukti',
  'courtroom.evidence.collapse': 'Tutup detail bukti',

  // -- modal kesimpulan ------------------------------------------------------
  'courtroom.summary.aria': 'Kesimpulan {name}',
  'courtroom.summary.close': 'Tutup',
  'courtroom.summary.empty': 'Kesimpulan belum tersedia.',

  // -- podium debat ----------------------------------------------------------
  'courtroom.debate.kicker': 'Perdebatan',
  'courtroom.debate.title': 'Jaksa vs Pembela',
  'courtroom.debate.note': 'Tayang langsung · bukan kotak hitam',
  'courtroom.debate.opening': 'Jaksa sedang menyiapkan dakwaan putaran pertama…',
  'courtroom.roundTitle': 'RONDE {r} / 2',
  'courtroom.side.prosecutor': 'Jaksa',
  'courtroom.side.defender': 'Pembela',
  'courtroom.side.bull': 'Tesis bull',
  'courtroom.side.bear': 'Tesis bear',
  'courtroom.utterance.prosecutorPreparing': 'Jaksa sedang menyiapkan dakwaan',
  'courtroom.utterance.defenderPreparing': 'Pembela sedang menyiapkan pembelaan',
  'courtroom.utterance.prosecutorTag': 'JAKSA',
  'courtroom.utterance.defenderTag': 'PEMBELA',
  'courtroom.utterance.reply': '↩ balasan',

  // -- memorandum hakim ------------------------------------------------------
  'courtroom.verdict.kicker': 'Putusan',
  'courtroom.verdict.title': 'Memorandum hakim',
  'courtroom.verdict.noteLive': 'Mengetik langsung',
  'courtroom.verdict.noteFinal': 'Final',
  'courtroom.verdict.judge': 'Hakim',
  'courtroom.verdict.meta': 'MEMORANDUM RISET · SIDANG {ticker}',
  'courtroom.verdict.outcome': 'Hasil putusan',
  'courtroom.verdict.confidence': 'Konfidensi',
  'courtroom.verdict.factsCites': '{facts} fakta kunci · {cites} sitasi',
  'courtroom.verdict.summarising': 'Hakim sedang merangkum…',

  // -- memo siap -------------------------------------------------------------
  'courtroom.memo.title': 'Memorandum sidang telah final.',
  'courtroom.memo.body': 'Putusan tercatat di arsip perkara {ticker}.',
  'courtroom.memo.tickerFallback': 'emiten',
  'courtroom.memo.cta': 'Baca memorandum',

  // -- sidang gagal ----------------------------------------------------------
  'courtroom.error.title': 'Sidang gagal berjalan',
  'courtroom.error.phase': 'pada fase <b>{phase}</b>',
  'courtroom.error.agent': ' · agen {agent}',
  'courtroom.error.newTrial': 'Sidang Baru',
  'courtroom.error.journal': 'Jurnal Sidang',

  // -- skeleton koneksi ------------------------------------------------------
  'courtroom.loading.connecting':
    'Menghubungi ruang sidang & menunggu para analis mengambil tempat…',

  // -- pintu keluar ----------------------------------------------------------
  'courtroom.skip.label': 'Skip ke Memo',
  'courtroom.skip.typing': 'Lompat ke putusan yang sedang diketik',
  'courtroom.skip.waiting': 'Putusan belum dimulai — sidang masih berjalan',
} satisfies typeof enD;
