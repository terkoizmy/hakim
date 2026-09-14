/** Bagian kamus: Beranda (/), Berkas Perkara (/dashboard), dan 404.
 *
 * Kamus dipisah per bagian supaya tiap domain bisa disusun tanpa berebut satu
 * berkas besar. Kunci di sini WAJIB berprefiks `home.`, `dashboard.`, atau
 * `notFound.` — sebaran (spread) di ./en.ts tidak memunculkan galat tsc untuk
 * kunci kembar, jadi tabrakan nama hanya terlihat sebagai nilai yang tertimpa.
 *
 * Catatan: prosa yang DIHASILKAN LLM (putusan, argumen jaksa/pembela,
 * ringkasan analis, fakta kunci) tidak masuk kamus — backend hanya berbahasa
 * Indonesia. Yang ada di sini murni chrome UI, termasuk kartu contoh
 * (showcase) di beranda yang teksnya memang hardcoded di halaman.
 *
 * Nama halaman dipakai KONSISTEN di seluruh berkas ini dan berkas halaman
 * lain: `/` = Home, `/dashboard` = Case Files, `/journal` = Journal. Dulu
 * beranda menyebut tujuan yang sama dengan tiga nama berbeda ("Daftar
 * Perkara", "Berkas Perkara", "Sidang").
 */
