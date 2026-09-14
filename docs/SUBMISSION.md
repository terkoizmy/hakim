# Submission — Sectors Hackathon Indonesia 2026

Dokumen kerja untuk pengisian formulir submission. Tiap bagian di bawah ini memetakan
satu isian formulir, dengan naskah, alasan, dan catatan produksinya.

**Batas waktu: 30 Sep 2026. Repo freeze total setelah submit.**

---

## 0. Peta bobot juri — baca ini dulu sebelum merekam

| Kriteria | Bobot | Konsekuensi untuk video |
|---|---|---|
| Real-world usability | **40%** | Video harus **mulai dari orangnya**, bukan dari arsitekturnya. Empat puluh persen ada di "apakah saya percaya ini dipakai orang nyata hari ini". |
| Video demo & storytelling | **30%** | Video itu sendiri bernilai 30%. Naskah, tempo, dan kejelasan narasi bukan pelengkap — itu sepertiga skor. |
| Technical depth & execution | **30%** | Orkestrasi custom, tiga analis data-unik-Sectors, sitasi, jurnal post-mortem, repo bersih & runnable. |

Artinya: **video judging harus memakai porsi terbesar untuk kegunaan nyata**, bukan
menghabiskan dua menit pertama menjelaskan graph agen. Kedalaman teknis tetap
dibuktikan, tapi di paruh kedua, dan lewat bukti yang terlihat di layar (tabel audit,
sitasi, post-mortem) — bukan lewat diagram arsitektur.

---

## 1. Repo publik

**Isian:** URL repository publik.

| Syarat | Status |
|---|---|
| Publik | perlu dipastikan saat push |
| Tanpa API key di dalamnya | ✅ diverifikasi — hanya `.env.example` yang terlacak; `.env`, `.env.local`, `.env.development` ada di `.gitignore` |
| Tetap publik ≥90 hari setelah pemenang diumumkan | komitmen, jangan diarsipkan |
| Dibuat di dalam build period (19 Agu–30 Sep 2026) | ✅ |
| Runnable dari nol | ✅ `backend/` (conda env), `frontend/` (npm), `docs/CONTRACT.md` |

**Sebelum push terakhir, jalankan sekali lagi:**

```bash
cd backend && python scripts/verify_contract.py   # bila ada
cd ../frontend && npx tsc --noEmit -p tsconfig.app.json && npm run build
git grep -nE "sk_live|api_key\s*=\s*[\"'][A-Za-z0-9]{8}" -- .   # harus kosong
```

`backend/.env` **tidak boleh** ikut ter-commit dan isinya tidak boleh ditempel ke mana pun.

---

## 2. Item 1 — Problem statement (1 kalimat)

Formulir meminta satu kalimat: **untuk siapa** dan **masalah apa yang dipecahkan**.

**Rekomendasi (pakai ini):**

> SIDANG membantu 20 juta investor ritel Indonesia menguji ide beli sahamnya melalui sidang AI multi-agent berbasis data — sebelum uangnya keluar.

Kalimat ini sudah ada di `IDEA.md` §11 dan bentuknya sudah benar: ada subjek (20 juta
investor ritel), ada masalah (ide beli diuji setelah uang keluar, bukan sebelum), ada
mekanisme (sidang AI multi-agent), ada sumber (data).

**Versi Inggris**, bila formulir lebih nyaman diisi bahasa Inggris:

> SIDANG helps Indonesia's 20 million retail investors stress-test a stock idea through a multi-agent AI trial grounded in real market data — before the money leaves their account.

**Dua alternatif** kalau ingin nada berbeda:

- *Menekankan gorengan:* SIDANG memberi 20 juta investor ritel Indonesia cara memeriksa red flag saham gorengan lewat sidang AI multi-agent — karena riset yang layak selama ini hanya milik institusi.
- *Menekankan ketidakpercayaan pada AI:* SIDANG mengubah rekomendasi saham dari AI menjadi putusan yang bisa diaudit — setiap angka tersitasi ke endpoint Sectors, dan tiap putusan dinilai ulang terhadap harga yang benar-benar terjadi.

