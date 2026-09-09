/** Pemformatan angka/tanggal gaya Indonesia (id-ID) + label UI kecil. */

const numberFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const rupiahFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

/** Angka relatif kecil (rasio, harga < 1000) tanpa pemisah ribuan yang berlebihan. */
export function formatValue(value: number, unit: string): string {
  if (unit === '%' || unit === 'x') return compactFmt.format(value) + unit;
  if (unit === 'Rp' || unit === 'miliar Rp') return formatNumber(value) + (unit.startsWith(' ') ? '' : ' ' + unit);
  return `${formatNumber(value)} ${unit}`.trim();
}

export function formatRupiah(value: number): string {
  return rupiahFmt.format(value);
}

/** Persen dpt minus/plus, misal +6,10% / -5,95%. */
export function formatPct(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : '';
  return sign + value.toLocaleString('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: digits }) + '%';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateTimeFmt.format(d);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Konfidensi 0..1 → persen. */
export function formatConfidence(value: number): string {
  return Math.round(value * 100) + '%';
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
