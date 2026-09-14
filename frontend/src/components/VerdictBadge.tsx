import { useLabels } from '../i18n';
import type { VerdictCategory } from '../types/contract';

export type VerdictBadgeCategory = VerdictCategory | 'ok' | 'warn' | 'red';

/** Warna per kategori. Ini murni visual, jadi tetap di komponen — bukan di
 * kamus. Yang penting: tiap entri menunjuk `category` kanoniknya, sehingga
 * alias ok/warn/red memakai label yang sama persis dengan kategori aslinya
 * (dulu ketiganya menyalin teks yang sama secara manual, dan itu yang membuat
 * satu putusan bisa tampil dengan tiga kapitalisasi berbeda). */
const VERDICT_STYLE: Record<
  string,
  { category: VerdictCategory; color: string; border: string; bg: string; dot: string }
> = {
  layak_diteliti_lanjut: {
    category: 'layak_diteliti_lanjut',
    color: '#8fc07c',
    border: 'rgba(127,176,105,0.4)',
    bg: 'rgba(127,176,105,0.06)',
    dot: '#7fb069',
  },
  ok: {
    category: 'layak_diteliti_lanjut',
    color: '#8fc07c',
    border: 'rgba(127,176,105,0.4)',
    bg: 'rgba(127,176,105,0.06)',
    dot: '#7fb069',
  },
  perlu_kehati_hatian: {
    category: 'perlu_kehati_hatian',
    color: '#d9a441',
    border: 'rgba(217,164,65,0.4)',
    bg: 'rgba(217,164,65,0.06)',
    dot: '#d9a441',
  },
  warn: {
    category: 'perlu_kehati_hatian',
    color: '#d9a441',
    border: 'rgba(217,164,65,0.4)',
    bg: 'rgba(217,164,65,0.06)',
    dot: '#d9a441',
  },
  red_flag_berat: {
    category: 'red_flag_berat',
    color: '#c96a5a',
    border: 'rgba(201,106,90,0.4)',
    bg: 'rgba(201,106,90,0.06)',
    dot: '#c96a5a',
  },
  red: {
    category: 'red_flag_berat',
    color: '#c96a5a',
    border: 'rgba(201,106,90,0.4)',
    bg: 'rgba(201,106,90,0.06)',
    dot: '#c96a5a',
  },
};

export default function VerdictBadge({
  category,
  className = '',
}: {
  category: VerdictBadgeCategory | string;
  className?: string;
}) {
  const labels = useLabels();
  const style = VERDICT_STYLE[category] ?? VERDICT_STYLE.warn;

  return (
    <span
      className={`inline-flex items-center gap-[7px] whitespace-nowrap rounded-[6px] px-[10px] py-[5px] font-mono text-[11.5px] tracking-[0.3px] ${className}`}
      style={{
        color: style.color,
        borderColor: style.border,
        background: style.bg,
        borderStyle: 'solid',
        borderWidth: 1,
      }}
    >
      <span
        className="h-1.5 w-1.5 flex-none rounded-full"
        style={{ background: style.dot }}
        aria-hidden="true"
      />
      {labels.verdict[style.category]}
    </span>
  );
}
