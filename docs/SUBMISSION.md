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
- Perhatikan pil mode sidang di bilah perkara: ia muncul hanya kalau backend
  melaporkan `mode=fixture`. Untuk penjurian lebih kuat kalau tidak muncul (artinya
  sidang live), tapi rekaman yang jujur tidak masalah — tentukan sadar, jangan
  tak sengaja. Pil itu kini diturunkan dari mode sidang **yang sebenarnya**
  dilaporkan backend, bukan dari konfigurasi frontend, jadi ia tidak bisa lagi
  bertentangan dengan isi memo (dulu ini bug — Lampiran B.3).
- Kolom cache di tabel Sumber Data kini jujur di ketiga mode (`hit` / `miss` /
  `fixture`), jadi ia boleh disorot di rekaman mana pun.
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

### B.3 DIPERBAIKI: mode fixture kini berlabel `fixture`

Dulu memo mode `fixture` menampilkan tabel audit yang **identik** dengan mode
live — padahal mode fixture **tidak menghubungi Sectors sama sekali dan tidak
menghabiskan kredit apa pun**. Sebabnya `client.py`: setelah membaca fixture,
responsnya tetap ditandai `cache="miss"`, dan tooltip kolom itu berbunyi
*"Diambil langsung dari API Sectors — kredit terpakai"*.

Sekarang labelnya tiga nilai dan ketiganya jujur:

| Label | Arti |
|---|---|
| `hit` | payload sudah pernah dibayar — cache lokal (TTL 7 hari) atau arsip permanen |
| `miss` | **dibeli dari Sectors saat sidang ini** — kredit terpakai |
| `fixture` | data contoh mode demo — tanpa jaringan, 0 kredit |

Badge di ruang sidang dan pil mode di bilah perkara ikut memakai kosakata yang
sama, dan pil mode diturunkan dari `mode` yang **dilaporkan backend** — bukan
dari konfigurasi frontend — sehingga tidak mungkin lagi bertentangan dengan isi
memo. Diuji di `tests/test_api.py` (`tc["cache"] == "fixture"` untuk tiap baris)
dan `tests/test_memo_cites.py` (`test_fixture_trial_never_claims_credits`).

### B.4 DIKOREKSI: 24 kredit terbuang — semuanya untuk hasil yang KOSONG

> **Koreksi.** Versi pertama lampiran ini mengklaim *"22 dari 243 kredit (9%)
> dibayar untuk payload yang identik"* dan menuduh `cache_key` membeli ulang
> data pasar-luas yang sama. **Klaim itu ditarik.** Setelah payload-nya dibuka
> satu per satu, kesamaan hash itu bukan tanda data pasar-luas dibeli ulang —
> melainkan tanda **responsnya kosong**, sehingga semua kosong itu memang
> identik. Menghapus simbol dari `cache_key` tidak akan menghemat apa pun di
> sini; yang bocor adalah panggilan yang memang tidak pernah mengembalikan baris.

Angka yang benar, dari `api_archive` (bukan dari `cache`), per 15 Sep 2026:

| Endpoint | Baris | Payload unik | Kredit terbuang | Isi baris kembar |
|---|---|---|---|---|
| `suspensions` | 12 | **1** | **11** | `results: []`, `total_count: 0` |
| `screener` | 18 | 10 | 8 | semua kembar = `where=symbol in ['X']`, `results: []` |
| `filings` | 12 | 7 | 5 | semua kembar = `results: []` |
| | | | **24** | |

`screener` 12 baris sisanya **unik dan berisi**: itu paginasi seluruh pasar
(`limit=200`, offset 0–800, dengan/tanpa `include_query_values`) yang dipakai
membangun registri emiten. Jadi kredit itu tidak terbuang.

**Temuan sebenarnya lebih tajam daripada klaim lama**, dan ini yang perlu
diselidiki: ketiga endpoint itu dipanggil **per emiten**, dan ketiganya
mengembalikan nol baris untuk **setiap** emiten.

