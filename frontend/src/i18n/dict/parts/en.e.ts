/** Bagian kamus: Papan Detektif (/board) dan pesan galat milik frontend
 * (api/mockRest.ts).
 *
 * Kunci di sini WAJIB berprefiks `board.` atau `mockErr.`.
 *
 * Teks papan yang dibangun BACKEND (label simpul/sisi dari payload, balasan
 * chat) tidak masuk kamus — backend tidak berubah, jadi teks itu tetap
 * Indonesia di kedua mode. Panel chat diberi satu keterangan kejujuran
 * (`board.chatNote`) supaya pembaca mode EN tidak mengira itu bug.
 *
 * Yang TIDAK diterjemahkan di halaman ini, dan alasannya:
 * - `getSmartPromptChips()`: teks chip = isi pesan yang DIKIRIM ke backend
 *   (yang hanya berbahasa Indonesia), bukan chrome UI. Menerjemahkannya
 *   membuat percakapan campur bahasa; `board.chatNote` sudah menjelaskan
 *   bahwa jawabannya berbahasa Indonesia.
 * - `initialChat` di mockRest: itu payload tiruan backend, bukan pesan galat.
 */
export const enE = {
  // -- pesan galat mock (api/mockRest.ts) ------------------------------------
  // mockRest bukan komponen React, jadi tidak bisa memakai hook `useLang()`.
  // Pesannya diambil dari kamus ini lewat `readStoredLang()` saat galat
  // dilempar — lihat catatan di berkasnya.
  'mockErr.tickerUnknown': 'Unknown ticker',
  'mockErr.memoNotReady': 'Memorandum is not ready yet',
  'mockErr.postmortemMissing': 'Post-mortem not found',

  // -- kepala halaman --------------------------------------------------------
  'board.header.kicker': 'Deeper analysis',
  'board.header.crumb': 'Detective Evidence Board',
  // Penekanan pindah ke kata lain: ID menebalkan "Detektif", EN menebalkan
  // "Evidence" — inilah alasan penanda `<em>` ada di dalam string kamus.
  'board.title': 'Detective <em>Evidence</em> Board',
  'board.subtitle':
    'Explore the graph of ownership ties, key people, and red-flag evidence for <b>issuers that have passed trial</b> (Worth research & Caution verdicts).',

  // -- panel kiri: daftar emiten --------------------------------------------
  'board.emiten.title': 'Issuers cleared by trial',
  'board.emiten.count': '{n} cases',
  'board.emiten.note':
    'Lists only issuers with a verdict of <b>{layak}</b> or <b>{hati}</b>.',
  'board.emiten.search': 'Search issuers…',
  'board.emiten.clear': 'Clear filter',
  'board.emiten.empty': 'No cleared issuer matches "{q}".',
  'board.emiten.richness': 'Richness {grade}',

  // -- panel kiri: legenda ---------------------------------------------------
  'board.legend.title': 'Filters & legend',
  'board.legend.cross': 'Cross-issuer red thread <em>· not yet available</em>',
  'board.legend.crossTitle':
    'Not available yet: the board holds a single issuer, so there are no cross-issuer threads to draw.',

  // -- kanvas: bilah alat ----------------------------------------------------
  'board.canvas.title': 'Board · <b>{ticker}</b>',
  'board.canvas.focus': 'Focus: {name}',
  // Saklar ini yang membuka/menutup jenis bukti di legenda, jadi ia juga
  // pemegang `aria-pressed` untuk panel legenda.
  'board.canvas.compact': 'Compact',
  'board.canvas.compactTitle': 'Back to the compact view (issuer, shareholders, key people)',
  'board.canvas.expand': 'Expand network',
  'board.canvas.expandTitle':
    'Show all evidence: red flags, news items, numeric facts, broker traces',
  'board.canvas.reset': 'Reset to {ticker}',
  'board.canvas.resetTitle': 'Reset focus to the main issuer {ticker}',
  'board.canvas.stats': '{cards} active cards · {threads} threads',
  'board.canvas.center': 'Centre',
  'board.canvas.centerTitle': 'Zoom to the focus card (readable scale)',
  'board.canvas.fitAll': 'Fit all',
  'board.canvas.fitAllTitle': 'Show the whole network (cards shrink)',
  'board.canvas.scrollHint': 'Scroll wheel = page scroll · Ctrl + wheel = canvas zoom',

  // -- kanvas: status muat & galat ------------------------------------------
  'board.loading':
    'Assembling the investigation file for <b>{ticker}</b> from the trial & Sectors…',
  'board.error.title': '⚠ Failed to load investigation data',
  'board.error.retry': 'Reload',
  'board.error.loadFailed': 'Failed to load data',
  'board.error.loadFailedTicker':
    'Failed to load investigation data for {ticker} from the server.',

  // -- kartu papan -----------------------------------------------------------
  'board.card.center': 'Focus centre',
  'board.card.cross': 'cross-issuer',
  'board.card.retrieved': 'Source retrieved {date}',
  'board.card.archive': 'archive',

  // -- inspektur simpul (panel kanan) ---------------------------------------
  'board.inspector.title': 'Evidence detail (focus centre)',
  'board.inspector.empty': 'Select a card on the board.',
  'board.inspector.source': 'Source: {name}',
  'board.inspector.retrieved': 'Retrieved: <b>{date}</b>',

  // -- panel kanan: daftar benang -------------------------------------------
  'board.related.title': 'Connected threads ({n})',
  'board.related.empty': 'No active threads.',
  'board.related.hidden': '{n} threads hidden by the type filters.',

  // -- seksi bawah: kepala ---------------------------------------------------
  'board.insight.kicker': 'AI Judge analysis & intelligence room',
  'board.insight.title': 'Investigation breakdown & <em>{ticker}</em> matrix',
  'board.insight.mode': 'Objective analysis mode',

  // -- panel chat ------------------------------------------------------------
  'board.chat.title': 'Ask the investigation assistant ({ticker})',
  'board.chat.focus': 'Focus: <b>{name}</b>',
  // Keterangan kejujuran: backend penjawab chat hanya berbahasa Indonesia.
  'board.chatNote': 'Answers are generated in Indonesian.',
  'board.chat.greeting':
    'Investigation board {ticker} is live. Ask about ownership, directors, or audit facts.',
  'board.chat.greetingShort': 'Investigation board {ticker} is live.',
  'board.chat.loadingInitial': 'Loading investigation data for {ticker}…',
  // Jawaban heuristik lokal saat server tidak terjangkau — kerangkanya milik
  // frontend, jadi ikut bahasa UI walau tampil di gelembung asisten.
  'board.chat.localFallback':
    'Thread analysis for {ticker}: found {n} active related entities around focus {focus}. (Local answer — the server could not be reached.)',
  'board.chat.from': 'AI Judge analysis:',
  'board.chat.heuristic': 'heuristic',
  'board.chat.heuristicTitle':
    'No LLM available — the answer is assembled from board data, not written by a language model.',
  'board.chat.modelTitle': 'Answered by model {model}.',
  'board.chat.busyAria': 'The assistant is searching the {ticker} board',
  'board.chat.busy': 'Searching the {ticker} board… weighing threads of evidence & red flags',
  'board.chat.suggestions': 'Suggested questions ({name}):',
  'board.chat.chipBusyTitle': 'Wait for the previous answer to finish first.',
  'board.chat.chipTitle': 'Click to ask the AI this question right away',
  'board.chat.placeholderBusy': 'Waiting for the answer about {name}…',
  'board.chat.placeholder': 'Ask your own question about {name}…',
  'board.chat.send': 'Send',
  'board.chat.sending': 'Analysing…',
  'board.chat.disclaimer':
    '⚖️ The AI Judge presents objective data & risk analysis for independent research (not a trading recommendation).',

  // -- grafik harga ----------------------------------------------------------
  'board.chart.title': 'Price movement · {ticker}',
  'board.chart.empty': 'No price chart available.',
  'board.chart.endLabel': 'Today',

  // -- benchmark metrik ------------------------------------------------------
  'board.benchmark.title': 'Valuation vs industry average',
  'board.benchmark.thesis': 'AI Judge investigation thesis:',
  'board.benchmark.superior': 'Superior',
  'board.benchmark.fair': 'Fair',
  'board.benchmark.watch': 'Watch',
  'board.benchmark.sector': 'Sector: {value}',
};
