/**
 * Grafik harga SVG interaktif:
 * grid line solid, area gradien, titik plot interaktif dengan tooltip harga,
 * tanggal, dan pergerakan persentase saat kursor mouse diarahkan ke titik.
 * Points harus ascending.
 */
import { useState, useCallback } from 'react';
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
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

  // Handler pelacakan mouse untuk snap-to-nearest point
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * W;

    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(x(i) - svgX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    setHoveredIdx(closestIdx);
  }, [points.length]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIdx(null);
  }, []);

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="relative w-full select-none">
      <svg
        className="block h-auto w-full overflow-visible cursor-crosshair"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Grafik harga ${first.date} sampai ${last.date}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9a24a" stopOpacity=".22" />
            <stop offset="1" stopColor="#c9a24a" stopOpacity="0" />
          </linearGradient>
          <filter id="pc-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* grid line solid — 25% / 50% / 75% area garis */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            stroke="#2a251e"
            strokeWidth={1}
            x1={0}
            y1={TOP + (BOT - TOP) * f}
            x2={W}
            y2={TOP + (BOT - TOP) * f}
          />
        ))}

        {/* Area fill gradien & garis harga utama */}
        <path d={area} fill="url(#pc-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#c9a24a"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Titik-titik plot dasar */}
        {points.map((p, i) => {
          const isHovered = hoveredIdx === i;
          const isLast = i === points.length - 1;
          return (
            <g key={`${p.date}-${i}`}>
              {/* Hitbox transparan yang nyaman disentuh kursor */}
              <circle
                cx={x(i)}
                cy={y(p.close)}
                r={14}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
              />
              {/* Titik visual */}
              <circle
                cx={x(i)}
                cy={y(p.close)}
                r={isHovered ? 6 : isLast ? 5 : 4}
                fill={isHovered ? '#f5d78e' : isLast ? '#e0c27a' : '#c9a24a'}
                stroke="#14120f"
                strokeWidth={isHovered ? 2.5 : 2}
                className="transition-all duration-150 pointer-events-none"
              />
            </g>
          );
        })}

        {/* Tooltip & Crosshair interaktif saat titik di-hover */}
        {activePoint && hoveredIdx !== null && (() => {
          const px = x(hoveredIdx);
          const py = y(activePoint.close);

          const boxW = 126;
          const boxH = 46;

          // Jaga agar tooltip tidak keluar dari batas kiri/kanan SVG
          let boxX = px - boxW / 2;
          if (boxX < 4) boxX = 4;
          if (boxX + boxW > W - 4) boxX = W - boxW - 4;

          // Letakkan di atas titik, atau di bawah jika titik berada di dekat batas atas
          let boxY = py - boxH - 12;
          if (boxY < 8) boxY = py + 14;

          const chg = activePoint.change_pct;
          const chgStr = chg !== undefined && chg !== null
            ? (chg > 0 ? `+${chg.toFixed(1)}%` : `${chg.toFixed(1)}%`)
            : null;
          const chgColor = chg && chg > 0 ? '#7fb069' : chg && chg < 0 ? '#c96a5a' : '#a89f90';

          return (
            <g className="pointer-events-none transition-all duration-100">
              {/* Garis vertikal crosshair */}
              <line
                x1={px}
                y1={TOP - 10}
                x2={px}
                y2={BOT + 8}
                stroke="#e0c27a"
                strokeWidth={1}
                strokeDasharray="3 3"
                strokeOpacity={0.45}
              />

              {/* Halo glow di sekeliling titik aktif */}
              <circle
                cx={px}
                cy={py}
                r={10}
                fill="#e0c27a"
                fillOpacity={0.25}
              />

              {/* Box popup tooltip harga */}
              <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                rx={6}
                fill="#16130f"
                stroke="#e0c27a"
                strokeWidth={1}
                strokeOpacity={0.8}
                filter="url(#pc-glow)"
              />

              {/* Label Harga */}
              <text
                x={boxX + boxW / 2}
                y={boxY + 19}
                textAnchor="middle"
                className="font-mono font-bold select-none"
                fontSize={13}
                fill="#f5d78e"
              >
                Rp {fmt(activePoint.close)}
              </text>

              {/* Tanggal & Perubahan */}
              <text
                x={boxX + boxW / 2}
                y={boxY + 36}
                textAnchor="middle"
                className="font-mono select-none"
                fontSize={10}
                fill="#b0a89a"
              >
                {fmtDate(activePoint.date)}
                {chgStr && (
                  <tspan dx={6} fill={chgColor} fontWeight="bold">
                    {chgStr}
                  </tspan>
                )}
              </text>
            </g>
          );
        })()}

        {/* Label nilai min/max & tanggal axis */}
        <text className="font-mono text-[11px]" fill="#e0c27a" x={W} y={TOP - 12} textAnchor="end">
          {activePoint ? `Rp ${fmt(activePoint.close)}` : `Maks: Rp ${fmt(max)}`}
        </text>
        <text className="font-mono text-[11px]" fill="#6f675a" x={0} y={BOT + 16}>
          Min: Rp {fmt(min)}
        </text>
        <text className="font-mono text-[11px]" fill="#6f675a" x={0} y={H - 2}>
          {fmtDate(first.date)}
        </text>
        <text className="font-mono text-[11px]" fill="#6f675a" x={W} y={H - 2} textAnchor="end">
          {endLabel ?? fmtDate(last.date)}
        </text>
      </svg>

      {/* Petunjuk interaktif halus di pojok kanan bawah */}
      <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-text-3">
        <span>Arahkan kursor pada grafik untuk melihat rincian harga</span>
        {activePoint && (
          <span className="text-brass-300 font-semibold">
            {fmtDate(activePoint.date)}: Rp {fmt(activePoint.close)}
          </span>
        )}
      </div>
    </div>
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