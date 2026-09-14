import type { en, enCore } from './en';
import { idA } from './parts/id.a';
import { idB } from './parts/id.b';
import { idC } from './parts/id.c';
import { idD } from './parts/id.d';
import { idE } from './parts/id.e';

/** Terjemahan Indonesia.
 *
 * `satisfies typeof en` bukan hiasan: ia yang menolak kunci kurang ATAU
 * berlebih saat `npm run typecheck`, jadi kamus tidak bisa "diam-diam"
 * ketinggalan satu teks pun.
 */
const idCore = {
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
  'nav.disclaimer':
    '<b>Disclaimer GLOBAL No. 10.</b> SIDANG adalah alat bantu riset, bukan rekomendasi investasi. Seluruh putusan, kategori, dan konfidensi merupakan hasil analisis otomatis dari data arsip dan tidak menjamin akurasi prediksi. Harga yang tampil hanya berasal dari arsip sidang — <em>tidak ada harga real-time</em>. Keputusan investasi sepenuhnya tanggung jawab Anda.',

  // -- label enum -----------------------------------------------------------
  'enum.phase.evidence': 'Pengumpulan Bukti',
  'enum.phase.debate': 'Perdebatan',
  'enum.phase.verdict': 'Putusan',

  'enum.agent.fundamental': 'Analisis Fundamental',
  'enum.agent.price': 'Analisis Harga',
  'enum.agent.smartmoney': 'Smart Money',
  'enum.agent.insider': 'Insider',
  'enum.agent.antigorengan': 'Anti-Gorengan',
  'enum.agent.prosecutor': 'Jaksa (Bear)',
  'enum.agent.defender': 'Pembela (Bull)',
  'enum.agent.judge': 'Hakim Ketua',

  'enum.verdict.layak_diteliti_lanjut': 'Layak diteliti lanjut',
  'enum.verdict.perlu_kehati_hatian': 'Perlu kehati-hatian',
  'enum.verdict.red_flag_berat': 'Red flag berat',
  'enum.verdictDoc.layak_diteliti_lanjut': 'Layak diteliti <em>lanjut</em>',
  'enum.verdictDoc.perlu_kehati_hatian': 'Perlu <em>kehati-hatian</em>',
  'enum.verdictDoc.red_flag_berat': 'Red flag <em>berat</em>',

  'enum.error.ticker_not_found': 'Ticker Tidak Dikenal',
  'enum.error.sectors_error': 'Gagal Menghubungi Sumber Data',
  'enum.error.llm_error': 'Hakim Gagal Merumuskan Putusan',
  'enum.error.timeout': 'Sidang Melebihi Batas Waktu',

  'enum.severity.low': 'Rendah',
  'enum.severity.medium': 'Sedang',
  'enum.severity.high': 'Tinggi',

  'enum.direction.akumulasi': 'Akumulasi',
  'enum.direction.distribusi': 'Distribusi',
  'enum.direction.beli': 'Beli',
  'enum.direction.jual': 'Jual',

  'enum.analyst.fundamental.name': 'Fundamental',
  'enum.analyst.fundamental.tagline': 'Laba & valuasi',
  'enum.analyst.price.name': 'Harga',
  'enum.analyst.price.tagline': 'Momentum & volume',
  'enum.analyst.smartmoney.name': 'Smart Money',
  'enum.analyst.smartmoney.tagline': 'Arus institusi',
  'enum.analyst.insider.name': 'Insider',
  'enum.analyst.insider.tagline': 'Transaksi direksi',
  'enum.analyst.antigorengan.name': 'Anti-Gorengan',
  'enum.analyst.antigorengan.tagline': 'Deteksi manipulasi',

  'enum.edge.memegang': 'memegang saham',
  'enum.edge.menjabat': 'menjabat di',
  'enum.edge.aliran': 'jejak transaksi',
  'enum.edge.redflag': 'menandai red flag',
  'enum.edge.fakta': 'menunjuk fakta',
  'enum.edge.bukti': 'dibuktikan oleh',
  'enum.edge.other': 'relasi',

  'enum.nodeType.emiten': 'Emiten',
  'enum.nodeType.pemegang': 'Pemegang Saham',
  'enum.nodeType.orang': 'Orang Kunci',
  'enum.nodeType.aliran': 'Jejak Broker/Institusi',
  'enum.nodeType.redflag': 'Red Flag',
  'enum.nodeType.kabar': 'Bukti Kabar',
  'enum.nodeType.fakta': 'Fakta Angka',

  'enum.richness.A': 'Data kaya',
  'enum.richness.B': 'Data cukup',
  'enum.richness.C': 'Data minim',
  'enum.richness.title': 'Kekayaan informasi: {grade}',
} satisfies typeof enCore;

/** Terjemahan lengkap: inti + bagian per halaman.
 *
 * Kelengkapan diperiksa dua lapis — `idCore` terhadap `enCore`, dan tiap
 * `idX.ts` di parts/ terhadap `enX.ts` pasangannya. Jadi kunci yang kurang di
 * bagian mana pun tetap menggagalkan `npm run typecheck`. */
export const id = { ...idCore, ...idA, ...idB, ...idC, ...idD, ...idE } satisfies typeof en;
