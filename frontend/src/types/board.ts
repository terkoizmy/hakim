import type { PricePoint, VerdictCategory } from './contract';

export type NodeType =
  | 'emiten'
  | 'pemegang'
  | 'orang'
  | 'aliran'
  | 'redflag'
  | 'kabar'
  | 'fakta';

export type EdgeType = 'memegang' | 'menjabat' | 'aliran' | 'redflag' | 'fakta' | 'bukti';

/** Node yang ditampilkan saat papan pertama dibuka (mode "ringkas").
 *  Sisanya dibuka lewat tombol "Perluas jaringan". */
export const DEFAULT_VISIBLE_NODES: NodeType[] = ['emiten', 'pemegang', 'orang'];
export const DEFAULT_VISIBLE_EDGES: EdgeType[] = ['memegang', 'menjabat'];

export interface MetricBenchmark {
  label: string;
  value: number;
  sectorAvg: number;
  unit: string;
  verdict: 'superior' | 'fair' | 'inferior';
}

/** Belum pernah dirender FE mana pun — hanya ikut terkirim server.
 *  PERINGATAN: `overall` datang dalam Bahasa Indonesia ('Rendah'), jadi kalau
 *  nanti ditampilkan, jangan dicetak mentah: lewatkan dulu ke `severityKey()`
 *  lalu `labels.severity`, supaya tidak muncul sebagai satu-satunya teks
 *  Indonesia di antarmuka Inggris (papan pernah melakukan kesalahan ini
 *  dengan `data.severity.toUpperCase()`). */
export interface RiskScorecard {
  governance: number;
  financial: number;
  valuation: number;
  overall: 'Rendah' | 'Sedang' | 'Tinggi';
}

export interface BoardNodeData {
  type: NodeType;
  label: string;
  sub?: string;
  value?: string;
  verdict?: VerdictCategory;
  severity?: 'rendah' | 'sedang' | 'tinggi';
  date?: string;
  detail?: string[];
  source?: string;
  cross?: boolean;
  selected?: boolean;
  retrievedAt?: string;
  /** 'hit' = payload dari arsip cache (tanggal = kapan benar-benar diambil);
   *  'fixture' = data contoh mode demo (0 kredit) */
  cache?: 'hit' | 'miss' | 'fixture';
}

export interface BoardNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: BoardNodeData;
  rotate: number;
}

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
}

export interface TickerBoardData {
  ticker: string;
  name: string;
  nodes: BoardNode[];
  edges: BoardEdge[];
  initialChat: string;
  aiInsights: Record<string, string>;
  priceHistory?: PricePoint[];
  metricsComparison?: MetricBenchmark[];
  riskScore?: RiskScorecard;
  thesisSummary?: string;
}

/** Balasan POST /api/board/{ticker}/chat (CONTRACT 1.4.0).
 *  `mode` jujur menyebut jalur yang dipakai: "llm" = model bahasa sungguhan,
 *  "heuristik" = jawaban darurat dari data papan ketika LLM tidak tersedia. */
export interface BoardChatResponse {
  reply: string;
  mode: 'llm' | 'heuristik';
  model?: string | null;
}

/** Warna dan pola garis saja — labelnya pindah ke kamus bahasa
 * (`useLabels().edge` / `.nodeType`), karena teks inilah yang muncul di
 * legenda dan panel detail papan. */
export const EDGE_META: Record<EdgeType, { color: string; dash?: string }> = {
  memegang: { color: '#e07a5f' },
  menjabat: { color: '#c4b5a0' },
  aliran: { color: '#8ba888', dash: '2 3' },
  redflag: { color: '#e65c5c', dash: '5 4' },
  fakta: { color: '#4cc98f' },
  // Tuduhan → kartu yang menopangnya. Titik-rapat: ini benang pembuktian, bukan
  // relasi struktural; digambar paling akhir supaya tampak "ditambahkan".
  bukti: { color: '#e8b64c', dash: '1 2' },
};

export const NODE_TYPE_META: Record<NodeType, { color: string }> = {
  emiten: { color: '#c9a24a' },
  pemegang: { color: '#5a8fb0' },
  orang: { color: '#a28fd6' },
  aliran: { color: '#8ba888' },
  redflag: { color: '#c96a5a' },
  kabar: { color: '#d9a441' },
  fakta: { color: '#4cc98f' },
};
