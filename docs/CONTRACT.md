# CONTRACT — Kontrak Backend ↔ Frontend SIDANG

> **Status: FROZEN** · schema_version `1.5.0` · Tertulis 2026-09-09 oleh orkestrator.

> **Changelog 1.5.0** (2026-09-14): tipe edge **`bukti`** — benang tuduhan→penopang yang menghubungkan node `redflag` ke kartu buktinya (satu-satunya benang yang tidak berpangkal di kartu pusat); aturan resolusi + sikap "ambigu = tidak digambar" di §3.2. §2 **Id & sitasi**: `fact_id` wajib `f_1…f_n` berurutan, `cites` wajib minimal satu `fact_id` dari `key_facts` memo itu sendiri dan dilarang memuat `evidence_id` — sebelum ini prompt hakim tidak pernah menjelaskan isi `cites`, dan finalizer membuang cite non-identik secara diam-diam sehingga seluruh lapisan sitasi mati (9 memo di `sidang.db` tersimpan tanpa satu pun cite).
>
> **Changelog 1.4.0** (2026-09-14): `POST /api/board/{ticker}/chat` **kini memanggil LLM sungguhan** dan balasannya menambah `mode` (`"llm"`/`"heuristik"`) + `model` — FE wajib menandai balasan heuristik sebagai bukan analisis AI (lihat §3.2). Aturan identitas orang di §3.2: satu orang di registri pemegang saham DAN di manajemen = **satu** node `pemegang` (jabatan masuk `sub`, kedua benang tetap ada); ejaan alias Sectors dinormalisasi. Kedua endpoint board kini menjawab `422 Ticker tidak dikenal` untuk ticker di luar registry.

> **Changelog 1.1.0** (2026-09-09): endpoint `GET /api/trials/{trial_id}/price-series` baru; postmortem menyertakan `price_series: Point[] | null`.
>
> **Changelog 1.2.0** (2026-09-09): endpoint `GET /api/tickers` baru — daftar emiten untuk dashboard "Berkas Perkara".
>
> **Changelog 1.2.1** (2026-09-09): `JournalItem` menambahkan field `trial_id` — FE halaman detail emiten memanggil `/price-series` langsung (0 kredit) tanpa lewat postmortem.
>
> **Changelog 1.2.2** (2026-09-10): `POST /api/trials` dapat menolak dengan `409` bila emiten yang sama sudah diadili kurang dari 7 hari lalu (cooldown re-sidang).
>
> **Changelog 1.3.0** (2026-09-14): endpoint `GET /api/board/{ticker}` + `POST /api/board/{ticker}/chat` didokumentasikan (Papan Bukti Detektif), beserta kosakata node/edge di §3.2. Tipe node `aliran` baru: broker summary & aliran institusi **tidak lagi** diketik `pemegang` (sebelumnya papan menyatakan "X memegang saham Y" secara keliru). `BoardNodeData` menambahkan `cache` (`hit`/`miss`) dan `retrievedAt` kini berisi tanggal ambil sebenarnya untuk data arsip.
>
> **Changelog 1.2.3** (2026-09-10): registry emiten membawa sektor IDX-IC — `TickerItem` menambah field `sector` (bisa `null` untuk emiten lama/belum ter-backfill); `GET /api/tickers` menerima param `sector=`; endpoint `GET /api/tickers/sectors` baru (daftar sektor + jumlah emiten). Sektor didapat dari echo `query_values` Companies Screener (`where="sector != ''"` + `include_query_values=true`, live-verified 2026-09-10).
>
> Aturan: worker HANYA MEMBACA file ini. Perubahan hanya oleh orkestrator dengan bump `schema_version`.
> Sumber kebenaran tunggal untuk: event SSE, MemoJSON, endpoint REST, kode error.

---

## 1. Amplop event SSE

Stream: `GET /api/trials/{trial_id}/events` → `text/event-stream`.
Setiap event SSE berisi satu baris `data:` berupa JSON:

