# Prompt Redesign SIDANG — per halaman (untuk OpenDesign)

Cara pakai: tempel **blok GLOBAL** + **blok halaman** yang mau didesain.
Semua copy harus Bahasa Indonesia.

**Status (9 Sep 2026):**
- ✅ Halaman 1 (Landing `/`) — SUDAH didesain & diimplementasikan di
  `frontend/src/pages/HomePage.tsx`. Jadikan itu **referensi gaya**;
  jangan didesain ulang.
- ⬜ Sisanya (2–7) menunggu redesign — prioritaskan 4 (ruang sidang) dan
  5 (memorandum).
- Karena migrasi Tailwind sudah selesai, implementasi langsung di repo:
  baca `docs/OPENDESIGN-FE-DOC.md` untuk aturan teknis, konvensi class,
  dan batasan file yang boleh diubah.

---

## GLOBAL — Design System (tempel di setiap prompt)

```text
Konteks produk: SIDANG — "pengadilan saham" IDX. Pengguna memasukkan kode
saham 4 huruf, 5 agen AI (analis) mengumpulkan bukti dari API Sectors, jaksa
(bear) berdebat 2 ronde melawan pembela (bull), hakim menulis memorandum
riset. Nada visual: ruang sidang yang serius, tenang, terpercaya.

Design system (ikuti, jangan diubah):
- Tema gelap: latar charcoal berlapis (#14181d / #191f26 / #20262e),
  garis hairline halus (rgba putih 6–10%), aksen utama kuningan/brass
  (#d9b46d, #b9944e), aksen samping: merah jaksa (#d9483b),
  hijau pembela (#4cc98f), biru data (#4f8fe8), ungu insider (#9e81ff).
- Font: display = Fraunces (serif, judul), teks = Inter, angka/kode =
  JetBrains Mono. Radius sedang (8–14px), TANPA shadow lembut di tiap kartu
  (pakai border hairline, bukan drop shadow).
- Konsep struktur: dokumen persidangan — stempel, garis arsip, nomor perkara,
  bukan dashboard SaaS.

ATURAN ANTI-"AI-LOOK" (wajib, pelanggaran = gagal):
1. TANPA panah "→" pada tombol atau link. Tombol hanya teks kerja aktif.
2. TANPA label eyebrow ALL-CAPS berjarak di atas heading.
3. TANPA meta-string pakai titik tengah "A · B · C".
4. TANPA aksen warna/gradient pada satu frasa di dalam judul — judul satu warna.
5. TANPA animasi fade-up berjenjang per kartu; maksimal satu momen animasi
   per halaman. Motion hanya untuk menunjukkan perubahan state.
6. Copy sesingkat mungkin: kalimat informasi, bukan kalimat jualan.
   Tanpa kata marketing ("jujur", "milik Anda", "dipertanggungjawabkan").
7. Kartu tidak semua sama: variasikan hierarki (ada yang menonjol, ada yang
   tipis). Jangan pemotongan konten jadi kartu identik berjajar.
8. Tanpa emoji; ikon garis tipis (stroke 1.5) hanya bila menambah makna.
9. TANPA harga real-time di mana pun. Harga hanya muncul dari arsip sidang
   (harga saat putusan / grafik harga sejak memo).
10. Footer/disclaimer wajib tampil: "alat bantu riset, bukan rekomendasi
    investasi".
```

---

## 1. Landing page — `/`

```text
Desain landing page tunggal untuk SIDANG (konteks: blok GLOBAL).

Isi halaman, urut dari atas:
1. HERO dua kolom: kiri — judul serif besar "Sebelum beli, aduli dulu."
   (satu warna ivory), sub 1–2 kalimat: "Lima analis menggali bukti dari
   data Sectors. Jaksa dan pembela berdebat dua ronde, lalu hakim
   menuliskan putusannya — terbuka dari awal sampai akhir." Dua tombol
   sekunder: "Lihat daftar perkara", "Jurnal sidang". Satu baris kecil
   di bawahnya: "Tiap angka bersitasi ke sumber datanya. Bukan rekomendasi
   investasi."
   Kanan — panel "SIDANG KILAT": stempel bergaya cap kantor bertuliskan
   SIDANG KILAT, input 4 huruf kode saham (placeholder BBCA), counter
   "0/4 · huruf besar otomatis", tombol primer "Mulai sidang", catatan
   "± 3 menit".
2. Bagian "Alur sidang": 3 kartu TIDAK IDENTIK (variasikan hierarki):
   - "Bukti dikumpulkan" — lima analis meneliti fundamental, harga, arus
     dana, insider, dan cek gorengan dari data Sectors.
   - "Dua pihak berdebat" — jaksa mencari jalur kegagalan, pembela
     menahannya. Dua ronde, tayang langsung.
   - "Hakim memutus" — kategori riset, alasannya, dan pertanyaan verifikasi
     yang Anda jawab sendiri.
3. Satu baris CTA jurnal: "Semua putusan terarsip — bandingkan memorandum
   lama dengan harga hari ini." + tombol "Buka jurnal".
4. Footer disclaimer GLOBAL no. 10.

Yang membuat halaman ini khas (pilih SATU ide kuat, sisanya tenang):
stempel/cap kantor persidangan atau nomor perkara sebagai motif visual.
```

