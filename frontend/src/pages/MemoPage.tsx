import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { CacheStatus, MemoJSON, VerdictCategory } from '../types/contract';
import { formatDate, formatDateTime, formatValue } from '../utils/format';
import { Markdown } from '../utils/md';
import { AlertIcon, BookIcon, GavelIcon } from '../components/icons';

/** Label sentence case sesuai mock. */
const VERDICT_DOC_LABEL: Record<VerdictCategory, { plain: string; em?: string }> = {
  layak_diteliti_lanjut: { plain: 'Layak diteliti ', em: 'lanjut' },
  perlu_kehati_hatian: { plain: 'Perlu ', em: 'kehati-hatian' },
  red_flag_berat: { plain: 'Red flag' },
};

// Mock putusan-dokumen: th mono di permukaan lebih gelap, td hairline.
const TH_CLS =
  'whitespace-nowrap border-b border-[#3a332a] bg-[#1a1713] px-4 py-3 text-left font-mono text-[10.5px] font-medium uppercase tracking-[1.2px] text-text-3';
const TD_CLS = 'border-b border-[#2a251e] px-4 py-[13px] align-top';

/** Chip id fakta (f_1 / ev_x) gaya mock — brass outline kecil. */
function CiteId({ id }: { id: string }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-[5px] border border-brass-600 px-[7px] py-px font-mono text-[11px] text-brass-400">
      {id}
    </span>
  );
}

/** Sitasi inline dengan tooltip "label · nilai" saat hover (mock .cite .tip). */
function CiteChip({ cid, fact }: { cid: string; fact?: MemoJSON['key_facts'][number] }) {
  return (
    <span className="cite-chip group/cite relative inline-flex">
      <span
        tabIndex={0}
        title={fact ? `${fact.label} · ${formatValue(fact.value, fact.unit)}` : cid}
        className="inline-flex cursor-default rounded-[6px] border border-brass-600 px-2 py-[2px] font-mono text-[11px] text-brass-400 transition-colors hover:bg-brass-500 hover:text-bg-1"
      >
        {cid}
      </span>
      {fact && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg border border-[#3a332a] bg-bg-3 px-3 py-2 font-mono text-[11px] text-text-0 opacity-0 transition-all group-hover/cite:translate-y-0 group-hover/cite:opacity-100"
        >
          {fact.label} · {formatValue(fact.value, fact.unit)}
        </span>
      )}
    </span>
  );
}

/** Kepala seksi mock: kicker brass + h2 display, note mono kanan. */
function SecHead({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return (
    <div className="mb-[18px] flex flex-wrap items-baseline justify-between gap-4">
      <div>
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[1.5px] text-brass-500">{kicker}</p>
        <h2 className="font-display text-[22px] font-medium text-text-0">{title}</h2>
      </div>
      {note && <span className="font-mono text-[12px] text-text-3">{note}</span>}
    </div>
  );
}

export default function MemoPage() {
  const { trialId } = useParams<{ trialId: string }>();
  const [memo, setMemo] = useState<MemoJSON | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setState('loading');
    setError('');
    api
      .fetchMemo(trialId ?? '')
      .then((m) => {
        if (!alive) return;
        setMemo(m);
        setState('ready');
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : 'Memorandum tidak dapat dimuat.');
        setState('error');
      });
    return () => {
      alive = false;
    };
  }, [trialId]);

  if (state === 'loading') {
    return <MemoLoadingSkeleton />;
  }

  if (state === 'error' || !memo) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-6 pt-10 pb-14">
        <section className="mx-auto my-10 max-w-[560px] rounded-[14px] border border-[#3a332a] bg-bg-2 p-8 text-center anim-scale">
          <span className="mx-auto mb-4 grid h-[50px] w-[50px] place-items-center rounded-pill border border-[rgba(201,162,74,0.34)] bg-[rgba(201,162,74,0.12)] text-brass-300">
            <AlertIcon size={22} />
          </span>
          <h2 className="mb-2 font-display text-[22px]">Memorandum belum tersedia</h2>
          <p className="text-text-2">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link to={`/trial/${trialId}`} className="btn btn-primary"><GavelIcon size={16} /> Kembali ke Sidang</Link>
            <Link to="/journal" className="btn btn-ghost"><BookIcon size={16} /> Jurnal Sidang</Link>
          </div>
        </section>
      </div>
    );
  }

  return <MemoView memo={memo} />;
}