```json
{
  "type": "<event_type>",
  "trial_id": "tr_8f3k...",
  "seq": 42,
  "ts": "2026-09-09T12:34:56.789Z",
  "payload": { }
}
```

- `seq`: integer monotonik naik per trial. Dipakai untuk resume klien via header `Last-Event-ID` (replay event dengan `seq > lastEventId`).
- `ts`: ISO-8601 UTC.
- Heartbeat dikirim tiap ±15 detik (`type: "heartbeat"`) agar proxy tidak memutus koneksi — frontend mengabaikannya.

### 1.1 Daftar event type + payload

| type | payload | Keterangan |
|---|---|---|
| `trial_started` | `{ "ticker": "CUAN", "company_name": "Petrindo Jaya Kreator Tbk", "mode": "fixture\|live", "models": { "analyst": "...", "debate": "...", "judge": "..." } }` | Event pertama stream |
| `phase_started` | `{ "phase": "evidence\|debate\|verdict", "round": 1 }` | `round` hanya ada saat `phase=debate` |
| `agent_started` | `{ "agent_id": "fundamental", "agent_role": "analyst\|prosecutor\|defender\|judge", "display_name": "Analisis Fundamental", "model": "deepseek-v4-flash" }` | 5 analis: `fundamental, price, smartmoney, insider, antigorengan` |
| `agent_tool_call` | `{ "agent_id": "fundamental", "tool": "company_report", "endpoint": "/v2/company/report/CUAN/", "params_summary": "sections=financials,valuation,peers", "cache": "hit\|miss" }` | Transparansi data |
| `agent_evidence` | `{ "agent_id": "fundamental", "evidence_id": "ev_12", "source_endpoint": "...", "headline": "Forward PE 8,4x vs peer 14,1x", "facts": [ { "label": "forward_pe", "value": 8.4, "unit": "x" } ] }` | Chip bukti di live feed |
| `agent_finished` | `{ "agent_id": "fundamental", "summary_md": "…markdown…", "data_richness": "A\|B\|C", "evidence_ids": ["ev_10","ev_11","ev_12"] }` | Rangkuman per analis |
| `debate_utterance` | `{ "round": 1, "side": "prosecution\|defense", "title": "…", "argument_md": "…", "cites": ["ev_12"], "rebuts": "ut_r3\|null" }` | `ut_` = id utterance sebelumnya yang dibalas |
| `memo_token` | `{ "text": "…" }` | Streaming teks hakim (opsional; frontend wajib toleran bila tidak ada) |
| `memo_ready` | `{ "memo": { …MemoJSON… } }` | Akhir sidang sukses |
| `trial_failed` | `{ "error_code": "ticker_not_found\|sectors_error\|llm_error\|timeout", "message": "…", "phase": "evidence\|debate\|verdict", "agent_id": null }` | Akhir sidang gagal |
| `heartbeat` | `{}` | Keep-alive |

---

## 2. MemoJSON

Disimpan di SQLite, dikembalikan `GET /api/trials/{id}/memo` dan `GET /api/journal`. **Self-contained**: semua sitasi di dalam memo merujuk `key_facts`/`citations` milik memo itu sendiri — BUKAN `evidence_id` dari stream (itu hanya untuk live feed).

