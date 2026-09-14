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
export const en = {
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
};

/** Kunci kamus yang sah — diambil dari kamus kanonik. */
export type DictKey = keyof typeof en;
