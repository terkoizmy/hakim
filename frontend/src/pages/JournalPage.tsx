import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { VERDICT_LABEL, type JournalItem, type VerdictCategory } from '../types/contract';
import { formatDate } from '../utils/format';
import { RichBadge } from './CourtroomPage';
import { AlertIcon, BookIcon, GavelIcon } from '../components/icons';

const FILTERS: { key: VerdictCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'layak_diteliti_lanjut', label: 'Layak Diteliti' },
  { key: 'perlu_kehati_hatian', label: 'Perlu Hati-hati' },
  { key: 'red_flag_berat', label: 'Red Flag Berat' },
];

const TH =
  'border-b border-line-1 px-4 pb-2.5 pt-3.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-3';
const TH_NUM = `${TH} text-right`;
const TD = 'border-b border-line-0 px-4 py-3 align-middle';
const CHIP =
  'inline-flex cursor-pointer items-center rounded-pill px-3.5 py-1.5 text-[12.5px] font-semibold transition-all';

export function VerdictBadge({ category }: { category: VerdictCategory }) {
  const cls =
    category === 'layak_diteliti_lanjut'
      ? 'badge-defend'
      : category === 'perlu_kehati_hatian'
        ? 'badge-brass'
        : 'badge-prosecute';
  return <span className={`badge ${cls}`}>{VERDICT_LABEL[category]}</span>;
}

