import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  Background,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
  EdgeLabelRenderer,
  type NodeProps,
  type Edge,
  type Node,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import VerdictBadge from '../components/VerdictBadge';
import Reveal from '../components/Reveal';
import PriceChart from '../components/PriceChart';
import { SparkIcon, ArrowRightIcon, RefreshIcon, ClockIcon, SearchIcon } from '../components/icons';
import { api } from '../api';
import {
  DEFAULT_VISIBLE_EDGES,
  DEFAULT_VISIBLE_NODES,
  EDGE_META,
  NODE_TYPE_META,
  type BoardNode,
  type BoardNodeData,
  type BoardEdge,
  type EdgeType,
  type NodeType,
  type TickerBoardData,
} from '../types/board';
import { formatDate } from '../utils/format';
import type { VerdictCategory } from '../types/contract';

const SEV_CLS: Record<string, string> = {
  rendah: 'text-[#7fb069] border-[rgba(127,176,105,0.4)] bg-[rgba(127,176,105,0.06)]',
  sedang: 'text-[#d9a441] border-[rgba(217,164,65,0.4)] bg-[rgba(217,164,65,0.06)]',
  tinggi: 'text-[#c96a5a] border-[rgba(201,106,90,0.4)] bg-[rgba(201,106,90,0.06)]',
};

// Grid bersama untuk semua baris legenda: [checkbox][contoh warna/garis][label].
// Dipakai legenda node, legenda benang, dan baris lintas-emiten supaya label
// ketiganya mulai pada x yang sama (sebelumnya flex + lebar swatch berbeda
// membuat teks tidak rata).
const LEGEND_ROW =
  'grid grid-cols-[12px_16px_1fr] items-center gap-x-2 cursor-pointer text-[11.5px] transition-colors';

const CENTER_X = 500;
const CENTER_Y = 360;

// --------------------------------------------------------------- pil benang
// Handle node ada di TENGAH kartu, jadi titik akhir benang = titik tengah
// kartu. Menaruh pil label di titik tengah benang (0.5) karena itu sering
// mendarat DI DALAM kartu — terutama kartu pusat emiten yang tinggi — sehingga
// pil menutupi teks kartu. Pil sekarang hanya boleh duduk di celah bebas
// antara kedua kartu ujungnya.
const CARD_W = 248; // harus sama dengan `w-[248px]` di BoardCard
const CARD_H_FALLBACK = 176; // tinggi kartu bervariasi; dipakai sebelum terukur
const PILL_H = 22;
const PILL_GAP = 8; // jarak minimum pil dari tepi kartu

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Satu benang yang perlu ditempatkan pil labelnya. */
interface LabelJob {
  id: string;
  source: string;
  target: string;
  ax: number; // titik tengah kartu sumber (= pangkal benang)
  ay: number;
  dx: number;
  dy: number;
  len: number;
  t0: number; // celah bebas, dalam fraksi panjang benang
  t1: number;
  need: number; // lebar pil yang dibutuhkan
  room: number; // lebar celah yang tersedia (px)
}

/** Perkiraan lebar pil dari panjang teks (mono 10.5px + padding + titik). */
function estimatePillWidth(label: string): number {
  return 34 + label.length * 6.4;
}

/**
 * Terjemahkan `dash` gaya SVG ("5 4" = 5px garis, 4px jeda) jadi latar bergaris
 * untuk contoh di legenda, supaya contoh garis di legenda persis sama dengan
 * yang digambar di kanvas. `undefined` → benang solid, tidak ada latar khusus.
 */
