import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
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

// Mock sidang-landing: kepala seksi bernomor romawi + garis gradien.
function SecHead({ num, title }: { num: string; title: React.ReactNode }) {
  return (
    <Reveal className="mb-[44px] flex items-baseline gap-5">
      <span className="whitespace-nowrap font-mono text-[13px] tracking-[1px] text-brass-500">
        {num}
      </span>
      <h2 className="whitespace-nowrap font-display text-[clamp(28px,4vw,40px)] font-normal leading-[1.1] text-text-0">
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
        className="relative overflow-hidden pb-[72px] pt-[88px] before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(201,162,74,0.06),transparent_60%)] max-[560px]:pb-14 max-[560px]:pt-16"
      >
        <div className="container flex flex-col items-center text-center">
          <Reveal className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-pill border border-[#3a332a] bg-[rgba(201,162,74,0.05)] px-4 py-2 font-mono text-[12px] uppercase tracking-[1.5px] text-brass-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brass-500" aria-hidden="true" />
              Multi-Agent · Data Sectors · Bahasa Indonesia
            </span>
            <h1 className="mx-auto mt-[34px] max-w-[16ch] font-display text-[clamp(44px,7vw,84px)] font-normal leading-[1.02] tracking-[-1px] text-text-0">
              Sebelum beli, <em className="italic text-brass-500">aduli</em> dulu.
            </h1>
            <p className="mx-auto mt-[26px] max-w-[56ch] text-[18px] leading-[1.7] text-text-2">
              Lima analis menggali bukti dari data Sectors —{' '}
              <strong className="font-medium text-text-0">jaksa bear</strong> berdebat melawan{' '}
              <strong className="font-medium text-text-0">pembela bull</strong> dalam dua ronde, lalu{' '}
              <strong className="font-medium text-text-0">hakim menulis memorandum riset</strong>.
              Semua tayang, semua tersimpan.
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
                  placeholder="KODE SAHAM"
                  maxLength={4}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Kode saham 4 huruf"
                  autoFocus
                />
              </div>
              <button
                className="btn-primary rounded-[9px] px-[22px] py-[14px] max-[560px]:w-full"
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
              <div className="mt-4 flex items-center gap-2 text-[13.5px] text-[#c96a5a]" role="alert">
                <AlertIcon size={16} />
                <span>{error} — pastikan 4 huruf kode emiten IDX.</span>
              </div>
            )}
            {!validTicker && value.length === 4 && (
              <div className="mt-4 flex items-center gap-2 text-[13.5px] text-[#c96a5a]" role="alert">
                <AlertIcon size={16} />
                <span>Kode harus 4 huruf (contoh: BBCA, CUAN).</span>
              </div>
            )}

            <div className="mt-[26px] flex flex-wrap justify-center gap-7">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-[14px] text-text-2 transition-colors hover:text-brass-300"
              >
                <FileIcon size={15} />
                Lihat Daftar Perkara
              </Link>
              <Link
                to="/journal"
                className="inline-flex items-center gap-2 text-[14px] text-text-2 transition-colors hover:text-brass-300"
              >
                <BookIcon size={15} />
                Jurnal Sidang
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ SHOWCASE ============ */}
      <section className="py-[84px] max-[560px]:py-16" id="putusan">
        <div className="container">
          <SecHead
            num="I · PUTUSAN"
            title={
              <>
                Lihat <em className="italic text-brass-500">produknya</em> dulu.
              </>
            }
          />

          <div className="grid grid-cols-[1.35fr_1fr] items-stretch gap-5 max-[900px]:grid-cols-1">
            <Reveal>
              <article className="relative flex flex-col gap-[18px] overflow-hidden rounded-[14px] border border-[#3a332a] bg-bg-2 p-7 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-[''] before:bg-[linear-gradient(90deg,var(--brass-500),transparent_70%)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-[12px] tracking-[0.5px] text-text-3">
                    PERKARA No. 2024-118 · SEKTOR PERBANKAN
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
                    Layak Diteliti
                  </span>
                  <span className="rounded-[6px] border border-[#3a332a] px-[9px] py-[5px] font-mono text-[12px] tracking-[0.5px] text-text-3">
                    INFO A
                  </span>
                </div>
                <div className="flex items-center gap-3.5">
                  <span className="whitespace-nowrap font-mono text-[12px] tracking-[0.5px] text-text-2">
                    KONFIDENSI
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-pill bg-[#2a251e]">
                    <div className="h-full w-[78%] rounded-pill bg-[linear-gradient(90deg,#9a7a36,#c9a24a)]" />
                  </div>
                  <span className="font-mono text-[14px] font-medium text-brass-300">78%</span>
                </div>
                <div className="flex flex-col gap-[6px] border-t border-[#2a251e] pt-[18px]">
                  <div className="mb-[6px] font-mono text-[11px] uppercase tracking-[1px] text-text-3">
                    Bukti yang dikutip
                  </div>
                  <div className="flex items-start gap-3 py-[3px]">
                    <span className="flex-none pt-0.5 font-mono text-[11px] text-brass-500">[S1]</span>
                    <span className="text-[13.5px] leading-[1.5] text-text-2">
                      Margin bunga bersih stabil di kuartal terakhir, didukung pertumbuhan kredit ritel.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 py-[3px]">
                    <span className="flex-none pt-0.5 font-mono text-[11px] text-brass-500">[S2]</span>
                    <span className="text-[13.5px] leading-[1.5] text-text-2">
                      Rasio NPL terkendali di bawah rata-rata sektor; cadangan memadai.
                    </span>
                  </div>
                  <div className="flex items-start gap-3 py-[3px]">
                    <span className="flex-none pt-0.5 font-mono text-[11px] text-brass-500">[S3]</span>
                    <span className="text-[13.5px] leading-[1.5] text-text-2">
                      Valuasi berada di kisaran historis, tanpa lonjakan volume yang mencurigakan.
                    </span>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap justify-between gap-3 border-t border-[#2a251e] pt-4">
                  <span className="font-mono text-[11.5px] tracking-[0.5px] text-text-3">
                    DITULIS OLEH HAKIM · 2 RONDE DEBAT
                  </span>
                  <span className="font-mono text-[11.5px] tracking-[0.5px] text-text-2">
                    ARSIP TERBUKA
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
                      Layak Diteliti
                    </h4>
                    <p className="text-[13.5px] leading-[1.55] text-text-2">
                      Bukti seimbang, fundamental sehat. Masuk daftar pantau untuk riset lanjutan.
                    </p>
                    <div className="mt-2 font-mono text-[11px] tracking-[0.5px] text-text-3">
                      CONTOH · TLKM · INFO A
                    </div>
                  </div>
                </article>
              </Reveal>
              <Reveal>
                <article className="flex items-start gap-4 rounded-[14px] border border-[#3a332a] bg-bg-2 p-[22px] transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brass-600">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-[#d9a441]" />
                  <div>
                    <h4 className="mb-1 font-display text-[18px] font-medium text-text-0">
                      Perlu Kehati-hatian
                    </h4>
                    <p className="text-[13.5px] leading-[1.55] text-text-2">
                      Ada sinyal campur — pertumbuhan ada, tapi risiko terukur. Perlu verifikasi.
                    </p>
                    <div className="mt-2 font-mono text-[11px] tracking-[0.5px] text-text-3">
                      CONTOH · GOTO · INFO B
                    </div>
                  </div>
                </article>
              </Reveal>
              <Reveal>
                <article className="flex items-start gap-4 rounded-[14px] border border-[#3a332a] bg-bg-2 p-[22px] transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brass-600">
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-[#c96a5a]" />
                  <div>
                    <h4 className="mb-1 font-display text-[18px] font-medium text-text-0">
                      Red Flag
                    </h4>
                    <p className="text-[13.5px] leading-[1.55] text-text-2">
                      Anomali terdeteksi pada beberapa metrik. Disarankan tidak dilanjutkan.
                    </p>
                    <div className="mt-2 font-mono text-[11px] tracking-[0.5px] text-text-3">
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
      <section className="py-[84px] max-[560px]:py-16" id="cara-kerja">
        <div className="container">
          <SecHead
            num="II · CARA KERJA"
            title={
              <>
                Tiga babak <em className="italic text-brass-500">persidangan</em>.
              </>
            }
          />

          <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
            <Reveal>
              <article className="relative rounded-[14px] border border-[#3a332a] bg-bg-2 p-7">
                <span className="font-mono text-[12px] tracking-[1px] text-brass-500">BABAK 01</span>
                <span className="mb-4 mt-[18px] block w-[44px] text-brass-300">
                  <SparkIcon size={40} />
                </span>
                <h3 className="mb-2 font-display text-[20px] font-medium text-text-0">
                  Lima analis menggali bukti
                </h3>
                <p className="text-[14px] leading-[1.6] text-text-2">
                  Setiap angka yang dipakai selalu bersitasi ke endpoint Sectors API.
                </p>
              </article>
            </Reveal>
            <Reveal>
              <article className="relative rounded-[14px] border border-[#3a332a] bg-bg-2 p-7">
                <span className="font-mono text-[12px] tracking-[1px] text-brass-500">BABAK 02</span>
                <span className="mb-4 mt-[18px] block w-[44px] text-brass-300">
                  <ScaleIcon size={40} />
                </span>
                <h3 className="mb-2 font-display text-[20px] font-medium text-text-0">
                  Debat dua ronde tayang langsung
                </h3>
                <p className="text-[14px] leading-[1.6] text-text-2">
                  Jaksa bear vs pembela bull — bukan kotak hitam, semua bisa disimak.
                </p>
              </article>
            </Reveal>
            <Reveal>
              <article className="relative rounded-[14px] border border-[#3a332a] bg-bg-2 p-7">
                <span className="font-mono text-[12px] tracking-[1px] text-brass-500">BABAK 03</span>
                <span className="mb-4 mt-[18px] block w-[44px] text-brass-300">
                  <FileIcon size={40} />
                </span>
                <h3 className="mb-2 font-display text-[20px] font-medium text-text-0">
                  Hakim menulis memorandum
                </h3>
                <p className="text-[14px] leading-[1.6] text-text-2">
                  Rangkuman riset final dengan kategori dan konfidensi yang jelas.
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
                  Setiap angka bersitasi
                </h4>
                <p className="text-[13.5px] leading-[1.55] text-text-2">
                  Semua klaim menunjuk ke endpoint Sectors API — bisa diverifikasi ulang.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[9px] border border-[#3a332a] text-brass-500">
                <FileIcon size={19} />
              </span>
              <div>
                <h4 className="mb-[5px] font-display text-[17px] font-medium text-text-0">
                  Proses transparan &amp; terarsip
                </h4>
                <p className="text-[13.5px] leading-[1.55] text-text-2">
                  Debat dan memorandum tersimpan, tidak ada proses yang disembunyikan.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[9px] border border-[#3a332a] text-brass-500">
                <ShieldAlertIcon size={19} />
              </span>
              <div>
                <h4 className="mb-[5px] font-display text-[17px] font-medium text-text-0">
                  Tanpa rekomendasi beli/jual
                </h4>
                <p className="text-[13.5px] leading-[1.55] text-text-2">
                  Hanya kategori riset — keputusan tetap sepenuhnya di tangan Anda.
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
              Jurnal Sidang
            </span>
            <h2 className="relative mx-auto mt-[18px] max-w-[20ch] font-display text-[clamp(30px,4.5vw,46px)] font-normal leading-[1.1] text-text-0">
              Semua putusan <em className="italic text-brass-500">terarsip</em>. Postmortem vs harga kini.
            </h2>
            <p className="relative mx-auto mt-5 max-w-[52ch] text-[16px] text-text-2">
              Setiap perkara yang pernah disidangkan tersimpan rapi. Kembali lagi nanti, bandingkan putusan
              dengan pergerakan harga — dan pelajari di mana risetnya tepat atau meleset.
            </p>
            <Link
              to="/journal"
              className="relative mt-8 inline-flex items-center gap-2.5 rounded-[9px] border border-brass-600 px-[26px] py-[14px] font-mono text-[14px] tracking-[0.5px] text-brass-300 transition-all hover:border-brass-500 hover:bg-brass-500 hover:text-[#14120f]"
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

/** Ikon sparkle kecil untuk item kredibilitas pertama. */
function DatabaseIconWrap() {
  return <SparkIcon size={19} />;
}