Yang **jangan** dipakai: kalimat yang menyebut "AI" sebagai nilainya sendiri. Juri
sudah melihat puluhan proyek AI; yang membedakan SIDANG adalah *perilaku komitenya*.

---

## 3. Item 2 — Track & anggota tim

**Isian:** dropdown track + nama anggota.

- **Track 1: AI Agents & Assistants.** Sudah dikunci di `README.md` dan `IDEA.md` §8.
  Uji kualifikasi trek ini adalah logika agen/orchestrasi buatan sendiri — graph,
  peran, protokol debat semuanya kode sendiri, bukan klien jadi + prompt. Terpenuhi.
- **Anggota tim:** solo (perlu dikonfirmasi saat mengisi formulir).

---

## 4. Item 3 — Video teaser (60 detik, publik)

**Tujuan:** membuat juri *mau* menonton video judging. Bukan ringkasan produk.
Satu kail, satu momen "oh", satu kalimat yang diingat.

**Tesis kreatif:** temanya sudah sinematik dengan sendirinya — ruang sidang. Jangan
melawan itu dengan motion graphic; pakai bahasa visual mahkamah yang sudah ada di
produk (brass, mono, hairline, cap "Disahkan").

### Naskah per detik

| Detik | Narasi (ID) | Visual |
|---|---|---|
| 0–4 | *(tanpa narasi)* | Teks penuh layar di atas hitam: **"Sebelum beli, adili dulu."** |
| 4–12 | "20 juta investor ritel Indonesia. Dominan milenial dan Gen Z. Pengalaman minim, aset kecil." | Angka 20,32 juta muncul; tiga kartu emiten generik diblur di belakang |
| 12–20 | "Riset yang layak cuma milik institusi. Yang tersisa: sinyal beli dari AI, tanpa cara memeriksanya." | Potongan cepat: komentar medsos, grafik liar, badge "suspensi" |
| 20–30 | "SIDANG mengadili emitennya. Lima analis memeriksa bukti nyata — fundamental, harga, smart money, insider, anti-gorengan." | `/trial/…` — feed analis muncul berurutan; tiap analis menyentuh endpoint Sectors |
| 30–40 | "Jaksa dan pembela berdebat dua ronde. Setiap klaim menempel pada endpoint yang memanggilnya." | Chip sitasi menyala → hover satu chip, tooltip nilai muncul |
| 40–51 | "Hasilnya memorandum riset: bukan perintah beli, tapi putusan beserta pertanyaan yang wajib Anda jawab dulu." | `/memo/…` — gulir pelan Ringkasan → Rasional → **Pertanyaan Verifikasi** → Red Flags |
| 51–60 | "Dan SIDANG menilai kembali putusannya sendiri terhadap harga yang benar-benar terjadi." | `/journal/…/postmortem` — kartu audit akurasi + grafik dengan penanda **PUTUSAN**; tutup dengan logo + footer disclaimer terlihat |

**Aturan pengambilan:**
- Maksimal **tiga** halaman. Tur sembilan rute membunuh tempo.
- Jangan tampilkan diagram arsitektur di teaser. Nol.
- Footer disclaimer **wajib** terlihat minimal sekali — ini yang membedakan SIDANG
  dari "AI yang bilang BELI", dan itu poin 40% kegunaan.
- Jangan narasikan sambil menggulir. Rekam visual dulu, narasi ditempel.

---

## 5. Item 4 — Video judging (≤3 menit, publik/unlisted)

**Tujuan:** membuktikan tiga kriteria juri, dalam urutan bobotnya.
Kira-kira: 75 detik kegunaan, 50 detik kedalaman teknis, sisanya pembuka dan penutup.

### Naskah per detik

