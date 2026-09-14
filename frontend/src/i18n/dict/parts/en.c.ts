/** Bagian kamus: Post-mortem (/journal/:id/postmortem) dan Memorandum (/memo/:id).
 *
 * Kunci di sini WAJIB berprefiks `postmortem.` atau `memo.`.
 *
 * Catatan: prosa yang DIHASILKAN LLM (putusan, argumen jaksa/pembela, ringkasan
 * analis, fakta kunci) tidak boleh masuk kamus — backend hanya berbahasa
 * Indonesia, jadi teks itu tetap apa adanya di kedua mode bahasa.
 *
 * `postmortem.outcome.*` adalah satu-satunya prosa penilaian yang ditulis
 * frontend sendiri (bukan keluaran LLM), jadi ikut diterjemahkan. Angkanya
 * masuk lewat parameter `{pct}`, bukan dirangkai dengan `+`, supaya urutan kata
 * Inggris bebas berbeda dari Indonesia.
 */
export const enC = {
  // -- post-mortem: kerangka ------------------------------------------------
  'postmortem.crumb.journal': 'Trial Journal',
  'postmortem.crumb.here': 'Post-mortem',
  'postmortem.error.title': 'Trial post-mortem not found',
  'postmortem.error.load': 'Post-mortem could not be loaded.',
  'postmortem.error.back': 'Back to Journal',
  'postmortem.kicker': 'Verdict Review',
  'postmortem.head.verdictOn': 'Verdict on <b>{date}</b>',
  'postmortem.head.newTrial': 'Appeal Trial / New Profile',

  // -- post-mortem: kartu evaluasi akurasi ----------------------------------
  'postmortem.outcome.kicker': 'Thesis Accuracy Audit',
  'postmortem.outcome.noData.title': 'Limited Data',
  'postmortem.outcome.noData.badge': 'Awaiting Data',
  'postmortem.outcome.noData.desc':
    'Market price history since the trial date is not yet long enough to test how significant the thesis is.',
  'postmortem.outcome.hitUp.title': 'Bullish Thesis on Target',
  'postmortem.outcome.hitUp.badge': 'Thesis Accurate · Bull',
  'postmortem.outcome.hitUp.desc':
    'The "{verdict}" verdict proved accurate. The share price has gained <em>{pct}</em> since the memorandum was signed off.',
  'postmortem.outcome.hitDown.title': 'Market Divergence (Re-evaluate)',
  'postmortem.outcome.hitDown.badge': 'Market Divergence',
  'postmortem.outcome.hitDown.desc':
    'The share price weakened <em>{pct}</em>, running counter to the optimism of the verdict. Worth investigating whether fresh fundamentals or a macro correction are behind it.',
  'postmortem.outcome.hitFlat.title': 'Consolidation / Neutral Market',
  'postmortem.outcome.hitFlat.badge': 'Consolidation',
  'postmortem.outcome.hitFlat.desc':
    'The share price has moved sideways (<em>{pct}</em>) around the verdict price. The market is still consolidating the catalyst.',
  'postmortem.outcome.flagDown.title': 'Risk Protection Worked',
  'postmortem.outcome.flagDown.badge': 'Protection Worked · Red Flag',
  'postmortem.outcome.flagDown.desc':
    'The committee warning protected investor capital. The share price dropped <em>{pct}</em>, validating the severe red flag findings from the prosecution.',
  'postmortem.outcome.flagUp.title': 'Anomalous Rally',
  'postmortem.outcome.flagUp.badge': 'Speculative Anomaly',
  'postmortem.outcome.flagUp.desc':
    'Despite the severe red flag, the stock rallied <em>{pct}</em>. Watch for speculative pump-style moves or a sudden recovery catalyst.',
  'postmortem.outcome.flagFlat.title': 'Stock Under Pressure',
  'postmortem.outcome.flagFlat.badge': 'Risk Confirmed',
  'postmortem.outcome.flagFlat.desc':
    'The stock failed to rally (<em>{pct}</em>), confirming the defensive stance of the committee was the rational call.',
  'postmortem.outcome.cautionDown.title': 'Caution Proved Right',
  'postmortem.outcome.cautionDown.badge': 'Validated · Caution',
  'postmortem.outcome.cautionDown.desc':
    'The caution of the committee proved well founded, with the price weakening by <em>{pct}</em>.',
  'postmortem.outcome.cautionUp.title': 'Rally Monitored',
  'postmortem.outcome.cautionUp.badge': 'Monitored',
  'postmortem.outcome.cautionUp.desc':
    'The stock posted a gain of <em>{pct}</em>, and the risk verification questions still need watching.',

  // -- post-mortem: grafik harga --------------------------------------------
  'postmortem.chart.title': 'The <em>price</em> journey',
  'postmortem.chart.archiveNote': 'ARCHIVE · NOT REAL-TIME',
  'postmortem.chart.empty':
    'No price series yet — this ticker needs at least two data points since the memorandum.',
  'postmortem.chart.aria': 'Price chart from {from} to {to}, with a marker for the verdict date',
  'postmortem.chart.marker': 'VERDICT',
  'postmortem.chart.now': 'now',
  'postmortem.chart.vsTrial': '{pct} vs Trial',

  // -- post-mortem: ringkasan & langkah lanjutan ----------------------------
  'postmortem.sum.priceAtTrial': 'Price at verdict',
  'postmortem.sum.priceNow': 'Latest price',
  'postmortem.sum.latestArchive': 'newest archive',
  'postmortem.sum.delta': 'Change',
  'postmortem.sum.sinceVerdict': 'since the verdict',
  'postmortem.sum.sinceVerdictDays': 'since the verdict · {n} days',
  'postmortem.verdict.kicker': 'Original Committee Verdict · {date}',
  'postmortem.verdict.openMemo': 'Open Memorandum Document →',
  'postmortem.verdict.questions': 'Verification Questions at Trial:',
  'postmortem.next.title': 'Next Analysis Steps',
  'postmortem.next.memo.kicker': '📄 Memorandum',
  'postmortem.next.memo.title': 'Re-read the Trial Arguments',
  'postmortem.next.memo.desc':
    'Review the prosecutor vs defence debate and the smart money data this verdict was built on.',
  'postmortem.next.memo.cta': 'Open Memorandum →',
  'postmortem.next.retrial.kicker': '⚖️ Appeal Trial',
  'postmortem.next.retrial.title': 'Start a New {ticker} Trial',
  'postmortem.next.retrial.desc':
    'Run the committee again on the most recent financial statements and market transactions.',
  'postmortem.next.retrial.cta': 'Hold a New Trial →',
  'postmortem.next.board.kicker': '🔍 Detective Board',
  'postmortem.next.board.title': 'Explore the Shareholding Web',
  'postmortem.next.board.desc':
    'Find other issuers in the same ownership group to see whether a similar price pattern shows up.',
  'postmortem.next.board.cta': 'Open Detective Board →',

  // -- memorandum: kerangka & aksi ------------------------------------------
  'memo.crumb.cases': 'Case Files',
  'memo.crumb.here': 'Memorandum',
  'memo.error.title': 'Memorandum not available yet',
  'memo.error.load': 'The memorandum could not be loaded.',
  'memo.error.backTrial': 'Back to Trial',
  'memo.error.journal': 'Trial Journal',
  'memo.action.copy': 'Copy Summary',
  'memo.action.copyTitle': 'Copy the memo summary text to the clipboard',
  'memo.action.copied': 'Copied to Clipboard!',
  'memo.action.print': 'Print / Save PDF',
  'memo.action.printTitle': 'Print or save as PDF',

  // -- memorandum: kepala dokumen -------------------------------------------
  // Nilai `data_mode` (fixture/live) dan `info_richness` (A/B/C) dulu dicetak
  // mentah; sekarang lewat label terbaca.
  'memo.head.mode.fixture': 'Data mode · Fixture',
  'memo.head.mode.live': 'Data mode · Live',
  'memo.head.richness': 'Info · {richness}',
  'memo.head.signed': 'Signed off {at} · Trial {trialId}',
  'memo.seal.top': 'TRIAL · RESEARCH',
  'memo.seal.mid': 'Signed',
  'memo.seal.bottom': 'VERDICT COMMITTEE',
  'memo.hero.kicker': 'Committee Verdict',
  'memo.hero.confidence': 'Confidence',

  // -- memorandum: teks yang disalin ke clipboard ---------------------------
  // Kerangka teks salinan milik frontend, jadi ikut bahasa UI. Isi prosa di
  // dalamnya tetap Bahasa Indonesia karena datang dari backend.
  'memo.copy.title': 'TRIAL RESEARCH VERDICT MEMORANDUM',
  'memo.copy.issuer': 'Issuer',
  'memo.copy.caseNo': 'Case number',
  'memo.copy.trial': 'Trial',
  'memo.copy.signed': 'Signed off',
  'memo.copy.verdict': 'Verdict',
  'memo.copy.confidence': 'Confidence',
  'memo.copy.execSummary': 'EXECUTIVE SUMMARY',
  'memo.copy.rationale': 'VERDICT RATIONALE',
  'memo.copy.questions': 'VERIFICATION QUESTIONS EVERY INVESTOR MUST ANSWER',
  'memo.copy.redFlags': 'RED FLAG FINDINGS',
  'memo.copy.noRedFlags': 'No red flags',
  'memo.copy.footer': 'Indonesian Stock Market Trial Research Platform (Hakim)',

  // -- memorandum: judul seksi ----------------------------------------------
  'memo.section.summary.kicker': 'Summary',
  'memo.section.summary.title': 'Executive Summary',
  'memo.section.rationale.kicker': 'Rationale',
  'memo.section.rationale.title': 'Reasoning behind the verdict',
  'memo.section.verify.kicker': 'Verification',
  'memo.section.verify.title': 'Answer these before you invest',
  'memo.section.facts.kicker': 'Facts',
  'memo.section.facts.title': 'Key Facts',
  'memo.section.facts.note': 'Quiet table · hairline',
  'memo.section.debate.kicker': 'Debate',
  'memo.section.debate.title': 'Opposing Theses',
  'memo.section.debate.note': 'Hover a citation to see its value',
  'memo.section.flow.kicker': 'Flow',
  'memo.section.flow.title': 'Smart Money & Insider',
  'memo.flow.smartmoney.title': 'Smart Money',
  'memo.flow.smartmoney.kicker': 'Institutional flow',
  'memo.flow.insider.title': 'Insider',
  'memo.flow.insider.kicker': 'Board transactions',
  'memo.section.redflags.kicker': 'Warnings',
  'memo.section.redflags.title': 'Red Flags',
  'memo.redflags.empty': 'No red flags on record.',

  // -- memorandum: tabel audit sumber data -----------------------------------
  'memo.section.audit.kicker': 'Audit',
  'memo.section.audit.title': 'Data Sources',
  'memo.section.audit.noteReal': 'Real Sectors calls · cache',
  'memo.section.audit.noteFallback': 'Sectors endpoints · cache',
  'memo.audit.table.endpoint': 'Endpoint',
  'memo.audit.table.param': 'Param',
  'memo.audit.table.cache': 'Cache',
  'memo.audit.table.retrieved': 'Retrieved',
  'memo.audit.calledBy': 'called by {agent}',
  'memo.audit.cacheHitTitle': 'Data still in the local cache (7 days) — 0 credits',
  'memo.audit.cacheMissTitle': 'Fetched straight from the Sectors API — credits used',
  // `hit`/`miss` sengaja tetap literal — itu istilah teknis dari API dan
  // pasangan istilahnya dipakai di sel tabel di atasnya. Penanda `<b>`/`<em>`
  // di sini hanya kait warna, bukan penekanan.
  'memo.audit.legend':
    '<b>hit</b> = data from the local cache (7-day TTL, 0 credits) · <em>miss</em> = fetched straight from the Sectors API (credits used). The first trial of a ticker is almost entirely misses — the cache saves credits on shared endpoints (indices, top-changes, issuer list).',

  // -- memorandum: tabel fakta kunci ----------------------------------------
  'memo.facts.empty': 'No key facts on record.',
  'memo.facts.table.id': 'ID',
  'memo.facts.table.metric': 'Metric',
  'memo.facts.table.value': 'Value',
  'memo.facts.table.asOf': 'As of',
  'memo.facts.table.source': 'Source',

  // -- memorandum: kartu tesis ----------------------------------------------
  // Nama peran sengaja RINGKAS: judul kartu 18px bersebelahan dengan pil
  // Bull/Bear, jadi label panjang ala `enum.agent.*` akan mendorong tata letak.
  'memo.thesis.bull.role': 'Defence',
  'memo.thesis.bull.tag': 'Bull',
  'memo.thesis.bear.role': 'Prosecution',
  'memo.thesis.bear.tag': 'Bear',

  // -- memorandum: tindakan lanjutan ----------------------------------------
  'memo.section.explore.kicker': 'Explore',
  'memo.section.explore.title': 'Next Actions & Investigation',
  'memo.section.explore.note': 'Suggested next analysis steps',
  'memo.next.profile.kicker': 'Case File',
  'memo.next.profile.title': 'Full {ticker} Profile',
  'memo.next.profile.desc':
    'Open the in-depth financial dossier, historical valuation moves, and fundamental summary for {ticker}.',
  'memo.next.profile.cta': 'Open Ticker Profile →',
  'memo.next.board.kicker': '🔍 Evidence Board',
  'memo.next.board.title': 'Detective Board / Network',
  'memo.next.board.desc':
    'Visualise the ownership threads of conglomerates, sector clusters, and market anomalies.',
  'memo.next.board.cta': 'Investigate on the Detective Board →',
  'memo.next.postmortem.kicker': 'Verdict Review',
  'memo.next.postmortem.title': 'Postmortem & Track Record',
  'memo.next.postmortem.desc':
    'Test the accuracy of the "{verdict}" thesis against realised market prices over time.',
  'memo.next.postmortem.cta': 'Audit Verdict Accuracy →',
};