/** MemoView: render semua field MemoJSON — gaya dokumen mock putusan-dokumen. */
export function MemoView({ memo }: { memo: MemoJSON }) {
  const verdict = memo.verdict;
  const factsById = keyFactsById(memo);
  const cat = VERDICT_DOC_LABEL[verdict.category];
  // Sub-judul hero: kalimat pertama rasional.
  const vSub = stripMd(verdict.rationale_md).split(/(?<=[.!?])\s/)[0] ?? '';

  return (
    <div className="pb-[72px]">
      <div className="mx-auto w-full max-w-[900px] px-6 pt-10">
        <div className="mb-[26px] flex items-center font-mono text-[12px] uppercase tracking-[1px] text-text-3">
          <Link to="/dashboard" className="text-brass-500 transition-colors hover:text-brass-300">Daftar Perkara</Link>
          <span className="mx-[6px]">/</span>
          <Link to={`/ticker/${memo.ticker}`} className="text-brass-500 transition-colors hover:text-brass-300">{memo.ticker}</Link>
          <span className="mx-[6px]">/</span>
          <span>Memorandum</span>
        </div>

        {/* ---------- DOC HEAD ---------- */}
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-[#3a332a] pb-[26px] anim-in">
          <div className="flex flex-col gap-[10px]">
            <div className="flex flex-wrap items-center gap-[10px]">
              <span className="font-mono text-[12px] tracking-[0.5px] text-text-3">{memo.memo_id}</span>
              <HeadBadge>Mode data · {memo.data_mode}</HeadBadge>
              <HeadBadge brass>Info {memo.info_richness}</HeadBadge>
            </div>
            <div className="font-mono text-[clamp(34px,5vw,52px)] font-medium leading-none tracking-[2px] text-text-0">
              {memo.ticker}
              <em className="not-italic text-brass-500">.</em>
            </div>
            <div className="font-display text-[18px] text-text-2">{memo.company_name}</div>
            <div className="font-mono text-[12px] tracking-[0.5px] text-text-3">
              Disahkan {formatDateTime(memo.created_at)} · Sidang {memo.trial_id}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="flex-none w-[120px] h-[120px] rounded-full border-2 border-brass-600 text-brass-400 flex flex-col items-center justify-center gap-[2px] text-center -rotate-[8deg] opacity-90 bg-[radial-gradient(circle_at_30%_30%,rgba(201,162,74,0.1),transparent_70%)] max-[640px]:w-[96px] max-[640px]:h-[96px]"
          >
            <span className="font-mono text-[8.5px] tracking-[2px] uppercase">SIDANG · RISET</span>
            <span className="font-display text-[15px] font-semibold italic">Disahkan</span>
            <span className="font-mono text-[8px] tracking-[1px]">KOMITE PUTUSAN</span>
          </div>
        </header>

        <div className="mt-10 flex flex-col gap-[44px]">
          {/* ---------- VERDICT HERO ---------- */}
          <section className="relative overflow-hidden rounded-[14px] border border-[#3a332a] bg-[linear-gradient(180deg,var(--bg-2),#1a1713)] px-[34px] pb-[30px] pt-[34px] anim-in-slow max-[640px]:px-[22px] max-[640px]:py-[26px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_220px_at_85%_0%,rgba(201,162,74,0.07),transparent_60%)]"
            />
            <p className="mb-[14px] font-mono text-[11px] uppercase tracking-[3px] text-brass-500">Putusan Komite</p>
            <div className="max-w-[20ch] font-display text-[clamp(26px,4vw,38px)] font-medium leading-[1.15] text-text-0">
              {cat.plain}
              {cat.em && (
                <em className={verdict.category === 'layak_diteliti_lanjut' ? 'italic text-brass-300' : 'italic text-[#d9a441]'}>
                  {cat.em}
                </em>
              )}
              {verdict.category === 'red_flag_berat' && <span className="text-[#c96a5a]"> berat</span>}
            </div>
            {vSub && <p className="mt-3 max-w-[52ch] text-[13.5px] leading-[1.6] text-text-2">{vSub}</p>}
            <div className="mt-[26px] max-w-[420px]">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-mono text-[10.5px] uppercase tracking-[1.2px] text-text-3">Konfidensi</span>
                <span className="font-mono text-[15px] font-medium tabular-nums text-brass-300">
                  {Math.round(verdict.confidence * 100)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-pill bg-[#2a251e]">
                <div
                  className={
                    'h-full rounded-pill transition-[width] duration-1000 ease-[ease-out] ' +
                    (verdict.category === 'layak_diteliti_lanjut'
                      ? 'bg-[linear-gradient(90deg,#8a6f33,var(--brass-500))]'
                      : verdict.category === 'perlu_kehati_hatian'
                        ? 'bg-[linear-gradient(90deg,#8a6f33,#d9a441)]'
                        : 'bg-[linear-gradient(90deg,#8a4a3a,#c96a5a)]')
                  }
                  style={{ width: `${Math.round(verdict.confidence * 100)}%` }}
                />
              </div>
            </div>
          </section>

          {/* ---------- RINGKASAN EKSEKUTIF ---------- */}
          <section className="anim-in">
            <SecHead kicker="Ringkasan" title="Ringkasan Eksekutif" />
            <div className="exec max-w-[62ch] font-display text-[clamp(17px,2.2vw,20px)] leading-[1.7] text-text-0 [&_p]:mb-4 [&_p:last-child]:mb-0">
              <Markdown source={memo.executive_summary} className="md" />
            </div>
          </section>

          {/* ---------- RASIONAL + VERIFIKASI ---------- */}
          <section className="anim-in grid grid-cols-1 gap-[26px] max-[820px]:grid-cols-1 md:grid-cols-2">
            <div>
              <p className="mb-[6px] font-mono text-[11px] uppercase tracking-[1.5px] text-brass-500">Rasional</p>
              <h3 className="mb-[14px] font-display text-[18px] font-medium text-text-0">Rasional putusan</h3>
              <Markdown source={verdict.rationale_md} className="md text-[14px] leading-[1.7] text-text-2" />
            </div>
            <div>
              <p className="mb-[6px] font-mono text-[11px] uppercase tracking-[1.5px] text-brass-500">Verifikasi</p>
              <h3 className="mb-[14px] font-display text-[18px] font-medium text-text-0">
                Wajib Anda jawab sebelum berinvestasi
              </h3>
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {verdict.verification_questions.map((q, i) => (
                  <li key={i} className="relative flex items-start gap-3 pl-0 text-[14px] leading-[1.6] text-text-2">
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-[6px] border border-brass-600 font-mono text-[12px] text-brass-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="pt-1">{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ---------- FAKTA KUNCI ---------- */}
          <section className="anim-in">
            <SecHead kicker="Fakta" title="Fakta Kunci" note="Tabel tenang · hairline" />
            <FactTable memo={memo} />
          </section>

          {/* ---------- TESIS BERHADAPAN ---------- */}
          <section className="anim-in">
            <SecHead kicker="Perdebatan" title="Tesis Berhadapan" note="Arahkan kursor ke sitasi untuk melihat nilai" />
            <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
              <ThesisCard
                side="bear"
                points={memo.bear_case.points}
                factsById={factsById}
              />
              <ThesisCard
                side="bull"
                points={memo.bull_case.points}
                factsById={factsById}
              />
            </div>
          </section>

          {/* ---------- SMART MONEY & INSIDER ---------- */}
          <section className="anim-in">
            <SecHead kicker="Arus" title="Smart Money & Insider" />
            <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
              <FlowCol title="Smart Money" kicker="Aliran institusi">
                {memo.smart_money_findings.map((f, i) => (
                  <li key={i}>
                    <DirChip direction={f.direction} kind="smartmoney" />
                    <span className="flex-1">{f.finding_md}</span>
                  </li>
                ))}
              </FlowCol>
              <FlowCol title="Insider" kicker="Transaksi direksi">
                {memo.insider_findings.map((f, i) => (
                  <li key={i}>
                    <DirChip direction={f.direction} kind="insider" />
                    <span className="flex-1">{f.finding_md}</span>
                  </li>
                ))}
              </FlowCol>
            </div>
          </section>

          {/* ---------- RED FLAGS ---------- */}
          <section className="anim-in">
            <SecHead kicker="Peringatan" title="Red Flags" />
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {memo.red_flags.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-[#2a251e] bg-bg-2 px-[14px] py-3 text-[13.5px] leading-[1.55] text-text-2"
                >
                  <SevChip severity={f.severity} />
                  <span className="flex-1">{f.flag_md}</span>
                </li>
              ))}
              {memo.red_flags.length === 0 && (
                <li className="rounded-lg border border-[#2a251e] bg-bg-2 px-[14px] py-3 text-[13.5px] text-text-3">
                  Tidak ada red flag tercatat.
                </li>
              )}
            </ul>
          </section>

          {/* ---------- SUMBER DATA ---------- */}
          <section className="anim-in">
            <SecHead
              kicker="Audit"
              title="Sumber Data"
              note={memo.tool_calls?.length ? 'Panggilan Sectors nyata · cache' : 'Endpoint Sectors · cache'}
            />
            <div className="overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className={TH_CLS}>Endpoint</th>
                    <th className={TH_CLS}>Param</th>
                    <th className={TH_CLS}>Cache</th>
                    <th className={TH_CLS}>Diambil</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRowsOf(memo).map((r, i) => (
                    <tr key={`${r.endpoint}-${r.at}-${i}`} className="transition-colors hover:bg-[#1a1713]">
                      <td className={`${TD_CLS} font-mono text-[11px] text-text-3`} title={r.agent ? `dipanggil oleh ${r.agent}` : r.endpoint}>{r.endpoint}</td>
                      <td className={`${TD_CLS} break-all font-mono text-[12.5px] text-text-3`}>{r.params || '—'}</td>
                      <td className={`${TD_CLS} font-mono text-[12.5px]`}>
                        <span className={r.cache === 'hit' ? 'text-[#7fb069]' : 'text-[#c96a5a]'}>{r.cache}</span>
                      </td>
                      <td className={`${TD_CLS} whitespace-nowrap font-mono text-[12.5px] text-text-3`}>{formatDateTime(r.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ---------------- bagian-bagian memo ---------------- */

/** Baris tabel audit: panggilan Sectors nyata bila ada, fallback ke sitasi fakta (memo lama). */
interface AuditRow {
  endpoint: string;
  params: string;
  cache: CacheStatus;
  at: string;
  agent?: string;
}

function auditRowsOf(memo: MemoJSON): AuditRow[] {
  if (memo.tool_calls?.length) {
    return memo.tool_calls.map((t) => ({
      endpoint: t.endpoint,
      params: t.params_summary,
      cache: t.cache,
      at: t.retrieved_at,
      agent: t.agent_id,
    }));
  }
  return memo.citations.map((c) => ({
    endpoint: c.endpoint,
    params: c.params_summary,
    cache: c.cache,
    at: c.retrieved_at,
  }));
}

/** Badge kecil baris id (mode data / info richness) — gaya .b-mode / .b-info mock. */
function HeadBadge({ brass, children }: { brass?: boolean; children: ReactNode }) {
  return (
    <span
      className={
        'inline-flex items-center gap-[7px] whitespace-nowrap rounded-[6px] px-[10px] py-[5px] font-mono text-[11px] tracking-[0.3px] ' +
        (brass
          ? 'border border-brass-600 bg-[rgba(201,162,74,0.06)] text-brass-300'
          : 'border border-[#3a332a] bg-[#1a1713] text-text-2')
      }
    >
      <span
        className={'h-1.5 w-1.5 rounded-full ' + (brass ? 'bg-brass-500' : 'bg-[#6f675a]')}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

function keyFactsById(memo: MemoJSON) {
  const map = new Map<string, MemoJSON['key_facts'][number]>();
  for (const f of memo.key_facts) map.set(f.fact_id, f);
  return map;
}

function stripMd(s: string): string {
  return s.replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
}

function FactTable({ memo }: { memo: MemoJSON }) {
  if (memo.key_facts.length === 0) {
    return (
      <div className="rounded-[14px] border border-[#3a332a] bg-bg-2 px-4 py-5 text-[13px] text-text-3">
        Tidak ada fakta kunci tercatat.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2">
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr>
            <th className={TH_CLS}>Id</th>
            <th className={TH_CLS}>Metrik</th>
            <th className={TH_CLS}>Nilai</th>
            <th className={TH_CLS}>Per Tanggal</th>
            <th className={TH_CLS}>Sumber</th>
          </tr>
        </thead>
        <tbody>
          {memo.key_facts.map((f) => (
            <tr key={f.fact_id} className="transition-colors hover:bg-[#1a1713]">
              <td className={`${TD_CLS}`}><CiteId id={f.fact_id} /></td>
              <td className={`${TD_CLS} text-text-2`}>{f.label}</td>
              <td className={`${TD_CLS} font-mono text-[12.5px] tabular-nums text-brass-400`}>
                {formatValue(f.value, f.unit)}
              </td>
              <td className={`${TD_CLS} font-mono text-[12.5px] text-text-3`}>{formatDate(f.as_of_date)}</td>
              <td className={`${TD_CLS} font-mono text-[11px] text-text-3`} title={f.source_endpoint}>
                {f.source_endpoint}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Kartu tesis jaksa/pembela — border-top warna kubu, poin + sitasi inline. */
function ThesisCard({
  side,
  points,
  factsById,
}: {
  side: 'bull' | 'bear';
  points: MemoJSON['bear_case']['points'];
  factsById: Map<string, MemoJSON['key_facts'][number]>;
}) {
  const isBull = side === 'bull';
  return (
    <article
      className={
        'flex flex-col gap-[14px] rounded-[14px] border border-[#3a332a] bg-bg-2 p-[22px] ' +
        (isBull ? 'border-t-2 border-t-[#7fb069]' : 'border-t-2 border-t-[#c96a5a]')
      }
      style={{ borderTopStyle: 'solid' }}
    >
      <div className="flex items-center gap-3">
        <span className="font-display text-[18px] font-medium text-text-0">{isBull ? 'Pembela' : 'Jaksa'}</span>
        <span
          className={
            'rounded-[6px] px-[9px] py-[3px] font-mono text-[11px] uppercase tracking-[1px] ' +
            (isBull
              ? 'border border-[rgba(127,176,105,0.4)] bg-[rgba(127,176,105,0.06)] text-[#7fb069]'
              : 'border border-[rgba(201,106,90,0.4)] bg-[rgba(201,106,90,0.06)] text-[#c96a5a]')
          }
        >
          {isBull ? 'Bull' : 'Bear'}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
        {points.map((p, i) => (
          <li key={i} className="relative pl-4 text-[13.5px] leading-[1.55] text-text-2">
            <span
              className="absolute left-0 top-[9px] h-1.5 w-1.5 rounded-full bg-brass-600"
              aria-hidden="true"
            />
            <span className="md [&_p]:mb-0">{p.argument_md}</span>
            {p.cites.length > 0 && (
              <span className="ml-1.5 inline-flex flex-wrap gap-1.5 align-middle">
                {p.cites.map((cid) => (
                  <CiteChip key={cid} cid={cid} fact={factsById.get(cid)} />
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

/** Kolom arus (smart money / insider) — daftar chip arah + teks. */
function FlowCol({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-[#3a332a] bg-bg-2 p-5">
      <h3 className="mb-1 font-display text-[16px] font-medium text-text-0">{title}</h3>
      <p className="mb-[14px] font-mono text-[10.5px] uppercase tracking-[1.2px] text-text-3">{kicker}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">{children}</ul>
    </div>
  );
}

/** Chip arah (Akumulasi/Distribusi/Beli/Jual) gaya mock .dir. */
function DirChip({ direction, kind }: { direction: string; kind: 'smartmoney' | 'insider' }) {
  const bull = kind === 'smartmoney' ? direction === 'akumulasi' : direction === 'beli';
  const bear = kind === 'smartmoney' ? direction === 'distribusi' : direction === 'jual';
  const label =
    kind === 'smartmoney'
      ? direction === 'akumulasi'
        ? 'Akumulasi'
        : direction === 'distribusi'
          ? 'Distribusi'
          : direction
      : direction === 'beli'
        ? 'Beli'
        : direction === 'jual'
          ? 'Jual'
          : direction;
  const cls = bull
    ? 'border border-[rgba(127,176,105,0.4)] bg-[rgba(127,176,105,0.06)] text-[#7fb069]'
    : bear
      ? 'border border-[rgba(201,106,90,0.4)] bg-[rgba(201,106,90,0.06)] text-[#c96a5a]'
      : 'border border-[#3a332a] bg-[#1a1713] text-text-2';
  return (
    <span className={'flex-none rounded-[5px] px-[7px] py-[2px] font-mono text-[10px] uppercase tracking-[0.5px] ' + cls}>
      {label}
    </span>
  );
}

/** Chip severity red flag gaya mock .sev. */
function SevChip({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  const cfg =
    severity === 'high'
      ? { label: 'Tinggi', cls: 'border border-[rgba(201,106,90,0.4)] bg-[rgba(201,106,90,0.06)] text-[#c96a5a]' }
      : severity === 'medium'
        ? { label: 'Sedang', cls: 'border border-[rgba(217,164,65,0.4)] bg-[rgba(217,164,65,0.06)] text-[#d9a441]' }
        : { label: 'Rendah', cls: 'border border-[#3a332a] bg-[#1a1713] text-text-2' };
  return (
    <span className={'flex-none rounded-[5px] px-2 py-[2px] font-mono text-[10px] uppercase tracking-[0.5px] ' + cfg.cls}>
      {cfg.label}
    </span>
  );
}

function MemoLoadingSkeleton() {
  return (
    <div className="pb-[72px]">
      <div className="mx-auto w-full max-w-[900px] px-6 pt-10">
        <div className="flex flex-col gap-4">
          <span className="skeleton h-[18px] w-[300px]" />
          <span className="skeleton h-[34px] w-[480px]" />
          <span className="skeleton h-[14px] w-[240px]" />
          <div className="skeleton h-[120px] rounded-[14px]" />
          <div className="skeleton h-[100px] rounded-[14px]" />
          <div className="skeleton h-[180px] rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}