| Detik | Bagian | Isi dan visual |
|---|---|---|
| 0–20 | **Masalah + untuk siapa** | Buka pada manusia, bukan produk: "Bayangkan pensiunan guru yang menaruh tabungannya di saham karena ikut grup WA." Sebut 20,32 juta investor ritel (+36% YoY), dominan milenial/Gen Z. Satu emiten gorengan nyata sebagai contoh kerugian. |
| 20–45 | **Produk bekerja hari ini** | Masuk `/trial/…` dan **biarkan berjalan**. Tunjukkan lima analis memanggil data nyata, lalu debat jaksa vs pembela. Tekankan: proses berpikirnya diperlihatkan, bukan black box. |
| 45–75 | **Kegunaan nyata (porsi 40%)** | Buka `/memo/…`. Gulir berurutan: Ringkasan Eksekutif → Rasional → **Pertanyaan Verifikasi Wajib Investor** → Red Flags → Fakta Kunci. Kalimat kunci: *"Ini bukan perintah beli. Ini daftar pertanyaan yang harus Anda jawab sebelum uang Anda keluar."* Tunjukkan disclaimer di memo. |
| 75–105 | **Kedalaman teknis (porsi 30%)** | Sorot chip sitasi → tooltip nilai. Lanjut ke tabel **Audit Sumber Data**: setiap panggilan tercatat dengan endpoint, parameter, dan status cache. Sebut disiplin kredit: `hit` = 0 kredit, arsip permanen supaya TTL habis tidak berarti bayar ulang. Sebut tiga analis yang tidak ada di framework AS: Smart Money (cohort broker), Insider filings, Anti-Gorengan (suspensi + free float). |
| 105–140 | **Akuntabilitas (diferensiasi)** | `/journal` → arsip putusan lama, lalu `/journal/…/postmortem`. Tunjukkan sembilan cabang evaluasi ("Tesis Akurat", "Proteksi Berhasil", "Anomali Spekulasi"). Poin yang harus diucapkan: *"Alat ini mempublikasikan kesalahannya sendiri."* |
| 140–165 | **Papan Bukti** | `/board` — jaringan kepemilikan, jejak broker, benang bukti antar node, chat LLM atas papan. Ini pemakaian LLM kedua: untuk penelusuran, bukan putusan. |
| 165–180 | **Penutup** | Tekan saklar **ID → EN** (3 detik) untuk menunjukkan antarmuka dwi-bahasa. Tutup dengan satu kalimat: *"SIDANG. Second opinion terstruktur sebelum kamu menekan tombol beli."* Logo, disclaimer, badge mode data. |

### Yang wajib ada di video judging (checklist)

- [ ] Persona nyata disebut dengan angka (bukan "para investor")
- [ ] Satu emiten nyata sebagai contoh, disebut namanya
- [ ] Sidang berjalan terlihat, bukan potongan-potongan yang dipotong
- [ ] Minimal satu chip sitasi di-hover sampai nilainya terbaca
- [ ] Tabel Audit Sumber Data terlihat
- [ ] Halaman post-mortem terlihat
- [ ] Disclaimer terlihat
- [ ] Saklar bahasa terlihat bekerja

---

## 6. Item 5 — Post media sosial

**Isian:** URL post di Instagram / LinkedIn / Threads / TikTok, **tag akun resmi Sectors**.

**Draf LinkedIn (paling cocok untuk audiens ini):**

> Setiap hari ribuan investor ritel Indonesia menerima sinyal beli dari AI — dan hampir tidak ada yang bisa menjelaskan dari mana angkanya datang.
>
> Kami membangun **SIDANG**: pengadilan saham berbasis multi-agent AI. Kasih satu ticker IDX, lalu lima analis memeriksa bukti dari data Sectors, jaksa dan pembela berdebat, dan hakim merumuskan memorandum riset yang **setiap angkanya tersitasi ke endpoint asalnya**.
>
> Yang membedakannya: SIDANG tidak bilang BELI. Ia memberi putusan, red flags, dan **pertanyaan verifikasi yang wajib Anda jawab sebelum uang Anda keluar**. Dan ia menilai kembali putusan lamanya terhadap harga yang benar-benar terjadi.
>
> Dibangun untuk @sectors Hackathon Indonesia 2026 — Track 1: AI Agents & Assistants.
>
> #SectorsHackathon #AIAgents #PasarModal

