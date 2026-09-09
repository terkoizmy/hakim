import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { VERDICT_LABEL, type MemoJSON, type VerdictCategory } from '../types/contract';
import { formatDate, formatDateTime, formatValue } from '../utils/format';
import { Markdown } from '../utils/md';
import { RichBadge, CacheBadge } from './CourtroomPage';
import {
  AlertIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BookIcon,
  CheckIcon,
  FileIcon,
  GavelIcon,
  LinkIcon,
  ScaleIcon,
} from '../components/icons';

/** Class tabel (fact-table / cite-table) — setara app.css .fact-table/.cite-table. */
const TABLE_CLS =
  'w-full border-collapse text-[13px] ' +
  '[&_th]:text-left [&_th]:text-[10.5px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-text-3 ' +
  '[&_th]:pr-3 [&_th]:pb-2.5 [&_th]:border-b [&_th]:border-line-1 [&_th:last-child]:pr-0 ' +
  '[&_td]:py-[11px] [&_td]:pr-3 [&_td]:border-b [&_td]:border-line-0 [&_td:last-child]:pr-0 ' +
  '[&_tbody_tr:last-child_td]:border-b-0';

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
      <div className="container pt-8 pb-14">
        <section className="card p-8 text-center max-w-[560px] mx-auto my-10 anim-scale">
          <span className="w-[50px] h-[50px] mx-auto mb-4 grid place-items-center rounded-pill text-brass-300 bg-[rgba(217,180,109,0.12)] border border-[color:rgba(217,180,109,0.34)]">
            <AlertIcon size={22} />
          </span>
          <h2 className="text-[22px] mb-2">Memorandum belum tersedia</h2>
          <p className="muted">{error}</p>
          <div className="flex items-center gap-3 justify-center mt-4">
            <Link to={`/trial/${trialId}`} className="btn btn-primary"><GavelIcon size={16} /> Kembali ke Sidang</Link>
            <Link to="/journal" className="btn btn-ghost"><BookIcon size={16} /> Jurnal Sidang</Link>
          </div>
        </section>
      </div>
    );
  }

  return <MemoView memo={memo} />;
}

