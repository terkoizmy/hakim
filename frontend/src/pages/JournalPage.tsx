import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { type JournalItem, type VerdictCategory } from '../types/contract';
import { formatDate, formatRupiah } from '../utils/format';
import { GavelIcon, SearchIcon } from '../components/icons';
import { renderRich, useLabels, useLang } from '../i18n';
// Badge putusan bersama — dulu berkas ini punya salinannya sendiri dan tiga
// halaman lain mengimpornya dari sini, sehingga ada dua implementasi badge yang
// sama persis. Sekarang satu sumber di components/.
import VerdictBadge from '../components/VerdictBadge';
import InfoBadge from '../components/InfoBadge';
import { TD_BASE, TH_BASE } from '../components/table';

/** Cincin fokus bersama — pola yang sama dengan AppShell. */
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0';

// Mock jurnal-sidang: th mono di permukaan lebih gelap, td hairline.
//
// Sengaja TANPA padding horizontal: tiap sel di tabel ini menyuplai paddingnya
// sendiri (`pl-4 pr-2` di kolom pertama, `px-2` di tengah, `pl-2 pr-4` di
// terakhir) supaya tepi teks sejajar dengan sudut kartu. Padding dasar di sini
// justru akan bertabrakan dengannya.
const TH_CLS = `${TH_BASE} py-3`;
const TD_CLS = `${TD_BASE} py-[13px] align-middle`;

type FilterCategory = 'all' | VerdictCategory;

/**
 * Jurnal Sidang (/journal) — arsip mock jurnal-sidang: kepala halaman
 * kicker + judul display, KPI summary, filter, search, lalu tabel arsip.
 */
