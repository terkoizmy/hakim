import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { VERDICT_LABEL, type JournalItem, type VerdictCategory } from '../types/contract';
import { formatDate } from '../utils/format';
import { RichBadge } from './CourtroomPage';
import { AlertIcon, BookIcon, GavelIcon, ScaleIcon } from '../components/icons';

const FILTERS: { key: VerdictCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'layak_diteliti_lanjut', label: 'Layak Diteliti' },
  { key: 'perlu_kehati_hatian', label: 'Perlu Hati-hati' },
  { key: 'red_flag_berat', label: 'Red Flag Berat' },
];

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
    <div className="journal-page">
      <div className="container pad-page">
        <header className="journal-head anim-in">
          <div className="journal-head-icon"><BookIcon size={22} /></div>
          <div>
            <h1>Jurnal Sidang</h1>
            <p className="muted">
              Memorandum lama dibandingkan dengan pergerakan harga hari ini — komite yang bisa dipertanggungjawabkan.
            </p>
          </div>
        </header>

        {/* Stat ringkas */}
        <div className="journal-stats anim-in">
          <StatCard label="Total sidang" value={String(stats.total)} />
          <StatCard label="Layak diteliti" value={String(stats.layak)} tone="defend" />
          <StatCard label="Perlu kehati-hatian" value={String(stats.hati)} tone="brass" />
          <StatCard label="Red flag berat" value={String(stats.berat)} tone="prosecute" />
        </div>

        {/* Filter */}
        <div className="journal-filter row wrap row-gap-2 anim-in">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip-filter ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {items === null ? (
          <JournalSkeleton />
        ) : error ? (
          <div className="card card-pad journal-empty anim-fade" role="alert">
            <AlertIcon size={20} />
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card card-pad journal-empty anim-fade">
            <span className="journal-empty-ic"><GavelIcon size={24} /></span>
            <h2>{items.length === 0 ? 'Belum ada sidang tersimpan' : 'Tidak ada sidang pada filter ini'}</h2>
            <p className="muted">
              {items.length === 0
                ? 'Mulai sidang pertama Anda, dan lihat hasilnya tercatat di sini.'
                : 'Pilih filter lain untuk melihat sidang lain.'}
            </p>
            <Link to="/" className="btn btn-primary"><GavelIcon size={16} /> Mulai Sidang Baru</Link>
          </div>
        ) : (
          <div className="card card-pad journal-table-wrap anim-fade">
            <table className="journal-table">
              <thead>
                <tr>
                  <th>Emiten</th>
                  <th>Kode</th>
                  <th>Putusan</th>
                  <th>Kaya Data</th>
                  <th className="num">Harga saat sidang</th>
                  <th>Tanggal</th>
                  <th aria-label="aksi" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr key={it.memo_id} className="journal-row">
                    <td>
                      <Link to={`/journal/${it.memo_id}/postmortem`} className="journal-company">
                        {it.company_name}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/journal/${it.memo_id}/postmortem`} className="journal-ticker mono">{it.ticker}</Link>
                    </td>
                    <td><VerdictBadge category={it.verdict_category} /></td>
                    <td><RichBadge richness={it.info_richness} /></td>
                    <td className="num mono">{it.price_at_trial.toLocaleString('id-ID')}</td>
                    <td className="small muted">{formatDate(it.created_at)}</td>
                    <td className="row-jump">
                      <Link to={`/journal/${it.memo_id}/postmortem`} className="btn btn-soft btn-sm" aria-label={`Post-mortem ${it.ticker}`}>
                        <ScaleIcon size={15} /> Rekap
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
  return (
    <div className="statcard card card-pad">
      <span className={`statcard-val mono ${tone ?? ''}`}>{value}</span>
      <span className="statcard-label tiny muted">{label}</span>
    </div>
  );
}

function JournalSkeleton() {
  return (
    <div className="card card-pad stack-md">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="row row-gap-3">
          <span className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <div className="stack-sm" style={{ flex: 1 }}>
            <span className="skeleton" style={{ width: '50%', height: 14 }} />
            <span className="skeleton" style={{ width: '70%', height: 10 }} />
          </div>
          <span className="skeleton" style={{ width: 90, height: 22 }} />
        </div>
      ))}
    </div>
  );
}