```json
{
  "schema_version": "1.0.0",
  "memo_id": "mm_...",
  "trial_id": "tr_...",
  "ticker": "CUAN",
  "company_name": "Petrindo Jaya Kreator Realty Tbk",
  "created_at": "2026-09-09T12:40:00Z",
  "data_mode": "fixture | live",
  "info_richness": "A | B | C",
  "executive_summary": "string — 1 paragraf, Bahasa Indonesia",
  "key_facts": [
    {
      "fact_id": "f_1",
      "label": "forward_pe",
      "value": 8.4,
      "unit": "x",
      "source_endpoint": "/v2/company/report/CUAN/?sections=valuation",
      "as_of_date": "2026-08-31"
    }
  ],
  "bull_case": {
    "title": "string",
    "points": [ { "point_id": "bp_1", "argument_md": "string", "cites": ["f_1"] } ]
  },
  "bear_case": {
    "title": "string",
    "points": [ { "point_id": "br_1", "argument_md": "string", "cites": ["f_2"] } ]
  },
  "smart_money_findings": [
    { "finding_md": "string", "direction": "akumulasi | distribusi | netral", "cites": ["f_3"] }
  ],
  "insider_findings": [
    { "finding_md": "string", "direction": "beli | jual | netral", "cites": ["f_4"] }
  ],
  "red_flags": [
    { "flag_md": "string", "severity": "low | medium | high", "cites": ["f_5"] }
  ],
  "verdict": {
    "category": "layak_diteliti_lanjut | perlu_kehati_hatian | red_flag_berat",
    "confidence": 0.0,
    "rationale_md": "string",
    "verification_questions": ["string", "string"]
  },
  "citations": [
    {
      "cite_id": "f_1",
      "source": "sectors_endpoint",
      "endpoint": "/v2/company/report/CUAN/?sections=valuation",
      "params_summary": "sections=valuation",
      "retrieved_at": "2026-09-09T12:34:00Z",
      "cache": "hit | miss"
    }
  ],
  "tool_calls": [
    {
      "agent_id": "fundamental",
      "tool": "company_report",
      "endpoint": "/v2/company/report/CUAN/",
      "params_summary": "sections=financials,valuation,...",
      "retrieved_at": "2026-09-09T12:33:40Z",
      "cache": "hit | miss"
    }
  ],
  "disclaimer": "Memo ini adalah alat bantu riset & analisis, bukan rekomendasi investasi. Keputusan investasi sepenuhnya tanggung jawab masing-masing investor."
}
```

**`tool_calls` (opsional, tambahan v1.1)** — catatan panggilan Sectors yang BENAR-BENAR terjadi selama sidang (satu entri per panggilan, dari event `agent_tool_call`). Ini sumber tabel audit "Sumber Data"; `citations` tetap anchor fakta → `key_facts`. Memo lama tanpa field ini tetap valid; UI fallback ke `citations`.

**Id & sitasi (sejak 1.5.0).** `fact_id` wajib `f_1`, `f_2`, `f_3`, … **berurutan**
(ejaan bergaris bawah). Setiap butir `bull_case.points`, `bear_case.points`,
`smart_money_findings`, `insider_findings`, dan `red_flags` **wajib** memuat `cites`
berisi **minimal satu `fact_id` dari `key_facts` memo itu sendiri**; `"cites": []`
bukan memo yang valid. `cites` **tidak boleh** memuat `evidence_id` (`ev_…`) — itu
namespace stream debat (§1 `debate_utterance`), bukan namespace fakta memo.
`point_id` memakai `bp_1…bp_n` (bull) dan `br_1…br_n` (bear).

> **Kenapa ditulis eksplisit (1.5.0).** Sebelum ini prompt hakim hanya menyebut
> *nama* field `cites` tanpa menjelaskan isinya, sementara prompt debat sudah lama
> berbunyi `"cites": ["ev_..."]` dan utterance debat ikut disuapkan ke hakim — jadi
> satu-satunya konvensi yang terbaca hakim adalah namespace yang salah. Ditambah
> finalizer yang **membuang diam-diam** cite apa pun yang tidak byte-identik dengan
> `fact_id` karangan hakim sendiri, akibatnya seluruh lapisan sitasi mati tanpa suara:
> 9 memo di `sidang.db` tersimpan dengan `cites` kosong di semua bagian, dan
> korelasinya 100% dengan ejaan `fact_id` non-kanonik (`f1`, `fact_001`).
> Parser backend kini **memetakan** ejaan apa pun (`f1`, `f_1`, `fact_001`, bahkan
> label fakta) ke `fact_id` kanonik lewat kosakata `key_facts` memo itu sendiri, dan
> menulis `WARNING` bila ada butir yang tetap tanpa sitasi. Memo yang ditulis harus
> tetap mengeluarkan `f_1…f_n`.

