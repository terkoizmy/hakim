/**
 * Kamus kanonik — berkas ini yang MENDEFINISIKAN kunci.
 *
 * `dict/id.ts` ditulis `satisfies typeof en`, jadi kunci yang hilang di
 * terjemahan Indonesia langsung menggagalkan `npm run typecheck`. Untuk
 * menambah teks: tambahkan di sini dulu, lalu di id.ts.
 *
 * Konvensi nilai:
 * - Penekanan di tengah kalimat memakai penanda `<b>…</b>` / `<em>…</em>`
 *   (lihat `rich.tsx`), bukan pemecahan JSX.
 * - Sisipan nilai memakai `{nama}`, mis. `Load {n} more`.
 * - Nama sengaja memakai kunci bertitik datar (bukan objek bersarang) supaya
 *   `keyof` bisa dipakai sebagai tipe kunci: `t('nav.jurnl')` = error tsc.
 */
// Kamus dipisah: `enCore` berisi kerangka aplikasi + seluruh label enum, lalu
// bagian per halaman masuk lewat parts/ supaya tiap domain bisa disusun tanpa
// berebut satu berkas besar.
import { enA } from './parts/en.a';
import { enB } from './parts/en.b';
import { enC } from './parts/en.c';
import { enD } from './parts/en.d';
import { enE } from './parts/en.e';

