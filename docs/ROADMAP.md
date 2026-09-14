# ROADMAP — Catatan Pengerjaan ke Depan

> Ditulis 2026-09-10 oleh orkestrator, atas masukan pemilik proyek.
> Referensi: `docs/CONTRACT.md` (schema 1.2.3), `sectors-docs-digest.md` (biaya endpoint),
> `backend/app/sectors/client.py` (aturan kredit).

---

## 1. Kebijakan penyimpanan data API Sectors — **JAWABAN: ya, arsipkan semua panggilan yang terhit kredit**

### Situasi sekarang

| Lapisan | Status | Masa hidup |
|---|---|---|
| `cache` (SQLite) | payload RAW semua panggilan Sectors | TTL 7 hari (`cache_ttl_days`), lalu **dibuang saat dibaca ulang** |
| `tickers` | registry emiten + sektor | permanen, ter-backfill tiap refresh |
| `memos.tool_calls` | ringkasan panggilan (endpoint + params + hit/miss) | permanen, tapi **tanpa payload** |

Artinya: data yang sudah **dibayar kreditnya** hilang setelah TTL habis. Ini boros —
data lama tetap bernilai untuk postmortem, tren antar-sidang, dan Papan Bukti (poin 2).

### Keputusan

**Semua payload Sectors yang terhit kredit diarsipkan permanen** (append-once, tidak
pernah dibuang). Cache tetap jadi lapisan baca utama (data segar); arsip adalah
lapisan historis + cadangan saat cache kosong.

### Rancangan teknis (usulan)

```sql
CREATE TABLE IF NOT EXISTS api_archive (
  cache_key  TEXT PRIMARY KEY,   -- sama dengan kunci cache → deduplikasi gratis
  endpoint   TEXT NOT NULL,      -- nama logis: company_report, screener, dst.
  symbol     TEXT,               -- emiten bila ada (None untuk screener registry)
  params     TEXT,               -- query string ringkas
  payload    TEXT NOT NULL,      -- JSON RAW dari API
  fetched_at REAL NOT NULL,      -- epoch
  credits    INTEGER NOT NULL DEFAULT 1
);
```

- Titik sentuh **satu tempat saja**: `SectorsClient._http_get()` di `client.py` —
  setiap respons live 2xx ditulis ke `api_archive` sebelum/bersama `cache_set()`.
  Fixture mode dan cache hit tidak menyentuh arsip (0 efek ke test).
- Endpoint baca (nanti): `GET /api/archive?symbol=&endpoint=` untuk inspeksi.
- **Efek ke kredit: NOL** — arsip menyalin data yang sama, tidak ada panggilan baru.

### Aturan manajemen kredit (berlaku untuk semua fitur baru)

1. Semua panggilan **wajib lewat `client.py`** (cache-first otomatis) — dilarang
   memanggil Sectors langsung dari evidence/endpoint lain.
2. Screener selalu `where=` (1 kredit), **tidak pernah** `q=` (3 kredit).
3. Company report selalu `sections` eksplisit — tidak pernah default 8 seksi (8 kredit).
4. Sidang ulang emiten terikat cooldown 7 hari (kontrak 1.2.2) = batas alami refresh.
5. **Estimasi kredit ditulis di deskripsi fitur sebelum implementasi**; fitur yang bisa
   hidup dari arsip/cache = prioritas.
6. Probe live (uji perilaku API) 1–2 kredit dianggap wajar, tapi lapor dulu.

---

## 2. Fitur baru: **Papan Bukti Detektif** (Detective Investigation Board)

### Konsep (dari pemilik proyek, 2026-09-10)

Halaman bertema papan investigasi detektif: foto/catatan bukti saling terhubung dengan
**garis benang merah interaktif**. Klik satu bukti → panel detail berisi informasi
lengkap emiten tersebut. Analogi: knowledge-graph ala RAG — node informasi relevan
terhubung satu sama lain.

> Contoh alur: saham A → pemegangnya orang X, Y, Z → klik orang X → muncul bukti
> terkait dia, termasuk ternyata dia juga memegang emiten B → dst.
> Sketsa desain menyusul; sementara ini spesifikasi fungsional saja.

