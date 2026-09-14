/** Bagian kamus: Jurnal Sidang (/journal), Profil Emiten (/ticker/:t), dan
 * diagram harga bersama (components/PriceChart).
 *
 * Kunci di sini WAJIB berprefiks `journal.`, `ticker.`, atau `chart.`.
 *
 * Catatan: prosa yang DIHASILKAN LLM (putusan, argumen jaksa/pembela, ringkasan
 * analis) tidak boleh masuk kamus — backend hanya berbahasa Indonesia, jadi teks
 * itu tetap apa adanya di kedua mode bahasa.
 *
 * Label putusan sengaja TIDAK diduplikasi di sini: KPI dan chip filter jurnal
 * membaca `labels.verdict` supaya satu kategori tidak pernah punya dua nama.
 */
export const enB = {
  // -- Jurnal Sidang (/journal) ---------------------------------------------
  'journal.crumb.home': 'Home',
  'journal.kicker': 'Verdict archive',
  'journal.title': 'Trial <em>Journal</em>',
  'journal.lede': 'Every case the SIDANG research committee has ever ruled on.',

  'journal.kpi.total': 'Total cases',
  'journal.filter.all': 'All ({n})',
  /** Chip putusan: label diambil dari `labels.verdict`, jadi hanya angkanya
   * yang perlu disisipkan di sini. */
  'journal.filter.verdict': '{label} ({n})',
  'journal.search.placeholder': 'Search ticker / issuer…',
  'journal.search.aria': 'Search the trial journal',

  'journal.error.load': 'The journal could not be loaded.',
  'journal.empty.title': 'No trials yet.',
  'journal.empty.body':
    'The committee has not ruled on any case yet. Start the first trial from the issuer list.',
  'journal.empty.cta': 'Go to case files',
  'journal.filterEmpty': 'No case matches the filter or the search term "{q}".',
  'journal.filterReset': 'Reset filters & search',

  'journal.table.date': 'Date',
  'journal.table.ticker': 'Ticker',
  'journal.table.issuer': 'Issuer',
  'journal.table.verdict': 'Verdict',
  'journal.table.richness': 'Data richness',
  'journal.table.price': 'Price at trial',
  'journal.table.actions': 'Actions',
  'journal.action.memo': 'Memo',
  'journal.action.postmortem': 'Post-mortem',
  'journal.action.postmortemTitle': 'Post-mortem: price performance since the verdict',

  // -- Profil Emiten (/ticker/:ticker) --------------------------------------
  'ticker.crumb.current': 'Issuer file',
  /** Nama pengganti saat backend belum mengenal nama emitennya. */
  'ticker.issuerFallback': 'IDX issuer',
  'ticker.lastVerdict.line': 'Price at the last verdict: <b>{price}</b> · <em>{date}</em>',
  'ticker.cta.start': 'Open trial',
  'ticker.cta.duration': '· about 3 min',
  'ticker.cta.title': 'Start a trial for {ticker}',
  'ticker.error.start': 'Could not start the trial. Try again.',

  'ticker.kicker.archive': 'Archive',
  'ticker.chart.title': 'Price history',
  'ticker.chart.note': 'SINCE THE LAST MEMO · {n} TRIALS',
  'ticker.chart.missing':
    'No price series is available for this trial — open a new trial to capture a fresh snapshot.',
  'ticker.chart.loading': 'Loading the price series…',
  'ticker.chart.foot':
    'Prices come from the trial archive, not live data. <b>Min {min} · Max {max}</b> since the last memo.',

  'ticker.history.title': 'Trial history',
  'ticker.table.date': 'Date',
  'ticker.table.verdict': 'Verdict',
  'ticker.table.richness': 'Data richness',
  'ticker.table.price': 'Price at trial',
  'ticker.table.docs': 'Documents',
  'ticker.action.memo': 'Memo',
  'ticker.action.postmortem': 'Post-mortem',
  'ticker.action.postmortemTitle': 'Post-mortem: price since the verdict',

  'ticker.empty.loading': 'Loading the history…',
  /** Tanpa nama emiten yang diketahui, ticker saja sudah cukup jelas. */
  'ticker.empty.title': '{ticker} has never stood trial',
  'ticker.empty.body':
    'The first trial will gather evidence from five analysts, then the judge writes a full research memorandum for {ticker}.',

  // -- Diagram harga (components/PriceChart) --------------------------------
  'chart.aria': 'Price chart from {from} to {to}',
  'chart.axis.max': 'Max: {value}',
  'chart.axis.min': 'Min: {value}',
  'chart.hint': 'Hover the chart to see price details',
};