## 2. Dashboard "Berkas Perkara" — `/dashboard`

```text
Desain halaman daftar emiten (konteks: blok GLOBAL). Ini halaman kerja
utama: pengguna memilih emiten lalu memulai sidang.

Isi:
1. Header ringkas: judul serif "Berkas Perkara" + satu kalimat: "Semua
   emiten terdaftar IDX — klik baris untuk membuka berkas, lalu adili."
   + kolom pencarian (placeholder "Cari kode atau nama emiten…").
2. TABEL screener dominan (bukan grid kartu): kolom Ticker, Emiten,
   Putusan Terakhir (badge kategori: hijau "Layak diteliti lanjut" /
   kuningan "Perlu kehati-hatian" / merah "Red flag berat"), Jml Sidang,
   Terakhir Diadili, Harga Saat Sidang (Rp, mono). Baris bisa diklik
   (hover: latar nyaris tak terlihat). Baris tanpa sidang: "Belum diadili".
3. Panel sempit samping (opsional bila ada data): "Sidang terakhir" —
   4 baris terakhir: badge putusan + ticker, klik membuka memorandum.
4. Footer disclaimer GLOBAL no. 10.

Nuansa: tabel arsip perkara — rapat, hairline, angka mono rata kanan.
Tanpa sparkline, tanpa harga real-time.
```

## 3. Detail emiten — `/ticker/:ticker`

```text
Desain halaman berkas satu emiten (konteks: blok GLOBAL).

Isi:
1. Crumb kembali "← Daftar Perkara". Judul: ticker mono besar (mis. BBCA)
   + nama emiten + badge putusan terakhir + badge kekayaan data
   (Info A/B/C). Satu baris: "Harga saat putusan terakhir: Rp X · tanggal".
2. Tombol primer "Buka sidang" (mulai sidang baru untuk ticker ini).
3. Kartu grafik "Perjalanan harga": line chart harga sejak memo terakhir
   (garis brass tipis, label min/max mono kecil, tanpa grid padat). Bila
   data kurang dari 2 titik: pesan netral "Seri harga belum tersedia —
   butuh setidaknya dua sidang untuk ticker ini."
4. Tabel "Riwayat Persidangan": Tanggal, Putusan (badge), Kekayaan Data
   (Info A/B/C), Harga Saat Sidang, link "Memo" dan "Post-mortem".
5. Empty state bila ticker belum pernah diadili: satu kartu tenang yang
   mengundang "Buka sidang".
6. Footer disclaimer GLOBAL no. 10.

Nuansa: berkas dossie satu terdakwa — identitas kuat di atas, data tenang
di bawah.
```

## 4. Ruang sidang live — `/trial/:trialId`

```text
Desain halaman sidang berlangsung (konteks: blok GLOBAL). Halaman paling
penting: menampilkan proses multi-agen secara transparan.

Isi, urut:
1. Bar kasus: segel gavel + ticker besar + badge nama emiten + nomor
   perkara mono + 4 stat kecil (Bukti, Analis 0/5, Data hit/miss, Durasi).
2. Stepper 3 fase horizontal: Pengumpulan Bukti → Perdebatan → Putusan,
   dengan penanda ronde saat debat.
3. PANEL ANALIS: 5 kartu (Fundamental, Harga, Smart Money, Insider,
   Anti-Gorengan), masing-masing warna aksen sendiri (kuningan, biru,
   hijau, ungu, merah). Tiap kartu: avatar ikon dengan titik status di
   pojok (abu = menunggu, kuning berdenyut = menyelidiki, hijau = selesai),
   tagline 4–6 kata, daftar bukti sebagai BARIS RINGKAS SATU KALIMAT
   (id EV_1 + judul terpotong) yang BISA DIKLIK untuk membuka detail +
   pill fakta (angka mono + label). Kartu menunggu: border dashed.
   Kartu selesai: baris "Ringkasan — N bukti" + badge Info A/B/C +
   fold "Baca kesimpulan".
4. PERDEBATAN: podium dua kolom (Jaksa merah "tesis bear" VS Pembela hijau
   "tesis bull"), penanda "RONDE 1/2", ucapan bergantian: chip speaker
   pendek "JAKSA · bear", judul argumen maks 6 kata, isi maks 3 kalimat
   atau 3 bullet, chip sitasi EV_x yang menunjuk bukti di panel analis.
   Balasan diberi tanda "↩ balasan".
5. PUTUSAN: teks memorandum mengetik live (efek mesin tik halus) di bawah
   segel hakim.
6. Saat memo final: banner "Memorandum sidang telah final." + tombol
   "Baca memorandum".
7. Footer disclaimer GLOBAL no. 10.

Nuansa: ruang sidang yang hidup — status agen terlihat tanpa hiruk-pikuk.
Animasi hanya pada perubahan state (titik berdenyut, progres bar), bukan
entrance berjenjang.
```

