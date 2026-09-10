import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { VerdictBadge } from './JournalPage';
import { SearchIcon } from '../components/icons';
import type { JournalItem, TickerListItem } from '../types/contract';
import type { VerdictCategory } from '../types/contract';

const EXAMPLES = ['BBCA', 'CUAN', 'GOTO', 'BRMS', 'BBRI'];

const SEARCH_DEBOUNCE_MS = 250;
/** Baris per halaman daftar emiten (registry IDX penuh ±962 — dimuat bertahap). */
const PAGE_SIZE = 60;

// Mock berkas-perkara: th mono uppercase di atas permukaan lebih gelap;
// header boleh wrap 2 baris (JML SIDANG dst.) agar tabel muat di kolom 1fr.
const TH =
  'border-b border-[#3a332a] bg-[#1a1713] px-[18px] py-[14px] text-left font-mono text-[11px] font-medium uppercase leading-[1.5] tracking-[1px] text-text-3';
const TH_NUM = `${TH} text-right`;
const TD = 'whitespace-nowrap border-b border-[#2a251e] px-[18px] py-[15px] align-middle';

/** Badge "belum diadili" — gaya b-none pada mock (dot samar, tanpa warna). */
function NotTriedBadge() {
  return (
    <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[6px] border border-[#3a332a] px-[10px] py-[5px] font-mono text-[11.5px] tracking-[0.3px] text-text-3">
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#6f675a]" aria-hidden="true" />
      Belum diadili
    </span>
  );
}

/**
 * Dashboard "Berkas Perkara" (/dashboard) — tabel screener seluruh emiten
 * IDX; klik baris membuka halaman detail emiten.
 */
export default function DashboardPage() {
  const navigate = useNavigate();
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
          <Link to="/" className="text-brass-500 transition-colors hover:text-brass-300">
            Sidang
          </Link>
          <span className="mx-[6px]">/</span>
          <span>Berkas Perkara</span>
        </div>
        <h1 className="font-display text-[clamp(34px,5vw,52px)] font-normal leading-[1.05] tracking-[-0.5px] text-text-0">
          Berkas{' '}
          <em aria-hidden="true" className="font-normal italic text-brass-500">
            Perkara
          </em>
        </h1>
        <p className="mt-[14px] max-w-[60ch] text-[16px] leading-[1.6] text-text-2">
          Semua emiten terdaftar IDX — klik baris untuk membuka berkas, lalu adili.
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
              placeholder="Cari kode atau nama emiten…"
              aria-label="Cari emiten"
              autoFocus
            />
          </label>
          {sectors.length > 0 && (
            <label className="flex items-center gap-2 rounded-[14px] border border-[#3a332a] bg-bg-2 px-[16px] transition-colors focus-within:border-brass-600">
              <span className="font-mono text-[11px] uppercase tracking-[1px] text-text-3">
                Sektor
              </span>
              <select
                className="min-w-0 cursor-pointer border-0 bg-transparent py-[15px] pr-1 text-[14px] text-text-0 outline-none"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                aria-label="Filter sektor"
              >
                <option value="">Semua</option>
                {sectors.map((s) => (
                  <option key={s.sector} value={s.sector}>
                    {s.sector} ({s.count})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <p className="mb-[26px] mt-2 font-mono text-[12px] tracking-[0.5px] text-text-3">
          {total > 0
            ? `MENAMPILKAN ${docket.length} DARI ${total} PERKARA${
                sector.trim() ? ` — SEKTOR ${sector.trim().toUpperCase()}` : query.trim() ? '' : ' — KETIK UNTUK MENCARI ATAU GULIR + MUAT LAGI'
              }`
            : 'MENAMPILKAN DAFTAR PERKARA'}
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
                    <th className={TH}>Ticker</th>
                    <th className={TH}>Emiten</th>
                    <th className={TH}>Putusan Terakhir</th>
                    <th className={TH_NUM}>Jml Sidang</th>
                    <th className={TH_NUM}>Terakhir Diadili</th>
                    <th className={TH_NUM}>Harga Saat Sidang</th>
                  </tr>
                </thead>
                <tbody>
                  {docket.map((t) => {
                    const hist = historyByTicker.get(t.ticker);
                    const last = hist?.[0];
                    return (
                      <tr
                        key={t.ticker}
                        className="group cursor-pointer transition-colors hover:bg-[rgba(201,162,74,0.05)] [&:last-child>td]:border-b-0"
                        onClick={() => navigate(`/ticker/${t.ticker}`)}
                        title={`Buka detail ${t.ticker}`}
                      >
                        <td
                          className={`${TD} font-mono text-[14px] font-medium tracking-[1px] text-brass-400`}
                        >
                          {t.ticker}
                        </td>
                        <td className={TD}>
                          <div className="max-w-[180px] truncate font-medium text-text-0">
                            {t.company_name || 'Emiten IDX'}
                          </div>
                          {t.sector && (
                            <div className="max-w-[180px] truncate text-[11.5px] text-text-3">
                              {t.sector}
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
                          {last ? fmtDate(last.created_at) : '—'}
                        </td>
                        <td
                          className={`${TD} text-right font-mono text-[13px] tabular-nums text-text-0`}
                        >
                          {last?.price_at_trial != null
                            ? `Rp ${last.price_at_trial.toLocaleString('id-ID')}`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {docket.length === 0 && !docketLoading && (
                    <tr>
                      <td colSpan={6} className="px-[18px] py-12 text-center text-[13px] text-text-3">
                        Tidak ada perkara yang cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {docketFallback && (
              <p className="m-0 border-t border-[#2a251e] px-[18px] py-2.5 font-mono text-[11px] tracking-[0.3px] text-text-3">
                Menampilkan contoh ticker — daftar emiten backend belum tersedia.
              </p>
            )}
            {!docketFallback && docket.length < total && (
              <div className="flex items-center justify-center border-t border-[#2a251e] px-[18px] py-3">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="cursor-pointer rounded-[8px] border border-brass-600 px-4 py-[7px] font-mono text-[12px] tracking-[0.5px] text-brass-400 transition-colors hover:bg-brass-500 hover:text-bg-1 disabled:opacity-50"
                >
                  {loadingMore ? 'Memuat…' : `Muat ${Math.min(PAGE_SIZE, total - docket.length)} lagi`}
                </button>
              </div>
            )}
          </div>

          {/* ---------- KOLOM SAMPING: ARSIP ---------- */}
          {showRecent && (
            <aside className="anim-in rounded-[14px] border border-[#3a332a] bg-bg-2 p-[22px] min-[1021px]:sticky min-[1021px]:top-[88px] max-[1020px]:-order-1">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[1.5px] text-brass-500">
                Arsip
              </p>
              <h3 className="mb-[18px] font-display text-[19px] font-medium text-text-0">
                Sidang terakhir
              </h3>
              {recent.map((j, i) => (
                <button
                  key={j.memo_id}
                  type="button"
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-none border-t border-[#2a251e] px-2 py-[11px] text-left transition-colors hover:bg-[rgba(201,162,74,0.05)] ${
                    i === 0 ? 'border-t-0' : ''
                  }`}
                  onClick={() => navigate(`/memo/${j.trial_id ?? j.memo_id}`)}
                  title={`Buka memorandum ${j.ticker}`}
                >
                  <SideDot category={j.verdict_category} />
                  <span className="font-mono text-[12px] tracking-[0.5px] text-text-0">
                    {j.ticker}
                  </span>
                  <span className="ml-auto whitespace-nowrap text-[12px] text-text-3">
                    {fmtDateShort(j.created_at)}
                  </span>
                </button>
              ))}
              <p className="mt-4 border-t border-[#2a251e] pt-[14px] text-[12px] leading-[1.6] text-text-3">
                Klik baris untuk membuka memorandum riset lengkap dari sidang terakhir.
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

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Bulan singkat agar tabel muat di kolom 1fr (mock: "12 Mei 2026").
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Bentuk pendek untuk baris arsip — "12 Mei". */
function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long' });
}