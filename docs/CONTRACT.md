# CONTRACT — Kontrak Backend ↔ Frontend SIDANG

> **Status: FROZEN** · schema_version `1.0.0` · Tertulis 2026-09-09 oleh orkestrator.
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
  "disclaimer": "Memo ini adalah alat bantu riset & analisis, bukan rekomendasi investasi. Keputusan investasi sepenuhnya tanggung jawab masing-masing investor."
}
```

Validasi: pydantic di backend; jika JSON hakim invalid → 1x repair loop → bila tetap gagal, `trial_failed` dengan `error_code: "llm_error"`.

---

## 3. Endpoint REST

| Method | Path | Request / Response |
|---|---|---|
| `POST` | `/api/trials` | Body `{ "ticker": "CUAN", "mode": "auto\|fixture" }` (mode opsional, default `auto`) → `202 { "trial_id", "ticker", "company_name", "mode", "created_at" }`. Ticker divalidasi via cache daftar emiten **sebelum** hit Sectors (404 Sectors = 1 kredit). Ticker invalid → `422 { "detail": "Ticker tidak dikenal" }`. Sidang berjalan di background task. |
| `GET` | `/api/trials/{trial_id}/events` | SSE. Replay dari `Last-Event-ID` bila ada. |
| `GET` | `/api/trials/{trial_id}/memo` | `200 MemoJSON` · `404 { "detail": "…" }` bila belum `memo_ready`. |
| `GET` | `/api/journal?limit=&offset=` | `200 { "items": [ { "memo_id", "ticker", "company_name", "verdict_category", "info_richness", "price_at_trial", "created_at" } ], "total" }` |
| `GET` | `/api/journal/{memo_id}/postmortem` | `200 { "memo": MemoJSON, "price_at_trial": 8.4, "price_now": 7.9, "change_pct": -5.95, "days_elapsed": 21 }` |
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