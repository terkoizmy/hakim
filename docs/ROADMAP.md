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

### Cakupan pasar Sectors (dicatat 2026-09-10)

IDX 99,99% (950+ emiten, harian) · SGX ±80% · KLSE ada · + ekstensi saham mining.
**Bukan seluruh Asia** (tidak ada SET/HKEX/TSE). Implikasi Papan Bukti: benang merah
lintas bursa (pemegang SGX/KLSE ↔ emiten IDX) mungkin, asalkan data shareholder
screener menyertakan negara/bursa — cek saat probe.

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