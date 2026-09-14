import type { enC } from './en.c';

/** Terjemahan Indonesia untuk bagian ./en.c.ts. */
export const idC = {
  // -- post-mortem: kerangka ------------------------------------------------
  'postmortem.crumb.journal': 'Jurnal Sidang',
  'postmortem.crumb.here': 'Post-mortem',
  'postmortem.error.title': 'Rekap sidang tidak ditemukan',
  'postmortem.error.load': 'Rekap tidak ditemukan.',
  'postmortem.error.back': 'Kembali ke Jurnal',
  'postmortem.kicker': 'Evaluasi Putusan',
  'postmortem.head.verdictOn': 'Putusan <b>{date}</b>',
  'postmortem.head.newTrial': 'Sidang Banding / Profil Baru',

  // -- post-mortem: kartu evaluasi akurasi ----------------------------------
  'postmortem.outcome.kicker': 'Audit Akurasi Tesis',
  'postmortem.outcome.noData.title': 'Data Masih Terbatas',
  'postmortem.outcome.noData.badge': 'Menunggu Data',
  'postmortem.outcome.noData.desc':
    'Rentang data transaksi pasar sejak tanggal sidang belum mencukupi untuk menguji signifikansi tesis.',
  'postmortem.outcome.hitUp.title': 'Tesis Bullish Tepat Sasaran',
  'postmortem.outcome.hitUp.badge': 'Tesis Akurat · Bull',
  'postmortem.outcome.hitUp.desc':
    'Putusan sidang "{verdict}" terbukti akurat. Harga saham telah menguat <em>{pct}</em> sejak memorandum disahkan.',
  'postmortem.outcome.hitDown.title': 'Divergensi Pasar (Evaluasi Ulang)',
  'postmortem.outcome.hitDown.badge': 'Divergensi Pasar',
  'postmortem.outcome.hitDown.desc':
    'Harga saham melemah <em>{pct}</em> berlawanan dengan optimisme putusan. Perlu diinvestigasi apakah terdapat perubahan fundamental baru atau sentimen koreksi makro.',
  'postmortem.outcome.hitFlat.title': 'Konsolidasi / Pasar Netral',
  'postmortem.outcome.hitFlat.badge': 'Konsolidasi',
  'postmortem.outcome.hitFlat.desc':
    'Harga saham bergerak mendatar (<em>{pct}</em>) di sekitar harga putusan. Pasar masih mengonsolidasi katalis.',
  'postmortem.outcome.flagDown.title': 'Proteksi Risiko Berhasil',
  'postmortem.outcome.flagDown.badge': 'Proteksi Berhasil · Red Flag',
  'postmortem.outcome.flagDown.desc':
    'Peringatan komite terbukti melindungi modal investor. Harga saham merosot <em>{pct}</em>, memvalidasi temuan red flag berat jaksa penuntut.',
  'postmortem.outcome.flagUp.title': 'Anomali Penguatan Saham',
  'postmortem.outcome.flagUp.badge': 'Anomali Spekulasi',
  'postmortem.outcome.flagUp.desc':
    'Kendati berstatus red flag berat, saham justru menguat <em>{pct}</em>. Waspadai potensi pergerakan spekulatif/gorengan atau katalis pemulihan mendadak.',
  'postmortem.outcome.flagFlat.title': 'Saham Tertekan / Lemah',
  'postmortem.outcome.flagFlat.badge': 'Risiko Terkonfirmasi',
  'postmortem.outcome.flagFlat.desc':
    'Saham tidak mampu menguat (<em>{pct}</em>), membuktikan sikap defensif komite adalah langkah rasional.',
  'postmortem.outcome.cautionDown.title': 'Kewaspadaan Terbukti Tepat',
  'postmortem.outcome.cautionDown.badge': 'Tervalidasi · Hati-Hati',
  'postmortem.outcome.cautionDown.desc':
    'Sikap hati-hati komite terbukti relevan dengan pelemahan harga sebesar <em>{pct}</em>.',
  'postmortem.outcome.cautionUp.title': 'Penguatan Terpantau',
  'postmortem.outcome.cautionUp.badge': 'Terpantau',
  'postmortem.outcome.cautionUp.desc':
    'Saham mencatatkan kenaikan <em>{pct}</em>, tetap perlu mengawal pertanyaan verifikasi risiko.',

  // -- post-mortem: grafik harga --------------------------------------------
  'postmortem.chart.title': 'Perjalanan <em>harga</em>',
  'postmortem.chart.archiveNote': 'ARSIP · BUKAN REAL-TIME',
  'postmortem.chart.empty':
    'Seri harga belum tersedia — butuh setidaknya dua titik sejak memorandum untuk ticker ini.',
  'postmortem.chart.aria': 'Grafik harga {from} sampai {to} dengan penanda tanggal putusan',
  'postmortem.chart.marker': 'PUTUSAN',
  'postmortem.chart.now': 'kini',
  'postmortem.chart.vsTrial': '{pct} vs Sidang',

  // -- post-mortem: ringkasan & langkah lanjutan ----------------------------
  'postmortem.sum.priceAtTrial': 'Harga saat putusan',
  'postmortem.sum.priceNow': 'Harga terakhir',
  'postmortem.sum.latestArchive': 'arsip terbaru',
  'postmortem.sum.delta': 'Selisih',
  'postmortem.sum.sinceVerdict': 'sejak putusan',
  'postmortem.sum.sinceVerdictDays': 'sejak putusan · {n} hari',
  'postmortem.verdict.kicker': 'Putusan Komite Asli · {date}',
  'postmortem.verdict.openMemo': 'Buka Dokumen Memorandum →',
  'postmortem.verdict.questions': 'Pertanyaan Verifikasi Saat Sidang:',
  'postmortem.next.title': 'Langkah Analisis Selanjutnya',
  'postmortem.next.memo.kicker': '📄 Memorandum',
  'postmortem.next.memo.title': 'Baca Kembali Argumen Sidang',
  'postmortem.next.memo.desc':
    'Review kembali perdebatan Jaksa vs Pembela dan data smart money yang menjadi dasar putusan ini.',
  'postmortem.next.memo.cta': 'Buka Memorandum →',
  'postmortem.next.retrial.kicker': '⚖️ Sidang Banding',
  'postmortem.next.retrial.title': 'Mulai Sidang Baru {ticker}',
  'postmortem.next.retrial.desc':
    'Jalankan komite sidang ulang dengan data laporan keuangan dan transaksi pasar paling mutakhir.',
  'postmortem.next.retrial.cta': 'Gelar Sidang Ulang →',
  'postmortem.next.board.kicker': '🔍 Detective Board',
  'postmortem.next.board.title': 'Eksplorasi Jejaring Saham',
  'postmortem.next.board.desc':
    'Cari emiten lain dalam grup kepemilikan yang sama untuk melihat apakah pola harga serupa terjadi.',
  'postmortem.next.board.cta': 'Buka Papan Detektif →',

  // -- memorandum: kerangka & aksi ------------------------------------------
  'memo.crumb.cases': 'Daftar Perkara',
  'memo.crumb.here': 'Memorandum',
  'memo.error.title': 'Memorandum belum tersedia',
  'memo.error.load': 'Memorandum tidak dapat dimuat.',
  'memo.error.backTrial': 'Kembali ke Sidang',
  'memo.error.journal': 'Jurnal Sidang',
  'memo.action.copy': 'Salin Ringkasan',
  'memo.action.copyTitle': 'Salin teks ringkasan memo ke clipboard',
  'memo.action.copied': 'Tersalin ke Clipboard!',
  'memo.action.print': 'Cetak / Simpan PDF',
  'memo.action.printTitle': 'Cetak atau Simpan sebagai PDF',

  // -- memorandum: kepala dokumen -------------------------------------------
  'memo.head.mode.fixture': 'Mode data · Fixture',
  'memo.head.mode.live': 'Mode data · Live',
  'memo.head.richness': 'Info · {richness}',
  'memo.head.signed': 'Disahkan {at} · Sidang {trialId}',
  'memo.seal.top': 'SIDANG · RISET',
  'memo.seal.mid': 'Disahkan',
  'memo.seal.bottom': 'KOMITE PUTUSAN',
  'memo.hero.kicker': 'Putusan Komite',
  'memo.hero.confidence': 'Konfidensi',

  // -- memorandum: teks yang disalin ke clipboard ---------------------------
  'memo.copy.title': 'MEMORANDUM PUTUSAN SIDANG RISET',
  'memo.copy.issuer': 'Emiten',
  'memo.copy.caseNo': 'Nomor Perkara',
  'memo.copy.trial': 'Sidang',
  'memo.copy.signed': 'Disahkan',
  'memo.copy.verdict': 'Putusan',
  'memo.copy.confidence': 'Konfidensi',
  'memo.copy.execSummary': 'RINGKASAN EKSEKUTIF',
  'memo.copy.rationale': 'RASIONAL PUTUSAN',
  'memo.copy.questions': 'PERTANYAAN VERIFIKASI WAJIB INVESTOR',
  'memo.copy.redFlags': 'TEMUAN RED FLAGS',
  'memo.copy.noRedFlags': 'Tidak ada red flag',
  'memo.copy.footer': 'Platform Sidang Riset Pasar Modal (Hakim)',

  // -- memorandum: judul seksi ----------------------------------------------
  'memo.section.summary.kicker': 'Ringkasan',
  'memo.section.summary.title': 'Ringkasan Eksekutif',
  'memo.section.rationale.kicker': 'Rasional',
  'memo.section.rationale.title': 'Rasional putusan',
  'memo.section.verify.kicker': 'Verifikasi',
  'memo.section.verify.title': 'Wajib Anda jawab sebelum berinvestasi',
  'memo.section.facts.kicker': 'Fakta',
  'memo.section.facts.title': 'Fakta Kunci',
  'memo.section.facts.note': 'Tabel tenang · hairline',
  'memo.section.debate.kicker': 'Perdebatan',
  'memo.section.debate.title': 'Tesis Berhadapan',
  'memo.section.debate.note': 'Arahkan kursor ke sitasi untuk melihat nilai',
  'memo.section.flow.kicker': 'Arus',
  'memo.section.flow.title': 'Smart Money & Insider',
  'memo.flow.smartmoney.title': 'Smart Money',
  'memo.flow.smartmoney.kicker': 'Aliran institusi',
  'memo.flow.insider.title': 'Insider',
  'memo.flow.insider.kicker': 'Transaksi direksi',
  'memo.section.redflags.kicker': 'Peringatan',
  'memo.section.redflags.title': 'Red Flags',
  'memo.redflags.empty': 'Tidak ada red flag tercatat.',

  // -- memorandum: tabel audit sumber data -----------------------------------
  'memo.section.audit.kicker': 'Audit',
  'memo.section.audit.title': 'Sumber Data',
  'memo.section.audit.noteReal': 'Panggilan Sectors nyata · cache',
  'memo.section.audit.noteFallback': 'Endpoint Sectors · cache',
  'memo.section.audit.noteFixture': 'Mode demo · data contoh bawaan · 0 kredit',
  'memo.audit.table.endpoint': 'Endpoint',
  'memo.audit.table.param': 'Param',
  'memo.audit.table.cache': 'Cache',
  'memo.audit.table.retrieved': 'Diambil',
  'memo.audit.calledBy': 'dipanggil oleh {agent}',
  'memo.audit.cacheHitTitle':
    'Sudah pernah dibayar — cache lokal (TTL 7 hari) atau arsip permanen — 0 kredit',
  'memo.audit.cacheMissTitle': 'Diambil langsung dari API Sectors — kredit terpakai',
  'memo.audit.cacheFixtureTitle':
    'Data contoh mode demo (berkas bawaan) — tanpa panggilan jaringan, 0 kredit',
  'memo.audit.legend':
    '<b>hit</b> = sudah pernah dibayar — cache lokal (TTL 7 hari) atau arsip permanen, 0 kredit · <em>miss</em> = diambil langsung dari API Sectors (kredit terpakai) · <i>fixture</i> = data contoh mode demo, 0 kredit. Sidang pertama sebuah emiten memang hampir seluruhnya miss — cache menghemat kredit pada endpoint yang dipakai bersama (indeks, top-changes, daftar emiten).',

  // -- memorandum: tabel fakta kunci ----------------------------------------
  'memo.facts.empty': 'Tidak ada fakta kunci tercatat.',
  'memo.facts.table.id': 'Id',
  'memo.facts.table.metric': 'Metrik',
  'memo.facts.table.value': 'Nilai',
  'memo.facts.table.asOf': 'Per Tanggal',
  'memo.facts.table.source': 'Sumber',

  // -- memorandum: kartu tesis ----------------------------------------------
  'memo.thesis.bull.role': 'Pembela',
  'memo.thesis.bull.tag': 'Bull',
  'memo.thesis.bear.role': 'Jaksa',
  'memo.thesis.bear.tag': 'Bear',

  // -- memorandum: tindakan lanjutan ----------------------------------------
  'memo.section.explore.kicker': 'Eksplorasi',
  'memo.section.explore.title': 'Tindakan & Investigasi Lanjutan',
  'memo.section.explore.note': 'Langkah analisis berikutnya',
  'memo.next.profile.kicker': 'Berkas Perkara',
  'memo.next.profile.title': 'Profil Lengkap {ticker}',
  'memo.next.profile.desc':
    'Buka dossier keuangan mendalam, pergerakan valuasi historis, dan ringkasan fundamental {ticker}.',
  'memo.next.profile.cta': 'Buka Profil Ticker →',
  'memo.next.board.kicker': '🔍 Papan Bukti',
  'memo.next.board.title': 'Papan Detektif / Jaringan',
  'memo.next.board.desc':
    'Visualisasikan benang merah keterkaitan kepemilikan konglomerasi, klaster sektor, dan anomali pasar.',
  'memo.next.board.cta': 'Investigasi di Detective Board →',
  'memo.next.postmortem.kicker': 'Evaluasi Putusan',
  'memo.next.postmortem.title': 'Postmortem & Track Record',
  'memo.next.postmortem.desc':
    'Uji akurasi tesis putusan {verdict} terhadap realisasi harga pasar dari waktu ke waktu.',
  'memo.next.postmortem.cta': 'Audit Akurasi Putusan →',
} satisfies typeof enC;
