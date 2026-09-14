import type { enA } from './en.a';

/** Terjemahan Indonesia untuk bagian ./en.a.ts. `satisfies` di sini yang
 * menolak kunci kurang atau berlebih saat `npm run typecheck`.
 *
 * Beberapa teks sengaja BUKAN salinan lama: nama tujuan disamakan dengan
 * navigasi utama ("Daftar Perkara" → "Berkas Perkara", "Jurnal Sidang" →
 * "Jurnal", "Sidang" → "Beranda"), dan grade mentah "INFO A/B/C" diganti
 * label kekayaan informasi. */
export const idA = {
  // -- beranda: hero --------------------------------------------------------
  'home.hero.badge': 'Multi-Agent · Data Sectors · Bahasa Indonesia',
  'home.hero.title': 'Sebelum beli, <em>aduli</em> dulu.',
  'home.hero.lead':
    'Lima analis menggali bukti dari data Sectors — <b>jaksa bear</b> berdebat melawan <b>pembela bull</b> dalam dua ronde, lalu <b>hakim menulis memorandum riset</b>. Semua tayang, semua tersimpan.',

  // -- beranda: formulir ticker --------------------------------------------
  'home.form.tickerPlaceholder': 'KODE SAHAM',
  'home.form.tickerLabel': 'Kode saham 4 huruf',
  'home.form.submit': 'Mulai Sidang',
  'home.form.note': '±3 menit · tanpa akun · tanpa biaya',
  'home.form.errorHint': '— pastikan 4 huruf kode emiten IDX.',
  'home.form.invalid': 'Kode harus 4 huruf (contoh: BBCA, CUAN).',
  'home.error.start': 'Gagal memulai sidang. Coba lagi.',
  'home.links.cases': 'Berkas Perkara',
  'home.links.journal': 'Jurnal',

  // -- beranda: kartu contoh putusan ---------------------------------------
  'home.showcase.num': 'I · PUTUSAN',
  'home.showcase.title': 'Lihat <em>produknya</em> dulu.',
  'home.showcase.caseMeta': 'PERKARA No. 2024-118 · SEKTOR PERBANKAN',
  'home.showcase.confidence': 'KONFIDENSI',
  'home.showcase.cited': 'Bukti yang dikutip',
  'home.showcase.evidence1':
    'Margin bunga bersih stabil di kuartal terakhir, didukung pertumbuhan kredit ritel.',
  'home.showcase.evidence2':
    'Rasio NPL terkendali di bawah rata-rata sektor; cadangan memadai.',
  'home.showcase.evidence3':
    'Valuasi berada di kisaran historis, tanpa lonjakan volume yang mencurigakan.',
  'home.showcase.byline': 'DITULIS OLEH HAKIM · 2 RONDE DEBAT',
  'home.showcase.archive': 'ARSIP TERBUKA',
  'home.showcase.card1.body':
    'Bukti seimbang, fundamental sehat. Masuk daftar pantau untuk riset lanjutan.',
  'home.showcase.card2.body':
    'Ada sinyal campur — pertumbuhan ada, tapi risiko terukur. Perlu verifikasi.',
  'home.showcase.card3.body':
    'Anomali terdeteksi pada beberapa metrik. Disarankan tidak dilanjutkan.',
  'home.showcase.sampleTicker': 'CONTOH · {ticker} · {grade}',
  'home.showcase.sampleGrade': 'CONTOH · {grade}',

  // -- beranda: cara kerja --------------------------------------------------
  'home.how.num': 'II · CARA KERJA',
  'home.how.title': 'Tiga babak <em>persidangan</em>.',
  'home.how.act': 'BABAK {n}',
  'home.how.step1.title': 'Lima analis menggali bukti',
  'home.how.step1.body':
    'Setiap angka yang dipakai selalu bersitasi ke endpoint Sectors API.',
  'home.how.step2.title': 'Debat dua ronde tayang langsung',
  'home.how.step2.body':
    'Jaksa bear vs pembela bull — bukan kotak hitam, semua bisa disimak.',
  'home.how.step3.title': 'Hakim menulis memorandum',
  'home.how.step3.body':
    'Rangkuman riset final dengan kategori dan konfidensi yang jelas.',

  // -- beranda: kredibilitas ------------------------------------------------
  'home.cred.cite.title': 'Setiap angka bersitasi',
  'home.cred.cite.body':
    'Semua klaim menunjuk ke endpoint Sectors API — bisa diverifikasi ulang.',
  'home.cred.transparent.title': 'Proses transparan & terarsip',
  'home.cred.transparent.body':
    'Debat dan memorandum tersimpan, tidak ada proses yang disembunyikan.',
  'home.cred.noAdvice.title': 'Tanpa rekomendasi beli/jual',
  'home.cred.noAdvice.body':
    'Hanya kategori riset — keputusan tetap sepenuhnya di tangan Anda.',

  // -- beranda: ajakan ke jurnal -------------------------------------------
  'home.journal.eyebrow': 'Jurnal',
  'home.journal.title': 'Semua putusan <em>terarsip</em>. Postmortem vs harga kini.',
  'home.journal.body':
    'Setiap perkara yang pernah disidangkan tersimpan rapi. Kembali lagi nanti, bandingkan putusan dengan pergerakan harga — dan pelajari di mana risetnya tepat atau meleset.',
  'home.journal.cta': 'Buka Jurnal',

  // -- berkas perkara (/dashboard) -----------------------------------------
  'dashboard.crumb.home': 'Beranda',
  'dashboard.crumb.current': 'Berkas Perkara',
  'dashboard.title': 'Berkas <em>Perkara</em>',
  'dashboard.lead':
    'Semua emiten terdaftar IDX — klik baris untuk membuka berkas, lalu adili.',
  'dashboard.search.placeholder': 'Cari kode atau nama emiten…',
  'dashboard.search.aria': 'Cari emiten',
  'dashboard.sector.label': 'Sektor:',
  'dashboard.sector.all': 'Semua Sektor',
  'dashboard.count.showing': 'MENAMPILKAN {shown} DARI {total} PERKARA',
  'dashboard.count.sector': ' — SEKTOR {sector}',
  'dashboard.count.hint': ' — KETIK UNTUK MENCARI ATAU GULIR + MUAT LAGI',
  'dashboard.count.fallback': 'MENAMPILKAN DAFTAR PERKARA',
  'dashboard.th.ticker': 'Ticker',
  'dashboard.th.issuer': 'Emiten',
  'dashboard.th.verdict': 'Putusan Terakhir',
  'dashboard.th.trials': 'Jml Sidang',
  'dashboard.th.lastTried': 'Terakhir Diadili',
  'dashboard.th.price': 'Harga Saat Sidang',
  'dashboard.badge.notTried': 'Belum diadili',
  'dashboard.issuerFallback': 'Emiten IDX',
  'dashboard.empty': 'Tidak ada perkara yang cocok dengan pencarian.',
  'dashboard.fallbackNote':
    'Menampilkan contoh ticker — daftar emiten backend belum tersedia.',
  'dashboard.loading': 'Memuat…',
  'dashboard.loadMore': 'Muat {n} lagi',
  'dashboard.row.title': 'Buka detail {ticker}',
  'dashboard.aside.eyebrow': 'Arsip',
  'dashboard.aside.title': 'Sidang terakhir',
  'dashboard.aside.open': 'Buka memorandum {ticker}',
  'dashboard.aside.note':
    'Klik baris untuk membuka memorandum riset lengkap dari sidang terakhir.',

  // -- 404 ------------------------------------------------------------------
  'notFound.title': 'Ruang sidang ini tidak ditemukan',
  'notFound.body':
    'Halaman yang Anda tuju tidak tersedia — mungkin sidang sudah ditutup atau url salah.',
  'notFound.cta': 'Ke Beranda',
} satisfies typeof enA;
