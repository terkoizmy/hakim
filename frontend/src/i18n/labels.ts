/** Tabel label per bahasa — pengganti 11 tabel yang dulu tersebar di 8 berkas.
 *
 * Tabel-tabel itu dulu berupa `Record<..., string>` Bahasa Indonesia di scope
 * modul. Selain duplikatif (tiga putusan yang sama dikodekan empat kali dengan
 * tiga kapitalisasi berbeda), bentuk itu membuat label **beku**: tidak ada cara
 * membuatnya ikut berganti saat bahasa diganti.
 *
 * Sekarang tiap tabel adalah peta `Record<Union, DictKey>` lalu diresolusi ke
 * bahasa aktif. Itu memberi dua pengaman sekaligus:
 *   - `Record<Union, …>` memaksa setiap anggota union punya label, jadi ada
 *     kategori yang lolos pun tidak bisa;
 *   - `DictKey` memastikan kuncinya benar-benar ada di kamus kanonik.
 * Kelengkapan terjemahannya sendiri sudah dijamin `satisfies typeof en` di
 * dict/id.ts.
 */
import { DICTS } from './dict';
import { type DictKey } from './dict';
import type { Lang } from './types';
import type { AgentId, DataRichness, Phase, TrialErrorCode, VerdictCategory } from '../types/contract';
import type { EdgeType, NodeType } from '../types/board';

/** Lima analis + tiga peran ruang sidang. */
export type AgentLabelKey = AgentId | 'prosecutor' | 'defender' | 'judge';
export type Severity = 'low' | 'medium' | 'high';

const PHASE: Record<Phase, DictKey> = {
  evidence: 'enum.phase.evidence',
  debate: 'enum.phase.debate',
  verdict: 'enum.phase.verdict',
};

const AGENT: Record<AgentLabelKey, DictKey> = {
  fundamental: 'enum.agent.fundamental',
  price: 'enum.agent.price',
  smartmoney: 'enum.agent.smartmoney',
  insider: 'enum.agent.insider',
  antigorengan: 'enum.agent.antigorengan',
  prosecutor: 'enum.agent.prosecutor',
  defender: 'enum.agent.defender',
  judge: 'enum.agent.judge',
};

const VERDICT: Record<VerdictCategory, DictKey> = {
  layak_diteliti_lanjut: 'enum.verdict.layak_diteliti_lanjut',
  perlu_kehati_hatian: 'enum.verdict.perlu_kehati_hatian',
  red_flag_berat: 'enum.verdict.red_flag_berat',
};

const VERDICT_DOC: Record<VerdictCategory, DictKey> = {
  layak_diteliti_lanjut: 'enum.verdictDoc.layak_diteliti_lanjut',
  perlu_kehati_hatian: 'enum.verdictDoc.perlu_kehati_hatian',
  red_flag_berat: 'enum.verdictDoc.red_flag_berat',
};

const ERROR: Record<TrialErrorCode, DictKey> = {
  ticker_not_found: 'enum.error.ticker_not_found',
  sectors_error: 'enum.error.sectors_error',
  llm_error: 'enum.error.llm_error',
  timeout: 'enum.error.timeout',
};

const SEVERITY: Record<Severity, DictKey> = {
  low: 'enum.severity.low',
  medium: 'enum.severity.medium',
  high: 'enum.severity.high',
};

const DIRECTION: Record<string, DictKey> = {
  akumulasi: 'enum.direction.akumulasi',
  distribusi: 'enum.direction.distribusi',
  beli: 'enum.direction.beli',
  jual: 'enum.direction.jual',
};

const ANALYST_NAME: Record<AgentId, DictKey> = {
  fundamental: 'enum.analyst.fundamental.name',
  price: 'enum.analyst.price.name',
  smartmoney: 'enum.analyst.smartmoney.name',
  insider: 'enum.analyst.insider.name',
  antigorengan: 'enum.analyst.antigorengan.name',
};

const ANALYST_TAGLINE: Record<AgentId, DictKey> = {
  fundamental: 'enum.analyst.fundamental.tagline',
  price: 'enum.analyst.price.tagline',
  smartmoney: 'enum.analyst.smartmoney.tagline',
  insider: 'enum.analyst.insider.tagline',
  antigorengan: 'enum.analyst.antigorengan.tagline',
};

