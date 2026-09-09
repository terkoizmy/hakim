/**
 * Grafik harga SVG tanpa dependensi — garis + area gradien, label tanggal/nilai.
 * Tema mengikuti token CSS ruang sidang (brass). Points harus ascending.
 */
import type { PricePoint } from '../types/contract';

interface Props {
  points: PricePoint[] | null;
  /** Label penanda titik akhir (mis. "hari ini"). */
  endLabel?: string;
}

const W = 720;
const H = 220;
const PAD_X = 10;
const PAD_TOP = 18;
const PAD_BOTTOM = 26;

export default function PriceChart({ points, endLabel }: Props) {
  if (!points || points.length < 2) return null;

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  // Nilai terakhir mungkin di luar min/max? Tidak — min/max dari data sendiri.
  const span = max - min || Math.max(1, max * 0.01);
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) => PAD_X + (innerW * i) / (points.length - 1);
  const y = (v: number) => PAD_TOP + innerH * (1 - (v - min) / span);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${PAD_TOP + innerH} L${PAD_X},${PAD_TOP + innerH} Z`;

  const first = points[0];
  const last = points[points.length - 1];
  const lastX = x(points.length - 1);
  const lastY = y(last.close);

  return (
    <svg
      className="block h-auto w-full"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Grafik harga ${first.date} sampai ${last.date}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(217,180,109,0.28)" />
          <stop offset="100%" stopColor="rgba(217,180,109,0.02)" />
        </linearGradient>
      </defs>

      {/* garis referensi min & max */}
      <line
        className="stroke-line-1"
        strokeWidth={1}
        strokeDasharray="3 4"
        x1={PAD_X}
        y1={y(max)}
        x2={W - PAD_X}
        y2={y(max)}
      />
      <line
        className="stroke-line-1"
        strokeWidth={1}
        strokeDasharray="3 4"
        x1={PAD_X}
        y1={y(min)}
        x2={W - PAD_X}
        y2={y(min)}
      />
      <text className="fill-text-2 font-mono text-[10px]" x={PAD_X + 2} y={y(max) - 5}>
        {fmt(max)}
      </text>
      <text className="fill-text-2 font-mono text-[10px]" x={PAD_X + 2} y={y(min) - 5}>
        {fmt(min)}
      </text>

      <path d={area} fill="url(#pc-fill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--brass-400)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      <circle
        className="fill-brass-300 stroke-bg-1"
        strokeWidth={1.5}
        cx={lastX}
        cy={lastY}
        r="3.5"
      />
      <text
        className="fill-brass-200 font-mono text-[10px] font-semibold"
        x={lastX - 4}
        y={lastY - 9}
        textAnchor="end"
      >
        {fmt(last.close)}
      </text>

      <text className="fill-text-2 font-mono text-[10px]" x={PAD_X} y={H - 8}>
        {fmtDate(first.date)}
      </text>
      <text
        className="fill-brass-200 font-mono text-[10px] font-semibold"
        x={lastX}
        y={H - 8}
        textAnchor="end"
      >
        {endLabel ?? fmtDate(last.date)}
      </text>
    </svg>
  );
}

function fmt(v: number): string {
  return v.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}