**Draf lebih pendek (Threads/TikTok caption):**

> Kami bikin pengadilan untuk saham. Lima analis AI mengumpulkan bukti, jaksa vs pembela berdebat 2 ronde, hakim menjatuhkan putusan — dan tiap angka bisa Anda lacak sampai endpoint asalnya. Bukan "AI bilang BELI". @sectors #SectorsHackathon

**Yang perlu disiapkan:** template thumbnail (IDEA.md menyebut Canva), dan ganti
`@sectors` dengan handle resmi yang diminta formulir.

---

## 7. Lampiran A — Catatan produksi

### URL demo (dua jenis id — mudah tertukar saat merekam)

| Halaman | URL | Catatan |
|---|---|---|
| Sidang | `/trial/tr_f38a2b2626f8` | ticker AADI, putusan `perlu_kehati_hatian`, kekayaan info B |
| Memorandum | `/memo/tr_f38a2b2626f8` | **wajib trial id (`tr_…`)**, bukan memo id |
| Post-mortem | `/journal/mm_43d52af82cc4/postmortem` | **wajib memo id (`mm_…`)**, bukan trial id |
| Jurnal | `/journal` | arsip; 34 sidang tersimpan saat terakhir diperiksa |
| Papan Bukti | `/board` | |
| Profil emiten | `/ticker/AADI` | |

`/memo/mm_…` akan menampilkan panel galat — itu perilaku benar, bukan bug.

### Kredit Sectors

Untuk rekaman, **pakai sidang yang sudah ada di arsip** — nol kredit. Menjalankan
sidang live saat merekam membakar kredit, dan anggaran 1.000 kredit adalah risiko
yang sudah tercatat di `IDEA.md` §9. Kalau memang perlu sidang live, jalankan sebagai
trial terkontrol lebih dulu (di luar rekaman), dengan persetujuan eksplisit, lalu
laporkan total token semua agen.

### Emiten yang dipilih untuk demo

Rekomendasi tiga ticker, masing-masing punya pekerjaan naratif:

1. **Blue chip (mis. BBCA)** — membuktikan produk tidak hanya bekerja pada kasus ekstrem.
2. **Satu emiten ber-red-flag** — di sinilah analis Anti-Gorengan menggigit. Ini momen
   emosional untuk audiens ritel, dan bukti paling kuat untuk kriteria kegunaan 40%.
3. **Satu saham baru/IPO** — menunjukkan kekayaan informasi A/B/C bekerja: data tipis
   diakui sebagai data tipis, bukan ditutupi.

### Teknis

- **Chrome**, viewport 1440×900, ekspor 1080p. Jangan Edge.
- Rekam narasi terpisah (mic terpisah dari screen recording), tempel di edit.
- Perhatikan pil mode data: `LIVE` vs `DEMO`. Rekaman yang jujur itu baik, tapi untuk
  penjurian lebih kuat kalau `LIVE`. Tentukan sadar, jangan tak sengaja.
  **Kalau memakai memo `DEMO`, jangan sorot kolom cache** — di mode itu `miss`
  berarti gratis, padahal tooltip-nya bilang "kredit terpakai" (Lampiran B.3).
- Antarmuka kini dwi-bahasa (default Inggris). Putuskan **satu bahasa untuk mayoritas
  video** — kalau narasinya Indonesia, rekam UI dalam mode ID, lalu sisipkan 3 detik
  perpindahan ke EN sebagai bukti fitur. Mencampur keduanya sepanjang video membingungkan.

---

## 8. Lampiran B — Kenapa tabel audit penuh `miss` (2 hit / 11 miss)