function dashSample(dash: string | undefined, color: string): { backgroundImage: string } | null {
  if (!dash) return null;
  const [on, off] = dash.split(/\s+/).map(Number);
  if (!on || !off) return null;
  return {
    backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 ${on}px, transparent ${on}px ${on + off}px)`,
  };
}

/**
 * Seberapa jauh (dalam fraksi panjang benang) benang keluar dari kartu yang
 * titik tengahnya jadi pangkalnya. Tepi kartu terpotong pada parameter
 * terkecil antara setengah lebar/|dx| dan setengah tinggi/|dy|.
 */
function cardExitFraction(dx: number, dy: number, halfW: number, halfH: number): number {
  const fx = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const fy = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  return Math.min(fx, fy);
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Titik tengah pil di sepanjang benang, atau `null` bila tidak ada ruang.
 *
 * Kandidat pertama adalah tengah celah bebas; kalau ada kartu KETIGA (atau pil
 * lain) yang kebetulan melintas di situ, pil digeser maju/mundur sepanjang
 * celah sampai menemukan tempat bersih. Bila celahnya lebih sempit dari lebar
 * pil, pil tidak digambar sama sekali — lebih baik hilang daripada menutupi
 * data kartu.
 */
function pickLabelAnchor(job: LabelJob, obstacles: Rect[]): { x: number; y: number } | null {
  const { ax, ay, dx, dy, len, t0, t1, need } = job;
  if (len < 1) return null;

  const mid = (t0 + t1) / 2;
  const span = (t1 - t0) / 2;
  const margin = Math.min(span, need / 2 / len);
  const STEPS = 12;

  for (let i = 0; i <= STEPS; i++) {
    const off = (i / STEPS) * (span - margin);
    const candidates = i === 0 ? [mid] : [mid - off, mid + off];
    for (const t of candidates) {
      const x = ax + dx * t;
      const y = ay + dy * t;
      const box: Rect = { x: x - need / 2, y: y - PILL_H / 2, w: need, h: PILL_H };
      if (!obstacles.some((o) => rectsOverlap(box, o))) return { x, y };
    }
  }
  return null;
}

/**
 * Rencanakan posisi pil untuk SEMUA benang sekaligus.
 *
 * Harus sekaligus, bukan per benang: beberapa benang masuk ke celah yang sama
 * (mis. `memegang` + `menjabat` milik orang yang sama sama-sama menuju kartu
 * pusat), jadi kalau tiap pil dihitung sendiri-sendiri mereka akan saling
 * menimpa. Yang celahnya paling sempit ditempatkan lebih dulu — pilihannya
 * paling sedikit — lalu pil yang longgar mengalah dan mencari tempat lain.
 */
function planEdgeLabels(edges: Edge[], nodes: Node[]): Map<string, { x: number; y: number } | null> {
  const cards: { id: string; rect: Rect }[] = [];
  const centers = new Map<string, { cx: number; cy: number; w: number; h: number }>();

  for (const n of nodes) {
    const w = n.measured?.width ?? CARD_W;
    const h = n.measured?.height ?? CARD_H_FALLBACK;
    cards.push({ id: n.id, rect: { x: n.position.x, y: n.position.y, w, h } });
    centers.set(n.id, {
      cx: n.position.x + w / 2,
      cy: n.position.y + h / 2,
      w,
      h,
    });
  }

  const jobs: LabelJob[] = [];
  for (const e of edges) {
    const raw = (e.data as { label?: unknown } | undefined)?.label;
    const label = typeof raw === 'string' ? raw : '';
    const a = centers.get(e.source);
    const b = centers.get(e.target);
    if (!label || !a || !b) continue;

    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;

    const t0 = cardExitFraction(dx, dy, a.w / 2, a.h / 2) + PILL_GAP / len;
    const t1 = 1 - cardExitFraction(dx, dy, b.w / 2, b.h / 2) - PILL_GAP / len;
    const need = estimatePillWidth(label);

    jobs.push({
      id: e.id,
      source: e.source,
      target: e.target,
      ax: a.cx,
      ay: a.cy,
      dx,
      dy,
      len,
      t0,
      t1,
      need,
      room: (t1 - t0) * len,
    });
  }

  jobs.sort((p, q) => p.room - q.room);

  const plan = new Map<string, { x: number; y: number } | null>();
  const placed: Rect[] = [];

  for (const job of jobs) {
    if (job.room < job.need) {
      plan.set(job.id, null);
      continue;
    }
    // Kartu ujung sendiri tidak perlu jadi penghalang: celah bebas sudah
    // dihitung dari tepi keduanya, jadi pil pasti di luar kedua kartu itu.
    const obstacles = cards
      .filter((c) => c.id !== job.source && c.id !== job.target)
      .map((c) => c.rect)
      .concat(placed);

    const anchor = pickLabelAnchor(job, obstacles);
    plan.set(job.id, anchor);
    if (anchor) {
      placed.push({
        x: anchor.x - job.need / 2,
        y: anchor.y - PILL_H / 2,
        w: job.need,
        h: PILL_H,
      });
    }
  }

  return plan;
}

// Sektor arah tematik di sekeliling pusat kanvas investigasi
const SECTOR_DIRECTIONS: Record<NodeType, { centerAngle: number; spread: number }> = {
  fakta: { centerAngle: -Math.PI / 2, spread: Math.PI * 0.5 },     // Atas (Metrik Valuasi & Finansial)
  orang: { centerAngle: -Math.PI * 0.05, spread: Math.PI * 0.38 },  // Kanan (Direksi & Manajemen)
  kabar: { centerAngle: Math.PI * 0.28, spread: Math.PI * 0.36 },   // Bawah-Kanan (Filings & Aksi Korporasi)
  redflag: { centerAngle: Math.PI * 0.62, spread: Math.PI * 0.44 }, // Bawah (Temuan Red Flags & Risiko)
  pemegang: { centerAngle: Math.PI, spread: Math.PI * 0.55 },       // Kiri (Pemilik Saham)
  aliran: { centerAngle: Math.PI * 0.82, spread: Math.PI * 0.4 },   // Kiri-Bawah (Jejak Broker & Institusi)
  emiten: { centerAngle: -Math.PI * 0.8, spread: Math.PI * 0.3 },   // Kiri-Atas (Afiliasi Emiten Silang)
};

export function formatBenchmarkValue(val: number | string | undefined | null, unit: string): string {
  if (val === undefined || val === null || val === '') return '-';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return `${val}${unit}`;
  if (unit === 'x') {
    return `${num.toFixed(2)}x`;
  }
  if (unit === '%') {
    return `${num.toFixed(1)}%`;
  }
  return `${Number.isInteger(num) ? num : num.toFixed(2)}${unit}`;
}

interface FocusLayoutResult {
  nodes: Node[];
  edges: Edge[];
  centerNode: BoardNode;
  connectedCount: number;
}

function calculateFocusLayout(
  allNodes: BoardNode[],
  allEdges: BoardEdge[],
  centerId: string,
  activeNodeTypes: Record<NodeType, boolean>,
  activeEdgeTypes: Record<EdgeType, boolean>,
): FocusLayoutResult {
  const centerNode = allNodes.find((n) => n.id === centerId) ?? allNodes[0];
  if (!centerNode) {
    return { nodes: [], edges: [], centerNode: allNodes[0], connectedCount: 0 };
  }

  // 1. Kumpulkan semua relasi benang aktif yang menyentuh node fokus
  const directEdges = allEdges.filter(
    (e) => (e.source === centerNode.id || e.target === centerNode.id) && activeEdgeTypes[e.type]
  );

  const neighborIds = new Set<string>();
  directEdges.forEach((e) => {
    if (e.source === centerNode.id) neighborIds.add(e.target);
    if (e.target === centerNode.id) neighborIds.add(e.source);
  });

  // 2. Filter tetangga yang valid sesuai filter pengguna
  const validNeighbors = allNodes
    .filter((n) => n.id !== centerNode.id && neighborIds.has(n.id))
    .filter((n) => activeNodeTypes[n.type]);

  const resultNodes: Node[] = [];

  // Tambahkan Node Pusat (Fokus Utama)
  resultNodes.push({
    id: centerNode.id,
    type: 'board',
    position: { x: CENTER_X, y: CENTER_Y },
    data: {
      ...centerNode.data,
      rotate: centerNode.rotate,
      selected: true,
      isCenter: true,
    },
  });

  const k = validNeighbors.length;

  if (k <= 6) {
    // Jika sedikit tetangga, sebar merata melingkar sederhana dengan radius lapang
    const radius = k > 3 ? 360 : 300;
    validNeighbors.forEach((neighbor, idx) => {
      const angle = (2 * Math.PI * idx) / (k || 1) - Math.PI / 2;
      const x = Math.round(CENTER_X + radius * Math.cos(angle));
      const y = Math.round(CENTER_Y + radius * Math.sin(angle));

      resultNodes.push({
        id: neighbor.id,
        type: 'board',
        position: { x, y },
        data: {
          ...neighbor.data,
          rotate: neighbor.rotate,
          selected: false,
          isCenter: false,
        },
      });
    });
  } else {
    // Jika banyak tetangga (seperti kasus emiten penuh dengan 30+ bukti),
    // kelompokkan berdasarkan sektor tematik (Kiri: Pemegang, Kanan: Direksi, Atas: Fakta, Bawah: Red Flag)
    // dan gunakan multi-ring konsentris agar tidak saling menumpuk.
    const grouped: Partial<Record<NodeType, BoardNode[]>> = {};
    validNeighbors.forEach((n) => {
      const t = n.type as NodeType;
      if (!grouped[t]) grouped[t] = [];
      grouped[t]!.push(n);
    });

    const RINGS = [360, 620, 880]; // Jarak radius antar cincin

    (Object.keys(grouped) as NodeType[]).forEach((type) => {
      const list = grouped[type] || [];
      if (list.length === 0) return;

      const sector = SECTOR_DIRECTIONS[type] || { centerAngle: 0, spread: Math.PI * 0.4 };

      // Bagi node ke ring-ring konsentris. Kapasitas dibuat longgar supaya
      // tampilan ringkas (<= 12 kartu) seluruhnya muat di cincin 0-1 — makin
      // dekat ke pusat, makin besar skala render yang dicapai fitView.
      let ringIdx = 0;
      const ringCapacity = [5, 7, 9];

      // Hitung pembagian per ring terlebih dahulu
      const ringBuckets: BoardNode[][] = [[], [], []];
      list.forEach((item) => {
        if (ringBuckets[ringIdx].length >= ringCapacity[ringIdx] && ringIdx < RINGS.length - 1) {
          ringIdx++;
        }
        ringBuckets[ringIdx].push(item);
      });

      // Letakkan setiap ring dengan sudut yang terdistribusi rapi
      ringBuckets.forEach((bucket, rIndex) => {
        const count = bucket.length;
        if (count === 0) return;

        const currentRadius = RINGS[rIndex];
        const angleStep = count > 1 ? sector.spread / (count - 1) : 0;
        const startAngle = sector.centerAngle - (count > 1 ? sector.spread / 2 : 0);

        // Sedikit offset selang-seling antar ring agar tidak menumpuk dalam garis lurus
        const stagger = rIndex % 2 === 1 ? angleStep * 0.35 : 0;

        bucket.forEach((nodeItem, itemIdx) => {
          const angle = count === 1 ? sector.centerAngle : startAngle + itemIdx * angleStep + stagger;
          const x = Math.round(CENTER_X + currentRadius * Math.cos(angle));
          const y = Math.round(CENTER_Y + currentRadius * Math.sin(angle));

          resultNodes.push({
            id: nodeItem.id,
            type: 'board',
            position: { x, y },
            data: {
              ...nodeItem.data,
              rotate: nodeItem.rotate,
              selected: false,
              isCenter: false,
            },
          });
        });
      });
    });
  }

  // 3. Collision Resolution (Repulsion Relaxation Physics):
  // Menjamin TIDAK ADA dua kartu yang bertumpukan (kartu lebar 210px, tinggi ~170px)
  const MIN_DX = 285; // lebar kartu 248px + celah benang
  const MIN_DY = 215;
  for (let pass = 0; pass < 25; pass++) {
    for (let i = 0; i < resultNodes.length; i++) {
      for (let j = i + 1; j < resultNodes.length; j++) {
        const n1 = resultNodes[i];
        const n2 = resultNodes[j];
        if (n1.id === centerNode.id && n2.id === centerNode.id) continue;

        const dx = n2.position.x - n1.position.x;
        const dy = n2.position.y - n1.position.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absX < MIN_DX && absY < MIN_DY) {
          // Ada tumpang tindih -> dorong saling menjauh
          const overlapX = (MIN_DX - absX) * 0.55;
          const overlapY = (MIN_DY - absY) * 0.55;
          const signX = dx >= 0 ? 1 : -1;
          const signY = dy >= 0 ? 1 : -1;

          if (n1.id !== centerNode.id) {
            n1.position.x -= overlapX * signX;
            n1.position.y -= overlapY * signY;
          }
          if (n2.id !== centerNode.id) {
            n2.position.x += overlapX * signX;
            n2.position.y += overlapY * signY;
          }
        }
      }
    }
  }

  const visibleIdSet = new Set(resultNodes.map((n) => n.id));

  // 4. Hubungkan benang antar node yang aktif di kanvas
  const resultEdges: Edge[] = allEdges
    .filter((e) => activeEdgeTypes[e.type])
    .filter((e) => visibleIdSet.has(e.source) && visibleIdSet.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'board',
      data: {
        type: e.type,
        label: e.label,
        active: e.source === centerNode.id || e.target === centerNode.id,
      },
    }));

  return {
    nodes: resultNodes,
    edges: resultEdges,
    centerNode,
    connectedCount: validNeighbors.length,
  };
}

function BoardCard({ data, selected, isCenter }: { data: BoardNodeData; selected: boolean; isCenter?: boolean }) {
  const t = NODE_TYPE_META[data.type];
  return (
    <div
      className={`w-[248px] rounded-[10px] border bg-[#1a1713] shadow-[0_14px_32px_rgba(0,0,0,.75)] transition-all duration-300 select-none ${
        isCenter
          ? 'border-brass-400 ring-2 ring-brass-500/60 shadow-[0_0_24px_rgba(201,162,74,0.35)] scale-[1.04]'
          : selected
            ? 'border-brass-500 ring-2 ring-brass-500/40'
            : 'border-[#443b30] hover:border-brass-500 hover:scale-[1.02]'
      }`}
    >
      <div
        className="h-2 rounded-t-[9px]"
        style={{ background: data.type === 'emiten' ? 'var(--brass-500)' : t.color }}
      />
      <div className="p-4">
        {isCenter && (
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-brass-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-brass-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brass-400 animate-pulse-dot" /> Pusat Fokus
          </div>
        )}
        {data.type === 'emiten' && (
          <div className="mb-2">
            <VerdictBadge category={data.verdict ?? 'warn'} className="!text-[11px] !px-2 !py-0.5 font-semibold" />
          </div>
        )}
        {data.type === 'redflag' && data.severity && (
          <span
            className={`inline-flex items-center border rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold leading-4 tracking-wide ${SEV_CLS[data.severity]}`}
          >
            {data.severity.toUpperCase()}
          </span>
        )}
        {data.type === 'kabar' && data.date && (
          <div className="font-mono text-[11px] font-medium text-text-3 mb-1">{formatDate(data.date)}</div>
        )}
        <div className="font-mono text-[16.5px] font-bold text-white leading-tight tracking-wide break-words">
          {data.label}
        </div>
        {data.sub && <div className="text-[12.5px] font-medium text-[#ded8ce] leading-snug mt-1.5">{data.sub}</div>}
        {data.value && (
          <div className="font-mono text-[15px] font-bold text-brass-300 mt-2 tabular-nums">{data.value}</div>
        )}
        {data.cross && (
          <div className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10.5px] font-semibold text-brass-300 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-brass-500" /> lintas emiten
          </div>
        )}
        {data.retrievedAt && (
          <div className="mt-2.5 pt-2 border-t border-[#2e271f] flex items-center gap-1.5 text-[10px] font-mono text-text-3">
            <ClockIcon size={11} className="text-brass-500/80 flex-none" />
            <span className="truncate">Sumber diambil {formatDate(data.retrievedAt)}</span>
            {data.cache === 'hit' && (
              <span className="ml-auto flex-none rounded-sm border border-[#3a332a] px-1 text-[9px] uppercase tracking-wide text-text-3">
                arsip
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BoardNodeCard({ data }: NodeProps) {
  const d = data as unknown as BoardNodeData & { rotate?: number; isCenter?: boolean };
  return (
    <div
      className="relative cursor-pointer transition-transform duration-300"
      style={{ transform: d.rotate ? `rotate(${d.rotate}deg)` : undefined }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        className="!opacity-0 !w-1 !h-1 !pointer-events-none !border-0 !bg-transparent"
      />
      <BoardCard data={d} selected={!!d.selected} isCenter={d.isCenter} />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        className="!opacity-0 !w-1 !h-1 !pointer-events-none !border-0 !bg-transparent"
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { board: BoardNodeCard };

function BoardEdge({ sourceX, sourceY, targetX, targetY, data }: any) {
  const meta = (data?.type && EDGE_META[data.type as EdgeType]) || { label: 'relasi', color: '#c4b5a0' };
  const label = data?.label as string | undefined;
  // Posisi pil dihitung sekali untuk semua benang oleh `planEdgeLabels`
  // (lihat FocusBoardFlow) supaya pil tidak saling menimpa; `null` = tidak ada
  // celah yang cukup, jadi labelnya tidak digambar.
  const anchor = data?.labelAnchor as { x: number; y: number } | null | undefined;

  const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  // Benang `bukti` tidak menyentuh kartu pusat, jadi `active` selalu false untuknya
  // — kalau memakai aturan redam yang sama, benang pembuktian justru jadi yang
  // paling tidak terbaca. Ia dapat bobotnya sendiri, sedikit di bawah benang
  // pusat tapi jelas di atas benang latar.
  const isBukti = data?.type === 'bukti';
  const width = isBukti ? 1.9 : data?.active ? 2.2 : 1.3;
  const opacity = isBukti ? 0.85 : data?.active ? 0.95 : 0.4;
  return (
    <>
      <path
        d={path}
        fill="none"
        stroke={meta.color}
        strokeWidth={width}
        strokeDasharray={meta.dash}
        strokeOpacity={opacity}
        className="transition-all duration-300 pointer-events-none"
      />
      {label && anchor && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${anchor.x}px, ${anchor.y}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan select-none"
          >
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border shadow-[0_2px_12px_rgba(0,0,0,0.9)] font-mono text-[10.5px] font-semibold tracking-wide transition-all duration-200 ${
                data?.active
                  ? 'bg-[#181410] ring-1 ring-white/15 shadow-[0_0_12px_rgba(0,0,0,0.9)]'
                  : 'bg-[#12100d]/95 hover:bg-[#181410]'
              }`}
              style={{
                borderColor: `${meta.color}80`,
                color: meta.color,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-none"
                style={{ backgroundColor: meta.color }}
              />
              <span className="whitespace-nowrap leading-none">{label}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes: EdgeTypes = { board: BoardEdge };

/** Kanvas internal yang membungkus ReactFlow dengan auto-fitView */
function FocusBoardFlow({
  nodes,
  edges,
  onNodeClick,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (_: any, node: Node) => void;
}) {
  const { fitView, getZoom } = useReactFlow();

  // Ukuran kartu baru diketahui setelah React Flow selesai mengukur, dan
  // penempatan pil perlu tahu ukuran semua kartu — jadi `useStore` di sini,
  // bukan di dalam tiap BoardEdge.
  const measuredNodes = useStore((s) => s.nodes);
  const edgesWithLabels = useMemo(() => {
    const plan = planEdgeLabels(edges, measuredNodes);
    if (plan.size === 0) return edges;
    return edges.map((e) => ({
      ...e,
      data: { ...(e.data ?? {}), labelAnchor: plan.get(e.id) ?? null },
    }));
  }, [edges, measuredNodes]);

  /* Skala minimum agar kartu tetap terbaca (label 16.5px → ≈9px di layar).
     Canvas tengah hanya ~740px lebar, sedangkan 12 kartu butuh ~3000px area:
     "fit semua" akan mengecilkan kartu sampai tak terbaca. Karena itu kalau
     hasil fit di bawah ambang ini, papan dipusatkan pada kartu fokus dan sisa
     jaringan dijangkau dengan pan / tombol "Fit semua". */
  const LEGIBLE_MIN_SCALE = 0.55;

  const fitAll = useCallback(
    (duration = 400) =>
      fitView({ duration, padding: 0.12, minZoom: 0.22, maxZoom: 1.1 }),
    [fitView],
  );

  const centerOnFocused = useCallback(
    (duration = 400) => {
      const center = nodes.find((n) => (n.data as { isCenter?: boolean })?.isCenter);
      if (!center) return;
      fitView({
        nodes: [{ id: center.id }],
        duration,
        minZoom: LEGIBLE_MIN_SCALE,
        maxZoom: LEGIBLE_MIN_SCALE,
      });
    },
    [fitView, nodes],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      fitAll(0);
      requestAnimationFrame(() => {
        if (getZoom() < LEGIBLE_MIN_SCALE) centerOnFocused(400);
      });
    }, 60);
    return () => clearTimeout(t);
  }, [nodes.length, fitAll, centerOnFocused, getZoom]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edgesWithLabels}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.12, minZoom: 0.22, maxZoom: 1.1 }}
      minZoom={0.22}
      maxZoom={2.2}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Lines}
        color="#221c15"
        gap={28}
        lineWidth={1}
      />
      <Panel position="bottom-right" className="!m-3 flex gap-2">
        <button
          type="button"
          onClick={() => centerOnFocused()}
          className="rounded border border-[#3a332a] bg-[#12100d]/95 px-2.5 py-1 font-mono text-[11px] text-brass-300 hover:border-brass-500 transition-colors"
          title="Perbesar ke kartu fokus (skala terbaca)"
        >
          Pusatkan
        </button>
        <button
          type="button"
          onClick={() => fitAll()}
          className="rounded border border-[#3a332a] bg-[#12100d]/95 px-2.5 py-1 font-mono text-[11px] text-text-2 hover:border-brass-500 hover:text-brass-300 transition-colors"
          title="Tampilkan seluruh jaringan (kartu mengecil)"
        >
          Fit semua
        </button>
      </Panel>
    </ReactFlow>
  );
}

