# DESIGN BRIEF — SIDANG (untuk mock pertama di Open Design)

> Untuk: desainer/desainer-AI di Open Design. Output yang diharapkan: mock halaman + `tokens.css` (design tokens) yang bisa di-port ke React.

## 1. Produk

**SIDANG** — "pengadilan saham" IDX. User ketik ticker (mis. `CUAN`) → sidang AI berlangsung secara live & bisa ditonton: 5 analis mengumpulkan bukti data → jaksa (bear) vs pembela (bull) berdebat 2 ronde → hakim mengucap putusan berupa memo riset Bahasa Indonesia.

- Audiens: investor ritel Indonesia muda (milenial/Gen Z), 20+ juta SID — tech-savvy, sensitif ke jujur/tidaknya sebuah produk.
- Rasa yang dicari: **serius tapi sinematik** — menonton sidang berlangsung harus terasa seperti acara yang layak ditonton (ini bahan video demo hackathon).
- Bahasa UI: **Indonesia** (label seperti "Mulai Sidang", "Bukti", "Putusan", "Jurnal Sidang").

## 2. Arah visual (mood)

- **Tema gelap "ruang sidang"**: near-black dengan tekstur halus/gradasi sangat lembut; aksen **kuningan/brass** (bukan neon). Kesan: mahkamah × fintech modern.
- Tipografi: **serif display** untuk judul & putusan (kesan dokumen hukum, contoh Fraunces), **sans** untuk UI (Inter), **mono untuk semua angka & kode endpoint** (JetBrains Mono) — angka harga/PE harus konsisten pakai mono.
- Hierarki lewat tipografi & spasi, bukan warna-warni ramai. Aksen warna terbatas: merah (jaksa), hijau (pembela), kuningan (aksen brand/putusan).
- Micro-interaction halus: status kartu analis berubah (berjalan→selesai), timeline fase, chip bukti muncul — transisi 150–250ms, tanpa yang norak.

## 3. Layar yang dimock (4)

### A. Home / Input Ticker
- Hero singkat: wordmark SIDANG + tagline *"Sebelum beli, aduli dulu."*
- Input ticker besar (mono, uppercase, maks 4 huruf) + tombol **"Mulai Sidang"**.
- Di bawah: teaser "Jurnal Sidang" (3 memo terakhir, kategori putusan sebagai badge).

### B. Courtroom — Live Feed (layar paling penting, ini hero demo)
- Header: ticker + nama perusahaan + badge mode (fixture/live) + indikator fase (Bukti → Debat → Putusan) sebagai stepper.
- **Tahap Bukti**: 5 kartu analis paralel (Fundamental, Harga, Smart Money, Insider, Anti-Gorengan) — tiap kartu: nama, model, status, badge cache hit/miss, chip bukti (headline + angka), lalu rangkuman saat selesai.
- **Tahap Debat**: panel dua kolom — **jaksa merah kiri, pembela hijau kanan**; tiap argumen punya judul, isi, chip sitasi ke bukti, dan penanda ronde (Ronde 1/2) + label "membalas".
- **Tahap Putusan**: memo menyatu di bawah (atau auto-scroll ke MemoView) dengan kesan "diketik" — bisa streaming token.
- Tangani juga state error: "sidang gagal" dengan pesan berbahasa Indonesia yang manusiawi.

### C. Memo (halaman report, bisa di-share)
- Header memo: ticker, nama perusahaan, tanggal, **badge peringkat kekayaan informasi A/B/C** (dengan tooltip penjelasan).
- Kartu putusan (hero): kategori *Layak diteliti lebih dalam / Perlu kehati-hatian / Red flag berat* + confidence bar + rasional singkat.
- **Pertanyaan verifikasi** ditonjolkan (ini pembeda kejujuran produknya) — list bernomor.
- Fakta kunci: tabel bersitasi (angka pakai mono, kolom sumber endpoint).
- Tesis jaksa vs pembela dua kolom bersitasi; temuan smart money & insider; red flags dengan severity (low/medium/high).
- Footer: disclaimer tetap + tabel sumber (endpoint + status cache).

### D. Jurnal Sidang + Post-mortem
- Tabel/daftar memo lama: ticker, tanggal, kategori putusan, badge A/B/C, harga saat sidang.
- Halaman post-mortem: **harga saat memo vs harga sekarang** — Δ% besar (naik hijau/turun merah), "N hari lalu", dan memo aslinya di bawah — kesan "komite yang bisa dipertanggungjawabkan".

## 4. Aturan teknis handoff

- Semua warna/spacing/radius/font dikumpulkan sebagai **design tokens** (CSS variables: color, spacing, radius, font-family, font-size, shadow) — frontend React membaca tokens dari `tokens.css`.
- Nama token harus stabil & deskriptif: `--color-bg`, `--color-surface`, `--color-brass`, `--color-prosecutor`, `--color-defender`, `--font-display`, `--font-ui`, `--font-mono`, dst.
- Fokus di **sistem & konsistensi**, bukan sejumlah besar layar — 4 layar di atas dengan komponen yang dipakai ulang sudah cukup.

## 5. Hindari

- Tampilan template SaaS generik (kartu abu-abu seragam, gradient ungu-biru).
- Emoji sebagai ikon utama (pakai ikon garis halus).
- Copy placeholder bahasa Inggris — pakai Bahasa Indonesia asli (lebih cepat dievaluasi).
- Animasi berlebihan; angka yang tidak mono.