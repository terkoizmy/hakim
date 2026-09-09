/**
 * Data mock Jurnal Sidang + Post-mortem (mode VITE_USE_MOCK=1).
 * Hanya untuk demo frontend — backend menggantinya dengan baris SQLite.
 */
import type {
  JournalItem,
  MemoJSON,
  PostmortemResponse,
  VerdictCategory,
} from '../types/contract';
import { SCHEMA_VERSION } from '../types/contract';

interface MockMemoSeed {
  memoId: string;
  trialId: string;
  ticker: string;
  companyName: string;
  createdAt: string;
  infoRichness: MemoJSON['info_richness'];
  verdictCategory: VerdictCategory;
  confidence: number;
  priceAtTrial: number;
}

const DISCLAIMER =
  'Memo ini adalah alat bantu riset & analisis, bukan rekomendasi investasi. Keputusan investasi sepenuhnya tanggung jawab masing-masing investor.';

function makeMemo(seed: MockMemoSeed): MemoJSON {
  const { memoId, trialId, ticker, companyName, createdAt, infoRichness, verdictCategory, confidence, priceAtTrial } = seed;
  const priceLabel = priceAtTrial >= 1000 ? 'Rp' + priceAtTrial.toLocaleString('id-ID') : `Rp ${priceAtTrial}`;
  return {
    schema_version: SCHEMA_VERSION,
    memo_id: memoId,
    trial_id: trialId,
    ticker,
    company_name: companyName,
    created_at: createdAt,
    data_mode: 'fixture',
    info_richness: infoRichness,
    executive_summary: `Sidang ${ticker} menyimpulkan bahwa emiten berada pada posisi ${verdictLabel(verdictCategory).toLowerCase()}. Data yang tersedia memadai untuk penilaian awal; investor diminta memverifikasi poin penting sebelum berkomitmen.`,
    key_facts: [
      { fact_id: 'f_1', label: 'last_price', value: priceAtTrial, unit: 'Rp', source_endpoint: `/v2/transaction/daily/${ticker}/`, as_of_date: createdAt.slice(0, 10) },
      { fact_id: 'f_2', label: 'price_volatility_30d', value: 4.1, unit: '%', source_endpoint: `/v2/transaction/daily/${ticker}/?range=30d`, as_of_date: createdAt.slice(0, 10) },
      { fact_id: 'f_3', label: 'free_float', value: 42, unit: '%', source_endpoint: `/v2/companies/?where=symbol=${ticker}`, as_of_date: createdAt.slice(0, 10) },
      { fact_id: 'f_4', label: 'foreign_net_30d', value: 96, unit: 'miliar Rp', source_endpoint: `/v2/transaction/foreign-flow/${ticker}/?range=30d`, as_of_date: createdAt.slice(0, 10) },
    ],
    bull_case: {
      title: 'Kasus pembelaan (bull)',
      points: [
        { point_id: 'bp_1', argument_md: `Lingkungan operasional mendukung: volatilitas 30 hari tetap terkendali (4,1%) dan free float 42% menjamin likuiditas institusi.`, cites: ['f_2', 'f_3'] },
        { point_id: 'bp_2', argument_md: `Arus dana asing 30 hari tercatat +Rp96 miliar — investor asing sedang menambah eksposur.`, cites: ['f_4'] },
      ],
    },
    bear_case: {
      title: 'Kasus penuntutan (bear)',
      points: [
        { point_id: 'br_1', argument_md: `Harga ${priceLabel} belum tentu sepadan dengan pertumbuhan fundamental; pastikan valuasi dibandingkan dengan peers subsector.`, cites: ['f_1'] },
      ],
    },
    smart_money_findings: [
      { finding_md: 'Cohort institusi menunjukkan pembelian bersih namun belum dominan (netral-menjelang-akumulasi).', direction: 'netral', cites: ['f_4'] },
    ],
    insider_findings: [
      { finding_md: 'Filings 90 hari tidak memuat transaksi insider yang material.', direction: 'netral', cites: [] },
    ],
    red_flags: [
      { flag_md: 'Data historis pendek/terbatas menurunkan kualitas konfirmasi — perlakukan sebagai kelas informasi rendah.', severity: infoRichness === 'C' ? 'high' : 'medium', cites: [] },
    ],
    verdict: {
      category: verdictCategory,
      confidence,
      rationale_md: `Komite menilai data yang tersedia menghasilkan kategori ${verdictLabel(verdictCategory).toLowerCase()}. Rincian tesis dan pertanyaan verifikasi di bawah wajib dibaca investor sebelum mengambil keputusan.`,
      verification_questions: [
        'Bagaimana proyeksi laba 12 bulan ke depan dibandingkan premium valuasi saat ini?',
        'Apakah terdapat agenda aksi korporasi yang dapat mengubah struktur modal?',
      ],
    },
    citations: [
      { cite_id: 'f_1', source: 'sectors_endpoint', endpoint: `/v2/transaction/daily/${ticker}/`, params_summary: 'daily', retrieved_at: createdAt, cache: 'hit' },
      { cite_id: 'f_2', source: 'sectors_endpoint', endpoint: `/v2/transaction/daily/${ticker}/?range=30d`, params_summary: 'range=30d', retrieved_at: createdAt, cache: 'hit' },
      { cite_id: 'f_3', source: 'sectors_endpoint', endpoint: `/v2/companies/?where=symbol=${ticker}`, params_summary: 'free float', retrieved_at: createdAt, cache: 'miss' },
      { cite_id: 'f_4', source: 'sectors_endpoint', endpoint: `/v2/transaction/foreign-flow/${ticker}/?range=30d`, params_summary: 'range=30d', retrieved_at: createdAt, cache: 'hit' },
    ],
    disclaimer: DISCLAIMER,
  };
}

