import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import {
  AlertIcon,
  ArrowRightIcon,
  BookIcon,
  BuildingIcon,
  DatabaseIcon,
  FileIcon,
  ScaleIcon,
  SearchIcon,
  ShieldAlertIcon,
  SparkIcon,
} from '../components/icons';

const TICKER_RE = /^[A-Za-z]{4}$/;

/** Reveal — scroll-reveal halus, hormati prefers-reduced-motion. */
function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

/** Landing page (/) — pitch produk, 1 halaman penuh. */
export default function HomePage() {
  const navigate = useNavigate();
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

  async function startTrial(t: string) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const trial = await api.createTrial(t, 'auto');
      navigate(`/trial/${trial.trial_id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Gagal memulai sidang. Coba lagi.';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* ============ HERO ============ */}
      <section
        className="relative overflow-hidden py-14 before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(760px_360px_at_18%_0%,var(--brass-glow-soft),transparent_60%),radial-gradient(640px_420px_at_92%_30%,rgba(79,143,232,0.06),transparent_60%)] max-[640px]:pt-10"
      >
        <div className="container flex flex-col items-center text-center">
          <Reveal className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-pill border border-[rgba(217,180,109,0.32)] bg-[rgba(217,180,109,0.07)] px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-brass-300">
              <span
                className="h-1.5 w-1.5 rounded-full bg-brass-400 shadow-[0_0_8px_var(--brass-glow)]"
                aria-hidden="true"
              />
              Multi-Agent · Data Sectors · Bahasa Indonesia
            </span>
            <h1 className="mt-5 text-[clamp(42px,6.4vw,68px)] leading-[1.02] tracking-[-0.01em]">
              Sebelum beli, <em className="italic text-brass-300">aduli</em> dulu.
            </h1>
            <p className="my-5 max-w-[46ch] text-[16.5px] leading-[1.7] text-text-1">
              Lima analis menggali bukti dari data Sectors —{' '}
              <strong className="font-medium text-text-0">jaksa bear</strong> berdebat melawan{' '}
              <strong className="font-medium text-text-0">pembela bull</strong> dalam dua ronde, lalu{' '}
              <strong className="font-medium text-text-0">hakim menulis memorandum riset</strong>.
              Semua tayang, semua tersimpan.
            </p>

            <form
              className="mx-auto mt-8 flex w-full max-w-[560px] gap-2.5 rounded-lg border border-line-2 bg-bg-2 p-2 shadow-3 transition-[border-color,box-shadow] focus-within:border-brass-600 focus-within:shadow-[0_0_0_3px_var(--brass-glow-soft),var(--shadow-3)] max-[560px]:flex-col max-[560px]:p-3"
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
                  placeholder="KODE SAHAM"
                  maxLength={4}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Kode saham 4 huruf"
                  autoFocus
                />
              </div>
              <button
                className="btn-primary max-[560px]:w-full"
                type="submit"
                disabled={!validTicker || submitting}
              >
                {submitting ? <span className="spinner-glow" /> : 'Mulai Sidang'}
              </button>
            </form>
            <p className="mt-3 font-mono text-[12px] tracking-[0.3px] text-text-3">
              ±3 menit · tanpa akun · tanpa biaya
            </p>

            {error && (
              <div className="mt-4 flex items-center gap-2 text-[13.5px] text-prosecute-300" role="alert">
                <AlertIcon size={16} />
                <span>{error} — pastikan 4 huruf kode emiten IDX.</span>
              </div>
            )}
            {!validTicker && value.length === 4 && (
              <div className="mt-4 flex items-center gap-2 text-[13.5px] text-prosecute-300" role="alert">
                <AlertIcon size={16} />
                <span>Kode harus 4 huruf (contoh: BBCA, CUAN).</span>
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-6">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-text-1 transition-colors hover:text-brass-300"
              >
                <FileIcon size={15} />
                Lihat Daftar Perkara
              </Link>
              <Link
                to="/journal"
                className="inline-flex items-center gap-2 text-sm text-text-1 transition-colors hover:text-brass-300"
              >
                <BookIcon size={15} />
                Jurnal Sidang
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ SHOWCASE ============ */}
      <section className="py-14 max-[560px]:py-10" id="putusan">
        <div className="container">
          <Reveal className="mb-8 flex items-baseline gap-5">
            <span className="whitespace-nowrap font-mono text-[12px] tracking-[0.12em] text-brass-300">
              I · PUTUSAN
            </span>
            <h2 className="text-[clamp(28px,4vw,40px)] font-normal">
              Lihat <em className="italic text-brass-300">produknya</em> dulu.
            </h2>
            <span
              className="h-px flex-1 bg-[linear-gradient(90deg,var(--line-2),transparent)]"
              aria-hidden="true"
            />
          </Reveal>

          <div className="grid grid-cols-[1.35fr_1fr] items-stretch gap-5 max-[1020px]:grid-cols-1">
            <Reveal>
              <article className="relative flex flex-col gap-4 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-[''] before:bg-[linear-gradient(90deg,var(--brass-500),transparent_70%)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] tracking-[0.06em] text-text-3">
                    PERKARA No. 2024-118 · SEKTOR PERBANKAN
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-display text-2xl font-semibold">Bank Rakyat</span>
                    <span className="text-xs tracking-[0.1em] text-brass-300">BBRI</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-sm border border-[rgba(47,168,119,0.4)] px-2.5 py-1 font-mono text-xs tracking-[0.04em] text-defend-300">
                    Layak Diteliti
                  </span>
                  <span className="rounded-sm border border-line-1 px-[9px] py-1 font-mono text-[11px] tracking-[0.06em] text-text-2">
                    INFO A
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-[11px] tracking-[0.08em] text-text-2">
                    KONFIDENSI
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-pill border border-line-1 bg-bg-0">
                    <div className="h-full w-[78%] rounded-pill bg-[linear-gradient(90deg,var(--brass-600),var(--brass-400))]" />
                  </div>
                  <span className="font-mono text-sm font-semibold text-brass-200">78%</span>
                </div>
                <div className="flex flex-col gap-2 border-t border-line-0 pt-4">
                  <div className="text-[10.5px] uppercase tracking-[0.1em] text-text-3">
                    Bukti yang dikutip
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-none pt-0.5 font-mono text-[11px] text-brass-300">[S1]</span>
                    <span className="text-[13.5px] leading-[1.55] text-text-1">
                      Margin bunga bersih stabil di kuartal terakhir, didukung pertumbuhan kredit ritel.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-none pt-0.5 font-mono text-[11px] text-brass-300">[S2]</span>
                    <span className="text-[13.5px] leading-[1.55] text-text-1">
                      Rasio NPL terkendali di bawah rata-rata sektor; cadangan memadai.
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-none pt-0.5 font-mono text-[11px] text-brass-300">[S3]</span>
                    <span className="text-[13.5px] leading-[1.55] text-text-1">
                      Valuasi berada di kisaran historis, tanpa lonjakan volume yang mencurigakan.
                    </span>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap justify-between gap-3 border-t border-line-0 pt-4">
                  <span className="text-[10.5px] tracking-[0.06em] text-text-3">
                    DITULIS OLEH HAKIM · 2 RONDE DEBAT
                  </span>
                  <span className="text-[10.5px] tracking-[0.06em] text-text-2">ARSIP TERBUKA</span>
                </div>
              </article>
            </Reveal>

            <div className="flex flex-col gap-4">
              <Reveal>
                <article className="flex items-start gap-4 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brass-600">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-defend-400" />
                  <div>
                    <h4 className="mb-1 font-display text-[17px] font-semibold">Layak Diteliti</h4>
                    <p className="text-[13px] leading-[1.55] text-text-1">
                      Bukti seimbang, fundamental sehat. Masuk daftar pantau untuk riset lanjutan.
                    </p>
                    <div className="mt-2 font-mono text-[10.5px] tracking-[0.06em] text-text-3">
                      CONTOH · TLKM · INFO A
                    </div>
                  </div>
                </article>
              </Reveal>
              <Reveal>
                <article className="flex items-start gap-4 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brass-600">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-brass-400" />
                  <div>
                    <h4 className="mb-1 font-display text-[17px] font-semibold">Perlu Kehati-hatian</h4>
                    <p className="text-[13px] leading-[1.55] text-text-1">
                      Ada sinyal campur — pertumbuhan ada, tapi risiko terukur. Perlu verifikasi.
                    </p>
                    <div className="mt-2 font-mono text-[10.5px] tracking-[0.06em] text-text-3">
                      CONTOH · GOTO · INFO B
                    </div>
                  </div>
                </article>
              </Reveal>
              <Reveal>
                <article className="flex items-start gap-4 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brass-600">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-prosecute-400" />
                  <div>
                    <h4 className="mb-1 font-display text-[17px] font-semibold">Red Flag</h4>
                    <p className="text-[13px] leading-[1.55] text-text-1">
                      Anomali terdeteksi pada beberapa metrik. Disarankan tidak dilanjutkan.
                    </p>
                    <div className="mt-2 font-mono text-[10.5px] tracking-[0.06em] text-text-3">
                      CONTOH · INFO C
                    </div>
                  </div>
                </article>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CARA KERJA ============ */}
      <section className="py-14 max-[560px]:py-10" id="cara-kerja">
        <div className="container">
          <Reveal className="mb-8 flex items-baseline gap-5">
            <span className="whitespace-nowrap font-mono text-[12px] tracking-[0.12em] text-brass-300">
              II · CARA KERJA
            </span>
            <h2 className="text-[clamp(28px,4vw,40px)] font-normal">
              Tiga babak <em className="italic text-brass-300">persidangan</em>.
            </h2>
            <span
              className="h-px flex-1 bg-[linear-gradient(90deg,var(--line-2),transparent)]"
              aria-hidden="true"
            />
          </Reveal>

          <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
            <Reveal>
              <article className="relative rounded-lg border border-line-1 bg-bg-2 p-6">
                <span className="font-mono text-xs tracking-[1px] text-brass-300">BABAK 01</span>
                <span className="my-4 grid h-11 w-11 place-items-center rounded-md border border-[rgba(217,180,109,0.26)] bg-[rgba(217,180,109,0.1)] text-brass-300">
                  <BuildingIcon size={22} />
                </span>
                <h3 className="mb-2 font-display text-xl font-medium">Lima analis menggali bukti</h3>
                <p className="text-sm leading-[1.6] text-text-1">
                  Setiap angka yang dipakai selalu bersitasi ke endpoint Sectors API.
                </p>
              </article>
            </Reveal>
            <Reveal>
              <article className="relative rounded-lg border border-line-1 bg-bg-2 p-6">
                <span className="font-mono text-xs tracking-[1px] text-brass-300">BABAK 02</span>
                <span className="my-4 grid h-11 w-11 place-items-center rounded-md border border-[rgba(217,180,109,0.26)] bg-[rgba(217,180,109,0.1)] text-brass-300">
                  <ScaleIcon size={22} />
                </span>
                <h3 className="mb-2 font-display text-xl font-medium">
                  Debat dua ronde tayang langsung
                </h3>
                <p className="text-sm leading-[1.6] text-text-1">
                  Jaksa bear vs pembela bull — bukan kotak hitam, semua bisa disimak.
                </p>
              </article>
            </Reveal>
            <Reveal>
              <article className="relative rounded-lg border border-line-1 bg-bg-2 p-6">
                <span className="font-mono text-xs tracking-[1px] text-brass-300">BABAK 03</span>
                <span className="my-4 grid h-11 w-11 place-items-center rounded-md border border-[rgba(217,180,109,0.26)] bg-[rgba(217,180,109,0.1)] text-brass-300">
                  <SparkIcon size={22} />
                </span>
                <h3 className="mb-2 font-display text-xl font-medium">Hakim menulis memorandum</h3>
                <p className="text-sm leading-[1.6] text-text-1">
                  Rangkuman riset final dengan kategori dan konfidensi yang jelas.
                </p>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ CREDIBILITY ============ */}
      <section className="py-14 max-[560px]:py-10">
        <div className="container">
          <Reveal className="mt-8 grid grid-cols-3 gap-6 rounded-lg border border-line-1 bg-bg-1 p-6 max-[1020px]:grid-cols-1 max-[900px]:grid-cols-1">
            <div className="flex items-start gap-4">
              <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-md border border-line-1 bg-[rgba(217,180,109,0.08)] text-brass-300">
                <DatabaseIcon size={19} />
              </span>
              <div>
                <h4 className="mb-1 font-display text-base font-semibold">Setiap angka bersitasi</h4>
                <p className="text-[13px] leading-[1.55] text-text-1">
                  Semua klaim menunjuk ke endpoint Sectors API — bisa diverifikasi ulang.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-md border border-line-1 bg-[rgba(217,180,109,0.08)] text-brass-300">
                <FileIcon size={19} />
              </span>
              <div>
                <h4 className="mb-1 font-display text-base font-semibold">
                  Proses transparan &amp; terarsip
                </h4>
                <p className="text-[13px] leading-[1.55] text-text-1">
                  Debat dan memorandum tersimpan, tidak ada proses yang disembunyikan.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-md border border-line-1 bg-[rgba(217,180,109,0.08)] text-brass-300">
                <ShieldAlertIcon size={19} />
              </span>
              <div>
                <h4 className="mb-1 font-display text-base font-semibold">
                  Tanpa rekomendasi beli/jual
                </h4>
                <p className="text-[13px] leading-[1.55] text-text-1">
                  Hanya kategori riset — keputusan tetap sepenuhnya di tangan Anda.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ JURNAL CTA ============ */}
      <section className="py-14 max-[560px]:py-10" id="jurnal">
        <div className="container">
          <Reveal className="relative overflow-hidden rounded-lg border border-line-1 bg-[linear-gradient(135deg,var(--bg-3),var(--bg-2))] px-8 py-14 text-center before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(600px_300px_at_50%_0%,var(--brass-glow-soft),transparent_70%)] max-[560px]:px-5 max-[560px]:py-8">
            <span className="font-mono text-xs uppercase tracking-[1.5px] text-brass-300">
              Jurnal Sidang
            </span>
            <h2 className="relative mx-auto mt-4 max-w-[20ch] font-display text-[clamp(30px,4.5vw,46px)] font-normal leading-[1.1]">
              Semua putusan <em className="italic text-brass-300">terarsip</em>. Postmortem vs harga kini.
            </h2>
            <p className="relative mx-auto mt-5 max-w-[52ch] text-base text-text-1">
              Setiap perkara yang pernah disidangkan tersimpan rapi. Kembali lagi nanti, bandingkan putusan
              dengan pergerakan harga — dan pelajari di mana risetnya tepat atau meleset.
            </p>
            <Link
              to="/journal"
              className="relative mt-8 inline-flex items-center gap-2.5 rounded-md border border-brass-600 px-[26px] py-3.5 font-mono text-sm tracking-[0.5px] text-brass-200 transition-all hover:border-brass-500 hover:bg-brass-500 hover:text-[#1c1407]"
            >
              Buka Jurnal Sidang
              <ArrowRightIcon size={16} />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}