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
      <div className="container pad-page">
        <section className="memo-404 card card-pad anim-scale">
          <span className="memo-404-ic"><AlertIcon size={22} /></span>
          <h2>Memorandum belum tersedia</h2>
          <p className="muted">{error}</p>
          <div className="row row-gap-3">
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
    <div className="memo-page">
      <div className="container">
        {/* Header memo */}
        <header className="memo-head anim-in">
          <div className="memo-head-grid">
            <div>
              <div className="memo-kicker">
                <span className="mono">{memo.memo_id}</span>
                <span className="badge badge-neutral">{memo.data_mode}</span>
                <span className="badge badge-brass"><ScaleIcon size={11} /> Memorandum Sidang</span>
              </div>
              <h1 className="memo-title">
                {memo.ticker} <span className="memo-company">{memo.company_name}</span>
              </h1>
              <p className="muted small">
                Disahkan {formatDateTime(memo.created_at)} &middot; skema kontrak v{memo.schema_version}
              </p>
            </div>
            <div className="memo-head-right">
              <RichBadge richness={memo.info_richness} />
            </div>
          </div>

          <div className="verdict-hero card card-pad anim-in-slow">
            <div className="verdict-hero-ic"><GavelIcon size={24} /></div>
            <div className="verd-hero-main">
              <div className="tiny muted mono">PUTUSAN KOMITE</div>
              <h2 className="verd-hero-title">{VERDICT_LABEL[verdict.category]}</h2>
              <div className="verd-conf">
                <span className="verd-conf-label tiny">Konfidensi komite</span>
                <div className="conf-bar">
                  <div className="conf-bar-fill" style={{ width: `${Math.round(verdict.confidence * 100)}%` }} />
                </div>
                <span className="verd-conf-value mono">{Math.round(verdict.confidence * 100)}%</span>
              </div>
            </div>
            <div className="verd-cat-badge" data-cat={verdict.category}>
              <VerdictGlyph category={verdict.category} size={30} />
            </div>
          </div>
        </header>

        <div className="memo-body">
          {/* Ringkasan eksekutif */}
          <section className="memo-section anim-in">
            <SectionHead icon={<FileIcon size={16} />} title="Ringkasan Eksekutif" />
            <div className="exec card card-pad">
              <Markdown source={memo.executive_summary} className="md" />
            </div>
          </section>

          {/* Putusan + pertanyaan verifikasi */}
          <section className="memo-section anim-in">
            <SectionHead icon={<ScaleIcon size={16} />} title="Rasional Putusan & Pertanyaan Verifikasi" />
            <div className="grid-2">
              <div className="card card-pad">
                <h3 className="memo-sub">Rasional</h3>
                <Markdown source={verdict.rationale_md} className="md" />
              </div>
              <div className="card card-pad">
                <h3 className="memo-sub">Wajib Anda jawab sebelum berinvestasi</h3>
                <ol className="question-list">
                  {verdict.verification_questions.map((q, i) => (
                    <li key={i} className="question-item">
                      <span className="question-num mono">{i + 1}</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          {/* Fakta kunci */}
          <section className="memo-section anim-in">
            <SectionHead icon={<LinkIcon size={16} />} title="Fakta Kunci (dengan sitasi)" />
            <FactTable memo={memo} />
          </section>

          {/* Bull vs bear */}
          <section className="memo-section anim-in">
            <SectionHead icon={<ScaleIcon size={16} />} title="Tesis Berhadapan" />
            <div className="thesis-grid">
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
          <section className="memo-section anim-in">
            <SectionHead icon={<BookIcon size={16} />} title="Arus Uang Cerdas & Insider" />
            <div className="grid-2">
              <div className="card card-pad">
                <h3 className="memo-sub">Smart Money <span className="muted small normal">(broker institusi & asing)</span></h3>
                <ul className="finding-list">
                  {memo.smart_money_findings.map((f, i) => (
                    <li key={i} className="finding-item">
                      <DirectionBadge kind="smartmoney" direction={f.direction} />
                      <span>{f.finding_md}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card card-pad">
                <h3 className="memo-sub">Insider <span className="muted small normal">(direksi & pemegang besar)</span></h3>
                <ul className="finding-list">
                  {memo.insider_findings.map((f, i) => (
                    <li key={i} className="finding-item">
                      <DirectionBadge kind="insider" direction={f.direction} />
                      <span>{f.finding_md}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Red flags */}
          <section className="memo-section anim-in">
            <SectionHead icon={<AlertIcon size={16} />} title="Cek Gorengan / Red Flags" />
            <ul className="redflag-list">
              {memo.red_flags.map((f, i) => (
                <li key={i} className="card card-pad redflag-item">
                  <SeverityBadge severity={f.severity} />
                  <span>{f.flag_md}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Sumber / citations */}
          <section className="memo-section anim-in">
            <SectionHead icon={<LinkIcon size={16} />} title="Sumber Data (Sectors API)" />
            <div className="card card-pad">
              <table className="cite-table">
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
                      <td className="mono">{c.cite_id}</td>
                      <td className="cite-endpoint mono" title={c.endpoint}>{c.endpoint}</td>
                      <td className="mono small">{c.params_summary}</td>
                      <td><CacheBadge cache={c.cache} /></td>
                      <td className="small muted">{formatDateTime(c.retrieved_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Disclaimer */}
          <footer className="disclaimer card card-pad anim-in">
            <strong>Disclaimer</strong>
            <p className="muted small">{memo.disclaimer}</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

/* ---------------- bagian-bagian memo ---------------- */

function SectionHead({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="memo-section-head">
      <span className="memo-section-ic">{icon}</span>
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
      <table className="fact-table">
        <thead>
          <tr>
            <th>Fakta</th>
            <th>Label</th>
            <th className="num">Nilai</th>
            <th>Per tanggal</th>
            <th>Sumber</th>
          </tr>
        </thead>
        <tbody>
          {memo.key_facts.map((f) => (
            <tr key={f.fact_id}>
              <td className="mono">{f.fact_id}</td>
              <td>{f.label}</td>
              <td className="num mono">{formatValue(f.value, f.unit)}</td>
              <td className="small muted">{formatDate(f.as_of_date)}</td>
              <td className="cite-endpoint small mono" title={f.source_endpoint}>{f.source_endpoint}</td>
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
    <article className={`thesis card card-pad thesis-${side}`}>
      <header className="thesis-head">
        <span className={`thesis-role ${side}`}>{roleLabel}</span>
        <h3>{title}</h3>
      </header>
      <ul className="thesis-points">
        {points.map((point, i) => (
          <li key={i}>
            <Markdown source={point} className="md md-sm" />
          </li>
        ))}
      </ul>
      {cites.length > 0 && (
        <div className="thesis-cites">
          <span className="tiny muted">Sitasi fakta:</span>
          {cites.map((cid) => {
            const fact = factsById.get(cid);
            return (
              <span key={cid} className="badge badge-neutral cite-rev" title={fact ? `${fact.label} = ${formatValue(fact.value, fact.unit)}` : cid}>
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
    <div className="memo-page">
      <div className="container pad-page">
        <div className="stack-md">
          <span className="skeleton" style={{ width: 300, height: 18 }} />
          <span className="skeleton" style={{ width: 480, height: 34 }} />
          <span className="skeleton" style={{ width: 240, height: 14 }} />
          <div className="card card-pad skeleton" style={{ height: 120 }} />
          <div className="card card-pad skeleton" style={{ height: 100 }} />
          <div className="card card-pad skeleton" style={{ height: 180 }} />
        </div>
      </div>
    </div>
  );
}

