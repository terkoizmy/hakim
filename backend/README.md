# SIDANG — Backend

Backend untuk **SIDANG** (Sidang Saham IDX): 5 analis mengumpulkan bukti dari
Sectors API secara paralel, Jaksa vs Pembela berdebat 2 ronde, Hakim Ketua
menulis memorandum riset (MemoJSON). Semua langkah di-streaming via SSE.

Kontrak backend ↔ frontend: `docs/CONTRACT.md` (FROZEN, jangan diedit).

---

## Environment (conda)

Semua perintah memakai env conda `sidang-backend` (Python 3.12).

```bash
# buat env + install deps (sekali saja)
conda env create -f environment.yml        # atau:
conda create -n sidang-backend python=3.12
conda run -n sidang-backend pip install -r requirements.txt
```

Jalankan perintah apa pun dengan prefix `conda run -n sidang-backend`:

```bash
conda run -n sidang-backend python -m app.cli sidang BBCA --mode fixture
conda run -n sidang-backend python -m pytest tests/ -v
conda run -n sidang-backend uvicorn app.main:app --reload --port 8000
```

> Catatan: `conda run` tidak mendukung skrip `python -c` multi-baris — tulis
> skrip ke file temp lalu jalankan `conda run -n sidang-backend python file.py`.

## Konfigurasi

Salin `.env.example` → `.env` (jangan commit `.env`). Mode default `fixture`
(tidak menyentuh HTTP — baca `app/sectors/fixtures/*.json`). Mode `live`
membutuhkan `SECTORS_API_KEY` dan `OLLAMA_API_KEY`.

| Variabel | Default | Keterangan |
|---|---|---|
| `SECTORS_MODE` | `fixture` | `fixture` \| `live` |
| `SECTORS_API_KEY` | — | Key Sectors (raw, tanpa `Bearer`) |
| `OLLAMA_BASE_URL` | `https://ollama.com/v1` | Endpoint OpenAI-compatible |
| `OLLAMA_API_KEY` | — | Key Ollama cloud |
| `MODEL_ANALYST/DEBATE/JUDGE` | `deepseek-v4-flash` | Model per peran |
| `TRIAL_TIMEOUT_SECONDS` | `300` | Batas waktu sidang |
| `CACHE_TTL_DAYS` | `7` | TTL cache Sectors di SQLite |

Tanpa `OLLAMA_API_KEY`, pipeline memakai **template deterministik**
(`llm_fallback_template=True`) sehingga demo fixture tetap menghasilkan
MemoJSON yang valid.

## Perintah

```bash
# CHECKPOINT 1 — sidang satu ticker via CLI (mencetak MemoJSON)
conda run -n sidang-backend python -m app.cli sidang BBCA --mode fixture
conda run -n sidang-backend python -m app.cli sidang CUAN --mode fixture

# CHECKPOINT 2 — test suite (TestClient full flow + aturan Sectors)
conda run -n sidang-backend python -m pytest tests/ -v

# Server API
conda run -n sidang-backend uvicorn app.main:app --reload --port 8000
```

## Endpoint (ringkas)

| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/api/trials` | `{ticker, mode}` → `202`; sidang jalan di background |
| `GET` | `/api/trials/{id}/events` | SSE, replay via `Last-Event-ID` |
| `GET` | `/api/trials/{id}/memo` | MemoJSON |
| `GET` | `/api/journal` | Daftar memo |
| `GET` | `/api/journal/{memo_id}/postmortem` | Harga saat sidang vs sekarang |
| `GET` | `/api/health` | Status |

## Struktur

```
app/
  config.py        # Settings (pydantic-settings, baca backend/.env)
  db.py            # SQLite: trials, memos, events, cache, tickers (WAL)
  models.py        # MemoJSON + amplop SSE + body REST (sesuai CONTRACT)
  eventbus.py      # publish/subscribe per trial + persist ke SQLite
  sectors/
    client.py      # Sectors REST v2: raw-key auth, sections eksplisit,
                   #   screener where=, backoff 429, cache, fixture mode
    fixtures/      # BBCA.json, CUAN.json, GENERIC.json (fallback)
  llm/
    client.py      # OpenAI-compatible (Ollama cloud)
    templates.py   # Fallback deterministik (analis/debat/hakim)
  evidence.py      # Ekstraksi bukti rule-based (anti-halusinasi)
  analysts.py      # 5 spesifikasi analis (gather + extract)
  orchestrator.py  # Alur sidang: 5 analis paralel → debat 2 ronde → hakim
  endpoints.py     # REST + SSE (CONTRACT §3)
  main.py          # create_app() (deps bisa di-inject untuk test)
  cli.py           # python -m app.cli sidang <TICKER> --mode fixture
tests/
  test_sectors.py  # Aturan Sectors: raw-key, sections, where=, 429, 404
  test_api.py      # TestClient full flow + SSE replay
```

## Aturan Sectors yang dijaga (lihat `sectors-docs-digest.md`)

- `Authorization` = **key mentah, tanpa prefix `Bearer`** (diuji di
  `tests/test_sectors.py`).
- Company report **selalu** mengirim `sections` eksplisit (1 kredit/section).
- Screener **selalu** memakai `where=` (1 kredit), bukan `q=` (3 kredit).
- HTTP 429 → backoff eksponensial + retry.
- Ticker divalidasi dari cache daftar emiten **sebelum** hit Sectors.
