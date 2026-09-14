import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import VerdictBadge from '../components/VerdictBadge';
import { TD_BASE, TH_WRAP } from '../components/table';
import { SearchIcon, ChevronDownIcon, CheckIcon } from '../components/icons';
import { renderRich, useLang } from '../i18n';
import { formatDate, formatRupiah } from '../utils/format';
import type { JournalItem, TickerListItem } from '../types/contract';
import type { VerdictCategory } from '../types/contract';

/** Cincin fokus bersama — pola yang sama dengan AppShell. */
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0';

/** Custom Dropdown Sektor dengan tema Mahkamah / Dark Sepia & Brass */
function SectorDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { sector: string; count: number }[];
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectedOption = options.find((o) => o.sector === value);
  const selectedLabel = selectedOption
    ? `${selectedOption.sector} (${selectedOption.count})`
    : t('dashboard.sector.all');

  const totalAll = options.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="relative min-w-[220px]" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-[#3a332a] bg-bg-2 px-[18px] py-[15px] text-left transition-all hover:border-brass-600/70 focus:border-brass-600 focus:outline-none focus:shadow-[0_0_0_3px_rgba(201,162,74,0.12)]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-mono text-[11px] uppercase tracking-[1px] text-text-3">
            {t('dashboard.sector.label')}
          </span>
          <span className="truncate text-[14.5px] font-medium text-text-0">
            {selectedLabel}
          </span>
        </div>
        <ChevronDownIcon
          size={16}
          className={`flex-none text-brass-400 transition-transform duration-200 ${
            open ? 'rotate-180 text-brass-300' : ''
          }`}
        />
      </button>

      {open && (
        <div className="anim-in absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[340px] overflow-y-auto rounded-xl border border-[#3a332a] bg-[#1a1713] p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.8)] backdrop-blur-md">
          {/* Option: Semua */}
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors ${FOCUS} ${
              value === ''
                ? 'bg-brass-500/20 font-semibold text-brass-300'
                : 'text-text-1 hover:bg-[#28231c] hover:text-text-0'
            }`}
          >
            <div className="flex items-center gap-2">
              {value === '' ? (
                <CheckIcon size={14} className="text-brass-400" />
              ) : (
                <span className="w-3.5" />
              )}
              <span>{t('dashboard.sector.all')}</span>
            </div>
            <span className="font-mono text-[11px] text-text-3">{totalAll}</span>
          </button>

          <div className="my-1 border-t border-[#2a251e]" />

          {/* Sektor List */}
          {options.map((s) => {
            const isSelected = value === s.sector;
            return (
              <button
                key={s.sector}
                type="button"
                onClick={() => {
                  onChange(s.sector);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors ${FOCUS} ${
                  isSelected
                    ? 'bg-brass-500/20 font-semibold text-brass-300'
                    : 'text-text-1 hover:bg-[#28231c] hover:text-text-0'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {isSelected ? (
                    <CheckIcon size={14} className="flex-none text-brass-400" />
                  ) : (
                    <span className="w-3.5 flex-none" />
                  )}
                  <span className="truncate">{s.sector}</span>
                </div>
                <span className="flex-none font-mono text-[11px] text-text-3">
                  {s.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const EXAMPLES = ['BBCA', 'CUAN', 'GOTO', 'BRMS', 'BBRI'];

const SEARCH_DEBOUNCE_MS = 250;
/** Baris per halaman daftar emiten (registry IDX penuh ±962 — dimuat bertahap). */
const PAGE_SIZE = 60;

// Mock berkas-perkara: th mono uppercase di atas permukaan lebih gelap;
// header boleh wrap 2 baris (JML SIDANG dst.) agar tabel muat di kolom 1fr.
const TH = `${TH_WRAP} px-[14px] py-3`;
const TH_NUM = `${TH} text-right`;
const TD = `${TD_BASE} whitespace-nowrap px-[14px] py-[13px] align-middle`;

/** Badge "belum diadili" — gaya b-none pada mock (dot samar, tanpa warna). */
function NotTriedBadge() {
  const { t } = useLang();
  return (
    <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[6px] border border-[#3a332a] px-[10px] py-[5px] font-mono text-[11.5px] tracking-[0.3px] text-text-3">
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#6f675a]" aria-hidden="true" />
      {t('dashboard.badge.notTried')}
    </span>
  );
}

/**
 * Dashboard "Berkas Perkara" (/dashboard) — tabel screener seluruh emiten
 * IDX; klik baris membuka halaman detail emiten.
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [docket, setDocket] = useState<TickerListItem[]>(
    EXAMPLES.map((t) => ({ ticker: t, company_name: '' })),
  );
  const [docketFallback, setDocketFallback] = useState(true); // fallback daftar contoh
  const [query, setQuery] = useState('');
  /** Kontrak 1.2.3 — filter sektor IDX-IC ('' = semua). */
  const [sector, setSector] = useState('');
  const [sectors, setSectors] = useState<{ sector: string; count: number }[]>([]);
  const [docketLoading, setDocketLoading] = useState(false);
  /** Total emiten yang cocok di backend (registry IDX penuh = ±962). */
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recent, setRecent] = useState<JournalItem[]>([]);
  const [journal, setJournal] = useState<JournalItem[]>([]);

  // Jurnal: agregat per ticker untuk tabel + kolom samping.
  useEffect(() => {
    let alive = true;
    api
      .fetchJournal(50, 0)
      .then((res) => {
        if (!alive) return;
        setJournal(res.items);
        setRecent(res.items.slice(0, 4));
      })
      .catch(() => undefined); // jurnal kosong / backend belum jalan — biarkan kolom tersembunyi
    return () => {
      alive = false;
    };
  }, []);

  // Riwayat per ticker, terurut terbaru dulu.
  const historyByTicker = useMemo(() => {
    const m = new Map<string, JournalItem[]>();
    for (const j of journal) {
      const list = m.get(j.ticker) ?? [];
      list.push(j);
      m.set(j.ticker, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return m;
  }, [journal]);

  // Opsi sektor untuk dropdown filter (kontrak 1.2.3) — opsional, backend lama diabaikan.
  useEffect(() => {
    let alive = true;
    api
      .fetchTickerSectors()
      .then((res) => {
        if (alive) setSectors(res.items);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Daftar emiten: dari backend bila tersedia; gagal → pakai daftar contoh.
  useEffect(() => {
    let alive = true;
    setDocketLoading(true);
    const t = setTimeout(() => {
      api
        .listTickers(query.trim() || undefined, PAGE_SIZE, 0, sector.trim() || undefined)
        .then((res) => {
          if (!alive) return;
          // Jawaban backend selalu dipakai — hasil kosong valid (mis. filter
          // sektor tanpa pencocokan); fallback contoh hanya bila request gagal.
          setDocket(res.items);
          setDocketFallback(false);
          setTotal(res.total);
        })
        .catch(() => {
          if (!alive) return;
          setDocketFallback(true);
          const q = query.trim().toUpperCase();
          setDocket(
            EXAMPLES.filter((t) => (q ? t.includes(q) : true)).map((t) => ({
              ticker: t,
              company_name: '',
            })),
          );
        })
        .finally(() => {
          if (alive) setDocketLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, sector]);

  /** Muat 60 baris berikutnya (offset = jumlah yang sudah tampil). */
  function loadMore() {
    if (loadingMore || docketFallback) return;
    setLoadingMore(true);
    api
      .listTickers(
        query.trim() || undefined,
        PAGE_SIZE,
        docket.length,
        sector.trim() || undefined,
      )
      .then((res) => {
        const known = new Set(docket.map((d) => d.ticker));
        const fresh = res.items.filter((i) => !known.has(i.ticker));
        setDocket((prev) => [...prev, ...fresh]);
        setTotal(res.total);
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }

  const showRecent = recent.length > 0;

  return (
    <div className="flex flex-col">
      <div className="container pb-10 pt-14">
        {/* ---------- PAGE HEAD ---------- */}
        <div className="mb-[18px] flex items-center font-mono text-[12px] uppercase tracking-[1px] text-text-3">
          <Link
            to="/"
            className={`rounded-xs text-brass-500 transition-colors hover:text-brass-300 ${FOCUS}`}
          >
            {t('dashboard.crumb.home')}
          </Link>
          <span className="mx-[6px]">/</span>
          <span>{t('dashboard.crumb.current')}</span>
        </div>
        <h1 className="font-display text-[clamp(34px,5vw,52px)] font-normal leading-[1.05] tracking-[-0.5px] text-text-0">
          {renderRich(t('dashboard.title'), {
            em: (c) => (
              <em aria-hidden="true" className="font-normal italic text-brass-500">
                {c}
              </em>
            ),
          })}
        </h1>
        <p className="mt-[14px] max-w-[60ch] text-[16px] leading-[1.6] text-text-2">
          {t('dashboard.lead')}
        </p>

        {/* ---------- SEARCH + FILTER SEKTOR ---------- */}
        <div className="mt-[30px] flex max-w-[720px] flex-col gap-3 min-[621px]:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] border border-[#3a332a] bg-bg-2 px-[18px] transition-colors focus-within:border-brass-600 focus-within:shadow-[0_0_0_3px_rgba(201,162,74,0.12)]">
            <span className="text-text-3" aria-hidden="true">
              <SearchIcon size={18} />
            </span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent py-[15px] text-[15px] text-text-0 outline-none placeholder:text-text-3"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('dashboard.search.placeholder')}
              aria-label={t('dashboard.search.aria')}
              autoFocus
            />
          </label>
          {sectors.length > 0 && (
            <SectorDropdown
              value={sector}
              onChange={setSector}
              options={sectors}
            />
          )}
        </div>
        <p className="mb-[26px] mt-2 font-mono text-[12px] tracking-[0.5px] text-text-3">
          {total > 0
            ? t('dashboard.count.showing', { shown: docket.length, total }) +
              (sector.trim()
                ? t('dashboard.count.sector', { sector: sector.trim().toUpperCase() })
                : query.trim()
                  ? ''
                  : t('dashboard.count.hint'))
            : t('dashboard.count.fallback')}
        </p>

        <div
          className={`grid grid-cols-1 items-start gap-6 pb-2 ${
            showRecent ? 'min-[1021px]:grid-cols-[minmax(0,1fr)_300px]' : ''
          }`}
        >
          {/* ---------- TABEL PERKARA ---------- */}
          <div
            className={`overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2 transition-opacity ${
              docketLoading ? 'opacity-[0.55]' : ''
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[14px]">
                <thead>
                  <tr>
                    <th className={TH}>{t('dashboard.th.ticker')}</th>
                    <th className={TH}>{t('dashboard.th.issuer')}</th>
                    <th className={TH}>{t('dashboard.th.verdict')}</th>
                    <th className={TH_NUM}>{t('dashboard.th.trials')}</th>
                    <th className={TH_NUM}>{t('dashboard.th.lastTried')}</th>
                    <th className={TH_NUM}>{t('dashboard.th.price')}</th>
                  </tr>
                </thead>
                <tbody>
                  {docket.map((row) => {
                    const hist = historyByTicker.get(row.ticker);
                    const last = hist?.[0];
                    const open = () => navigate(`/ticker/${row.ticker}`);
                    return (
                      <tr
                        key={row.ticker}
                        className={`group cursor-pointer transition-colors hover:bg-[rgba(201,162,74,0.05)] [&:last-child>td]:border-b-0 ${FOCUS}`}
                        onClick={open}
                        // Baris dapat diklik juga harus dapat dijangkau keyboard.
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            open();
                          }
                        }}
                        tabIndex={0}
                        title={t('dashboard.row.title', { ticker: row.ticker })}
                      >
                        <td
                          className={`${TD} font-mono text-[14px] font-medium tracking-[1px] text-brass-400`}
                        >
                          {row.ticker}
                        </td>
                        <td className={TD}>
                          <div className="max-w-[180px] truncate font-medium text-text-0">
                            {row.company_name || t('dashboard.issuerFallback')}
                          </div>
                          {row.sector && (
                            <div className="max-w-[180px] truncate text-[11.5px] text-text-3">
                              {row.sector}
                            </div>
                          )}
                        </td>
                        <td className={TD}>
                          {last ? (
                            <VerdictBadge category={last.verdict_category} />
                          ) : (
                            <NotTriedBadge />
                          )}
                        </td>
                        <td className={`${TD} text-right font-mono text-[13px] text-text-1`}>
                          {hist ? hist.length : '—'}
                        </td>
                        <td className={`${TD} text-right font-mono text-[12px] text-text-2`}>
                          {last ? formatDate(last.created_at) : '—'}
                        </td>
                        <td
                          className={`${TD} text-right font-mono text-[13px] tabular-nums text-text-0`}
                        >
                          {last?.price_at_trial != null
                            ? formatRupiah(last.price_at_trial)
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {docket.length === 0 && !docketLoading && (
                    <tr>
                      <td colSpan={6} className="px-[18px] py-6">
                        <div className="mx-auto rounded-[14px] border border-[#2a251e] bg-[#1a1713] px-6 py-10 text-center text-[13px] text-text-3">
                          {t('dashboard.empty')}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {docketFallback && (
              <p className="m-0 border-t border-[#2a251e] px-[18px] py-2.5 font-mono text-[11px] tracking-[0.3px] text-text-3">
                {t('dashboard.fallbackNote')}
              </p>
            )}
            {!docketFallback && docket.length < total && (
              <div className="flex items-center justify-center border-t border-[#2a251e] px-[18px] py-3">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className={`cursor-pointer rounded-[8px] border border-brass-600 px-4 py-[7px] font-mono text-[12px] tracking-[0.5px] text-brass-400 transition-colors hover:bg-brass-500 hover:text-bg-1 disabled:opacity-50 ${FOCUS}`}
                >
                  {loadingMore
                    ? t('dashboard.loading')
                    : t('dashboard.loadMore', { n: Math.min(PAGE_SIZE, total - docket.length) })}
                </button>
              </div>
            )}
          </div>

          {/* ---------- KOLOM SAMPING: ARSIP ---------- */}
          {showRecent && (
            <aside className="anim-in rounded-[14px] border border-[#3a332a] bg-bg-2 p-[22px] min-[1021px]:sticky min-[1021px]:top-[88px] max-[1020px]:-order-1">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[1.5px] text-brass-500">
                {t('dashboard.aside.eyebrow')}
              </p>
              <h3 className="mb-[18px] font-display text-[19px] font-medium text-text-0">
                {t('dashboard.aside.title')}
              </h3>
              {recent.map((j, i) => (
                <button
                  key={j.memo_id}
                  type="button"
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-none border-t border-[#2a251e] px-2 py-[11px] text-left transition-colors hover:bg-[rgba(201,162,74,0.05)] ${FOCUS} ${
                    i === 0 ? 'border-t-0' : ''
                  }`}
                  onClick={() => navigate(`/memo/${j.trial_id ?? j.memo_id}`)}
                  title={t('dashboard.aside.open', { ticker: j.ticker })}
                >
                  <SideDot category={j.verdict_category} />
                  <span className="font-mono text-[12px] tracking-[0.5px] text-text-0">
                    {j.ticker}
                  </span>
                  <span className="ml-auto whitespace-nowrap text-[12px] text-text-3">
                    {formatDate(j.created_at)}
                  </span>
                </button>
              ))}
              <p className="mt-4 border-t border-[#2a251e] pt-[14px] text-[12px] leading-[1.6] text-text-3">
                {t('dashboard.aside.note')}
              </p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mini dot warna kategori putusan untuk baris arsip. */
function SideDot({ category }: { category: VerdictCategory }) {
  const color =
    category === 'layak_diteliti_lanjut'
      ? '#7fb069'
      : category === 'perlu_kehati_hatian'
        ? '#d9a441'
        : '#c96a5a';
  return <span className="h-2 w-2 flex-none rounded-full" style={{ background: color }} aria-hidden="true" />;
}

/* fmtDate/fmtDateShort dulu tinggal di sini dengan `id-ID` yang dipaku mati:
   tanggal tidak ikut berganti saat bahasa diganti, dan nilai tak valid
   dikembalikan apa adanya sebagai teks ISO mentah di dalam sel. Tabel dan
   baris arsip kini memakai pemformat bersama di utils/format. */