function getSmartPromptChips(selectedNode: BoardNode | undefined, ticker: string): string[] {
  if (!selectedNode) {
    return [
      `Apa risiko utama yang terhubung di ${ticker}?`,
      `Siapa pemegang saham pengendali ${ticker}?`,
      `Bagaimana valuasi & kinerja ${ticker} dibanding industri?`,
    ];
  }

  const { type, label, value } = selectedNode.data;

  switch (type) {
    case 'emiten':
      return [
        `Apa saja red flag terbesar yang terhubung pada ${label}?`,
        `Siapa saja pemegang saham dan pengendali ${label}?`,
        `Bagaimana kesehatan metrik finansial ${label}?`,
      ];
    case 'pemegang':
      return [
        `Apa pengaruh porsi kepemilikan ${label} (${value || ''}) terhadap emiten?`,
        `Apakah ${label} memiliki relasi di emiten lain?`,
        `Siapa pemilik manfaat akhir (ultimate owner) di balik ${label}?`,
      ];
    case 'orang':
      return [
        `Bagaimana rekam jejak ${label} dalam memimpin tata kelola emiten?`,
        `Apakah ${label} memegang jabatan di emiten atau entitas lain?`,
        `Apa pengaruh kepemimpinan ${label} terhadap kinerja operasional?`,
      ];
    case 'redflag':
      return [
        `Jelaskan risiko "${label}" dengan bahasa sederhana.`,
        `Di skenario apa risiko ini bisa memicu kerugian bagi emiten?`,
        `Bagaimana mitigasi manajemen terhadap red flag ini?`,
      ];
    case 'kabar':
      return [
        `Apakah isu "${label}" berdampak jangka panjang atau sesaat?`,
        `Bagaimana sentimen pasar terhadap kabar ini?`,
        `Apakah kabar ini mempengaruhi fundamental bisnis emiten?`,
      ];
    case 'fakta':
      return [
        `Apakah angka ${label} (${value || ''}) tergolong sehat di sektor ini?`,
        `Bagaimana tren metrik ini mempengaruhi dividen & laba?`,
        `Bandingkan nilai ${label} ini dengan rata-rata industri.`,
      ];
    default:
      return [
        `Jelaskan temuan kunci dari bukti ${label}.`,
        `Apa kaitannya bukti ini dengan risiko emiten?`,
      ];
  }
}