### Scope MVP

- **Sumber emiten**: yang sudah diadili dengan verdict
  `layak_diteliti_lanjut` / `perlu_kehati-hatian` (dari jurnal). `red_flag_berat`
  bisa menyusul sebagai mode "papan waspada".
- **Tipe node (usulan)**:
  - `Emiten` (ticker + verdict + harga saat sidang)
  - `Pemegang Saham` (major shareholder, % kepemilikan)
  - `Orang Kunci` (direksi/komisaris dari section `management`)
  - `Red Flag` (dari memo), `Temuan Smart Money` (akumulasi/distribusi broker)
  - `Bukti Kabar` (headline berita dari `/v2/news/` — filter per symbol/sector/tags/
    keyword, est. 1 kredit/panggilan, perlu 1 probe; resep-contoh FinArena memang
    punya endpoint ini tapi tidak pernah memakainya → pembeda kita)
  - `Penghentian` (suspension dari `/v2/suspensions/` — kandidat "pin merah" papan)
  - `Fakta Angka` (key_facts memo — PE, ROE, dsb.)
- **Tipe edge**: `memegang saham` (%), `menjabat di`, `menandai red flag`,
  `mendukung argumen` (bull/bear), `aktifitas broker net`.
- **Interaksi**: klik node → panel samping detail lengkap (fakta + angka + sumber
  endpoint + tanggal ambil); node pemegang saham → highlight semua emiten lain yang
  juga dia pegang (benang merah menyala).
- **Library**: `@xyflow/react` (react-flow v12) — tambahan dependency baru di frontend;
  dukung panzoom, edge bergaya "benang" (dash animasi), dan node custom bertema
  dark-brass SIDANG.

### Data pemegang saham — **BISA, dua sumber**

| Sumber | Biaya | Isi | Catatan |
|---|---|---|---|
| Company report `sections=management,ownership` | **0** (sudah ditarik di setiap sidang, 2 kredit) | major shareholders + %, direksi/komisaris | cukup untuk emiten yang pernah diadili — tinggal arsipkan (poin 1) |
| Screener fields `major_shareholders_name`, `major_shareholders_share_percentage`, `executives_shareholdings_*` | 1 kredit per query `where=` | hubungan lintas emiten: "si X juga pegang emiten B" tanpa mengadili B | field list-of-objects (any-match); **butuh 1 probe live** untuk verifikasi bentuk respons sebelum dipakai |

Implikasi penting: **papan bukti untuk emiten yang sudah diadili = 0 kredit tambahan**
selama data ownership trial diarsipkan. Graf lintas emiten (hubungan antar pemegang)
butuh probe screener + beberapa panggilan `where=` yang dikelompokkan (batch) per
pemegang teratas — estimasi ≤ 10 kredit untuk MVP, hanya sekali, lalu cache/arsip.

### Rancangan teknis (usulan)

- **Backend**: tabel arsip (poin 1) + endpoint baru
  - `GET /api/board` → daftar emiten tersidang untuk pilihan papan
  - `GET /api/board/{ticker}` → `{nodes: [...], edges: [...]}` dibangun dari:
    memo (key_facts, red_flags, smart_money, insider) + arsip ownership/management
    (+ opsional hasil screener-shareholder yang diarsipkan).
  - Kontrak naik ke **1.3.0** (endpoint baru, additive).
- **Frontend**: route `/papan-bukti` (masuk nav), page baru `InvestigationBoardPage.tsx`,
  node/edge renderer react-flow, panel detail. Angka pakai format memo yang ada.
- **Fallback**: emiten belum diadili → tampil kartu "belum ada bukti — adili dulu".

### Urutan pengerjaan yang disarankan

1. Arsip `api_archive` (fondasi, 0 kredit) — poin 1.
2. `GET /api/board` dari memo + arsip ownership untuk 1 emiten (BBCA sebagai demo).
3. Page react-flow MVP dengan data emiten tunggal.
4. Probe screener shareholder lintas emiten (1–2 kredit) → graf antar-emiten.
5. Panel detail + polish visual (menunggu sketsa desain pemilik proyek).

