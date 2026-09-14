import { useEffect, useRef, type ReactNode } from 'react';

/* Blok yang belum tampil, plus cara menampilkannya. Dipakai oleh SATU
   pendengar gulir bersama (bukan satu per blok).

   Kenapa perlu: `IntersectionObserver` hanya melaporkan PERUBAHAN status
   terlihat antar-frame. Lompatan gulir besar — tombol End, drag scrollbar,
   flick roda yang cepat, atau kembali dari riwayat — bisa melewati sebuah
   blok tanpa pernah membuatnya terlihat di frame mana pun, sehingga callback
   "terlihat" tak pernah datang dan blok itu tetap `opacity: 0` selamanya.
   Halaman lalu terlihat seperti berhenti di tengah. Pendengar gulir ini
   menutup celah itu: begitu sebuah blok terlihat ATAU sudah terlewat di atas
   viewport, blok itu ditampilkan. */
const pending = new Map<HTMLElement, () => void>();
let listening = false;

function stopListening() {
  if (!listening) return;
  listening = false;
  window.removeEventListener('scroll', sweep);
  window.removeEventListener('resize', sweep);
}

function sweep() {
  if (pending.size === 0) {
    stopListening();
    return;
  }
  const vh = window.innerHeight;
  // `top < vh` mencakup dua keadaan sekaligus: blok sedang terlihat, dan blok
  // yang sudah terlewat (top negatif). Blok yang masih di bawah viewport
  // (top >= vh) dibiarkan menunggu supaya animasinya tetap terasa.
  pending.forEach((reveal, el) => {
    if (el.getBoundingClientRect().top < vh) reveal();
  });
}

function forget(el: HTMLElement) {
  pending.delete(el);
  if (pending.size === 0) stopListening();
}

function startListening() {
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', sweep, { passive: true });
  window.addEventListener('resize', sweep);
}

export default function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => {
      el.classList.add('is-in');
      forget(el);
    };

    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-in');
      return;
    }

    const reveal = () => {
      if (delay > 0) window.setTimeout(show, delay);
      else show();
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          reveal();
          io.unobserve(en.target);
        });
      },
      // Ambang 0, bukan 0.12: blok yang tingginya lebih dari ~8x viewport
      // tidak akan pernah mencapai rasio 12% sehingga tak pernah tampil.
      { threshold: 0 },
    );

    io.observe(el);
    pending.set(el, reveal);
    startListening();
    sweep(); // blok yang sudah terlihat / sudah terlewat saat komponen dipasang

    return () => {
      io.disconnect();
      forget(el);
    };
  }, [delay]);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
