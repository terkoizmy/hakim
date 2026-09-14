import type { en } from './en';

/** Terjemahan Indonesia.
 *
 * `satisfies typeof en` bukan hiasan: ia yang menolak kunci kurang ATAU
 * berlebih saat `npm run typecheck`, jadi kamus tidak bisa "diam-diam"
 * ketinggalan satu teks pun.
 */
export const id = {
  'meta.title': 'SIDANG — Sidang Pasar Modal Indonesia',
  'meta.description':
    'Sebelum beli, aduli dulu. Multi-agent AI meneliti saham IDX: debat jaksa vs pembela di atas data Sectors, putusan komite 5 menit.',

  'nav.brand': 'SIDANG — Beranda',
  'nav.aria': 'Navigasi utama',
  'nav.dashboard': 'Berkas Perkara',
  'nav.board': 'Papan Detektif',
  'nav.journal': 'Jurnal',
  'nav.cta': 'Berkas Perkara',
  'nav.langLabel': 'Bahasa',
  'nav.langSwitchTo': 'Tampilkan antarmuka dalam {lang}',
  'nav.badgeFixture': 'Data fixture — tidak memakai kredit API',
  'nav.badgeLive': 'Terhubung ke data Sectors',
  'nav.disclaimer':
    '<b>Disclaimer GLOBAL No. 10.</b> SIDANG adalah alat bantu riset, bukan rekomendasi investasi. Seluruh putusan, kategori, dan konfidensi merupakan hasil analisis otomatis dari data arsip dan tidak menjamin akurasi prediksi. Harga yang tampil hanya berasal dari arsip sidang — <em>tidak ada harga real-time</em>. Keputusan investasi sepenuhnya tanggung jawab Anda.',
} satisfies typeof en;
