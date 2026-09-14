import type { enE } from './en.e';

/** Terjemahan Indonesia untuk bagian ./en.e.ts.
 *
 * Sebagian besar nilai di sini adalah teks asli yang dulu tertanam di
 * DetectiveBoardPage.tsx — dipindahkan apa adanya supaya halaman berbahasa
 * Indonesia tidak berubah tampilannya.
 */
export const idE = {
  // -- kepala halaman --------------------------------------------------------
  'board.header.kicker': 'Analisis lanjutan',
  'board.header.crumb': 'Papan Bukti Detektif',
  'board.title': 'Papan Bukti <em>Detektif</em>',
  'board.subtitle':
    'Eksplorasi grafis relasi kepemilikan, orang kunci, dan bukti red flag untuk <b>emiten yang telah lolos sidang</b> (Vonis Layak & Kehati-hatian).',

  // -- panel kiri: daftar emiten --------------------------------------------
  'board.emiten.title': 'Emiten Lolos Sidang',
  'board.emiten.count': '{n} perkara',
  'board.emiten.note': 'Hanya menampilkan emiten dengan vonis <b>{layak}</b> atau <b>{hati}</b>.',
  'board.emiten.search': 'Cari emiten sidang…',
  'board.emiten.clear': 'Hapus filter',
  'board.emiten.empty': 'Tidak ada emiten lolos sidang yang cocok dengan pencarian "{q}".',
  'board.emiten.richness': 'Kekayaan data {grade}',

  // -- panel kiri: legenda ---------------------------------------------------
  'board.legend.title': 'Filter & Legenda',
  'board.legend.cross': 'Benang merah lintas emiten <em>· belum tersedia</em>',
  'board.legend.crossTitle':
    'Belum tersedia: papan hanya memuat satu emiten, jadi belum ada benang antar-emiten yang bisa digambar.',

  // -- kanvas: bilah alat ----------------------------------------------------
  'board.canvas.title': 'Papan · <b>{ticker}</b>',
  'board.canvas.focus': 'Fokus: {name}',
  'board.canvas.compact': 'Ringkas',
  'board.canvas.compactTitle': 'Kembali ke tampilan ringkas (emiten, pemegang saham, orang kunci)',
  'board.canvas.expand': 'Perluas jaringan',
  'board.canvas.expandTitle':
    'Tampilkan seluruh bukti: red flag, bukti kabar, fakta angka, jejak broker',
  'board.canvas.reset': 'Reset ke {ticker}',
  'board.canvas.resetTitle': 'Reset fokus ke emiten utama {ticker}',
  'board.canvas.stats': '{cards} kartu aktif · {threads} benang',
  'board.canvas.center': 'Pusatkan',
  'board.canvas.centerTitle': 'Perbesar ke kartu fokus (skala terbaca)',
  'board.canvas.fitAll': 'Fit semua',
  'board.canvas.fitAllTitle': 'Tampilkan seluruh jaringan (kartu mengecil)',
  'board.canvas.scrollHint': 'Roda gulir = gulir halaman · Ctrl + roda = zoom kanvas',

  // -- kanvas: status muat & galat ------------------------------------------
  'board.loading': 'Menyusun berkas investigasi <b>{ticker}</b> dari sidang & Sectors…',
  'board.error.title': '⚠ Gagal Memuat Data Investigasi',
  'board.error.retry': 'Coba Muat Ulang',
  'board.error.loadFailed': 'Gagal memuat data',
  'board.error.loadFailedTicker': 'Gagal memuat data investigasi {ticker} dari server.',

  // -- kartu papan -----------------------------------------------------------
  'board.card.center': 'Pusat Fokus',
  'board.card.cross': 'lintas emiten',
  'board.card.retrieved': 'Sumber diambil {date}',
  'board.card.archive': 'arsip',

  // -- inspektur simpul (panel kanan) ---------------------------------------
  'board.inspector.title': 'Detail Bukti (Pusat Fokus)',
  'board.inspector.empty': 'Pilih kartu di papan.',
  'board.inspector.source': 'Sumber: {name}',
  'board.inspector.retrieved': 'Diambil: <b>{date}</b>',

  // -- panel kanan: daftar benang -------------------------------------------
  'board.related.title': 'Benang Terhubung ({n})',
  'board.related.empty': 'Tidak ada benang aktif.',
  'board.related.hidden': '{n} benang tersembunyi oleh filter tipe.',

  // -- seksi bawah: kepala ---------------------------------------------------
  'board.insight.kicker': 'Ruang Analisis & Intelijen Hakim AI',
  'board.insight.title': 'Bedah Investigasi & Matriks <em>{ticker}</em>',
  'board.insight.mode': 'Mode Analisis Objektif',

  // -- panel chat ------------------------------------------------------------
  'board.chat.title': 'Tanya Asisten Investigasi ({ticker})',
  'board.chat.focus': 'Fokus: <b>{name}</b>',
  'board.chatNote': 'Jawaban dihasilkan dalam Bahasa Indonesia.',
  'board.chat.greeting':
    'Papan investigasi {ticker} aktif. Silakan tanyakan kepemilikan, direksi, atau fakta audit.',
  'board.chat.greetingShort': 'Papan investigasi {ticker} aktif.',
  'board.chat.loadingInitial': 'Memuat data investigasi {ticker}…',
  'board.chat.localFallback':
    'Analisis keterkaitan {ticker}: Ditemukan {n} entitas relasi aktif pada fokus {focus}. (Jawaban lokal — server tidak terjangkau.)',
  'board.chat.from': 'Analisis Hakim AI:',
  'board.chat.heuristic': 'heuristik',
  'board.chat.heuristicTitle':
    'LLM tidak tersedia — jawaban disusun dari data papan, bukan oleh model bahasa.',
  'board.chat.modelTitle': 'Dijawab oleh model {model}.',
  'board.chat.busyAria': 'Asisten sedang menelusuri papan {ticker}',
  'board.chat.busy': 'Menelusuri papan {ticker}… menimbang benang bukti & red flag',
  'board.chat.suggestions': 'Rekomendasi Pertanyaan ({name}):',
  'board.chat.chipBusyTitle': 'Tunggu jawaban sebelumnya selesai dulu.',
  'board.chat.chipTitle': 'Klik untuk langsung menanyakan ini ke AI',
  'board.chat.placeholderBusy': 'Menunggu jawaban untuk {name}…',
  'board.chat.placeholder': 'Ketik pertanyaan mandiri soal {name}…',
  'board.chat.send': 'Kirim',
  'board.chat.sending': 'Menganalisis…',
  'board.chat.disclaimer':
    '⚖️ Asisten Hakim menyajikan analisis data & risiko objektif untuk riset mandiri (bukan rekomendasi transaksi).',

  // -- grafik harga ----------------------------------------------------------
  'board.chart.title': 'Grafik Pergerakan Harga · {ticker}',
  'board.chart.empty': 'Grafik harga tidak tersedia.',
  'board.chart.endLabel': 'Hari ini',

  // -- benchmark metrik ------------------------------------------------------
  'board.benchmark.title': 'Benchmark Valuasi vs Rata-rata Industri',
  'board.benchmark.thesis': 'Tesis Investigasi Hakim:',
  'board.benchmark.superior': 'Unggul',
  'board.benchmark.fair': 'Wajar',
  'board.benchmark.watch': 'Waspada',
  'board.benchmark.sector': 'Sektor: {value}',
} satisfies typeof enE;