Pertanyaan ini wajar muncul saat demo. Jawaban singkatnya: **11 `miss` itu
normal dan tidak bisa dihindari; yang justru perlu diperbaiki adalah apa yang
diklaim labelnya.**

Angka di bawah diverifikasi langsung dari `backend/data/sidang.db`, sidang
`tr_f38a2b2626f8` (AADI), mode `live`.

### B.0 Angka mentahnya

Satu sidang memanggil **13** endpoint, bukan 11. Widget `2 / 11` itu
`hit / miss` — 2 + 11 = 13.

### B.1 Sebelas `miss` itu SEMUANYA ticker-spesifik

Tidak ada apa pun untuk di-`hit` pada sidang pertama sebuah emiten:

| Endpoint | Param | Kenapa miss |
|---|---|---|
| `/v2/suspensions/` | `symbol=AADI` | per emiten |
| `/v2/company/corporate-actions/AADI/` | — | per emiten |
| `/v2/companies/` (screener) | `where=symbol in ['AADI']` | per emiten |
| `/v2/broker-summary/AADI/` | `start&end` | per emiten **+ bertanggal** |
| `/v2/foreign-flow/AADI/` | *lihat B.5* | per emiten |
| `/v2/daily/AADI/` | `start&end` | per emiten **+ bertanggal** |
| `/v2/company/report/AADI/` | `sections=management,ownership` | per emiten |
| `/v2/filings/` | `symbol=AADI` | per emiten |
| `/v2/company/report/AADI/` | `sections=financials,valuation,…` | param berbeda → kunci berbeda |
| `/v2/financials/quarterly/AADI/` | `n_quarters=4` | per emiten |
| `/v2/company/get-segments/AADI/` | — | per emiten |

`company_report` muncul dua kali sebagai `miss` memang benar: dua `sections`
berbeda menghasilkan dua `cache_key` berbeda, jadi dua payload berbeda.

Dua hal yang membuat `miss` tetap terjaga di sidang berikutnya:

- **Tiga kunci memuat tanggal hari ini** (`daily`, `index-daily`,
  `broker-summary` memakai `_dates()`). Sidang ulang emiten yang sama **besok**
  tetap `miss` pada ketiganya, walaupun TTL cache 7 hari belum habis.
- **`RETRIAL_COOLDOWN` = 7 hari** (`endpoints.py`), jadi memang tidak ada
  sidang ulang dalam jendela cache.

### B.2 Dua `hit` itu tepat dua endpoint pasar-luas yang ada

```
/v2/index-daily/ihsg/          ← pasar-luas
/v2/companies/top-changes/     ← pasar-luas
```

Keduanya ticker-free, sudah dibayar sidang sebelumnya, dan tersedia. Jadi `2/11`
bukan tanda cache gagal — cache bekerja **tepat** pada dua endpoint yang memang
bisa dibagi, dan tidak bisa bekerja pada sebelas yang memang khas emiten.

### B.3 Kalau memo yang Anda lihat mode DEMO, labelnya salah

Ini temuan yang paling penting untuk demo, dan mudah direproduksi: memo `BBCA`
mode `fixture` menampilkan **`2 / 11` yang identik** — padahal mode fixture
**tidak menghubungi Sectors sama sekali dan tidak menghabiskan kredit apa pun**.

Sebabnya `client.py:187`: setelah membaca fixture, responsnya tetap ditandai
`cache="miss"`. Lalu tooltip kolom itu berbunyi *"Diambil langsung dari API
Sectors — kredit terpakai"*. Di mode DEMO kalimat itu tidak benar untuk
kesebelas baris.

Konsekuensi praktis: **rekam video judging dalam mode `LIVE`**, atau kalau
memang memakai memo DEMO, jangan menyorot kolom cache sebagai bukti disiplin
kredit. Jangan sampai juri melihat "kredit terpakai" di memo yang kreditnya nol.

### B.4 TEMUAN: 22 dari 243 kredit (9%) dibayar untuk payload yang identik