/** MemoView: render semua field MemoJSON — dipakai MemoPage (dan bisa dipakai halaman lain). */
export function MemoView({ memo }: { memo: MemoJSON }) {
  const verdict = memo.verdict;
  return (
    <div className="pb-[72px]">
      <div className="container">
        {/* Header memo */}
        <header className="mb-6 anim-in">
          <div className="flex justify-between items-start gap-5 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap text-[11.5px] text-text-3 mb-3">
                <span className="font-mono">{memo.memo_id}</span>
                <span className="badge badge-neutral">{memo.data_mode}</span>
                <span className="badge badge-brass"><ScaleIcon size={11} /> Memorandum Sidang</span>
              </div>
              <h1 className="text-[clamp(30px,4.6vw,46px)] tracking-[0.01em]">
                {memo.ticker} <span className="block text-[17px] text-text-1 font-sans tracking-normal mt-1.5 font-normal">{memo.company_name}</span>
              </h1>              <p className="muted small">
                Disahkan {formatDateTime(memo.created_at)} &middot; skema kontrak v{memo.schema_version}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <RichBadge richness={memo.info_richness} />
            </div>
            <div
              aria-hidden="true"
              className="flex-none w-[120px] h-[120px] rounded-full border-2 border-brass-500 text-brass-400 flex flex-col items-center justify-center gap-[2px] text-center -rotate-[8deg] opacity-90 bg-[radial-gradient(circle_at_30%_30%,rgba(201,162,74,0.1),transparent_70%)] max-[640px]:w-[96px] max-[640px]:h-[96px]"
            >
              <span className="font-mono text-[8.5px] tracking-[2px] uppercase">SIDANG · RISET</span>
              <span className="font-display text-[15px] font-semibold italic">Disahkan</span>
              <span className="font-mono text-[8px] tracking-[1px]">KOMITE PUTUSAN</span>
            </div>
          </div>

          <div className="card p-8 flex items-center gap-6 flex-wrap anim-in-slow bg-[linear-gradient(150deg,rgba(217,180,109,0.16),var(--bg-2)_58%)] border-[color:rgba(217,180,109,0.42)] shadow-[var(--shadow-brass),inset_0_0_0_1px_rgba(217,180,109,0.06)]">
            <div className="w-[62px] h-[62px] flex-none grid place-items-center rounded-lg text-brass-300 bg-[rgba(217,180,109,0.14)] border border-[color:rgba(217,180,109,0.42)] shadow-[inset_0_0_18px_rgba(217,180,109,0.08)]">
              <GavelIcon size={24} />
            </div>
            <div className="flex-1 min-w-[240px]">
              <div className="tiny muted font-mono">PUTUSAN KOMITE</div>
              <h2 className="font-display text-[clamp(26px,3.8vw,40px)] font-[650] leading-[1.15] mt-1">{VERDICT_LABEL[verdict.category]}</h2>
              <div className="flex items-center gap-3 mt-3 max-w-[460px]">
                <span className="text-text-2 whitespace-nowrap tiny">Konfidensi komite</span>
                <div className="flex-1 h-2 rounded-pill bg-bg-0 border border-line-1 overflow-hidden">
                  <div
                    className="h-full bg-[linear-gradient(90deg,var(--brass-500),var(--brass-300))] rounded-pill transition-[width] duration-1000 ease-[var(--ease-out)]"
                    style={{ width: `${Math.round(verdict.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-[13px] font-semibold text-brass-200 font-mono">{Math.round(verdict.confidence * 100)}%</span>
              </div>
            </div>
            <div
              data-cat={verdict.category}
              className={
                'w-16 h-16 grid place-items-center rounded-pill ' +
                (verdict.category === 'layak_diteliti_lanjut'
                  ? 'text-defend-300 bg-[rgba(47,168,119,0.14)] border border-[color:rgba(47,168,119,0.42)]'
                  : verdict.category === 'perlu_kehati_hatian'
                    ? 'text-brass-300 bg-[rgba(217,180,109,0.14)] border border-[color:rgba(217,180,109,0.42)]'
                    : 'text-prosecute-300 bg-[rgba(217,72,59,0.14)] border border-[color:rgba(217,72,59,0.42)]')
              }
            >
              <VerdictGlyph category={verdict.category} size={30} />
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-10">
          {/* Ringkasan eksekutif */}
          <section className="anim-in">
            <SectionHead icon={<FileIcon size={16} />} title="Ringkasan Eksekutif" />
            <div className="card card-pad [&_p]:text-[16px] [&_p]:leading-[1.85]">
              <Markdown source={memo.executive_summary} className="md" />
            </div>
          </section>

          {/* Putusan + pertanyaan verifikasi */}
          <section className="anim-in">
            <SectionHead icon={<ScaleIcon size={16} />} title="Rasional Putusan & Pertanyaan Verifikasi" />
            <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
              <div className="card card-pad">
                <h3 className="text-[15px] mb-3 text-text-0">Rasional</h3>
                <Markdown source={verdict.rationale_md} className="md" />
              </div>
              <div className="card card-pad">
                <h3 className="text-[15px] mb-3 text-text-0">Wajib Anda jawab sebelum berinvestasi</h3>
                <ol className="m-0 p-0 list-none flex flex-col gap-3">
                  {verdict.verification_questions.map((q, i) => (
                    <li key={i} className="flex gap-3 items-start leading-[1.6] text-text-1">
                      <span className="flex-none w-6 h-6 grid place-items-center rounded-pill text-[12px] font-bold text-brass-200 bg-[rgba(217,180,109,0.12)] border border-[color:rgba(217,180,109,0.34)] font-mono">{i + 1}</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          {/* Fakta kunci */}
          <section className="anim-in">
            <SectionHead icon={<LinkIcon size={16} />} title="Fakta Kunci (dengan sitasi)" />
            <FactTable memo={memo} />
          </section>

          {/* Bull vs bear */}
          <section className="anim-in">
            <SectionHead icon={<ScaleIcon size={16} />} title="Tesis Berhadapan" />
            <div className="grid grid-cols-2 gap-4 items-stretch max-[860px]:grid-cols-1">
              <ThesisCard
                side="bear"
                title={memo.bear_case.title}
                points={memo.bear_case.points.map((p) => p.argument_md)}
                cites={memo.bear_case.points.flatMap((p) => p.cites)}
                factsById={keyFactsById(memo)}
              />
              <ThesisCard
                side="bull"
                title={memo.bull_case.title}
                points={memo.bull_case.points.map((p) => p.argument_md)}
                cites={memo.bull_case.points.flatMap((p) => p.cites)}
                factsById={keyFactsById(memo)}
              />
            </div>
          </section>

          {/* Smart money + insider */}
          <section className="anim-in">
            <SectionHead icon={<BookIcon size={16} />} title="Arus Uang Cerdas & Insider" />
            <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
              <div className="card card-pad">
                <h3 className="text-[15px] mb-3 text-text-0">Smart Money <span className="muted small font-normal">(broker institusi & asing)</span></h3>
                <ul className="m-0 p-0 list-none flex flex-col gap-3">
                  {memo.smart_money_findings.map((f, i) => (
                    <li key={i} className="flex gap-3 items-start text-[13.5px] text-text-1 leading-[1.6]">
                      <DirectionBadge kind="smartmoney" direction={f.direction} />
                      <span>{f.finding_md}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card card-pad">
                <h3 className="text-[15px] mb-3 text-text-0">Insider <span className="muted small font-normal">(direksi & pemegang besar)</span></h3>
                <ul className="m-0 p-0 list-none flex flex-col gap-3">
                  {memo.insider_findings.map((f, i) => (
                    <li key={i} className="flex gap-3 items-start text-[13.5px] text-text-1 leading-[1.6]">
                      <DirectionBadge kind="insider" direction={f.direction} />
                      <span>{f.finding_md}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Red flags */}
          <section className="anim-in">
            <SectionHead icon={<AlertIcon size={16} />} title="Cek Gorengan / Red Flags" />
            <ul className="m-0 p-0 list-none flex flex-col gap-3">
              {memo.red_flags.map((f, i) => (
                <li key={i} className="card card-pad flex gap-3 items-start text-[13.5px] text-text-1">
                  <SeverityBadge severity={f.severity} />
                  <span>{f.flag_md}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Sumber / citations */}
          <section className="anim-in">
            <SectionHead icon={<LinkIcon size={16} />} title="Sumber Data (Sectors API)" />
            <div className="card card-pad">
              <table className={TABLE_CLS}>
                <thead>
                  <tr>
                    <th>Sitasi</th>
                    <th>Endpoint</th>
                    <th>Param</th>
                    <th>Cache</th>
                    <th>Diambil</th>
                  </tr>
                </thead>
                <tbody>
                  {memo.citations.map((c) => (
                    <tr key={c.cite_id}>
                      <td className="font-mono">{c.cite_id}</td>
                      <td className="max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap text-text-1 font-mono" title={c.endpoint}>{c.endpoint}</td>
                      <td className="font-mono small">{c.params_summary}</td>
                      <td><CacheBadge cache={c.cache} /></td>
                      <td className="small muted">{formatDateTime(c.retrieved_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Disclaimer */}
          <footer className="card card-pad anim-in italic border-[color:rgba(217,180,109,0.22)] bg-[linear-gradient(160deg,rgba(217,180,109,0.06),var(--bg-2))]">
            <strong>Disclaimer</strong>
            <p className="muted small mt-1.5 mb-0">{memo.disclaimer}</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

/* ---------------- bagian-bagian memo ---------------- */

function SectionHead({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-8 h-8 grid place-items-center text-brass-300 bg-[rgba(217,180,109,0.09)] border border-[color:rgba(217,180,109,0.26)] rounded-sm">{icon}</span>
      <h2 className="section-title">{title}</h2>
    </div>
  );
}

function VerdictGlyph({ category, size }: { category: VerdictCategory; size?: number }) {
  if (category === 'red_flag_berat') return <AlertIcon size={size ?? 24} />;
  if (category === 'perlu_kehati_hatian') return <ScaleIcon size={size ?? 24} />;
  return <CheckIcon size={size ?? 24} />;
}

function keyFactsById(memo: MemoJSON) {
  const map = new Map<string, MemoJSON['key_facts'][number]>();
  for (const f of memo.key_facts) map.set(f.fact_id, f);
  return map;
}

function FactTable({ memo }: { memo: MemoJSON }) {
  if (memo.key_facts.length === 0) {
    return <div className="card card-pad muted small">Tidak ada fakta kunci tercatat.</div>;
  }
  return (
    <div className="card card-pad">
      <table className={TABLE_CLS}>
        <thead>
          <tr>
            <th>Fakta</th>
            <th>Label</th>
            <th className="text-right">Nilai</th>
            <th>Per tanggal</th>
            <th>Sumber</th>
          </tr>
        </thead>
        <tbody>
          {memo.key_facts.map((f) => (
            <tr key={f.fact_id}>
              <td className="font-mono">{f.fact_id}</td>
              <td>{f.label}</td>
              <td className="text-right font-mono">{formatValue(f.value, f.unit)}</td>
              <td className="small muted">{formatDate(f.as_of_date)}</td>
              <td className="max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap text-text-1 small font-mono" title={f.source_endpoint}>{f.source_endpoint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ThesisCard({
  side,
  title,
  points,
  cites,
  factsById,
}: {
  side: 'bull' | 'bear';
  title: string;
  points: string[];
  cites: string[];
  factsById: Map<string, MemoJSON['key_facts'][number]>;
}) {
  const isBull = side === 'bull';
  const roleLabel = isBull ? 'Pembela (Bull)' : 'Jaksa (Bear)';
  return (
    <article
      className={
        'card card-pad flex flex-col gap-3 border-l-[3px] ' +
        (isBull ? 'border-l-defend-500' : 'border-l-prosecute-500')
      }
    >
      <header>
        <span
          className={
            'inline-flex items-center text-[11px] font-bold tracking-[0.1em] uppercase py-[3px] px-2.5 rounded-pill ' +
            (isBull
              ? 'text-defend-300 bg-[rgba(47,168,119,0.12)] border border-[color:rgba(47,168,119,0.34)]'
              : 'text-prosecute-300 bg-[rgba(217,72,59,0.12)] border border-[color:rgba(217,72,59,0.34)]')
          }
        >
          {roleLabel}
        </span>
        <h3 className="text-[18px] font-sans font-semibold text-text-0 mt-1">{title}</h3>
      </header>
      <ul className="m-0 p-0 pl-1 list-none flex flex-col gap-3 text-text-1">
        {points.map((point, i) => (
          <li key={i}>
            <Markdown source={point} className="md md-sm" />
          </li>
        ))}
      </ul>
      {cites.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-2 border-t border-line-0">
          <span className="tiny muted">Sitasi fakta:</span>
          {cites.map((cid) => {
            const fact = factsById.get(cid);
            return (
              <span key={cid} className="badge badge-neutral font-mono" title={fact ? `${fact.label} = ${formatValue(fact.value, fact.unit)}` : cid}>
                <LinkIcon size={11} /> {cid}
              </span>
            );
          })}
        </div>
      )}
    </article>
  );
}

function DirectionBadge({
  kind,
  direction,
}: {
  kind: 'smartmoney' | 'insider';
  direction: string;
}) {
  const bullish = kind === 'smartmoney' ? direction === 'akumulasi' : direction === 'beli';
  const bearish = kind === 'smartmoney' ? direction === 'distribusi' : direction === 'jual';
  if (bullish)
    return (
      <span className="badge badge-defend">
        {kind === 'smartmoney' ? <ArrowUpIcon size={11} /> : <ArrowUpIcon size={11} />} {direction}
      </span>
    );
  if (bearish)
    return (
      <span className="badge badge-prosecute">
        <ArrowDownIcon size={11} /> {direction}
      </span>
    );
  return <span className="badge badge-neutral">netral</span>;
}

function SeverityBadge({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  if (severity === 'high') return <span className="badge badge-prosecute">severity tinggi</span>;
  if (severity === 'medium') return <span className="badge badge-brass">severity sedang</span>;
  return <span className="badge badge-neutral">severity rendah</span>;
}

function MemoLoadingSkeleton() {
  return (
    <div className="pb-[72px]">
      <div className="container pt-8 pb-14">
        <div className="flex flex-col gap-4">
          <span className="skeleton w-[300px] h-[18px]" />
          <span className="skeleton w-[480px] h-[34px]" />
          <span className="skeleton w-[240px] h-[14px]" />
          <div className="card card-pad skeleton h-[120px]" />
          <div className="card card-pad skeleton h-[100px]" />
          <div className="card card-pad skeleton h-[180px]" />
        </div>
      </div>
    </div>
  );
}