function verdictLabel(c: VerdictCategory): string {
  switch (c) {
    case 'layak_diteliti_lanjut':
      return 'Layak Diteliti Lanjut';
    case 'perlu_kehati_hatian':
      return 'Perlu Kehati-hatian';
    case 'red_flag_berat':
      return 'Red Flag Berat';
  }
}

const T0 = '2026-08-14T02:10:00Z';
const T1 = '2026-07-28T09:40:00Z';
const T2 = '2026-08-20T08:15:00Z';
const T3 = '2026-08-02T03:05:00Z';

export const JOURNAL_ITEMS: JournalItem[] = [
  { memo_id: 'mm_bbcA_0001', ticker: 'BBCA', company_name: 'PT Bank Central Asia Tbk', verdict_category: 'layak_diteliti_lanjut', info_richness: 'A', price_at_trial: 10250, created_at: T0 },
  { memo_id: 'mm_goto_0003', ticker: 'GOTO', company_name: 'PT GoTo Gojek Tokopedia Tbk', verdict_category: 'perlu_kehati_hatian', info_richness: 'C', price_at_trial: 68, created_at: T2 },
  { memo_id: 'mm_brms_0002', ticker: 'BRMS', company_name: 'PT Bumi Resources Minerals Tbk', verdict_category: 'red_flag_berat', info_richness: 'B', price_at_trial: 182, created_at: T3 },
  { memo_id: 'mm_cuan_0007', ticker: 'CUAN', company_name: 'PT Petrindo Jaya Kreator Tbk', verdict_category: 'layak_diteliti_lanjut', info_richness: 'B', price_at_trial: 12350, created_at: T1 },
];

export const POSTMORTEMS: Record<string, PostmortemResponse> = {
  mm_bbcA_0001: {
    memo: makeMemo({ memoId: 'mm_bbcA_0001', trialId: 'tr_mock_bbcA01', ticker: 'BBCA', companyName: 'PT Bank Central Asia Tbk', createdAt: T0, infoRichness: 'A', verdictCategory: 'layak_diteliti_lanjut', confidence: 0.78, priceAtTrial: 10250 }),
    price_at_trial: 10250,
    price_now: 10875,
    change_pct: +6.1,
    days_elapsed: 26,
  },
  mm_goto_0003: {
    memo: makeMemo({ memoId: 'mm_goto_0003', trialId: 'tr_mock_goto01', ticker: 'GOTO', companyName: 'PT GoTo Gojek Tokopedia Tbk', createdAt: T2, infoRichness: 'C', verdictCategory: 'perlu_kehati_hatian', confidence: 0.62, priceAtTrial: 68 }),
    price_at_trial: 68,
    price_now: 62,
    change_pct: -8.82,
    days_elapsed: 20,
  },
  mm_brms_0002: {
    memo: makeMemo({ memoId: 'mm_brms_0002', trialId: 'tr_mock_brms01', ticker: 'BRMS', companyName: 'PT Bumi Resources Minerals Tbk', createdAt: T3, infoRichness: 'B', verdictCategory: 'red_flag_berat', confidence: 0.84, priceAtTrial: 182 }),
    price_at_trial: 182,
    price_now: 150,
    change_pct: -17.58,
    days_elapsed: 38,
  },
  mm_cuan_0007: {
    memo: makeMemo({ memoId: 'mm_cuan_0007', trialId: 'tr_mock_cuan01', ticker: 'CUAN', companyName: 'PT Petrindo Jaya Kreator Tbk', createdAt: T1, infoRichness: 'B', verdictCategory: 'layak_diteliti_lanjut', confidence: 0.71, priceAtTrial: 12350 }),
    price_at_trial: 12350,
    price_now: 13100,
    change_pct: +6.07,
    days_elapsed: 43,
  },
};
