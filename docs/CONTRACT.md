# CONTRACT — Kontrak Backend ↔ Frontend SIDANG

> **Status: FROZEN** · schema_version `1.2.1` · Tertulis 2026-09-09 oleh orkestrator.
>
> **Changelog 1.1.0** (2026-09-09): endpoint `GET /api/trials/{trial_id}/price-series` baru; postmortem menyertakan `price_series: Point[] | null`.
>
> **Changelog 1.2.0** (2026-09-09): endpoint `GET /api/tickers` baru — daftar emiten untuk dashboard "Berkas Perkara".
>
> **Changelog 1.2.1** (2026-09-09): `JournalItem` menambahkan field `trial_id` — FE halaman detail emiten memanggil `/price-series` langsung (0 kredit) tanpa lewat postmortem.
>
> **Changelog 1.2.2** (2026-09-10): `POST /api/trials` dapat menolak dengan `409` bila emiten yang sama sudah diadili kurang dari 7 hari lalu (cooldown re-sidang).
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
| `GET` | `/api/tickers?q=&limit=&offset=` | `200 { "items": [ { "ticker", "company_name" } ], "total" }` — daftar emiten terdaftar dari cache daftar emiten (sudah dipakai validasi POST /api/trials). `q` = pencarian case-insensitive pada ticker ATAU company_name (prefix/substring). `limit` default 50, `offset` default 0, `total` = jumlah hasil setelah filter `q` (bukan total semua). Fixture mode: dari `_listed_companies` fixture. Cache 1 hari — jika cache daftar emiten kosong, isi dulu lalu jawab (live mode: 1 kredit saat refresh pertama saja). |
| `GET` | `/api/health` | `200 { "status": "ok", "sectors_mode": "fixture\|live", "version": "…" }` |

CORS: allow `http://localhost:5173` (Vite default).

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