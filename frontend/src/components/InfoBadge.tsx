import type { ReactNode } from 'react';

/** Badge "Info A/B/C" gaya `.b-info` mock — satu implementasi untuk semua halaman.
 *
 * Sebelumnya badge ini tinggal di dalam JournalPage dan diekspor dari sana,
 * sementara Profil Ticker menyalinnya diam-diam ke berkasnya sendiri. Dua
 * definisi yang isinya nyaris sama persis adalah utang: begitu salah satunya
 * diubah, tabel Jurnal dan tabel riwayat ticker menampilkan badge yang berbeda
 * tanpa ada yang menyadarinya.
 *
 * `title` menyimpan grade aslinya (A/B/C), sedangkan isi badge adalah label
 * terbaca seperti "Data kaya" — grade tunggal tidak berarti apa-apa bagi
 * pembaca yang belum tahu konvensinya.
 */
export default function InfoBadge({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[6px] border border-brass-600 bg-[rgba(201,162,74,0.06)] px-[10px] py-[5px] font-mono text-[11px] tracking-[0.3px] text-brass-300"
    >
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-brass-500" aria-hidden="true" />
      {children}
    </span>
  );
}