## 5. Memorandum — `/memo/:trialId`

```text
Desain halaman dokumen putusan (konteks: blok GLOBAL). Ini DOKUMEN —
nuansa kertas resmi, bukan dashboard.

Isi, urut:
1. Kepala memo: id mono + badge mode data + ticker besar + nama emiten +
   "Disahkan <tanggal>" + badge kekayaan data Info A/B/C.
2. HERO PUTUSAN menonjol: segel, label kecil "Putusan Komite" (boleh
   all-caps HANYA di sini sebagai stempel), kategori besar (Layak diteliti
   lanjut / Perlu kehati-hatian / Red flag berat), bar konfidensi %.
3. Ringkasan Eksekutif — satu paragraf.
4. Dua kolom: Rasional putusan | "Wajib Anda jawab sebelum berinvestasi"
   (list bernomor pertanyaan verifikasi).
5. Tabel "Fakta Kunci": id sitasi (f_1), label metrik, nilai (mono),
   per tanggal, endpoint sumber (mono kecil). Tabel tenang, hairline.
6. "Tesis Berhadapan": dua kartu — Jaksa (Bear) merah vs Pembela (Bull)
   hijau; poin argumentasi bersitasi f_x; sitasi ditampilkan sebagai chip
   yang ber-hover menampilkan nilainya.
7. Arus Smart Money & Insider: dua kolom daftar dengan badge arah
   (akumulasi/distribusi, beli/jual).
8. Red Flags: daftar dengan badge severity (tinggi/sedang/rendah).
9. Tabel "Sumber Data": endpoint Sectors, param, cache hit/miss, waktu
   diambil.
10. Disclaimer GLOBAL no. 10 sebagai blok penutup.

Nuansa: memorandum diketik di atas kertas arsip — tipografi membawa
hierarki, bukan kotak-kotak kartu identik.
```

## 6. Jurnal — `/journal`

```text
Desain halaman arsip sidang (konteks: blok GLOBAL).

Isi:
1. Judul "Jurnal Sidang" + satu kalimat: "Semua putusan yang pernah
   diputuskan komite, terarsip."
2. Tabel arsip: Tanggal, Ticker, Emiten, Putusan (badge), Kekayaan Data,
   Harga Saat Sidang, aksi: link "Memo" dan "Post-mortem". Baris rapat,
   angka mono.
3. Empty state: "Belum ada sidang." + tombol ke landing.
4. Footer disclaimer GLOBAL no. 10.
```

## 7. Post-mortem — `/journal/:memoId/postmortem`

```text
Desain halaman evaluasi putusan (konteks: blok GLOBAL). Pertanyaan yang
dijawab halaman ini: "setelah sidang, harga bergerak ke mana?"

Isi:
1. Kepala: kembali ke jurnal, ticker + tanggal putusan + badge putusan.
2. Grafik harga utama: garis harga sejak tanggal memo, dengan PENANDA
   vertikal di tanggal putusan + label harga saat itu; area setelah
   penanda diberi penekanan halus (bukan warna bar baru yang ramai).
   Label min/max mono kecil.
3. Baris ringkas: harga saat putusan, harga terakhir, selisih % (mono,
   merah bila turun / hijau bila naik — hanya angka, tanpa kata jualan).
4. Kartu putusan lama (ringkas): kategori + alasan satu paragraf +
   chip pertanyaan verifikasi.
5. Disclaimer GLOBAL no. 10.

Nuansa: jurnal pengadilan yang menutup perkara — evaluatif, tidak
membela diri.
```

---

## Catatan pemakaian

- Prompt 4 (ruang sidang) dan 5 (memorandum) adalah halaman penilaian
  hackathon — prioritaskan keduanya bila waktu terbatas.
- Setelah dapat desain, jangan campur gaya lama & baru di satu halaman:
  satu pass penuh per halaman.
- Data apa pun yang tidak ada di prompt (harga real-time, prediksi, target
  harga) MEMANG tidak ada di produk — jangan tambahkan demi kelengkapan.