interface VettedEmitenItem {
  ticker: string;
  name: string;
  verdictCategory: VerdictCategory | 'ok' | 'warn';
  infoRichness?: string;
  priceAtTrial?: number;
  createdAt?: string;
  sector?: string;
}

export default function DetectiveBoardPage() {
  const [selectedTicker, setSelectedTicker] = useState<string>('BBCA');
  const [searchQuery, setSearchQuery] = useState('');
  const [boardData, setBoardData] = useState<TickerBoardData | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [vettedEmiten, setVettedEmiten] = useState<VettedEmitenItem[]>([]);

  // Fetch daftar emiten yang lolos sidang (Vonis Layak / Hati-Hati)
  useEffect(() => {
    let alive = true;
    api
      .fetchJournal(100)
      .then((res) => {
        if (!alive) return;
        // Filter HANYA perkara yang lolos sidang dengan vonis Layak atau Perlu Kehati-hatian
        const passedItems = res.items.filter(
          (it) =>
            it.verdict_category === 'layak_diteliti_lanjut' ||
            it.verdict_category === 'perlu_kehati_hatian'
        );

        if (passedItems.length > 0) {
          // Ambil riwayat sidang terbaru per ticker
          const map = new Map<string, VettedEmitenItem>();
          passedItems.forEach((it) => {
            if (!map.has(it.ticker)) {
              map.set(it.ticker, {
                ticker: it.ticker,
                name: it.company_name,
                verdictCategory: it.verdict_category,
                infoRichness: it.info_richness,
                priceAtTrial: it.price_at_trial ?? undefined,
                createdAt: it.created_at,
              });
            }
          });
          const list = Array.from(map.values());
          setVettedEmiten(list);
          if (!map.has(selectedTicker) && list.length > 0) {
            setSelectedTicker(list[0].ticker);
          }
        }
      })
      .catch((err) => {
        console.error('[DetectiveBoard] Gagal fetch journal:', err);
      });

    return () => {
      alive = false;
    };
  }, []);

  // Fetch board data nyata per ticker
  useEffect(() => {
    let alive = true;
    setLoadingBoard(true);
    setBoardError(null);
    api
      .fetchBoard(selectedTicker)
      .then((data) => {
        if (!alive) return;
        setBoardData(data);
        const mainNode =
          data.nodes.find((n: BoardNode) => n.data.type === 'emiten' && !n.data.cross) ?? data.nodes[0];
        if (mainNode) setSelectedId(mainNode.id);
        setChatLog([
          {
            role: 'ai',
            text: data.initialChat || `Papan investigasi ${selectedTicker} aktif. Silakan tanyakan kepemilikan, direksi, atau fakta audit.`,
          },
        ]);
      })
      .catch((err) => {
        console.error(`[DetectiveBoard] Gagal fetchBoard ${selectedTicker} dari backend:`, err);
        if (!alive) return;
        setBoardError(err?.message || `Gagal memuat data investigasi ${selectedTicker} dari server.`);
      })
      .finally(() => {
        if (alive) setLoadingBoard(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedTicker]);

  const currentBoard = useMemo<TickerBoardData>(() => {
    if (boardData) return boardData;
    return {
      ticker: selectedTicker,
      name: `${selectedTicker} Tbk`,
      nodes: [],
      edges: [],
      initialChat: `Memuat data investigasi ${selectedTicker}...`,
      aiInsights: {},
    };
  }, [boardData, selectedTicker]);

  const filteredEmiten = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return vettedEmiten;
    return vettedEmiten.filter(
      (e) =>
        e.ticker.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.sector && e.sector.toLowerCase().includes(q))
    );
  }, [searchQuery, vettedEmiten]);

  const mainDefaultId = useMemo(() => {
    const mainNode = currentBoard.nodes.find((n) => n.data.type === 'emiten' && !n.data.cross);
    return mainNode ? mainNode.id : currentBoard.nodes[0]?.id ?? 'emiten_main';
  }, [currentBoard]);

  const [selectedId, setSelectedId] = useState<string>(mainDefaultId);

  // Sinkronkan selectedId saat ticker emiten berganti
  useEffect(() => {
    setSelectedId(mainDefaultId);
  }, [mainDefaultId]);

  /* Papan dibuka dalam mode RINGKAS: hanya inti pemeriksaan (emiten, pemegang
     saham, orang kunci). Bukti pendukung dibuka lewat "Perluas jaringan" supaya
     papan pertama kali dilihat tidak jadi bola benang kusut. */
  const buildToggles = <T extends string>(keys: T[], visible: T[]): Record<T, boolean> =>
    Object.fromEntries(keys.map((k) => [k, visible.includes(k)])) as Record<T, boolean>;

  const [activeNodeTypes, setActiveNodeTypes] = useState<Record<NodeType, boolean>>(() =>
    buildToggles(Object.keys(NODE_TYPE_META) as NodeType[], DEFAULT_VISIBLE_NODES),
  );

  const [activeEdgeTypes, setActiveEdgeTypes] = useState<Record<EdgeType, boolean>>(() =>
    buildToggles(Object.keys(EDGE_META) as EdgeType[], DEFAULT_VISIBLE_EDGES),
  );

  const [chat, setChat] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatLog, setChatLog] = useState<
    {
      role: 'user' | 'ai';
      text: string;
      mode?: 'llm' | 'heuristik';
      model?: string | null;
      id?: string;
      pending?: boolean; // balasan belum datang — gelembung menampilkan animasi
    }[]
  >([
    {
      role: 'ai',
      text: `Papan investigasi ${selectedTicker} aktif.`,
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll ke pesan terbaru setiap ada chat baru
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatLog]);

  // Hitung layout dinamis: Node terpilih menjadi pusat, relasi terhubung mengelilingi, sisanya disembunyikan
  const { nodes, edges, centerNode, connectedCount } = useMemo(
    () =>
      calculateFocusLayout(
        currentBoard.nodes,
        currentBoard.edges,
        selectedId,
        activeNodeTypes,
        activeEdgeTypes,
      ),
    [currentBoard, selectedId, activeNodeTypes, activeEdgeTypes],
  );

  const selected = centerNode;

  // Saran pertanyaan pintar yang berubah dinamis mengikuti fokus node
  const promptChips = useMemo(
    () => getSmartPromptChips(selected, selectedTicker),
    [selected, selectedTicker]
  );

  // Benang terhubung untuk panel kanan: hanya edge yang BENAR-BENAR tampil di
  // kanvas (sudah lolos filter tipe + kedua ujungnya tidak tersembunyi),
  // bukan seluruh edge mentah papan. Sebelumnya panel menghitung 44 edge
  // padahal kanvas cuma menggambar sebagian.
  //
  // Dikelompokkan per entitas: satu orang bisa terhubung lewat DUA benang
  // sekaligus (pemegang saham yang juga menjabat). Kalau ditampilkan per edge,
  // nama yang sama muncul dua kali dan terbaca seperti node ganda — padahal
  // node-nya cuma satu.
  const related = useMemo(() => {
    if (!selected) return [];
    const dataById = new Map<string, BoardNodeData>();
    nodes.forEach((n) => dataById.set(n.id, n.data as unknown as BoardNodeData));

    const grouped = new Map<
      string,
      { otherId: string; otherLabel: string; threads: { type: EdgeType; label: string }[] }
    >();

    edges
      .filter((e) => e.source === selected.id || e.target === selected.id)
      .forEach((e) => {
        const otherId = e.source === selected.id ? e.target : e.source;
        const other = dataById.get(otherId);
        if (!other) return;
        const entry =
          grouped.get(otherId) ??
          { otherId, otherLabel: other.label, threads: [] as { type: EdgeType; label: string }[] };
        entry.threads.push({
          type: (e.data?.type ?? 'fakta') as EdgeType,
          label: (e.data?.label ?? '') as string,
        });
        grouped.set(otherId, entry);
      });

    return [...grouped.values()];
  }, [edges, nodes, selected]);

  const relatedThreadCount = related.reduce((sum, r) => sum + r.threads.length, 0);

  // Selisih antara benang di papan vs yang tampil — dipakai empty state supaya
  // panel jujur menyebut ada berapa benang yang disembunyikan filter.
  const hiddenRelatedCount = useMemo(() => {
    if (!selected) return 0;
    const total = currentBoard.edges.filter(
      (e) => e.source === selected.id || e.target === selected.id
    ).length;
    return Math.max(0, total - relatedThreadCount);
  }, [currentBoard, selected, relatedThreadCount]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedId(node.id);
  }, []);

  const sendQuestion = (text: string) => {
    const q = text.trim();
    if (!q || chatBusy) return;

    // Gelembung "sedang berpikir" ditambahkan SEKARANG dan duduk di posisi
    // balasan; begitu jawaban tiba, gelembung yang sama diganti isinya (bukan
    // ditambah), jadi percakapan tidak pernah menampilkan dua balasan.
    const pendingId = `pending_${Date.now()}`;
    const settle = (entry: {
      role: 'ai';
      text: string;
      mode?: 'llm' | 'heuristik';
      model?: string | null;
    }) => {
      setChatLog((l) => l.map((m) => (m.id === pendingId ? { ...entry, id: pendingId } : m)));
      setChatBusy(false);
    };

    setChatLog((l) => [
      ...l,
      { role: 'user', text: q, id: `q_${pendingId}` },
      { role: 'ai', text: '', id: pendingId, pending: true },
    ]);
    setChat('');
    setChatBusy(true);

    api
      .chatBoard(selectedTicker, q)
      .then((res) => {
        settle({ role: 'ai', text: res.reply, mode: res.mode, model: res.model });
      })
      .catch(() => {
        settle({
          role: 'ai',
          mode: 'heuristik',
          text: `Analisis keterkaitan ${selectedTicker}: Ditemukan ${connectedCount} entitas relasi aktif pada fokus ${selected?.data.label ?? selectedTicker}. (Jawaban lokal — server tidak terjangkau.)`,
        });
      });
  };

  const sendChat = () => {
    sendQuestion(chat);
  };

  const toggleNode = (k: NodeType) =>
    setActiveNodeTypes((s) => ({ ...s, [k]: !s[k] }));
  const toggleEdge = (k: EdgeType) =>
    setActiveEdgeTypes((s) => ({ ...s, [k]: !s[k] }));

  // Mode ringkas vs lengkap: "Perluas jaringan" menyalakan seluruh jenis bukti.
  const allTypesOn =
    (Object.keys(NODE_TYPE_META) as NodeType[]).every((k) => activeNodeTypes[k]) &&
    (Object.keys(EDGE_META) as EdgeType[]).every((k) => activeEdgeTypes[k]);

  const toggleAllTypes = () => {
    if (allTypesOn) {
      setActiveNodeTypes(buildToggles(Object.keys(NODE_TYPE_META) as NodeType[], DEFAULT_VISIBLE_NODES));
      setActiveEdgeTypes(buildToggles(Object.keys(EDGE_META) as EdgeType[], DEFAULT_VISIBLE_EDGES));
    } else {
      setActiveNodeTypes((s) => ({ ...s, ...buildToggles(Object.keys(NODE_TYPE_META) as NodeType[], Object.keys(NODE_TYPE_META) as NodeType[]) }));
      setActiveEdgeTypes((s) => ({ ...s, ...buildToggles(Object.keys(EDGE_META) as EdgeType[], Object.keys(EDGE_META) as EdgeType[]) }));
    }
  };

  const isFocusingNonMain = selectedId !== mainDefaultId;

  return (
    <div className="py-8">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <header className="mb-6">
            <div className="flex items-center gap-2 font-mono text-[11px] text-text-3 tracking-[1.5px] uppercase mb-2">
              <span>Analisis lanjutan</span>
              <span className="text-brass-500">/</span>
              <span className="text-brass-400">Papan Bukti Detektif</span>
            </div>
            <h1 className="font-display font-normal text-[clamp(28px,4vw,40px)] leading-[1.05] text-text-0">
              Papan Bukti <em className="italic text-brass-500">Detektif</em>
            </h1>
            <p className="mt-2 text-text-2 max-w-[62ch] text-[15px]">
              Eksplorasi grafis relasi kepemilikan, orang kunci, dan bukti red flag untuk <strong>emiten yang telah lolos sidang</strong> (Vonis Layak &amp; Kehati-hatian).
            </p>
          </header>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-[265px_1fr_310px] gap-4 items-stretch">
          {/* LEFT: emiten list + filter */}
          <Reveal>
            <div className="flex flex-col gap-3.5 h-[720px]">
              <div className="bg-bg-2 border border-[#3a332a] rounded-[14px] p-3.5 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-mono text-[11px] text-text-3 tracking-[1.5px] uppercase">
                    Emiten Lolos Sidang
                  </h3>
                  <span className="font-mono text-[10px] text-brass-400 bg-brass-500/10 px-2 py-0.5 rounded border border-brass-500/20">
                    {filteredEmiten.length} perkara
                  </span>
                </div>

                <p className="text-[11px] text-text-3 mb-2.5 leading-relaxed">
                  Hanya menampilkan emiten dengan vonis <span className="text-[#7fb069] font-medium">Layak</span> atau <span className="text-[#d9a441] font-medium">Hati-Hati</span>.
                </p>

                {/* Search Box */}
                <div className="relative mb-2.5">
                  <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari emiten sidang..."
                    className="w-full bg-bg-1 border border-[#3a332a] rounded-md pl-8 pr-7 py-1.5 font-mono text-[11.5px] text-text-0 placeholder:text-text-3 focus-visible:border-brass-500 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(201,162,74,0.15)] transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-0 font-mono text-xs px-1"
                      title="Hapus filter"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Emiten List */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {filteredEmiten.length === 0 ? (
                    <div className="py-8 text-center text-text-3 font-mono text-xs leading-relaxed px-2">
                      Tidak ada emiten lolos sidang yang cocok dengan pencarian &quot;{searchQuery}&quot;.
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {filteredEmiten.map((e) => {
                        const isCurrent = e.ticker === selectedTicker;
                        const isLayak = e.verdictCategory === 'layak_diteliti_lanjut' || e.verdictCategory === 'ok';
                        return (
                          <li key={e.ticker}>
                            <button
                              type="button"
                              onClick={() => {
                                if (e.ticker !== selectedTicker) {
                                  setSelectedTicker(e.ticker);
                                }
                              }}
                              className={`w-full text-left flex flex-col gap-1 px-2.5 py-2 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500/40 ${
                                isCurrent
                                  ? 'bg-brass-500/15 border border-brass-500/40 text-brass-300 shadow-sm'
                                  : 'hover:bg-white/[0.04] text-text-0 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className={`font-mono text-[12.5px] tracking-wide ${isCurrent ? 'font-bold text-brass-300' : 'font-medium text-text-0'}`}>
                                  {e.ticker}
                                </span>
                                <span
                                  className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium tracking-wide ${
                                    isLayak
                                      ? 'text-[#7fb069] bg-[#7fb069]/10 border-[#7fb069]/30'
                                      : 'text-[#d9a441] bg-[#d9a441]/10 border-[#d9a441]/30'
                                  }`}
                                >
                                  {isLayak ? 'Layak' : 'Hati-Hati'}
                                </span>
                              </div>
                              <div className="text-[11px] text-text-3 truncate">{e.name}</div>
                              {(e.createdAt || e.infoRichness || e.sector) && (
                                <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-text-3">
                                  {e.infoRichness && (
                                    <span className="text-brass-400">Richness {e.infoRichness}</span>
                                  )}
                                  {e.createdAt && (
                                    <>
                                      <span>•</span>
                                      <span>{formatDate(e.createdAt)}</span>
                                    </>
                                  )}
                                  {e.sector && !e.createdAt && (
                                    <span>{e.sector}</span>
                                  )}
                                </div>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Filter & Legenda */}
              <div className="bg-bg-2 border border-[#3a332a] rounded-[14px] p-3.5 flex-none">
                <h3 className="font-mono text-[10.5px] text-text-3 tracking-[1.5px] uppercase mb-2">
                  Filter &amp; Legenda
                </h3>
                <div className="flex flex-col gap-y-[3px]">
                  {(Object.keys(NODE_TYPE_META) as NodeType[]).map((k) => (
                    <label key={k} className={`${LEGEND_ROW} text-text-2 hover:text-text-0`}>
                      <input
                        type="checkbox"
                        checked={activeNodeTypes[k]}
                        onChange={() => toggleNode(k)}
                        className="accent-[#c9a24a] w-3 h-3 m-0"
                      />
                      <span
                        className="w-2 h-2 rounded-full justify-self-center"
                        style={{ background: NODE_TYPE_META[k].color }}
                      />
                      <span className="min-w-0 truncate" title={NODE_TYPE_META[k].label}>
                        {NODE_TYPE_META[k].label}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="border-t border-[#2a251e] my-2" />
                <div className="flex flex-col gap-y-[3px]">
                  {(Object.keys(EDGE_META) as EdgeType[]).map((k) => (
                    <label key={k} className={`${LEGEND_ROW} text-text-2 hover:text-text-0`}>
                      <input
                        type="checkbox"
                        checked={activeEdgeTypes[k]}
                        onChange={() => toggleEdge(k)}
                        className="accent-[#c9a24a] w-3 h-3 m-0"
                      />
                      <span
                        className="w-3.5 h-[2px] justify-self-center"
                        style={{
                          background: EDGE_META[k].color,
                          // Contoh garis mengikuti `dash` milik tipe itu sendiri —
                          // sebelumnya hanya `redflag` yang diputus-putus, jadi
                          // legenda `aliran` (yang di kanvas putus-putus) tampil
                          // sebagai garis penuh: legenda berbohong soal kanvas.
                          ...(dashSample(EDGE_META[k].dash, EDGE_META[k].color) ?? {}),
                        }}
                      />
                      <span className="min-w-0 truncate" title={EDGE_META[k].label}>
                        {EDGE_META[k].label}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="border-t border-[#2a251e] my-2" />
                {/* Saklar ini SENGAJA mati. Papan hanya memuat satu emiten, jadi
                    tidak ada benang ANTAR-emiten yang bisa digambar — dulu
                    saklar ini hanya menyaring kartu bertanda `cross`, bukan
                    menggambar benang, sehingga menjanjikan sesuatu yang tidak
                    ada. Daripada berbohong, dimatikan dengan alasan tertulis. */}
                <label
                  className={`${LEGEND_ROW} text-text-3 cursor-not-allowed`}
                  title="Belum tersedia: papan hanya memuat satu emiten, jadi belum ada benang antar-emiten yang bisa digambar."
                >
                  <input
                    type="checkbox"
                    checked={false}
                    disabled
                    readOnly
                    className="accent-[#c9a24a] w-3 h-3 m-0 cursor-not-allowed"
                  />
                  <span aria-hidden className="block" />
                  <span className="min-w-0 truncate">
                    Benang merah lintas emiten{' '}
                    <span className="font-mono text-[10px] tracking-wide text-text-3/80">
                      · belum tersedia
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </Reveal>

          {/* CENTER: board canvas */}
          <Reveal delay={40}>
            <div className="bg-[#0b0907] border border-[#3a332a] rounded-[14px] overflow-hidden shadow-2 h-[720px] flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#2a251e] bg-bg-2 flex-none">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[11px] text-text-3 tracking-[1.5px] uppercase">
                    Papan · <b className="font-semibold text-brass-400">{selectedTicker}</b>
                  </span>
                  <span className="text-text-3 text-xs">/</span>
                  <span className="inline-flex items-center gap-1.5 rounded-pill border border-brass-600/40 bg-brass-500/10 px-2 py-0.5 font-mono text-[11px] text-brass-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-brass-400 animate-pulse-dot" />
                    Fokus: {selected?.data.label ?? selectedTicker}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleAllTypes}
                    className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                      allTypesOn
                        ? 'border-[#3a332a] bg-bg-1 text-text-3 hover:border-brass-500 hover:text-brass-300'
                        : 'border-brass-600/50 bg-brass-500/10 text-brass-300 hover:border-brass-500'
                    }`}
                    title={
                      allTypesOn
                        ? 'Kembali ke tampilan ringkas (emiten, pemegang saham, orang kunci)'
                        : 'Tampilkan seluruh bukti: red flag, bukti kabar, fakta angka, jejak broker'
                    }
                  >
                    <SparkIcon size={12} />
                    {allTypesOn ? 'Ringkas' : 'Perluas jaringan'}
                  </button>
                  {isFocusingNonMain && (
                    <button
                      type="button"
                      onClick={() => setSelectedId(mainDefaultId)}
                      className="inline-flex items-center gap-1.5 rounded border border-[#3a332a] bg-bg-1 px-2.5 py-1 font-mono text-[11px] text-brass-400 hover:border-brass-500 hover:text-brass-300 transition-colors"
                      title={`Reset fokus ke emiten utama ${selectedTicker}`}
                    >
                      <RefreshIcon size={12} /> Reset ke {selectedTicker}
                    </button>
                  )}
                  <span className="font-mono text-[11px] text-text-3 tracking-wide">
                    {nodes.length} kartu aktif · {edges.length} benang
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full board-canvas bg-[#080706] relative">
                {boardError && !loadingBoard && (
                  <div className="absolute inset-0 bg-[#080706]/95 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="text-[#c96a5a] font-mono text-sm font-bold">
                      ⚠ Gagal Memuat Data Investigasi
                    </div>
                    <p className="font-mono text-xs text-text-3 max-w-[400px]">
                      {boardError}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBoardError(null);
                        setLoadingBoard(true);
                        api
                          .fetchBoard(selectedTicker)
                          .then((data) => {
                            setBoardData(data);
                            const mainNode =
                              data.nodes.find((n: BoardNode) => n.data.type === 'emiten' && !n.data.cross) ??
                              data.nodes[0];
                            if (mainNode) setSelectedId(mainNode.id);
                          })
                          .catch((err) => setBoardError(err?.message || 'Gagal memuat data'))
                          .finally(() => setLoadingBoard(false));
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-brass-500/40 bg-brass-500/10 font-mono text-xs text-brass-300 hover:bg-brass-500/20 transition-colors"
                    >
                      <RefreshIcon size={13} /> Coba Muat Ulang
                    </button>
                  </div>
                )}
                {loadingBoard && (
                  <div className="absolute inset-0 bg-[#080706]/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3">
                    <div className="w-7 h-7 border-2 border-brass-500/30 border-t-brass-500 rounded-full animate-spin" />
                    <span className="font-mono text-xs text-text-2 tracking-wide">
                      Menyusun berkas investigasi <b className="text-brass-300">{selectedTicker}</b> dari sidang &amp; Sectors...
                    </span>
                  </div>
                )}
                <ReactFlowProvider>
                  <FocusBoardFlow
                    nodes={nodes}
                    edges={edges}
                    onNodeClick={onNodeClick}
                  />
                </ReactFlowProvider>
              </div>
            </div>
          </Reveal>

          {/* RIGHT: detail + benang */}
          <Reveal delay={80}>
            <div className="flex flex-col gap-3.5 h-[720px]">
              <div className="bg-bg-2 border border-[#3a332a] rounded-[14px] p-3.5 flex-none max-h-[340px] flex flex-col min-h-0 overflow-y-auto">
                <h3 className="font-mono text-[11px] text-text-3 tracking-[1.5px] uppercase mb-3 flex-none">
                  Detail Bukti (Pusat Fokus)
                </h3>
                {selected ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2 h-2 rounded-full flex-none"
                        style={{ background: NODE_TYPE_META[selected.data.type].color }}
                      />
                      <span className="font-mono text-[12px] font-bold tracking-wide text-text-0">
                        {selected.data.label}
                      </span>
                    </div>
                    <div className="text-[12px] text-text-2 mb-2.5">
                      {NODE_TYPE_META[selected.data.type].label}
                      {selected.data.sub ? ` · ${selected.data.sub}` : ''}
                    </div>
                    {selected.data.value && (
                      <div className="font-mono text-lg font-bold text-brass-400 tabular-nums mb-2.5">{selected.data.value}</div>
                    )}
                    {selected.data.verdict && (
                      <div className="mb-2.5">
                        <VerdictBadge category={selected.data.verdict} />
                      </div>
                    )}
                    <ul className="flex flex-col gap-1.5 text-[12px] text-text-2">
                      {selected.data.detail?.map((d, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-brass-500 flex-none">·</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                    {selected.data.source && (
                      <div className="mt-2.5 font-mono text-[10px] text-text-3">
                        Sumber: {selected.data.source}
                      </div>
                    )}
                    <div className="mt-2.5 pt-2 border-t border-[#3a332a] flex items-center gap-1.5 font-mono text-[10.5px] text-text-3">
                      <ClockIcon size={12} className="text-brass-500 flex-none" />
                      <span>Diambil: <strong className="text-text-2 font-normal">{selected.data.retrievedAt ?? '10 Sep 2026'}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-text-2 text-sm">Pilih kartu di papan.</div>
                )}
              </div>

              {/* Daftar benang yang tumbuh mengisi kolom — bukan kartu detail yang
                  melar menyisakan ruang kosong, karena isinya yang panjang. */}
              <div className="bg-bg-2 border border-[#3a332a] rounded-[14px] p-3.5 flex-1 flex flex-col min-h-0">
                <h3 className="font-mono text-[11px] text-text-3 tracking-[1.5px] uppercase mb-2 flex-none">
                  Benang Terhubung ({relatedThreadCount})
                </h3>
                {related.length === 0 ? (
                  <div className="text-text-2 text-xs">
                    {hiddenRelatedCount > 0
                      ? `${hiddenRelatedCount} benang tersembunyi oleh filter tipe.`
                      : 'Tidak ada benang aktif.'}
                  </div>
                ) : (
                  <ul className="flex flex-col gap-1 overflow-y-auto pr-1 flex-1">
                    {related.map((r) => (
                      <li key={r.otherId}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(r.otherId)}
                          className="w-full text-left flex flex-col gap-0.5 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500/40"
                        >
                          {/* baris 1: titik + nama + panah (panah selalu di ujung kanan) */}
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full flex-none"
                              style={{ background: r.threads[0] ? EDGE_META[r.threads[0].type].color : undefined }}
                            />
                            <span
                              className="flex-1 min-w-0 truncate font-mono text-[11.5px] text-text-0 tracking-wide"
                              title={r.otherLabel}
                            >
                              {r.otherLabel}
                            </span>
                            <ArrowRightIcon size={12} className="text-text-3 flex-none" />
                          </div>
                          {/* baris 2: semua jenis benang ke entitas ini, rata pada x yang sama */}
                          <div className="pl-4 text-[10px] text-text-3">
                            {r.threads
                              .map((t) => `${EDGE_META[t.type].label}${t.label ? ` ${t.label}` : ''}`)
                              .join(' · ')}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Reveal>
        </div>

        {/* BOTTOM SECTION: Ruang Analisis Intelijen & Visual Grafik AI */}
        <Reveal delay={90}>
          <div className="mt-8 pt-6 border-t border-[#2e271f]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-text-3 tracking-[1.5px] uppercase mb-1">
                  <SparkIcon size={13} className="text-brass-400" />
                  <span>Ruang Analisis &amp; Intelijen Hakim AI</span>
                </div>
                <h2 className="font-display font-normal text-2xl text-text-0">
                  Bedah Investigasi &amp; Matriks <em className="italic text-brass-400">{selectedTicker}</em>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-brass-400/90 bg-brass-500/10 px-3 py-1 rounded-full border border-brass-500/20">
                  Mode Analisis Objektif
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5 items-start">
              {/* LEFT: Asisten AI Interaktif + Smart Chips */}
              <div className="bg-bg-2 border border-[#3a332a] rounded-[14px] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-mono text-[11.5px] text-text-0 font-semibold tracking-wide flex items-center gap-2">
                    <SparkIcon size={14} className="text-brass-400" /> Tanya Asisten Investigasi ({selectedTicker})
                  </h3>
                  <span className="text-[11px] font-mono text-text-3">
                    Fokus: <b className="text-brass-300 font-semibold">{selected?.data.label ?? selectedTicker}</b>
                  </span>
                </div>

                <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto mb-4 pr-1">
                  {chatLog.map((m, i) => (
                    <div
                      key={m.id ?? i}
                      className={`text-[13px] leading-relaxed ${
                        m.role === 'user'
                          ? 'text-text-0 text-right bg-brass-500/10 border border-brass-500/30 rounded-lg p-3 ml-12'
                          : 'text-text-2 bg-bg-1 border border-[#2e271f] rounded-lg p-3 mr-6'
                      } ${m.pending ? 'animate-fade-in' : ''}`}
                    >
                      {m.role === 'ai' && !m.pending && (
                        <div className="font-mono text-[10.5px] font-semibold text-brass-400 mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="flex items-center gap-1.5">
                            <SparkIcon size={11} /> Analisis Hakim AI:
                          </span>
                          {/* jujur soal jalur jawaban: model bahasa vs heuristik lokal */}
                          {m.mode === 'heuristik' ? (
                            <span
                              className="font-normal text-[9.5px] uppercase tracking-wide px-1.5 py-[1px] rounded border text-[#d9a441] bg-[#d9a441]/10 border-[#d9a441]/30"
                              title="LLM tidak tersedia — jawaban disusun dari data papan, bukan oleh model bahasa."
                            >
                              heuristik
                            </span>
                          ) : m.mode === 'llm' ? (
                            <span
                              className="font-normal text-[9.5px] uppercase tracking-wide px-1.5 py-[1px] rounded border text-[#7fb069] bg-[#7fb069]/10 border-[#7fb069]/30"
                              title={`Dijawab oleh model ${m.model ?? 'LLM'}.`}
                            >
                              {m.model ?? 'llm'}
                            </span>
                          ) : null}
                        </div>
                      )}
                      {m.pending ? (
                        // Animasi "asisten sedang menelusuri papan": tiga titik
                        // memantul bergantian + garis progres. LLM bisa butuh
                        // beberapa detik, jadi harus terlihat hidup — bukan
                        // gelembung kosong yang tampak seperti jawaban hampa.
                        <div
                          className="flex flex-col gap-2"
                          role="status"
                          aria-live="polite"
                          aria-label={`Asisten sedang menelusuri papan ${selectedTicker}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-[3px]" aria-hidden>
                              {[0, 1, 2].map((d) => (
                                <span
                                  key={d}
                                  className="h-1.5 w-1.5 rounded-full bg-brass-400 animate-bounce motion-reduce:animate-none"
                                  style={{ animationDelay: `${d * 0.16}s`, animationDuration: '1.05s' }}
                                />
                              ))}
                            </span>
                            <span className="font-mono text-[10.5px] text-brass-300/90 tracking-wide">
                              Menelusuri papan {selectedTicker}… menimbang benang bukti &amp; red flag
                            </span>
                          </div>
                          {/* Bar progres tak-tentu. Memakai keyframe `livebar`
                              (menggeser `left`), bukan `strip-slide` yang
                              menganimasikan `backgroundPosition` — yang terakhir
                              tidak menggerakkan elemen berwarna solid apa pun. */}
                          <span
                            className="relative h-[2px] w-full overflow-hidden rounded-full bg-brass-500/15"
                            aria-hidden
                          >
                            <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-brass-400/70 animate-livebar motion-reduce:animate-none" />
                          </span>
                        </div>
                      ) : (
                        m.text
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Smart Suggestion Chips */}
                <div className="mb-4 pt-3 border-t border-[#2e271f]">
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-text-3 uppercase tracking-wider mb-2">
                    <SparkIcon size={11} className="text-brass-400 flex-none" />
                    <span>Rekomendasi Pertanyaan ({selected?.data.label ?? selectedTicker}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {promptChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendQuestion(chip)}
                        disabled={chatBusy}
                        className="text-left font-mono text-[11px] rounded-md border border-[#3a332a] bg-bg-1 px-3 py-1.5 text-text-2 hover:border-brass-500 hover:text-brass-300 hover:bg-brass-500/10 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#3a332a] disabled:hover:text-text-2 disabled:hover:bg-bg-1"
                        title={
                          chatBusy
                            ? 'Tunggu jawaban sebelumnya selesai dulu.'
                            : 'Klik untuk langsung menanyakan ini ke AI'
                        }
                      >
                        💬 {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendChat();
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={chat}
                    onChange={(e) => setChat(e.target.value)}
                    placeholder={
                      chatBusy
                        ? `Menunggu jawaban untuk ${selected?.data.label ?? selectedTicker}…`
                        : `Ketik pertanyaan mandiri soal ${selected?.data.label ?? selectedTicker}…`
                    }
                    className="flex-1 bg-bg-1 border border-[#3a332a] rounded-md px-3.5 py-2.5 text-sm text-text-0 placeholder:text-text-3 focus-visible:border-brass-500 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(201,162,74,.12)] transition-shadow"
                  />
                  <button
                    type="submit"
                    disabled={chatBusy}
                    aria-busy={chatBusy}
                    className="font-mono text-xs tracking-wider text-[#14120f] bg-brass-500 rounded-md px-4 py-2.5 transition-colors hover:bg-brass-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500/50 font-semibold disabled:opacity-60 disabled:cursor-wait disabled:hover:bg-brass-500 inline-flex items-center gap-2"
                  >
                    {chatBusy && (
                      <span
                        className="h-3 w-3 rounded-full border-2 border-[#14120f]/30 border-t-[#14120f] animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                    )}
                    {chatBusy ? 'Menganalisis…' : 'Kirim'}
                  </button>
                </form>

                <div className="mt-2.5 text-center font-mono text-[10px] text-text-3/80">
                  ⚖️ Asisten Hakim menyajikan analisis data &amp; risiko objektif untuk riset mandiri (bukan rekomendasi transaksi).
                </div>
              </div>

              {/* RIGHT: Visual Grafik Harga & Benchmark Metrik Evaluasi */}
              <div className="flex flex-col gap-4">
                {/* 1. Grafik Tren Harga */}
                <div className="bg-bg-2 border border-[#3a332a] rounded-[14px] p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-mono text-[11px] text-text-3 tracking-[1.5px] uppercase">
                      Grafik Pergerakan Harga · {selectedTicker}
                    </h3>
                    <span className="font-mono text-[12px] font-bold text-brass-300">
                      {selectedTicker === 'BBCA'
                        ? 'Rp 9.850'
                        : selectedTicker === 'BRMS'
                          ? 'Rp 186'
                          : selectedTicker === 'CUAN'
                            ? 'Rp 6.425'
                            : selectedTicker === 'GOTO'
                              ? 'Rp 68'
                              : selectedTicker === 'BBRI'
                                ? 'Rp 4.920'
                                : 'Rp 2.890'}
                    </span>
                  </div>
                  <div className="pt-2">
                    {currentBoard.priceHistory && currentBoard.priceHistory.length >= 2 ? (
                      <PriceChart points={currentBoard.priceHistory} endLabel="Hari ini" />
                    ) : (
                      <div className="h-28 flex items-center justify-center text-text-3 font-mono text-xs">
                        Grafik harga tidak tersedia.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Benchmark Metrik vs Sektor & Tesis Ringkas */}
                <div className="bg-bg-2 border border-[#3a332a] rounded-[14px] p-4">
                  <h3 className="font-mono text-[11px] text-text-3 tracking-[1.5px] uppercase mb-3">
                    Benchmark Valuasi vs Rata-rata Industri
                  </h3>

                  {currentBoard.metricsComparison && (
                    <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                      {currentBoard.metricsComparison.map((m, idx) => (
                        <div key={idx} className="bg-bg-1 border border-[#342d24] rounded-lg p-2.5">
                          <div className="flex items-center justify-between text-[11px] text-text-3 font-mono mb-1">
                            <span>{m.label}</span>
                            <span
                              className={`text-[9.5px] px-1.5 py-0.2 rounded font-semibold ${
                                m.verdict === 'superior'
                                  ? 'bg-[#7fb069]/15 text-[#7fb069]'
                                  : m.verdict === 'fair'
                                    ? 'bg-[#d9a441]/15 text-[#d9a441]'
                                    : 'bg-[#c96a5a]/15 text-[#c96a5a]'
                              }`}
                            >
                              {m.verdict === 'superior' ? 'Unggul' : m.verdict === 'fair' ? 'Wajar' : 'Waspada'}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="font-mono text-sm font-bold text-text-0">
                              {formatBenchmarkValue(m.value, m.unit)}
                            </span>
                            <span className="font-mono text-[10.5px] text-text-3">
                              Sektor: {formatBenchmarkValue(m.sectorAvg, m.unit)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentBoard.thesisSummary && (
                    <div className="bg-brass-500/5 border border-brass-500/20 rounded-lg p-3">
                      <div className="font-mono text-[10px] uppercase font-semibold text-brass-400 mb-1 flex items-center gap-1.5">
                        <SparkIcon size={11} /> Tesis Investigasi Hakim:
                      </div>
                      <p className="text-[12px] text-text-2 leading-relaxed">
                        {currentBoard.thesisSummary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
