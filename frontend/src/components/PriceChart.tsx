/**
 * Grafik harga SVG tanpa dependensi — gaya chart mock berkas-emiten:
 * grid line solid, titik per-snapshot, label max brass-soft / min faint.
 * Points harus ascending.
 */
import type { PricePoint } from '../types/contract';

interface Props {
  points: PricePoint[] | null;
  /** Label penanda titik akhir (mis. "hari ini"). */
  endLabel?: string;
}

const W = 600;
const H = 220;
const TOP = 40;
const BOT = 180;

export default function PriceChart({ points, endLabel }: Props) {
  if (!points || points.length < 2) return null;

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || Math.max(1, max * 0.01);

  const x = (i: number) => (W * i) / (points.length - 1);
  const y = (v: number) => TOP + (BOT - TOP) * (1 - (v - min) / span);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.close).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <svg
      className="block h-auto w-full overflow-visible"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Grafik harga ${first.date} sampai ${last.date}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9a24a" stopOpacity=".18" />
          <stop offset="1" stopColor="#c9a24a" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grid line solid — 25% / 50% / 75% area garis */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} stroke="#2a251e" strokeWidth={1} x1={0} y1={TOP + (BOT - TOP) * f} x2={W} y2={TOP + (BOT - TOP) * f} />
      ))}

      <path d={area} fill="url(#pc-fill)" />
      <path d={line} fill="none" stroke="#c9a24a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* titik pada tiap snapshot; titik terakhir lebih besar & brass-soft */}
      {points.map((p, i) => (
        <circle
          key={`${p.date}-${i}`}
          cx={x(i)}
          cy={y(p.close)}
          r={i === points.length - 1 ? 5 : 4}
          fill={i === points.length - 1 ? '#e0c27a' : '#c9a24a'}
          stroke="#14120f"
          strokeWidth={2}
        />
      ))}

      {/* label nilai & tanggal — gaya axis mock */}
      <text className="font-mono text-[11px]" fill="#e0c27a" x={W} y={TOP - 12} textAnchor="end">
        Rp {fmt(max)}
      </text>
      <text className="font-mono text-[11px]" fill="#6f675a" x={0} y={BOT + 16}>
        Rp {fmt(min)}
      </text>
      <text className="font-mono text-[11px]" fill="#6f675a" x={0} y={H - 2}>
        {fmtDate(first.date)}
      </text>
      <text className="font-mono text-[11px]" fill="#6f675a" x={W} y={H - 2} textAnchor="end">
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