`cache_key` memasang simbol ke dalam kunci **meski responsnya tidak bergantung
simbol** (`key = suspensions:ABBA:symbol=ABBA`). Akibatnya data pasar-luas yang
sama dibeli ulang setiap kali ada emiten baru. Dari arsip:

| Endpoint | Diambil | Payload unik | Kredit terbuang |
|---|---|---|---|
| `suspensions` | 11× | **1** | **10** |
| `screener` | 17× | 10 | 7 |
| `filings` | 11× | 6 | 5 |
| | | | **22** |

`suspensions` adalah kasus terjelas: **11 kredit, 1 payload** — hash-nya sama
persis untuk ABBA, BBRI, ACES, BBCA, ACST, ARTO, TLKM, GOTO, AALI, AADI, AGRO.
Kesebelasnya terbukti pembelian nyata (kolom `credits` = 1 di setiap baris,
`fetched_at` tersebar 9–14 Sep), bukan fixture.

### B.5 TEMUAN: kolom Param tidak selalu jujur

Baris `foreign-flow` di audit menulis `period=30d`, tetapi klien
(`client.py:foreign_flow`) mengirim `{}` tanpa parameter sama sekali — dan arsip
mengonfirmasi: **11 baris `foreign_flow`, `params` kosong**. Jadi kolom Param
menampilkan parameter yang tidak pernah dikirim. Kuncinya pun
`foreign_flow:AADI`, tanpa periode.

### B.6 TEMUAN: kolom "Diambil" menunjukkan waktu sidang, bukan waktu data diambil

`ToolCall` tidak membawa `fetched_at` dari `SectorsResponse`, jadi kolom
"Diambil" selalu diisi `now_iso()` saat sidang berjalan. Bukti dari AADI:

```
audit  /v2/companies/top-changes/   retrieved_at = 2026-09-14 15:37 UTC
arsip  top_movers:…                 fetched_at   = 2026-09-09 20:55 waktu lokal
```

Payload itu **lima hari lebih tua** daripada tanggal yang tertulis di memo.
`CONTRACT.md` sudah benar untuk Papan Bukti (`retrievedAt` = tanggal ambil
asli) — tabel Sumber Data di memo belum ikut.

### B.7 Perbaikan yang disarankan

Belum satupun dikerjakan — menunggu keputusan Anda, dan **tidak ada perubahan
backend** dalam scope saat ini.

1. Turunkan simbol dari `cache_key` untuk endpoint pasar-luas (`suspensions`,
   `listed_companies`, `filings` bila memang tidak bergantung simbol).
   Menghemat ~22 kredit per 11 emiten.
2. Bedakan label `fixture` dari `miss` supaya mode DEMO tidak mengaku
   menghabiskan kredit.
3. Teruskan `fetched_at` ke `ToolCall` agar kolom "Diambil" jujur.
4. Rapikan tooltip `hit`: sekarang berbunyi *"tersimpan di cache lokal (7 hari)"*,
   padahal `hit` juga dilayani dari arsip permanen yang **tanpa TTL** dan bisa
   jauh lebih tua dari 7 hari.

Poin 1 dan 2 justru bahan video yang kuat: *"kami menemukan kebocoran kredit —
dan label yang salah — di alat kami sendiri, lewat audit yang kami bangun."*
Itu bukti kedalaman teknis, bukan klaim.


---

## 9. Checklist akhir sebelum submit

- [ ] Repo publik, tanpa API key, history bersih
- [ ] `README.md` menjelaskan cara menjalankan dari nol
- [ ] Teaser 1 menit terunggah **publik**
- [ ] Video judging ≤3 menit terunggah (publik/unlisted)
- [ ] Problem statement 1 kalimat tersalin ke formulir
- [ ] Track = AI Agents & Assistants + anggota tim
- [ ] Post medsos terunggah, akun resmi Sectors ter-tag
- [ ] Formulir tersubmit **pagi hari 30 Sep**, bukan tengah malam
- [ ] Setelah submit: freeze total