---

### Layout halaman (sketsa pemilik proyek, 2026-09-10 — `sketch-analisis-page.png`)

```
┌─────────┬──────────────────────────────┬──────────────┐
│ daftar  │  PAPAN BUKTI DETEKTIF        │ detail       │
│ emiten  │  (react-flow + benang)       │ informasi    │
├─────────┼──────────────────────────────┤ node         │
│ FILTER  │  AI Agent chat soal emiten   ├──────────────┤
│ &LEGENDA│  yang sedang dianalisis      │ BENANG       │
│         │                              │ TERKAIT      │
└─────────┴──────────────────────────────┴──────────────┘
```

- **Kiri-atas** — daftar emiten tersidang (dari `GET /api/board`), pilih untuk memuat papan.
- **Kiri-bawah** — **Filter & Legenda Papan**: toggle per tipe node (pemegang saham,
  orang kunci, red flag, kabar, fakta angka), toggle per tipe edge, + mode
  "benang merah lintas emiten" (hanya hubungan antar pemegang). *(keputusan 2026-09-10)*
- **Tengah-atas** — graf react-flow; tengah-bawah — chat AI Agent soal emiten yang
  sedang dianalisis.
- **Kanan-atas** — detail informasi node terpilih (fakta + angka + sumber + tanggal).
- **Kanan-bawah** — **Benang Terkait**: daftar koneksi node terpilih ("si X juga
  memegang BRMS 12%"), klik → pindah seleksi ke node itu — navigasi graf tanpa drag.
  *(keputusan 2026-09-10)*

### Ditunda: node kebijakan pemerintah (dibahas 2026-09-10, tunda)

Sectors tidak punya endpoint regulasi khusus; sumber mungkin hanya `/v2/news/`
(filter keyword; tags Sectors berorientasi pasar, bukan kategori kebijakan) dan
red_flags memo. Konsepnya kuat — kebijakan = node hub yang menimpa banyak emiten —
tapi sumber datanya perlu matang dulu. Opsi yang tercatat: dari memo (0 kredit),
dari news+LLM saat sidang (+1–2 kredit/sidang), papan kebijakan global (±10–15
kredit sekali), analis ke-6. **Belum diputuskan — jangan implementasi.**

### Cakupan pasar Sectors (dicatat 2026-09-10)

IDX 99,99% (950+ emiten, harian) · SGX ±80% · KLSE ada · + ekstensi saham mining.
**Bukan seluruh Asia** (tidak ada SET/HKEX/TSE). Implikasi Papan Bukti: benang merah
lintas bursa (pemegang SGX/KLSE ↔ emiten IDX) mungkin, asalkan data shareholder
screener menyertakan negara/bursa — cek saat probe.

---

## 2b. **SELESAI 2026-09-14** — keterbacaan graf Papan Bukti

Temuan awal: `/api/board/BBCA` mengembalikan **42 kartu / 44 benang**, dan `fitView` jatuh
ke `minZoom 0.15` → kartu ter-render ±37px, tak terbaca. Dua akar masalah:

1. **Salah tipe node.** Broker summary (`YU Net Buy`, `ZP Net Sell`, …) dan aliran institusi
   (Fidelity, T. Rowe Price) diketik `pemegang` sehingga papan menyatakan
   "YU memegang saham BBCA" — **salah secara faktual di halaman bertema papan bukti.**
2. **Semua jenis bukti menyala sejak awal**, jadi 42 kartu tampil bersamaan.

Yang dikerjakan:

- Tipe node baru **`aliran`** + tipe edge **`aliran`** (`jejak transaksi`, putus-putus).
  Broker summary & aliran institusi tidak lagi memakai `memegang`. Untuk BBCA:
  `pemegang` turun 16 → **6** (Dwimuria 54.9%, Public 44.6%, Treasury 0.4%, 3 individu),
  `aliran` = 10.
- Papan dibuka dalam **mode ringkas** (`DEFAULT_VISIBLE_NODES/EDGES` di `types/board.ts`):
  emiten + pemegang saham + orang kunci saja → **12 kartu / 14 benang**. Tombol
  **"Perluas jaringan" / "Ringkas"** di toolbar untuk membuka seluruh bukti (42 kartu).
- Kartu diperbesar 210 → **248px**, label 15 → 16.5px, canvas 600 → **720px**, radius cincin
  dirapatkan (`RINGS [360, 620, 880]`, `ringCapacity [5, 7, 9]`).
- **Provenance jujur.** `retrievedAt` sebelumnya selalu `date.today()` — data arsip dilabeli
  tanggal hari ini. Sekarang `SectorsResponse.fetched_at` diisi dari `cache.created_at`
  (metode baru `Database.cache_get_created_at`), dan `BoardNodeData.cache` menandai
  `hit`/`miss`; kartu menampilkan "Sumber diambil 12 Sep 2026 · arsip".
- **Ambang terbaca.** Fit-semua pada canvas ±740px hanya mencapai skala ±0.40 (kartu 99px) —
  di bawah ambang `LEGIBLE_MIN_SCALE = 0.55`. Kalau hasil fit di bawah ambang, papan
  memusatkan pada kartu fokus di skala 0.55; tombol **"Pusatkan" / "Fit semua"** di kanan-bawah
  canvas. Terukur: 0.40 → **0.55**, tanpa error konsol.

Terverifikasi: `pytest` 32 lulus · `tsc -b` bersih · `vite build` bersih · 12↔42 kartu
bolak-balik tanpa error konsol. **0 kredit** (semua dari cache BBCA).

**Utang yang tersisa dari temuan ini:** ketiganya sudah diselesaikan — lihat §2c.

---

## 2c. **SELESAI 2026-09-14** — tiga utang Papan Bukti + perapian tata letak

### 1. Chat papan: heuristik → LLM sungguhan

`POST /api/board/{ticker}/chat` sekarang menyusun jawaban lewat `LLMClient` dengan prompt
sistem yang **mengikat jawaban pada isi papan** (anti-halusinasi) + konteks graf hasil
`_chat_context`. Balasan membawa `mode` (`"llm"`/`"heuristik"`) dan `model`, jadi FE bisa
jujur soal jalur yang dipakai.

Konteks graf memisahkan **kepemilikan** dari **jejak transaksi** — broker summary masuk baris
`Jejak broker/institusi (bukan pemegang saham): …` supaya LLM tidak menyebut broker sebagai
pemegang saham. Balasan kosong dari LLM (`"   "`) juga jatuh ke heuristik, bukan ditampilkan.

FE: `BoardChatResponse` di `types/board.ts`, chip **kuning "heuristik"** (title: LLM tidak
tersedia) vs chip **hijau `{model}`**. Bukti live: chip `deepseek-v4-flash:0731` dan jawaban
memuat angka papan (Dwimuria 54,9%; red flag konsentrasi level medium; stock split) — bukan
hafalan model. **0 kredit Sectors** (graf dari cache), hanya token LLM.

### 2. Identitas orang: dua ejaan → satu kartu

`canonical_person_name` membuang alias (`/…`, `a.k.a.`, "yang biasa dipanggil"), dengan
pengaman: nama sebelum `/` yang terlalu pendek (`A/Divisi Korporat`) **tidak** dianggap nama
utama. Orang yang muncul di registri pemegang saham **dan** di manajemen menjadi satu node
`pemegang` dengan jabatan di `sub` dan kedua benang (`memegang` + `menjabat`); kedua ejaan
asli disimpan di `detail` sebagai jejak audit.

Sekaligus: `_fmt_pct` tidak lagi menciutkan kepemilikan kecil jadi `0.0%`
(`0.0001` fraksi → **`0.01%`**), dan `_fixture_lookup` mencocokkan fixture secara longgar
terhadap segmen `sections=` sehingga mode fixture tidak lagi kosong untuk `company_report`
7-seksi.

### 3. Panel kanan memakai benang yang benar-benar tampil

`Benang Terhubung (44)` → **`(14)`** — 14 = edge yang benar-benar digambar (sudah tersaring
`activeEdgeTypes` + `visibleIdSet`). Daftar dikelompokkan **per entitas**: satu orang = satu
baris, benangnya digabung di baris kedua (`memegang saham 0.01% · menjabat di Director`).
Sisa benang yang tersembunyi filter disebut eksplisit ("N benang tersembunyi oleh filter tipe").

### 4. Perapian tata letak (dari tangkapan layar pemilik proyek)

- **Legenda satu kolom** dengan grid bersama `grid-cols-[12px_16px_1fr]` — checkbox, contoh
  warna/garis, dan label ketiganya mulai pada x yang sama; baris lintas-emiten ikut rata.
  Label tak lagi terpotong ("menunjuk f…" → utuh).
- Kolom kiri/kanan dinaikkan `600 → 720px` agar sejajar canvas.
- Baris benang: teks relasi turun ke baris kedua pada x tetap (`pl-4`), tidak lagi bergerigi.
- Ruang mati kolom kanan dihapus — yang melar mengisi kolom adalah **daftar benang**
  (`flex-1`), bukan kartu detail yang menyisakan lubang.

### 5. Pil label benang tidak lagi menutupi kartu (temuan lanjutan dari tangkapan layar)

Pil label digambar di **titik tengah benang**, dan karena handle node ada di tengah kartu,
titik tengah itu sering mendarat **di dalam kartu** — pil menutupi label kartu ("2.666.921 lbr"
menimpa kartu tetangga, "0.35%" menimpa kartu pemiliknya). Dua akar masalah:

1. **Label terlalu lebar.** Benang `memegang` untuk direksi bersaham memakai jumlah lembar
   (11 karakter angka + " lbr"), sedangkan benang `memegang` lain memakai persen. Sekarang
   semuanya persen; jumlah lembar tetap ada di `detail` kartu (CONTRACT §3.2).
2. **Penempatan per benang.** Tiap pil dihitung sendiri-sendiri, jadi beberapa benang yang
   masuk ke celah yang sama (`memegang` + `menjabat` milik orang yang sama) saling menimpa.

Sekarang `planEdgeLabels` merencanakan posisi **semua** pil sekaligus: tiap pil hanya boleh
duduk di celah bebas antara kedua kartu ujungnya, menghindari kartu lain **dan** pil yang sudah
ditempatkan; yang celahnya paling sempit ditempatkan lebih dulu. Kalau celahnya lebih sempit
dari lebar pil, pilnya **tidak digambar** — informasi itu tetap terbaca di kartu (persen di
`value`, jabatan di `sub`) dan di panel "Benang Terhubung".

Terukur di kanvas (geometri DOM, bukan perkiraan):

| Mode | Kartu | Benang | Pil | Pil×kartu | Pil×pil |
|---|---|---|---|---|---|
| Ringkas | 11 | 14 | 10 | **0** | **0** |
| Perluas jaringan | 41 | 44 | 33 | **0** | **0** |

Sebelum perbaikan: 4 tabrakan pil×pil di mode ringkas. 0 error konsol.

### Verifikasi

`pytest` **66 lulus** (34 tes papan di `backend/tests/test_board.py`, semuanya hermetic:
`sectors_mode="fixture"` + `ollama_api_key=""` → 0 kredit & 0 token) · `tsc -b` bersih ·
`vite build` bersih · jalur LLM diuji lewat UI sungguhan. CONTRACT dinaikkan ke **1.4.0**.

---

## 3. Shortlist fitur lain (keputusan menunggu, sebelumnya 2026-09-10)

Dari catatan sebelumnya — diprioritaskan setelah Papan Bukti:

1. **Analis Kabar + IPO** (endpoint filings, suspensions, IPO listing-performance
   sudah tersedia di client; 1 kredit per panggilan, cache 7 hari).
2. **Konsensus vs Putusan** — bandingkan verdict SIDANG dengan rating analyst
   (`analyst_rating_breakdown` di section `future`, 1 kredit/seksi).
3. **Funnel Screening → Sidang** — dari screener (mis. `forward_pe < x and ...`)
   langsung jadi antrean sidang.

---

## 4. Sisa pekerjaan hackathon (laporan/deliverable)

- [ ] Video demo + README/pitch + diagram arsitektur
- [ ] Rekap total pemakaian token semua agen (aturan sidang)
- [ ] Keputusan commit/untrack: `frontend/mock_design/`, `frontend/sidang.zip`
- [ ] (Terbuka) test set live lengkap: BBCA + CUAN + 1 emiten gorengan ≈ 48 kredit

## 5. Catatan lingkungan (berlaku terus)

- Frontend: Chrome untuk screenshot (BUKAN Edge), Vite kadang perlu bersih-bersih
  `node_modules/.vite` + kill port 5173/5174.
- Backend: conda `sidang-backend`, uvicorn `--host ::`; `conda run` menolak `-c`
  multiline/stdin piped — tulis script ke `$TEMP` dulu.
- Test harus hermetic: `ollama_api_key=""` di fixture test (backend/.env berisi key asli).
- API key hanya di `.env`, tidak pernah di-commit; jangan pernah mencetak nilainya.

---

## 6. Temuan audit provenance (2026-09-15) — status

Dari audit tabel "Sumber Data" di memo AADI (`tr_f38a2b2626f8`, mode `live`).
Rincian lengkap + angka mentahnya di `docs/SUBMISSION.md` Lampiran B.

**Selesai:**
- Label `cache` jadi tiga nilai (`hit` / `miss` / `fixture`). Mode fixture dulu
  melabeli tiap barisnya `miss` — artinya memo demo mengaku menghabiskan kredit
  yang tidak pernah dipakai. (CONTRACT 1.7.0)
- `retrieved_at` kini tanggal payload BENAR-BENAR diambil, bukan `now_iso()` saat
  sidang berjalan; `Citation` mewarisi pasangan `(cache, retrieved_at)` dari
  endpoint sumber faktanya, bukan `created_at` memo.
- Pil mode di ruang sidang diturunkan dari `mode` yang dilaporkan backend, bukan
  dari konfigurasi frontend — tidak bisa lagi bertentangan dengan isi memo.

**Terbuka, prioritas tertinggi — `analysts.py:105`:**
`screener(where=f"symbol in ['{ctx.ticker}']")` **tidak pernah cocok**. Screener
menyimpan simbol dengan sufiks `.JK` (`"CASS.JK"`) — `client.py:662` sudah
menuliskan itu di komentarnya sendiri dan karena itu mencari `['{sym}','{sym}.JK']`,
tapi pemanggilan analis Anti-Gorengan tidak. Akibatnya analis itu menyumbang
**nol fakta** ke setiap memo di mode live, termasuk pemeriksaan suspensi yang
justru diferensiasi yang kita jual. Fixture menyembunyikannya karena fixture-nya
berisi. Perbaikannya satu baris.

**Terbuka, perlu 1 panggilan hidup untuk memastikan:**
`/v2/suspensions/?symbol=<X>` mengembalikan `results: []` untuk **12 dari 12**
emiten yang terarsip (ABBA, BBRI, ACES, BBCA, ACST, ARTO, TLKM, GOTO, AALI,
AADI, AGRO) — mencurigakan untuk ACST/ARTO/GOTO. Penyebabnya bisa konvensi `.JK`
yang sama, bisa nama parameter yang berbeda. 11 kredit terbuang di sana.

**Terbuka, kosmetik:**
Kolom Param menampilkan `period=30d` untuk `foreign-flow`, padahal klien
mengirim `{}` tanpa parameter (arsip: 11 baris `foreign_flow`, `params` kosong).

**Catatan koreksi:** klaim awal "22 dari 243 kredit dibayar untuk payload
identik" **ditarik**. Setelah payload dibuka, kesamaan hash itu bukan tanda data
pasar-luas dibeli ulang — melainkan tanda responsnya **kosong**, sehingga semua
yang kosong memang identik. Menghapus simbol dari `cache_key` tidak menghemat
apa pun; yang bocor adalah panggilan yang tidak pernah mengembalikan baris.