Validasi: pydantic di backend; jika JSON hakim invalid → 1x repair loop → bila tetap gagal, `trial_failed` dengan `error_code: "llm_error"`.

---

## 3. Endpoint REST

| Method | Path | Request / Response |
|---|---|---|
| `POST` | `/api/trials` | Body `{ "ticker": "CUAN", "mode": "auto\|fixture" }` (mode opsional, default `auto`) → `202 { "trial_id", "ticker", "company_name", "mode", "created_at" }`. Ticker divalidasi via cache daftar emiten **sebelum** hit Sectors (404 Sectors = 1 kredit). Ticker invalid → `422 { "detail": "Ticker tidak dikenal" }`. Emiten yang sudah punya memo < 7 hari → `409 { "detail": "<TICKER> sudah diadili pada … — sidang ulang … setelah <tgl>" }` (cooldown re-sidang; memo lama tetap bisa dibuka dari jurnal). Sidang berjalan di background task. |
| `GET` | `/api/trials/{trial_id}/events` | SSE. Replay dari `Last-Event-ID` bila ada. |
| `GET` | `/api/trials/{trial_id}/memo` | `200 MemoJSON` · `404 { "detail": "…" }` bila belum `memo_ready`. |
| `GET` | `/api/journal?limit=&offset=` | `200 { "items": [ { "memo_id", "trial_id", "ticker", "company_name", "verdict_category", "info_richness", "price_at_trial", "created_at" } ], "total" }` — `trial_id` sejak 1.2.1. |
| `GET` | `/api/journal/{memo_id}/postmortem` | `200 { "memo": MemoJSON, "price_at_trial": 8.4, "price_now": 7.9, "change_pct": -5.95, "days_elapsed": 21, "price_series": [ { "date": "2026-09-08", "close": 8400, "volume": 12000000, "change_pct": 0.5 }, … ] \| null }` — `price_series` ascending by date, 2–52 titik; `null` bila data tidak cukup (< 2 titik). |
| `GET` | `/api/trials/{trial_id}/price-series` | `200 { "trial_id", "ticker", "points": [ { "date", "close", "volume", "change_pct" }, … ] \| null }` — snapshot harga dari trial (daily_transaction), ascending, 2–52 titik; `null` bila < 2 titik (HTTP tetap 200). |
| `GET` | `/api/tickers?q=&limit=&offset=&sector=` | `200 { "items": [ { "ticker", "company_name", "sector" } ], "total" }` — daftar emiten terdaftar dari cache daftar emiten (sudah dipakai validasi POST /api/trials). `q` = pencarian case-insensitive pada ticker ATAU company_name (prefix/substring). `sector` = filter persis nama sektor IDX-IC (mis. `Financials`) — sejak 1.2.3. `limit` default 50, `offset` default 0, `total` = jumlah hasil setelah filter (bukan total semua). `sector` bisa `null` (emiten lama / registry sebelum 1.2.3). Fixture mode: dari `_listed_companies` fixture. Cache 1 hari — jika cache daftar emiten kosong, isi dulu lalu jawab (live mode: 1 kredit/halaman saat refresh pertama saja). |
| `GET` | `/api/tickers/sectors` | `200 { "items": [ { "sector", "count" } ], "total" }` — daftar sektor berbeda dalam registry + jumlah emiten per sektor (terurut terbanyak dulu) untuk dropdown filter dashboard. Sejak 1.2.3. |
| `GET` | `/api/health` | `200 { "status": "ok", "sectors_mode": "fixture\|live", "version": "…" }` |
| `GET` | `/api/board/{ticker}` | `200 { "ticker", "name", "nodes": [BoardNode], "edges": [BoardEdge], "initialChat", "aiInsights": { "<insight_key>": "…" }, "priceHistory": Point[] \| null, "metricsComparison": MetricBenchmark[], "riskScore": RiskScorecard \| null, "thesisSummary" }` — graf Papan Bukti Detektif untuk emiten yang sudah disidang. Sejak 1.3.0. |
| `POST` | `/api/board/{ticker}/chat` | body `{ "message": "…" }` → `200 { "reply": "…", "mode": "llm" \| "heuristik", "model": "…" \| null }`. Sejak 1.3.0; `mode`/`model` sejak 1.4.0. LLM menjawab dari konteks graf papan (**0 kredit Sectors** — graf dibangun dari cache/arsip). `mode: "heuristik"` + `model: null` = LLM absen/gagal/membalas kosong; FE **wajib** menampilkannya sebagai jawaban darurat, bukan analisis AI. |

