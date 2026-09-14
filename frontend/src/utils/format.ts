/** Pemformatan angka/tanggal — mengikuti bahasa antarmuka.
 *
 * Sebelumnya lima `Intl` dibangun sekali di scope modul dengan 'id-ID',
 * sehingga beku sejak import pertama dan tidak bisa ikut saat bahasa
 * diganti. Sekarang pemformat dibuat lazy per bahasa, dan `setFormatLocale`
 * (dipanggil provider bahasa) adalah satu-satunya penulisnya.
 *
 * Nama fungsi yang diekspor sengaja TIDAK berubah supaya berkas pemanggil
 * tidak perlu disentuh.
 */
import { DEFAULT_LANG, type Lang } from '../i18n/types';

/** Angka dan tanggal IKUT bahasa UI (keputusan user 2026-09-14): mode EN
 * memakai pemisah ribuan/desimal serta nama bulan ala en-US. */
const LOCALES: Record<Lang, string> = { en: 'en-US', id: 'id-ID' };

/** Satuan yang datang dari data backend masih Bahasa Indonesia. Ini bagian
 * data, bukan chrome UI, jadi diterjemahkan di sini alih-alih lewat kamus. */
const UNIT_EN: Record<string, string> = { 'miliar Rp': 'billion IDR' };

interface Formatters {
  locale: string;
  number: Intl.NumberFormat;
  compact: Intl.NumberFormat;
  rupiah: Intl.NumberFormat;
  date: Intl.DateTimeFormat;
  dateTime: Intl.DateTimeFormat;
  time: Intl.DateTimeFormat;
}

function build(lang: Lang): Formatters {
  const locale = LOCALES[lang];
  return {
    locale,
    number: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    compact: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    rupiah: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    dateTime: new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

const cache = new Map<Lang, Formatters>();
let current: Lang = DEFAULT_LANG;

/** Dipanggil provider bahasa tiap kali bahasa berganti. */
export function setFormatLocale(lang: Lang): void {
  current = lang;
}

function fmt(): Formatters {
  let set = cache.get(current);
  if (!set) {
    set = build(current);
    cache.set(current, set);
  }
  return set;
}

export function formatNumber(value: number): string {
  return fmt().number.format(value);
}

/** Angka relatif kecil (rasio, harga < 1000) tanpa pemisah ribuan yang berlebihan. */
export function formatValue(value: number, unit: string): string {
  const label = current === 'en' ? UNIT_EN[unit] ?? unit : unit;
  if (label === '%' || label === 'x') return fmt().compact.format(value) + label;
  if (label === 'Rp' || label === 'billion IDR') {
    return formatNumber(value) + (label.startsWith(' ') ? '' : ' ' + label);
  }
  return `${formatNumber(value)} ${label}`.trim();
}

export function formatRupiah(value: number): string {
  // Simbol "Rp" ditulis tetap, bukan lewat style:'currency' — dengan locale
  // en-US, Intl akan mencetak "IDR" padahal mata uangnya tetap Rupiah.
  return `Rp ${fmt().rupiah.format(value)}`;
}

/** Persen bertanda eksplisit, mis. +6,10% (ID) / +6.10% (EN). */
export function formatPct(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : '';
  return (
    sign +
    value.toLocaleString(fmt().locale, {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }) +
    '%'
  );
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  // Tanggal epoch/placeholder (mis. 1970) dianggap "tidak ada data".
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1990) return '—';
  return fmt().date.format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fmt().dateTime.format(d);
}

/** Stempel provenance: backend mengirim TANGGAL AMBIL payload (YYYY-MM-DD) untuk
 * data Sectors dan jam kejadian (ISO lengkap) untuk hal lain. Tanggal saja
 * ditampilkan sebagai tanggal — mencetaknya sebagai "00.00" akan mengarang jam
 * yang tidak pernah ada. */
export function formatStamp(iso: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(iso);
  if (dateOnly) {
    // Dibangun sebagai tanggal LOKAL: `new Date('2026-09-09')` adalah tengah
    // malam UTC, yang di zona barat akan mundur sehari.
    const [y, m, d] = iso.split('-').map(Number);
    return fmt().date.format(new Date(y, m - 1, d));
  }
  return formatDateTime(iso);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fmt().time.format(d);
}
