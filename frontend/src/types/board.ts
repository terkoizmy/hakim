import type { PricePoint, VerdictCategory } from './contract';

export type NodeType =
  | 'emiten'
  | 'pemegang'
  | 'orang'
  | 'aliran'
  | 'redflag'
  | 'kabar'
  | 'fakta';

export type EdgeType = 'memegang' | 'menjabat' | 'aliran' | 'redflag' | 'fakta';

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
  /** 'hit' = payload dari arsip cache (tanggal = kapan benar-benar diambil) */
  cache?: 'hit' | 'miss';
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

export const EDGE_META: Record<EdgeType, { label: string; color: string; dash?: string }> = {
  memegang: { label: 'memegang saham', color: '#e07a5f' },
  menjabat: { label: 'menjabat di', color: '#c4b5a0' },
  aliran: { label: 'jejak transaksi', color: '#8ba888', dash: '2 3' },
  redflag: { label: 'menandai red flag', color: '#e65c5c', dash: '5 4' },
  fakta: { label: 'menunjuk fakta', color: '#4cc98f' },
};

export const NODE_TYPE_META: Record<NodeType, { label: string; color: string }> = {
  emiten: { label: 'Emiten', color: '#c9a24a' },
  pemegang: { label: 'Pemegang Saham', color: '#5a8fb0' },
  orang: { label: 'Orang Kunci', color: '#a28fd6' },
  aliran: { label: 'Jejak Broker/Institusi', color: '#8ba888' },
  redflag: { label: 'Red Flag', color: '#c96a5a' },
  kabar: { label: 'Bukti Kabar', color: '#d9a441' },
  fakta: { label: 'Fakta Angka', color: '#4cc98f' },
};
