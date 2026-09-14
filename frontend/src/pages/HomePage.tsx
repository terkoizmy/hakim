import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import Reveal from '../components/Reveal';
import { renderRich, useLabels, useLang } from '../i18n';
import {
  AlertIcon,
  ArrowRightIcon,
  BookIcon,
  FileIcon,
  ScaleIcon,
  SearchIcon,
  ShieldAlertIcon,
  SparkIcon,
} from '../components/icons';

const TICKER_RE = /^[A-Za-z]{4}$/;

/** Cincin fokus bersama — pola yang sama dengan AppShell (satu sumber, supaya
 * navigasi keyboard tidak pernah kehilangan penanda fokus). */
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0';

// Reveal diimpor dari komponen bersama — sebelumnya halaman ini punya salinan
// lokal sendiri yang memakai IntersectionObserver `threshold: 0.12` tanpa
// jaring pengaman. Blok yang TERLOMPATI oleh gulir cepat (tombol End, drag
// scrollbar) tak pernah memicu callback "terlihat" sehingga tetap
// `opacity: 0` selamanya dan halaman terlihat berhenti di tengah. Komponen
// bersama menutup celah itu lewat satu pendengar gulir bersama. Dua salinan
// juga berarti perbaikan di satu tempat tidak menyentuh yang lain.

// Mock sidang-landing: kepala seksi bernomor romawi + garis gradien.
function SecHead({ num, title }: { num: string; title: React.ReactNode }) {
  return (
    <Reveal className="mb-[44px] flex items-baseline gap-5">
      <span className="whitespace-nowrap font-mono text-[13px] tracking-[1px] text-brass-500">
        {num}
      </span>
      {/* Judul seksi BOLEH melipat; nomornya tidak.
       *
       * `whitespace-nowrap` di sini semula dipasang agar judul tetap satu baris
       * di desktop — tapi ia juga melarang judul melipat di layar sempit, dan
       * judul Indonesia lebih panjang daripada Inggris ("Tiga babak
       * persidangan." meluber ~100px di 390px). Tanpa nowrap ia tetap satu
       * baris selama memang muat; yang berubah hanya izin melipat saat tidak muat. */}
      <h2 className="font-display text-[clamp(28px,4vw,40px)] font-normal leading-[1.1] text-text-0">
        {title}
      </h2>
      <span
        className="h-px flex-1 bg-[linear-gradient(90deg,#3a332a,transparent)]"
        aria-hidden="true"
      />
    </Reveal>
  );
}