export const enA = {
  // -- beranda: hero --------------------------------------------------------
  // Pil fitur di atas judul. "Indonesian" di sini adalah bahasa KELUARAN
  // sidang (prosa backend), bukan bahasa antarmuka.
  'home.hero.badge': 'Multi-Agent · Sectors Data · Indonesian',
  'home.hero.title': 'Before you buy, put it on <em>trial</em>.',
  'home.hero.lead':
    'Five analysts dig through Sectors data — the <b>bear prosecutor</b> debates the <b>bull defence counsel</b> across two rounds, then the <b>judge writes the research memo</b>. All streamed, all archived.',

  // -- beranda: formulir ticker --------------------------------------------
  'home.form.tickerPlaceholder': 'STOCK CODE',
  // aria-label: pembaca layar tidak melihat placeholder bergaya mono.
  'home.form.tickerLabel': 'Four-letter stock code',
  'home.form.submit': 'Start Trial',
  'home.form.note': '±3 minutes · no account · no cost',
  // Ditempel setelah pesan galat dari API (yang tetap Bahasa Indonesia).
  'home.form.errorHint': '— make sure the IDX ticker is 4 letters.',
  'home.form.invalid': 'The code must be 4 letters (e.g. BBCA, CUAN).',
  'home.error.start': 'Could not start the trial. Please try again.',

  // Tautan cepat di bawah formulir — memakai nama halaman yang sama dengan
  // navigasi utama (dulu: "Lihat Daftar Perkara" dan "Jurnal Sidang").
  'home.links.cases': 'Case Files',
  'home.links.journal': 'Journal',

  // -- beranda: kartu contoh putusan ---------------------------------------
  'home.showcase.num': 'I · VERDICT',
  'home.showcase.title': 'See the <em>verdict</em> first.',
  'home.showcase.caseMeta': 'CASE No. 2024-118 · BANKING SECTOR',
  'home.showcase.confidence': 'CONFIDENCE',
  'home.showcase.cited': 'Cited evidence',
  'home.showcase.evidence1':
    'Net interest margin held steady last quarter, backed by retail credit growth.',
  'home.showcase.evidence2':
    'NPL ratio is under control, below the sector average; provisions are adequate.',
  'home.showcase.evidence3':
    'Valuation sits inside its historical range, with no suspicious volume spikes.',
  'home.showcase.byline': 'WRITTEN BY THE JUDGE · 2 DEBATE ROUNDS',
  'home.showcase.archive': 'OPEN ARCHIVE',
  'home.showcase.card1.body':
    'Balanced evidence, healthy fundamentals. Goes on the watchlist for follow-up research.',
  'home.showcase.card2.body':
    'Mixed signals — there is growth, but the risk is measurable. Needs verification.',
  'home.showcase.card3.body':
    'Anomalies detected in several metrics. Not recommended for follow-up.',
  // Baris contoh memakai LABEL kekayaan informasi, bukan grade mentah "INFO A".
  'home.showcase.sampleTicker': 'EXAMPLE · {ticker} · {grade}',
  'home.showcase.sampleGrade': 'EXAMPLE · {grade}',

  // -- beranda: cara kerja --------------------------------------------------
  'home.how.num': 'II · HOW IT WORKS',
  // Penekanan sengaja pindah ke "three acts": urutan kata Inggris tidak sama
  // dengan Indonesia, dan itu boleh — penanda <em> ada di dalam string kamus.
  'home.how.title': 'A trial in <em>three acts</em>.',
  'home.how.act': 'ACT {n}',
  'home.how.step1.title': 'Five analysts dig for evidence',
  'home.how.step1.body':
    'Every figure used is cited back to a Sectors API endpoint.',
  'home.how.step2.title': 'Two debate rounds, live',
  'home.how.step2.body':
    'Bear prosecutor vs. bull defence counsel — no black box, all of it out in the open.',
  'home.how.step3.title': 'The judge writes the memo',
  'home.how.step3.body':
    'A final research summary with a clear category and a clear confidence score.',

  // -- beranda: kredibilitas ------------------------------------------------
  'home.cred.cite.title': 'Every figure is cited',
  'home.cred.cite.body':
    'Every claim points back to a Sectors API endpoint — you can check it yourself.',
  'home.cred.transparent.title': 'Transparent and archived',
  'home.cred.transparent.body':
    'Debates and memos are kept — nothing about the process is hidden.',
  'home.cred.noAdvice.title': 'No buy or sell calls',
  'home.cred.noAdvice.body':
    'Research categories only — the decision stays entirely with you.',

  // -- beranda: ajakan ke jurnal -------------------------------------------
  'home.journal.eyebrow': 'Journal',
  'home.journal.title': "Every verdict is <em>archived</em>. Post-mortems vs. today's price.",
  'home.journal.body':
    'Every case ever tried is kept on file. Come back later, compare the verdict with how the price actually moved — and see where the research landed and where it missed.',
  'home.journal.cta': 'Open Journal',

  // -- berkas perkara (/dashboard) -----------------------------------------
  'dashboard.crumb.home': 'Home',
  'dashboard.crumb.current': 'Case Files',
  'dashboard.title': 'Case <em>Files</em>',
  'dashboard.lead':
    'Every IDX-listed issuer — click a row to open its case file and put it on trial.',
  'dashboard.search.placeholder': 'Search ticker or issuer name…',
  'dashboard.search.aria': 'Search issuers',
  'dashboard.sector.label': 'Sector:',
  'dashboard.sector.all': 'All sectors',
  // Baris hitungan di atas tabel; dirakit dari tiga potongan supaya urutan
  // katanya bebas berbeda antar bahasa. Huruf besar dipertahankan karena
  // potongan ini bergaya mono-meta.
  'dashboard.count.showing': 'SHOWING {shown} OF {total} CASES',
  'dashboard.count.sector': ' — SECTOR {sector}',
  'dashboard.count.hint': ' — TYPE TO SEARCH OR SCROLL + LOAD MORE',
  'dashboard.count.fallback': 'SHOWING CASE LIST',
  'dashboard.th.ticker': 'Ticker',
  'dashboard.th.issuer': 'Issuer',
  'dashboard.th.verdict': 'Latest verdict',
  'dashboard.th.trials': 'Trials',
  'dashboard.th.lastTried': 'Last tried',
  'dashboard.th.price': 'Price at trial',
  'dashboard.badge.notTried': 'Not yet tried',
  // Nama perusahaan kosong dari registry — jangan cetak sel kosong.
  'dashboard.issuerFallback': 'IDX issuer',
  'dashboard.empty': 'No cases match your search.',
  'dashboard.fallbackNote':
    'Showing sample tickers — the backend issuer list is not available yet.',
  'dashboard.loading': 'Loading…',
  'dashboard.loadMore': 'Load {n} more',
  'dashboard.row.title': 'Open {ticker} details',
  'dashboard.aside.eyebrow': 'Archive',
  'dashboard.aside.title': 'Recent trials',
  'dashboard.aside.open': 'Open {ticker} memo',
  'dashboard.aside.note':
    'Click a row to open the full research memo from that trial.',

  // -- 404 ------------------------------------------------------------------
  'notFound.title': 'This courtroom does not exist',
  'notFound.body':
    'The page you were looking for is not available — the trial may have closed, or the URL is wrong.',
  'notFound.cta': 'Back to Home',
};
