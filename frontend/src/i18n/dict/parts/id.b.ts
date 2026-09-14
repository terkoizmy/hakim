import type { enB } from './en.b';

/** Terjemahan Indonesia untuk bagian ./en.b.ts. */
export const idB = {
  // -- Jurnal Sidang (/journal) ---------------------------------------------
  'journal.crumb.home': 'Beranda',
  'journal.kicker': 'Arsip Putusan',
  'journal.title': 'Jurnal <em>Sidang</em>',
  'journal.lede': 'Semua perkara yang pernah diputuskan oleh majelis komite riset SIDANG.',

  'journal.kpi.total': 'Total Perkara',
  'journal.filter.all': 'Semua ({n})',
  'journal.filter.verdict': '{label} ({n})',
  'journal.search.placeholder': 'Cari ticker / emiten...',
  'journal.search.aria': 'Cari di jurnal sidang',

  'journal.error.load': 'Jurnal tidak dapat dimuat.',
  'journal.empty.title': 'Belum ada sidang.',
  'journal.empty.body':
    'Komite belum memutuskan perkara apa pun. Mulai sidang pertama dari daftar emiten.',
  'journal.empty.cta': 'Ke Daftar Perkara',
  'journal.filterEmpty': 'Tidak ada perkara yang cocok dengan filter atau kata kunci pencarian "{q}".',
  'journal.filterReset': 'Reset Filter & Pencarian',

  'journal.table.date': 'Tanggal',
  'journal.table.ticker': 'Ticker',
  'journal.table.issuer': 'Emiten',
  'journal.table.verdict': 'Putusan',
  'journal.table.richness': 'Kekayaan Data',
  'journal.table.price': 'Harga saat sidang',
  'journal.table.actions': 'Aksi',
  'journal.action.memo': 'Memo',
  'journal.action.postmortem': 'Post-mortem',
  'journal.action.postmortemTitle': 'Post-mortem: evaluasi akurasi harga sejak putusan',

  // -- Profil Emiten (/ticker/:ticker) --------------------------------------
  'ticker.crumb.current': 'Berkas Emiten',
  'ticker.issuerFallback': 'Emiten IDX',
  'ticker.lastVerdict.line': 'Harga saat putusan terakhir: <b>{price}</b> · <em>{date}</em>',
  'ticker.cta.start': 'Buka Sidang',
  'ticker.cta.duration': '· ±3 menit',
  'ticker.cta.title': 'Mulai sidang untuk {ticker}',
  'ticker.error.start': 'Gagal memulai sidang. Coba lagi.',

  'ticker.kicker.archive': 'Arsip',
  'ticker.chart.title': 'Perjalanan harga',
  'ticker.chart.note': 'SEJAK MEMO TERAKHIR · {n} SIDANG',
  'ticker.chart.missing':
    'Seri harga belum tersedia untuk sidang ini — buka sidang baru untuk mengambil snapshot terkini.',
  'ticker.chart.loading': 'Memuat seri harga…',
  'ticker.chart.foot':
    'Harga diambil dari arsip sidang, bukan real-time. <b>Min {min} · Max {max}</b> sejak memo terakhir.',

  'ticker.history.title': 'Riwayat persidangan',
  'ticker.table.date': 'Tanggal',
  'ticker.table.verdict': 'Putusan',
  'ticker.table.richness': 'Kekayaan Data',
  'ticker.table.price': 'Harga saat sidang',
  'ticker.table.docs': 'Dokumen',
  'ticker.action.memo': 'Memo',
  'ticker.action.postmortem': 'Post-mortem',
  'ticker.action.postmortemTitle': 'Post-mortem: harga sejak putusan',

  'ticker.empty.loading': 'Memuat riwayat…',
  'ticker.empty.title': '{ticker} belum pernah diadili',
  'ticker.empty.body':
    'Sidang pertama akan mengumpulkan bukti dari lima analis, lalu hakim menulis memorandum riset lengkap untuk {ticker}.',

  // -- Diagram harga (components/PriceChart) --------------------------------
  'chart.aria': 'Grafik harga {from} sampai {to}',
  'chart.axis.max': 'Maks: {value}',
  'chart.axis.min': 'Min: {value}',
  'chart.hint': 'Arahkan kursor pada grafik untuk melihat rincian harga',
} satisfies typeof enB;