export const enCore = {
  // -- dokumen ---------------------------------------------------------------
  'meta.title': 'SIDANG — Indonesian Stock Market Trial',
  'meta.description':
    'Before you buy, put it on trial. Multi-agent AI researches IDX stocks: prosecutor vs defence counsel debating over Sectors data, committee verdict in 5 minutes.',

  // -- kerangka aplikasi (AppShell) -----------------------------------------
  'nav.brand': 'SIDANG — Home',
  'nav.aria': 'Main navigation',
  'nav.dashboard': 'Case Files',
  'nav.board': 'Detective Board',
  'nav.journal': 'Journal',
  // Tombol header dan menu menunjuk halaman yang sama — dulu keduanya beda
  // nama ("Berkas Perkara" vs "Daftar Perkara"), sekarang satu sumber.
  'nav.cta': 'Case Files',
  'nav.langLabel': 'Language',
  'nav.langSwitchTo': 'Show the interface in {lang}',
  'nav.badgeFixture': 'Fixture data — no API credits used',
  'nav.badgeLive': 'Connected to Sectors data',
  'nav.disclaimer':
    '<b>Global disclaimer No. 10.</b> SIDANG is a research aid, not investment advice. Every verdict, category, and confidence score is the output of automated analysis over archived data and does not guarantee predictive accuracy. Prices shown come only from the trial archive — <em>no real-time prices</em>. Investment decisions are entirely your own responsibility.',

  // -- label enum -----------------------------------------------------------
  // Dulu tersebar di 11 tabel di 8 berkas. Sekarang satu sumber, dan kamus
  // inilah yang menjamin tidak ada terjemahan yang tertinggal.
  //
  // Fase sidang sengaja RINGKAS: stepper di CourtroomPage memakai
  // `whitespace-nowrap` tepat di sebelah pil "RONDE n/2", jadi label panjang
  // seperti "Evidence Gathering" akan mendorong tata letak.
  'enum.phase.evidence': 'Evidence',
  'enum.phase.debate': 'Debate',
  'enum.phase.verdict': 'Verdict',

  'enum.agent.fundamental': 'Fundamental Analysis',
  'enum.agent.price': 'Price Analysis',
  'enum.agent.smartmoney': 'Smart Money',
  'enum.agent.insider': 'Insider',
  'enum.agent.antigorengan': 'Anti-Gorengan',
  'enum.agent.prosecutor': 'Prosecutor (Bear)',
  'enum.agent.defender': 'Defence Counsel (Bull)',
  'enum.agent.judge': 'Presiding Judge',

  // Putusan: SATU kapitalisasi (sentence case) untuk badge, kartu, dan judul
  // sekaligus. Dulu empat tabel memecah ini dengan tiga kapitalisasi berbeda
  // ("Layak diteliti lanjut" / "Layak Diteliti Lebih Lanjut" / "Layak diteliti
  // lanjut " + <em>), jadi teks yang sama tampil berbeda antar halaman.
  'enum.verdict.layak_diteliti_lanjut': 'Worth further research',
  'enum.verdict.perlu_kehati_hatian': 'Exercise caution',
  'enum.verdict.red_flag_berat': 'Severe red flag',
  // Versi berpenekanan untuk judul dokumen memo & h2 postmortem. Satu set
  // dipakai keduanya — penekanannya jatuh di kata pembeda.
  'enum.verdictDoc.layak_diteliti_lanjut': 'Worth further <em>research</em>',
  'enum.verdictDoc.perlu_kehati_hatian': 'Exercise <em>caution</em>',
  'enum.verdictDoc.red_flag_berat': 'Severe <em>red flag</em>',

  'enum.error.ticker_not_found': 'Unknown ticker',
  'enum.error.sectors_error': 'Data source unreachable',
  'enum.error.llm_error': 'Judge failed to reach a verdict',
  'enum.error.timeout': 'Trial exceeded the time limit',

  // Keparahan red flag. Dulu papan mencetak nilai data mentah ('HIGH')
  // sementara memo mencetak label ('Tinggi') — konsep yang sama, dua wajah.
  'enum.severity.low': 'Low',
  'enum.severity.medium': 'Medium',
  'enum.severity.high': 'High',

  // Arah transaksi (chip di MemoPage).
  'enum.direction.akumulasi': 'Accumulation',
  'enum.direction.distribusi': 'Distribution',
  'enum.direction.beli': 'Buy',
  'enum.direction.jual': 'Sell',

  // -- analis ---------------------------------------------------------------
  // Hanya nama & tagline. Monogram dan ikon tetap di utils/analysts.ts karena
  // keduanya tidak bergantung bahasa.
  'enum.analyst.fundamental.name': 'Fundamental',
  'enum.analyst.fundamental.tagline': 'Earnings & valuation',
  'enum.analyst.price.name': 'Price',
  'enum.analyst.price.tagline': 'Momentum & volume',
  'enum.analyst.smartmoney.name': 'Smart Money',
  'enum.analyst.smartmoney.tagline': 'Institutional flow',
  'enum.analyst.insider.name': 'Insider',
  'enum.analyst.insider.tagline': 'Insider transactions',
  'enum.analyst.antigorengan.name': 'Anti-Gorengan',
  'enum.analyst.antigorengan.tagline': 'Manipulation detection',

  // -- graf papan detektif --------------------------------------------------
  'enum.edge.memegang': 'holds shares in',
  'enum.edge.menjabat': 'sits on the board of',
  'enum.edge.aliran': 'transaction trace',
  'enum.edge.redflag': 'flags a red flag',
  'enum.edge.fakta': 'points to fact',
  'enum.edge.bukti': 'substantiated by',
  // Cadangan untuk jenis relasi yang belum dikenal frontend ini.
  'enum.edge.other': 'relation',

  'enum.nodeType.emiten': 'Issuer',
  'enum.nodeType.pemegang': 'Shareholder',
  'enum.nodeType.orang': 'Key Person',
  'enum.nodeType.aliran': 'Broker/Institution Trace',
  'enum.nodeType.redflag': 'Red Flag',
  'enum.nodeType.kabar': 'News Evidence',
  'enum.nodeType.fakta': 'Numeric Fact',

  // -- kekayaan informasi (badge Info A/B/C) --------------------------------
  // Sebelumnya badge hanya mencetak grade mentah ("Info A") sementara label
  // terbacanya cuma dipakai di atribut title — jadi pembaca tidak tahu artinya.
  'enum.richness.A': 'Rich data',
  'enum.richness.B': 'Adequate data',
  'enum.richness.C': 'Sparse data',
  'enum.richness.title': 'Information richness: {grade}',
};

/** Kamus kanonik lengkap: inti + bagian per halaman.
 *
 * Sebaran (spread) TIDAK memunculkan galat tsc untuk kunci kembar — kunci yang
 * sama di dua bagian hanya saling menimpa diam-diam. Karena itu tiap bagian
 * memakai prefiks namespace-nya sendiri. */
export const en = { ...enCore, ...enA, ...enB, ...enC, ...enD, ...enE };

/** Kunci kamus yang sah — diambil dari kamus kanonik. */
export type DictKey = keyof typeof en;