CORS: allow `http://localhost:5173` (Vite default).

### 3.2 Kosakata graf Papan Bukti (sejak 1.3.0)

`BoardNode` = `{ id, type, position: {x, y}, data: BoardNodeData, rotate }`.
`BoardEdge` = `{ id, source, target, type, label? }`.

`data.type` pada node — **satu nilai per entitas, tidak boleh tumpang tindih**:

| `type` | Arti |
|---|---|
| `emiten` | Perusahaan yang diperiksa (kartu pusat) |
| `pemegang` | **Pemegang saham riil** dari registri IDX (punya `value` = % kepemilikan) |
| `orang` | Direksi / komisaris (`sub` = jabatan) |
| `aliran` | **Bukan pemegang saham**: broker summary (`Net Buy`/`Net Sell`) dan aliran institusi. Dipisahkan agar papan tidak menyatakan "X memegang saham Y" secara keliru |
| `redflag` | Temuan risiko (`severity`: rendah/sedang/tinggi) |
| `kabar` | Bukti dari filings / suspensi / aksi korporasi |
| `fakta` | Metrik & fakta angka |

`type` pada edge: `memegang` (hanya dari `pemegang`/`orang` bersaham), `menjabat`, `aliran` (jejak transaksi — pasangan dari node `aliran`), `redflag`, `fakta`, `bukti`.

**Benang `bukti` (sejak 1.5.0).** Semua benang lain berpangkal di kartu pusat (`emiten`);
`bukti` satu-satunya yang **tidak** — ia menghubungkan node `redflag` ke kartu yang
**menopang tuduhan itu** (`fakta`, `kabar`, `pemegang`, atau `aliran`). Tujuannya: papan
tidak berhenti pada "ada red flag", tetapi menunjukkan angka/kartu mana yang membuat
tuduhan itu berdiri — mis. red flag "Konsentrasi kepemilikan 54.9%" → kartu pemegang
`PT Dwimuria Investama Andalan (54.9%)`. Rujukan diresolusi tiga aturan, dan **masing-masing
wajib cocok TUNGGAL**:

1. provenance eksplisit dari detektor papan (`support`) — kartu yang dibangun dari datum yang sama;
2. pasangan (angka, satuan) yang sama persis dengan `value` kartu (`54.9%`, `-0.1%`, `2.50x`);
   **wajib berdesimal**, supaya angka bulat lemah seperti `1` tidak jadi jangkar palsu;
3. label kartu (≥ 4 karakter) muncul verbatim di teks red flag.

Bila rujukannya tidak ada **atau ambigu** (dua kartu memuat angka/label yang sama, mis. tiga
kartu "Dividen"), benangnya **tidak digambar** — tuduhan tanpa benang lebih jujur daripada
benang yang menunjuk kartu salah. Jumlah benang per red flag dibatasi 2. Karena itu papan
**boleh** memuat red flag tanpa benang `bukti` sama sekali: di BBCA, flag "aksi korporasi
berisiko (stock split)" memang tidak punya kartu penopang, jadi dibiarkan tanpa benang.
`_chat_context` menyebutkan red flag yang tanpa penopang secara eksplisit supaya LLM tidak
mengarang buktinya.