export default function JournalPage() {
  const { t } = useLang();
  const labels = useLabels();
  const [items, setItems] = useState<JournalItem[] | null>(null);
  // null = belum ada galat; '' = galat frontend (teksnya dari kamus, diambil
  // saat render supaya ikut berganti bahasa tanpa memuat ulang jurnal).
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('all');

  useEffect(() => {
    let alive = true;
    api
      .fetchJournal(100, 0)
      .then((res) => alive && setItems(res.items))
      .catch((e) => {
        if (!alive) return;
        // Pesan ApiError datang dari lapisan api (backend berbahasa Indonesia);
        // hanya galat milik frontend yang lewat kamus.
        setError(e instanceof ApiError ? e.message : '');
        setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const rawList = useMemo(() => items ?? [], [items]);

  // Statistik Ringkasan Putusan
  const stats = useMemo(() => {
    let bull = 0;
    let caution = 0;
    let redFlag = 0;
    for (const it of rawList) {
      if (it.verdict_category === 'layak_diteliti_lanjut') bull++;
      else if (it.verdict_category === 'perlu_kehati_hatian') caution++;
      else if (it.verdict_category === 'red_flag_berat') redFlag++;
    }
    return {
      total: rawList.length,
      bull,
      caution,
      redFlag,
    };
  }, [rawList]);

  // Filter & Search
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rawList.filter((it) => {
      const matchFilter = selectedFilter === 'all' || it.verdict_category === selectedFilter;
      const matchSearch =
        !q ||
        it.ticker.toLowerCase().includes(q) ||
        it.company_name.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [rawList, selectedFilter, search]);

  return (
    <div className="pt-12">
      <div className="mx-auto w-full max-w-[1080px] px-6 pb-14">
        <nav className="mb-[22px] font-mono text-[12px] uppercase tracking-[1px] text-text-3">
          <Link to="/" className={`rounded-xs text-brass-500 transition-colors hover:text-brass-300 ${FOCUS}`}>
            {t('journal.crumb.home')}
          </Link>
          <span className="mx-[6px]">/</span>
          <span>{t('nav.journal')}</span>
        </nav>

        {/* ---------- PAGE HEAD ---------- */}
        <header className="anim-in mb-[28px] border-b border-[#3a332a] pb-[24px]">
          <p className="mb-[10px] font-mono text-[11px] uppercase tracking-[2px] text-brass-500">
            {t('journal.kicker')}
          </p>
          <h1 className="font-display text-[clamp(30px,4.5vw,44px)] font-medium leading-[1.1] text-text-0">
            {renderRich(t('journal.title'), {
              em: (c) => <em className="italic text-brass-300">{c}</em>,
            })}
          </h1>
          <p className="mt-3 max-w-[52ch] text-[14.5px] text-text-2">{t('journal.lede')}</p>
        </header>

        {/* ---------- SUMMARY KPIS ---------- */}
        {items !== null && rawList.length > 0 && (
          <section className="anim-in-slow mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#3a332a] bg-bg-2 p-4">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-text-3">
                {t('journal.kpi.total')}
              </span>
              <div className="mt-1 font-mono text-[22px] font-medium text-text-0">
                {stats.total}
              </div>
            </div>
            <div className="rounded-xl border border-[#3a332a] bg-bg-2 p-4">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-[#7fb069]">
                {labels.verdict.layak_diteliti_lanjut}
              </span>
              <div className="mt-1 font-mono text-[22px] font-medium text-[#7fb069]">
                {stats.bull}
              </div>
            </div>
            <div className="rounded-xl border border-[#3a332a] bg-bg-2 p-4">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-[#d9a441]">
                {labels.verdict.perlu_kehati_hatian}
              </span>
              <div className="mt-1 font-mono text-[22px] font-medium text-[#d9a441]">
                {stats.caution}
              </div>
            </div>
            <div className="rounded-xl border border-[#3a332a] bg-bg-2 p-4">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-[#c96a5a]">
                {labels.verdict.red_flag_berat}
              </span>
              <div className="mt-1 font-mono text-[22px] font-medium text-[#c96a5a]">
                {stats.redFlag}
              </div>
            </div>
          </section>
        )}

        {/* ---------- CONTROLS: SEARCH & FILTER ---------- */}
        {items !== null && rawList.length > 0 && (
          <div className="anim-in mb-5 flex flex-wrap items-center justify-between gap-3">
            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11.5px]">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                aria-pressed={selectedFilter === 'all'}
                className={`rounded-lg px-3 py-1.5 transition-all ${FOCUS} ${
                  selectedFilter === 'all'
                    ? 'border border-brass-600 bg-brass-500/20 text-brass-300 font-semibold'
                    : 'border border-[#3a332a] bg-bg-2 text-text-3 hover:border-brass-600/50 hover:text-text-1'
                }`}
              >
                {t('journal.filter.all', { n: rawList.length })}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('layak_diteliti_lanjut')}
                aria-pressed={selectedFilter === 'layak_diteliti_lanjut'}
                className={`rounded-lg px-3 py-1.5 transition-all ${FOCUS} ${
                  selectedFilter === 'layak_diteliti_lanjut'
                    ? 'border border-[#7fb069] bg-[#7fb069]/20 text-[#7fb069] font-semibold'
                    : 'border border-[#3a332a] bg-bg-2 text-text-3 hover:border-[#7fb069]/50 hover:text-[#7fb069]'
                }`}
              >
                {t('journal.filter.verdict', {
                  label: labels.verdict.layak_diteliti_lanjut,
                  n: stats.bull,
                })}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('perlu_kehati_hatian')}
                aria-pressed={selectedFilter === 'perlu_kehati_hatian'}
                className={`rounded-lg px-3 py-1.5 transition-all ${FOCUS} ${
                  selectedFilter === 'perlu_kehati_hatian'
                    ? 'border border-[#d9a441] bg-[#d9a441]/20 text-[#d9a441] font-semibold'
                    : 'border border-[#3a332a] bg-bg-2 text-text-3 hover:border-[#d9a441]/50 hover:text-[#d9a441]'
                }`}
              >
                {t('journal.filter.verdict', {
                  label: labels.verdict.perlu_kehati_hatian,
                  n: stats.caution,
                })}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('red_flag_berat')}
                aria-pressed={selectedFilter === 'red_flag_berat'}
                className={`rounded-lg px-3 py-1.5 transition-all ${FOCUS} ${
                  selectedFilter === 'red_flag_berat'
                    ? 'border border-[#c96a5a] bg-[#c96a5a]/20 text-[#c96a5a] font-semibold'
                    : 'border border-[#3a332a] bg-bg-2 text-text-3 hover:border-[#c96a5a]/50 hover:text-[#c96a5a]'
                }`}
              >
                {t('journal.filter.verdict', {
                  label: labels.verdict.red_flag_berat,
                  n: stats.redFlag,
                })}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full max-w-[260px]">
              <SearchIcon
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('journal.search.placeholder')}
                aria-label={t('journal.search.aria')}
                className={`w-full rounded-lg border border-[#3a332a] bg-bg-2 py-1.5 pl-8 pr-3 font-mono text-[12px] text-text-0 placeholder:text-text-3 focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 ${FOCUS}`}
              />
            </div>
          </div>
        )}

        {items === null ? (
          <JournalSkeleton />
        ) : error !== null ? (
          <div className="anim-fade rounded-[14px] border border-[#3a332a] bg-bg-2 px-6 py-10 text-center text-text-2" role="alert">
            {error || t('journal.error.load')}
          </div>
        ) : rawList.length === 0 ? (
          /* ---------- EMPTY STATE ---------- */
          <section className="anim-in flex flex-col items-center gap-[18px] rounded-[14px] border border-dashed border-[#3a332a] bg-bg-2 px-6 py-[72px] text-center">
            <span className="block w-[44px] text-brass-600">
              <GavelIcon size={44} />
            </span>
            <h2 className="font-display text-[22px] font-medium text-text-0">
              {t('journal.empty.title')}
            </h2>
            <p className="max-w-[40ch] text-[14px] text-text-2">{t('journal.empty.body')}</p>
            <Link
              to="/dashboard"
              className={`rounded-pill border border-brass-600 px-5 py-[10px] font-mono text-[12px] tracking-[0.5px] text-brass-400 transition-colors hover:bg-brass-500 hover:text-bg-1 ${FOCUS}`}
            >
              {t('journal.empty.cta')}
            </Link>
          </section>
        ) : filteredList.length === 0 ? (
          /* ---------- FILTER EMPTY STATE ---------- */
          <div className="anim-in rounded-[14px] border border-[#3a332a] bg-bg-2 px-6 py-12 text-center">
            <p className="text-[14px] text-text-2">{t('journal.filterEmpty', { q: search })}</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedFilter('all');
              }}
              className={`mt-3 rounded-xs font-mono text-[12px] text-brass-400 underline underline-offset-4 hover:text-brass-300 ${FOCUS}`}
            >
              {t('journal.filterReset')}
            </button>
          </div>
        ) : (
          /* ---------- ARCHIVE TABLE ---------- */
          <div className="anim-fade overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className={`${TH_CLS} pl-4 pr-2`}>{t('journal.table.date')}</th>
                    <th className={`${TH_CLS} px-2`}>{t('journal.table.ticker')}</th>
                    <th className={`${TH_CLS} px-2`}>{t('journal.table.issuer')}</th>
                    <th className={`${TH_CLS} px-2`}>{t('journal.table.verdict')}</th>
                    <th className={`${TH_CLS} hidden px-2 lg:table-cell`}>
                      {t('journal.table.richness')}
                    </th>
                    <th className={`${TH_CLS} px-2 text-right`}>{t('journal.table.price')}</th>
                    <th className={`${TH_CLS} pl-2 pr-4 text-right`}>{t('journal.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((it) => (
                    <tr key={it.memo_id} className="transition-colors hover:bg-[#1a1713] [&:last-child>td]:border-b-0">
                      <td className={`${TD_CLS} whitespace-nowrap pl-4 pr-2 font-mono text-[12px] text-text-3`}>
                        {formatDate(it.created_at)}
                      </td>
                      <td className={`${TD_CLS} whitespace-nowrap px-2 font-mono text-[12.5px] font-medium tracking-[0.5px] text-text-0`}>
                        {it.ticker}
                        <em className="not-italic text-brass-500">.</em>
                      </td>
                      <td className={`${TD_CLS} px-2 text-[12.5px] text-text-2`}>
                        <div className="max-w-[140px] truncate sm:max-w-[190px]">{it.company_name}</div>
                      </td>
                      <td className={`${TD_CLS} whitespace-nowrap px-2`}>
                        <VerdictBadge category={it.verdict_category} />
                      </td>
                      <td className={`${TD_CLS} hidden whitespace-nowrap px-2 lg:table-cell`}>
                        <InfoBadge title={t('enum.richness.title', { grade: it.info_richness })}>
                          {labels.richness[it.info_richness]}
                        </InfoBadge>
                      </td>
                      <td className={`${TD_CLS} whitespace-nowrap px-2 text-right font-mono text-[12px] tabular-nums text-brass-400`}>
                        {it.price_at_trial == null ? '—' : formatRupiah(it.price_at_trial)}
                      </td>
                      <td className={`${TD_CLS} whitespace-nowrap pl-2 pr-4 text-right`}>
                        <div className="flex items-center justify-end gap-1.5 font-mono text-[11.5px]">
                          <Link
                            to={`/memo/${it.trial_id ?? it.memo_id}`}
                            className={`rounded border border-[#3a332a] bg-bg-3 px-2 py-0.5 text-brass-400 transition-colors hover:border-brass-500 hover:text-brass-200 ${FOCUS}`}
                          >
                            {t('journal.action.memo')}
                          </Link>
                          <Link
                            to={`/journal/${it.memo_id}/postmortem`}
                            className={`rounded border border-[#3a332a] bg-bg-3 px-2 py-0.5 text-brass-400 transition-colors hover:border-brass-500 hover:text-brass-200 ${FOCUS}`}
                            title={t('journal.action.postmortemTitle')}
                          >
                            {t('journal.action.postmortem')}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JournalSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-[#3a332a] bg-bg-2 px-6 py-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div className="flex flex-1 flex-col gap-2">
            <span className="skeleton" style={{ width: '50%', height: 14 }} />
            <span className="skeleton" style={{ width: '70%', height: 10 }} />
          </div>
          <span className="skeleton" style={{ width: 90, height: 22 }} />
        </div>
      ))}
    </div>
  );
}