const EDGE: Record<EdgeType, DictKey> = {
  memegang: 'enum.edge.memegang',
  menjabat: 'enum.edge.menjabat',
  aliran: 'enum.edge.aliran',
  redflag: 'enum.edge.redflag',
  fakta: 'enum.edge.fakta',
  bukti: 'enum.edge.bukti',
};

const RICHNESS: Record<DataRichness, DictKey> = {
  A: 'enum.richness.A',
  B: 'enum.richness.B',
  C: 'enum.richness.C',
};

const NODE: Record<NodeType, DictKey> = {
  emiten: 'enum.nodeType.emiten',
  pemegang: 'enum.nodeType.pemegang',
  orang: 'enum.nodeType.orang',
  aliran: 'enum.nodeType.aliran',
  redflag: 'enum.nodeType.redflag',
  kabar: 'enum.nodeType.kabar',
  fakta: 'enum.nodeType.fakta',
};

/** Data papan memakai nilai Indonesia, data memo memakai nilai Inggris untuk
 * konsep yang sama. Dinormalkan di sini supaya UI tidak lagi menampilkan dua
 * wajah berbeda ("TINGGI" di papan, "Tinggi" di memo). */
const SEV_ALIAS: Record<string, Severity> = {
  low: 'low',
  rendah: 'low',
  medium: 'medium',
  sedang: 'medium',
  high: 'high',
  tinggi: 'high',
};

export function severityKey(raw: string | null | undefined): Severity | null {
  if (!raw) return null;
  return SEV_ALIAS[raw.toLowerCase()] ?? null;
}

function pick<K extends string>(lang: Lang, map: Record<K, DictKey>): Record<K, string> {
  const dict = DICTS[lang];
  const out = {} as Record<K, string>;
  for (const key of Object.keys(map) as K[]) out[key] = dict[map[key]];
  return out;
}

export interface Labels {
  /** Fase sidang. */
  phase: Record<Phase, string>;
  /** Nama agen/peran; indeks longgar karena id datang dari payload event. */
  agent: Record<string, string>;
  /** Label putusan sentence case — satu-satunya kapitalisasi yang dipakai UI. */
  verdict: Record<VerdictCategory, string>;
  /** Label putusan berpenekanan `<em>` untuk judul dokumen/h2 (lihat renderRich). */
  verdictDoc: Record<VerdictCategory, string>;
  error: Record<TrialErrorCode, string>;
  severity: Record<Severity, string>;
  /** Arah transaksi; tidak dikenal → dikembalikan apa adanya oleh pemanggil. */
  direction: Record<string, string>;
  analyst: Record<AgentId, { name: string; tagline: string }>;
  edge: Record<EdgeType, string>;
  nodeType: Record<NodeType, string>;
  /** Kekayaan informasi hasil riset analis (grade A/B/C). */
  richness: Record<DataRichness, string>;
}

/** Berkas ini sengaja bebas React — `useLabels()` ada di ./index.tsx, yang
 * memanggil fungsi ini. Kalau hook-nya ditaruh di sini, ./index.tsx dan
 * ./labels.ts akan saling mengimpor. */
export function buildLabels(lang: Lang): Labels {
  const name = pick(lang, ANALYST_NAME);
  const tagline = pick(lang, ANALYST_TAGLINE);
  const analyst = {} as Labels['analyst'];
  for (const id of Object.keys(name) as AgentId[]) {
    analyst[id] = { name: name[id], tagline: tagline[id] };
  }
  return {
    phase: pick(lang, PHASE),
    agent: pick(lang, AGENT),
    verdict: pick(lang, VERDICT),
    verdictDoc: pick(lang, VERDICT_DOC),
    error: pick(lang, ERROR),
    severity: pick(lang, SEVERITY),
    direction: pick(lang, DIRECTION),
    analyst,
    edge: pick(lang, EDGE),
    nodeType: pick(lang, NODE),
    richness: pick(lang, RICHNESS),
  };
}