/** Landing page (/) — pitch produk, 1 halaman penuh. */
export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const labels = useLabels();
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ticker = value.trim().toUpperCase();
  const validTicker = TICKER_RE.test(ticker);

  function onTickerChange(raw: string) {
    const cleaned = raw.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4);
    setValue(cleaned);
    if (error) setError(null);
  }

  // Parameternya bernama `code`, bukan `t`: nama `t` dipakai fungsi terjemah.
  async function startTrial(code: string) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const trial = await api.createTrial(code, 'auto');
      navigate(`/trial/${trial.trial_id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('home.error.start');
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* ============ HERO ============ */}
      <section
        className="relative overflow-hidden pb-[72px] pt-[88px] before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(201,162,74,0.06),transparent_60%)] max-[560px]:pb-14 max-[560px]:pt-16"
      >
        <div className="container flex flex-col items-center text-center">
          <Reveal className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-pill border border-[#3a332a] bg-[rgba(201,162,74,0.05)] px-4 py-2 font-mono text-[12px] uppercase tracking-[1.5px] text-brass-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brass-500" aria-hidden="true" />
              {t('home.hero.badge')}
            </span>
            <h1 className="mx-auto mt-[34px] max-w-[16ch] font-display text-[clamp(44px,7vw,84px)] font-normal leading-[1.02] tracking-[-1px] text-text-0">
              {renderRich(t('home.hero.title'), {
                em: (c) => <em className="italic text-brass-500">{c}</em>,
              })}
            </h1>
            <p className="mx-auto mt-[26px] max-w-[56ch] text-[18px] leading-[1.7] text-text-2">
              {renderRich(t('home.hero.lead'), {
                b: (c) => <strong className="font-medium text-text-0">{c}</strong>,
              })}
            </p>

            <form
              className="mx-auto mt-10 flex w-full max-w-[560px] gap-2.5 rounded-[14px] border border-[#3a332a] bg-bg-2 p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-[border-color,box-shadow] focus-within:border-brass-600 focus-within:shadow-[0_0_0_3px_rgba(201,162,74,0.12),0_20px_50px_-20px_rgba(0,0,0,0.6)] max-[560px]:flex-col max-[560px]:p-3"
              onSubmit={(e) => {
                e.preventDefault();
                startTrial(ticker);
              }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-4 pr-1.5 max-[560px]:px-2">
                <SearchIcon size={18} className="flex-none text-text-3" />
                <input
                  className="min-w-0 flex-1 border-none bg-transparent py-3 font-mono text-base uppercase tracking-[2px] text-text-0 outline-none placeholder:tracking-[1px] placeholder:text-text-3 focus-visible:outline-none"
                  value={value}
                  onChange={(e) => onTickerChange(e.target.value)}
                  placeholder={t('home.form.tickerPlaceholder')}
                  maxLength={4}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={t('home.form.tickerLabel')}
                  autoFocus
                />
              </div>
              <button
                className="btn-primary rounded-[9px] px-[22px] py-[14px] max-[560px]:w-full"
                type="submit"
                disabled={!validTicker || submitting}
              >
                {submitting ? <span className="spinner-glow" /> : t('home.form.submit')}
              </button>
            </form>
            <p className="mt-3 font-mono text-[12px] tracking-[0.3px] text-text-3">
              {t('home.form.note')}
            </p>

            {error && (
              <div
                className="mt-4 flex w-full max-w-[560px] items-center justify-center gap-2 rounded-[14px] border border-[rgba(201,106,90,0.4)] bg-[rgba(201,106,90,0.06)] px-[18px] py-[14px] text-[13.5px] text-[#c96a5a]"
                role="alert"
              >
                <AlertIcon size={16} />
                <span>
                  {error} {t('home.form.errorHint')}
                </span>
              </div>
            )}
            {!validTicker && value.length === 4 && (
              <div
                className="mt-4 flex w-full max-w-[560px] items-center justify-center gap-2 rounded-[14px] border border-[rgba(201,106,90,0.4)] bg-[rgba(201,106,90,0.06)] px-[18px] py-[14px] text-[13.5px] text-[#c96a5a]"
                role="alert"
              >
                <AlertIcon size={16} />
                <span>{t('home.form.invalid')}</span>
              </div>
            )}

            <div className="mt-[26px] flex flex-wrap justify-center gap-7">
              <Link
                to="/dashboard"
                className={`inline-flex items-center gap-2 rounded-xs text-[14px] text-text-2 transition-colors hover:text-brass-300 ${FOCUS}`}
              >
                <FileIcon size={15} />
                {t('home.links.cases')}
              </Link>
              <Link
                to="/journal"
                className={`inline-flex items-center gap-2 rounded-xs text-[14px] text-text-2 transition-colors hover:text-brass-300 ${FOCUS}`}
              >
                <BookIcon size={15} />
                {t('home.links.journal')}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ SHOWCASE ============ */}
      <section className="py-[84px] max-[560px]:py-16" id="putusan">
        <div className="container">
          <SecHead
            num={t('home.showcase.num')}
            title={renderRich(t('home.showcase.title'), {
              em: (c) => <em className="italic text-brass-500">{c}</em>,
            })}
          />

          <div className="grid grid-cols-[1.35fr_1fr] items-stretch gap-5 max-[900px]:grid-cols-1">
            <Reveal>
              <article className="relative flex flex-col gap-[18px] overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2 p-7 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-[''] before:bg-[linear-gradient(90deg,var(--brass-500),transparent_70%)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-[12px] tracking-[0.5px] text-text-3">
                    {t('home.showcase.caseMeta')}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-display text-[26px] font-medium text-text-0">
                      Bank Rakyat
                    </span>
                    <span className="font-mono text-[13px] tracking-[1px] text-brass-500">BBRI</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-[6px] border border-[rgba(127,176,105,0.4)] px-[10px] py-[5px] font-mono text-[13px] tracking-[0.5px] text-[#7fb069]">
                    {labels.verdict.layak_diteliti_lanjut}
                  </span>
                  <span
                    className="rounded-[6px] border border-[#3a332a] px-[9px] py-[5px] font-mono text-[12px] tracking-[0.5px] text-text-3"
                    title={t('enum.richness.title', { grade: labels.richness.A })}
                  >
                    {labels.richness.A}
                  </span>
                </div>
                <div className="flex items-center gap-3.5">
                  <span className="whitespace-nowrap font-mono text-[12px] tracking-[0.5px] text-text-2">
                    {t('home.showcase.confidence')}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-pill bg-[#2a251e]">
                    <div className="h-full w-[78%] rounded-pill bg-[linear-gradient(90deg,#9a7a36,#c9a24a)]" />
                  </div>
                  <span className="font-mono text-[14px] font-medium text-brass-300">78%</span>
                </div>
                <div className="flex flex-col gap-[6px] border-t border-[#2a251e] pt-[18px]">
                  <div className="mb-[6px] font-mono text-[11px] uppercase tracking-[1px] text-text-3">
                    {t('home.showcase.cited')}
                  </div>
                  <div className="flex items-start gap-3 py-[3px]">
                    <span className="flex-none pt-0.5 font-mono text-[11px] text-brass-500">[S1]</span>
                    <span className="text-[13.5px] leading-[1.5] text-text-2">
                      {t('home.showcase.evidence1')}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 py-[3px]">
                    <span className="flex-none pt-0.5 font-mono text-[11px] text-brass-500">[S2]</span>
                    <span className="text-[13.5px] leading-[1.5] text-text-2">
                      {t('home.showcase.evidence2')}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 py-[3px]">
                    <span className="flex-none pt-0.5 font-mono text-[11px] text-brass-500">[S3]</span>
                    <span className="text-[13.5px] leading-[1.5] text-text-2">
                      {t('home.showcase.evidence3')}
                    </span>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap justify-between gap-3 border-t border-[#2a251e] pt-4">
                  <span className="font-mono text-[11.5px] tracking-[0.5px] text-text-3">
                    {t('home.showcase.byline')}
                  </span>
                  <span className="font-mono text-[11.5px] tracking-[0.5px] text-text-2">
                    {t('home.showcase.archive')}
                  </span>
                </div>
              </article>
            </Reveal>

            <div className="flex flex-col gap-5">
              <Reveal>
                <article className="flex items-start gap-4 rounded-[14px] border border-[#3a332a] bg-bg-2 p-[22px] transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brass-600">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-[#7fb069]" />
                  <div>
                    <h4 className="mb-1 font-display text-[18px] font-medium text-text-0">
                      {labels.verdict.layak_diteliti_lanjut}
                    </h4>
                    <p className="text-[13.5px] leading-[1.55] text-text-2">
                      {t('home.showcase.card1.body')}
                    </p>
                    <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.5px] text-text-3">
                      {t('home.showcase.sampleTicker', {
                        ticker: 'TLKM',
                        grade: labels.richness.A,
                      })}
                    </div>
                  </div>
                </article>
              </Reveal>
              <Reveal>
                <article className="flex items-start gap-4 rounded-[14px] border border-[#3a332a] bg-bg-2 p-[22px] transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brass-600">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-[#d9a441]" />
                  <div>
                    <h4 className="mb-1 font-display text-[18px] font-medium text-text-0">
                      {labels.verdict.perlu_kehati_hatian}
                    </h4>
                    <p className="text-[13.5px] leading-[1.55] text-text-2">
                      {t('home.showcase.card2.body')}
                    </p>
                    <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.5px] text-text-3">
                      {t('home.showcase.sampleTicker', {
                        ticker: 'GOTO',
                        grade: labels.richness.B,
                      })}
                    </div>
                  </div>
                </article>
              </Reveal>
              <Reveal>
                <article className="flex items-start gap-4 rounded-[14px] border border-[#3a332a] bg-bg-2 p-[22px] transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brass-600">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-[#c96a5a]" />
                  <div>
                    <h4 className="mb-1 font-display text-[18px] font-medium text-text-0">
                      {labels.verdict.red_flag_berat}
                    </h4>
                    <p className="text-[13.5px] leading-[1.55] text-text-2">
                      {t('home.showcase.card3.body')}
                    </p>
                    <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.5px] text-text-3">
                      {t('home.showcase.sampleGrade', { grade: labels.richness.C })}
                    </div>
                  </div>
                </article>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CARA KERJA ============ */}
      <section className="py-[84px] max-[560px]:py-16" id="cara-kerja">
        <div className="container">
          <SecHead
            num={t('home.how.num')}
            title={renderRich(t('home.how.title'), {
              em: (c) => <em className="italic text-brass-500">{c}</em>,
            })}
          />

          <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
            <Reveal>
              <article className="relative rounded-[14px] border border-[#3a332a] bg-bg-2 p-7">
                <span className="font-mono text-[12px] tracking-[1px] text-brass-500">
                  {t('home.how.act', { n: '01' })}
                </span>
                <span className="mb-4 mt-[18px] block w-[44px] text-brass-300">
                  <SparkIcon size={40} />
                </span>
                <h3 className="mb-2 font-display text-[20px] font-medium text-text-0">
                  {t('home.how.step1.title')}
                </h3>
                <p className="text-[14px] leading-[1.6] text-text-2">
                  {t('home.how.step1.body')}
                </p>
              </article>
            </Reveal>
            <Reveal>
              <article className="relative rounded-[14px] border border-[#3a332a] bg-bg-2 p-7">
                <span className="font-mono text-[12px] tracking-[1px] text-brass-500">
                  {t('home.how.act', { n: '02' })}
                </span>
                <span className="mb-4 mt-[18px] block w-[44px] text-brass-300">
                  <ScaleIcon size={40} />
                </span>
                <h3 className="mb-2 font-display text-[20px] font-medium text-text-0">
                  {t('home.how.step2.title')}
                </h3>
                <p className="text-[14px] leading-[1.6] text-text-2">
                  {t('home.how.step2.body')}
                </p>
              </article>
            </Reveal>
            <Reveal>
              <article className="relative rounded-[14px] border border-[#3a332a] bg-bg-2 p-7">
                <span className="font-mono text-[12px] tracking-[1px] text-brass-500">
                  {t('home.how.act', { n: '03' })}
                </span>
                <span className="mb-4 mt-[18px] block w-[44px] text-brass-300">
                  <FileIcon size={40} />
                </span>
                <h3 className="mb-2 font-display text-[20px] font-medium text-text-0">
                  {t('home.how.step3.title')}
                </h3>
                <p className="text-[14px] leading-[1.6] text-text-2">
                  {t('home.how.step3.body')}
                </p>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ CREDIBILITY ============ */}
      <section className="py-[84px] max-[560px]:py-16">
        <div className="container">
          <Reveal className="grid grid-cols-3 gap-8 rounded-[14px] border border-[#2a251e] bg-[#1a1713] p-10 max-[900px]:grid-cols-1">
            <div className="flex items-start gap-4">
              <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[9px] border border-[#3a332a] text-brass-500">
                <DatabaseIconWrap />
              </span>
              <div>
                <h4 className="mb-[5px] font-display text-[17px] font-medium text-text-0">
                  {t('home.cred.cite.title')}
                </h4>
                <p className="text-[13.5px] leading-[1.55] text-text-2">
                  {t('home.cred.cite.body')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[9px] border border-[#3a332a] text-brass-500">
                <FileIcon size={19} />
              </span>
              <div>
                <h4 className="mb-[5px] font-display text-[17px] font-medium text-text-0">
                  {t('home.cred.transparent.title')}
                </h4>
                <p className="text-[13.5px] leading-[1.55] text-text-2">
                  {t('home.cred.transparent.body')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[9px] border border-[#3a332a] text-brass-500">
                <ShieldAlertIcon size={19} />
              </span>
              <div>
                <h4 className="mb-[5px] font-display text-[17px] font-medium text-text-0">
                  {t('home.cred.noAdvice.title')}
                </h4>
                <p className="text-[13.5px] leading-[1.55] text-text-2">
                  {t('home.cred.noAdvice.body')}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ JURNAL CTA ============ */}
      <section className="pb-[84px] pt-[84px] max-[560px]:py-16" id="jurnal">
        <div className="container">
          <Reveal className="relative overflow-hidden rounded-[14px] border border-[#3a332a] bg-[linear-gradient(135deg,var(--bg-3),var(--bg-2))] px-12 py-16 text-center before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(600px_300px_at_50%_0%,rgba(201,162,74,0.08),transparent_70%)] max-[560px]:px-6 max-[560px]:py-12">
            <span className="relative font-mono text-[12px] uppercase tracking-[1.5px] text-brass-500">
              {t('home.journal.eyebrow')}
            </span>
            <h2 className="relative mx-auto mt-[18px] max-w-[20ch] font-display text-[clamp(30px,4.5vw,46px)] font-normal leading-[1.1] text-text-0">
              {renderRich(t('home.journal.title'), {
                em: (c) => <em className="italic text-brass-500">{c}</em>,
              })}
            </h2>
            <p className="relative mx-auto mt-5 max-w-[52ch] text-[16px] text-text-2">
              {t('home.journal.body')}
            </p>
            <Link
              to="/journal"
              className={`relative mt-8 inline-flex items-center gap-2.5 rounded-[9px] border border-brass-600 px-[26px] py-[14px] font-mono text-[14px] tracking-[0.5px] text-brass-300 transition-all hover:border-brass-500 hover:bg-brass-500 hover:text-[#14120f] ${FOCUS}`}
            >
              {t('home.journal.cta')}
              <ArrowRightIcon size={16} />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/** Ikon sparkle kecil untuk item kredibilitas pertama. */
function DatabaseIconWrap() {
  return <SparkIcon size={19} />;
}