export default function JournalPage() {
  const [items, setItems] = useState<JournalItem[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<VerdictCategory | 'all'>('all');

  useEffect(() => {
    let alive = true;
    api
      .fetchJournal(100, 0)
      .then((res) => alive && setItems(res.items))
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : 'Jurnal tidak dapat dimuat.');
        setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? (items ?? []) : (items ?? []).filter((i) => i.verdict_category === filter)),
    [items, filter],
  );

  const stats = useMemo(() => {
    const list = items ?? [];
    return {
      total: list.length,
      layak: list.filter((i) => i.verdict_category === 'layak_diteliti_lanjut').length,
      hati: list.filter((i) => i.verdict_category === 'perlu_kehati_hatian').length,
      berat: list.filter((i) => i.verdict_category === 'red_flag_berat').length,
    };
  }, [items]);

  return (
    <div>
      <div className="container py-8 pb-14">
        <header className="anim-in flex items-center gap-5">
          <div className="grid h-[52px] w-[52px] flex-none place-items-center rounded-lg border border-[rgba(217,180,109,0.34)] bg-[rgba(217,180,109,0.12)] text-brass-300">
            <BookIcon size={22} />
          </div>
          <div>
            <h1 className="text-[30px]">
              Jurnal <em aria-hidden="true" className="font-medium italic text-brass-300">Sidang</em>
            </h1>
            <p className="muted mt-1 max-w-[640px]">
              Memorandum lama dibandingkan dengan pergerakan harga hari ini — komite yang bisa dipertanggungjawabkan.
            </p>
          </div>
        </header>

        {/* Stat ringkas */}
        <div className="anim-in mb-6 grid grid-cols-4 gap-4 max-[980px]:grid-cols-2 max-[640px]:grid-cols-2 max-[640px]:gap-3">
          <StatCard label="Total sidang" value={String(stats.total)} />
          <StatCard label="Layak diteliti" value={String(stats.layak)} tone="defend" />
          <StatCard label="Perlu kehati-hatian" value={String(stats.hati)} tone="brass" />
          <StatCard label="Red flag berat" value={String(stats.berat)} tone="prosecute" />
        </div>

        {/* Filter */}
        <div className="anim-in mb-5 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={
                filter === f.key
                  ? `${CHIP} border border-transparent bg-gradient-to-b from-brass-300 to-brass-500 text-[#1c1407]`
                  : `${CHIP} border border-line-2 bg-bg-2 text-text-1 hover:border-brass-500 hover:text-text-0`
              }
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {items === null ? (
          <JournalSkeleton />
        ) : error ? (
          <div
            className="card anim-fade flex flex-col items-center gap-3 px-6 py-10 text-center"
            role="alert"
          >
            <AlertIcon size={20} />
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card anim-fade flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="grid h-[52px] w-[52px] place-items-center rounded-pill border border-[rgba(217,180,109,0.34)] bg-[rgba(217,180,109,0.12)] text-brass-300">
              <GavelIcon size={24} />
            </span>
            <h2 className="text-[21px]">
              {items.length === 0 ? 'Belum ada sidang tersimpan' : 'Tidak ada sidang pada filter ini'}
            </h2>
            <p className="muted">
              {items.length === 0
                ? 'Mulai sidang pertama Anda, dan lihat hasilnya tercatat di sini.'
                : 'Pilih filter lain untuk melihat sidang lain.'}
            </p>
            <Link to="/" className="btn btn-primary mt-2"><GavelIcon size={16} /> Mulai Sidang Baru</Link>
          </div>
        ) : (
          <div className="card anim-fade overflow-x-auto p-0">
            <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className={TH}>Tanggal</th>
                  <th className={TH}>Ticker</th>
                  <th className={TH}>Emiten</th>
                  <th className={TH}>Putusan</th>
                  <th className={TH}>Kekayaan Data</th>
                  <th className={TH_NUM}>Harga Saat Sidang</th>
                  <th className={TH_NUM} aria-label="aksi">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr
                    key={it.memo_id}
                    className="transition-colors hover:bg-[rgba(236,224,200,0.03)] [&:last-child>td]:border-b-0"
                  >
                    <td className={`${TD} small muted`}>{formatDate(it.created_at)}</td>
                    <td className={TD}>
                      <Link to={`/journal/${it.memo_id}/postmortem`} className="mono font-semibold text-brass-200">
                        {it.ticker}
                      </Link>
                    </td>
                    <td className={TD}>
                      <Link
                        to={`/journal/${it.memo_id}/postmortem`}
                        className="font-medium text-text-0 transition-colors hover:text-brass-300"
                      >
                        {it.company_name}
                      </Link>
                    </td>
                    <td className={TD}><VerdictBadge category={it.verdict_category} /></td>
                    <td className={TD}><RichBadge richness={it.info_richness} /></td>
                    <td className={`${TD} mono text-right`}>
                      {it.price_at_trial == null ? '—' : it.price_at_trial.toLocaleString('id-ID')}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-right`}>
                      <Link
                        to={`/memo/${it.memo_id}`}
                        className="inline-block border-b border-transparent text-[12.5px] text-brass-300 transition-colors hover:border-brass-500 hover:text-brass-100"
                      >
                        Memo
                      </Link>
                      <Link
                        to={`/journal/${it.memo_id}/postmortem`}
                        className="ml-4 inline-block border-b border-transparent text-[12.5px] text-brass-300 transition-colors hover:border-brass-500 hover:text-brass-100"
                      >
                        Post-mortem
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'defend' | 'brass' | 'prosecute' }) {
  const toneCls =
    tone === 'defend' ? 'text-defend-300' : tone === 'brass' ? 'text-brass-300' : tone === 'prosecute' ? 'text-prosecute-300' : '';
  return (
    <div className="card flex flex-col gap-[2px] px-6 py-5">
      <span className={`mono text-[28px] font-[650] text-text-0 ${toneCls}`}>{value}</span>
      <span className="tiny muted">{label}</span>
    </div>
  );
}

function JournalSkeleton() {
  return (
    <div className="card flex flex-col gap-4 px-6 py-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div className="flex flex-col gap-2" style={{ flex: 1 }}>
            <span className="skeleton" style={{ width: '50%', height: 14 }} />
            <span className="skeleton" style={{ width: '70%', height: 10 }} />
          </div>
          <span className="skeleton" style={{ width: 90, height: 22 }} />
        </div>
      ))}
    </div>
  );
}