Kasus `screener` sebabnya sudah pasti, dan bukti ada di repo sendiri:
`client.py:662` — kode yang memvalidasi ticker — sudah menulis komentarnya
sendiri, *"The API stores symbols with the .JK suffix (e.g. `BBRI.JK`)"*, dan
karena itu ia mencari `['{sym}','{sym}.JK']`. Arsip mengonfirmasi: baris
pasar-luas mengembalikan `"symbol": "CASS.JK"`. Sedangkan `analysts.py:105`
mencari `where=symbol in ['{ctx.ticker}']` — **tanpa bentuk `.JK`** — sehingga
tidak pernah cocok. Perbaikannya satu baris.

Kasus `suspensions` belum pasti: 12 dari 12 baris kosong (ABBA, BBRI, ACES,
BBCA, ACST, ARTO, TLKM, GOTO, AALI, AADI, AGRO), yang mencurigakan untuk emiten
seperti ACST/ARTO/GOTO. Penyebabnya bisa konvensi `.JK` yang sama, bisa nama
parameter yang berbeda. Memastikannya butuh satu panggilan hidup, jadi belum
dilakukan.

**Konsekuensi untuk klaim produk:** analis Anti-Gorengan saat ini menyumbang
**nol fakta** ke setiap memo di mode live — dan itu termasuk pemeriksaan
suspensi, yang justru diferensiasi yang kita jual (`README.md`, "red flag khas
Indonesia"). Di mode fixture ia tampak bekerja normal, karena fixture-nya
berisi. Ini prioritas tertinggi yang masih terbuka.

### B.5 TEMUAN: kolom Param tidak selalu jujur

Baris `foreign-flow` di audit menulis `period=30d`, tetapi klien
(`client.py:foreign_flow`) mengirim `{}` tanpa parameter sama sekali — dan arsip
mengonfirmasi: **11 baris `foreign_flow`, `params` kosong**. Jadi kolom Param
menampilkan parameter yang tidak pernah dikirim. Kuncinya pun
`foreign_flow:AADI`, tanpa periode.

### B.6 DIPERBAIKI: kolom "Diambil" kini tanggal payload diambil

Dulu `ToolCall` tidak membawa `fetched_at` dari `SectorsResponse`, jadi kolom
"Diambil" selalu diisi `now_iso()` saat sidang berjalan. Bukti dari AADI:

```
audit  /v2/companies/top-changes/   retrieved_at = 2026-09-14 15:37 UTC
arsip  top_movers:…                 fetched_at   = 2026-09-09 20:55 waktu lokal
```

Payload itu **lima hari lebih tua** daripada tanggal yang tertulis di memo.

Sekarang `ToolCall` membawa `fetched_at` dari respons, dan `Citation` mewarisi
pasangan `(cache, retrieved_at)` dari endpoint yang benar-benar menjadi sumber
fakta — bukan lagi `created_at` memo, dan bukan lagi "hit kalau ada satu
endpoint yang hit". Kalau tanggalnya tidak diketahui, baris itu jatuh kembali
ke waktu sidang (dan itu satu-satunya nilai yang jujur). `SectorsResponse.
fetched_at` adalah **tanggal ISO** (`YYYY-MM-DD`), jadi frontend memformatnya
sebagai tanggal, bukan tanggal-waktu. Diuji di
`tests/test_memo_cites.py::test_citations_inherit_the_real_fetch_date_and_cache_label`.

### B.7 Status perbaikan

| # | Temuan | Status |
|---|---|---|
| B.3 | Label `fixture` dibedakan dari `miss` | **selesai** |
| B.6 | `fetched_at` diteruskan ke `ToolCall` + sitasi | **selesai** |
| B.4 | Panggilan per-emiten mengembalikan 0 baris (screener `.JK`, suspensions) | **terbuka** — prioritas tertinggi |
| B.5 | Kolom Param menampilkan `period=30d` yang tidak pernah dikirim | **terbuka** |
| — | Tooltip `hit`: berbunyi *"cache lokal (7 hari)"*, padahal `hit` juga dilayani arsip permanen **tanpa TTL** | **selesai** |

B.4 dan B.5 sengaja tidak dikerjakan: keduanya menyentuh perilaku panggilan API
dan butuh panggilan hidup untuk diverifikasi, jadi menunggu keputusan.

Yang sudah dikerjakan pun bahan video yang kuat: *"kami menemukan label yang
salah dan tanggal yang menyesatkan di alat kami sendiri, lewat audit yang kami
bangun — lalu kami perbaiki di depan Anda."* Itu bukti kedalaman teknis, bukan
klaim.


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