`label` pada edge: `memegang` **selalu persen** (`"54.9%"`, `"0.01%"`), termasuk untuk direksi
bersaham yang tidak masuk registri pemegang saham — sebelumnya benang itu memakai jumlah lembar
(`"2.666.921 lbr"`) sehingga pil labelnya jauh lebih lebar dari yang lain dan menutupi kartu
tetangga. Jumlah lembar tetap tersedia di `data.detail` kartu (`Jumlah Lembar: …`).

`BoardNodeData.retrievedAt` + `.cache` = provenance: `cache: "hit"` berarti payload berasal dari arsip cache dan `retrievedAt` adalah **tanggal payload itu benar-benar diambil** dari Sectors (bukan tanggal hari ini). `cache: "miss"` = baru diambil.

Kolom `aiInsights` memakai kunci per kategori: `pemegang`, `orang`, `redflag`, `valuasi`, `fakta` (dipakai panel detail).

**Identitas orang (sejak 1.4.0).** Sectors menulis nama orang dengan ejaan berbeda antar
bagian payload (`Tan Ho Hien/Subur Disebut Juga Subur Tan` di `major_shareholders` vs
`Tan Ho Hien/Subur Atau Dipanggil Subur Tan` di `key_executives`). Backend menormalkan nama
lewat `canonical_person_name` (buang alias setelah `/`, `a.k.a.`, "yang biasa dipanggil")
sehingga orang yang sama menjadi **satu** node. Bila orang itu muncul di kedua registri:

- tipe node = `pemegang` (dia benar-benar punya saham — jangan turunkan jadi `orang`),
- jabatan masuk ke `sub` (mis. `Kepemilikan 0.01% · Director`),
- **kedua** benang tetap ada (`memegang` + `menjabat`),
- kedua ejaan asli disimpan di `data.detail` sebagai jejak audit.

**Persen.** `major_shareholders` mengirim campuran (fraksi 0–1 atau persen) sehingga skalanya
dideteksi; `executives_shareholdings` **selalu** fraksi (×100). `_fmt_pct` mempertahankan
kepemilikan kecil (`0.0001` fraksi → `0.01%`, bukan `0.0%`).

> **Catatan (1.4.0):** jalur LLM sudah terbukti hidup — jawaban memuat angka papan
> (mis. Dwimuria 54,9%, red flag konsentrasi level medium) dan bukan hafalan model.
> Bila LLM absen/gagal, balasan turun ke heuristik kata kunci dengan `mode: "heuristik"`;
> FE menandainya dengan chip kuning "heuristik" (bukan chip hijau nama model).

### 3.1 Kode error `trial_failed`

| error_code | Arti |
|---|---|
| `ticker_not_found` | Ticker tidak ada di IDX / daftar emiten |
| `sectors_error` | Gagal panggil Sectors API (non-429 setelah retry) |
| `llm_error` | Panggilan LLM gagal / JSON invalid setelah repair |
| `timeout` | Lewat batas waktu sidang (default 300s) |

---

## 4. Mode & fixture

- `SECTORS_MODE=fixture` (default dev): backend tidak menyentuh HTTP — baca `backend/app/sectors/fixtures/*.json` (BBCA, CUAN, GENERIC).
- Frontend mock: `VITE_USE_MOCK=1` → `src/api/mockSse.ts` memutar `src/mocks/stream-BBCA.jsonl` (format baris = amplop SSE di atas, satu event per baris, field `trial_id` konsisten). Interface `mockSse` identik dengan `sse`.
- Frontend live: `VITE_API_BASE` (default `http://localhost:8000`).