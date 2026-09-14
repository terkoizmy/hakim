# SIDANG ⚖️🐂🐻

> **"Sebelum beli, adili dulu."** — 20,3 juta investor ritel Indonesia punya SID. Setiap SID butuh SIDANG.

**SIDANG** adalah "pengadilan saham" berbasis multi-agent AI untuk pasar modal Indonesia. Kasih ticker IDX apa pun → lima analis data memeriksa bukti dari [Sectors API](https://docs.sectors.app) → jaksa (bear) dan pembela (bull) berdebat dua ronde → hakim merumuskan **memorandum riset** berbahasa Indonesia, bersitasi, dalam ±5 menit.

**Bukan "AI yang bilang BELI" — second opinion terstruktur sebelum kamu menekan tombol beli.**

---

## Masalahnya

- **20,32 juta investor ritel** Indonesia (akhir 2025, +36% YoY), dominan milenial & Gen Z — pengalaman minim, aset kecil
- **Saham gorengan** = isu nasional 2025–2026; investor ritel tidak tahu cek red flag (suspensi, free float, anomali)
- **Equity research** yang layak hanya milik institusi — mahal, bahasa Inggris, tidak ada untuk investor kecil
- Arus dana institusi/asing & transaksi insider *tersedia sebagai data* — tapi ritel tidak bisa membacanya

## Cara kerja

```
User: pilih emiten → "Buka Sidang"
  [1] 5 Analis mengumpulkan bukti (paralel, dari Sectors API)
      • Analisis Fundamental  — laporan keuangan, valuasi vs peers, parit
      • Analisis Harga        — momentum, vs indeks, konteks movers
      • Smart Money            — akumulasi broker institusi, arus asing
      • Insider               — transaksi direksi & pemegang saham besar
      • Anti-Gorengan          — suspensi, free float, aksi korporasi
  [2] Jaksa (bear) vs Pembela (bull) berdebat 2 ronde
  [3] Hakim Ketua menjatuhkan putusan
→ MEMORANDUM SIDANG (tesis bull, tesis bear, skor risiko, pertanyaan verifikasi)
→ tersimpan di JURNAL SIDANG (memo lama vs harga hari ini — post-mortem publik)
→ tiap angka bisa dilacak di PAPAN BUKTI (graf bukti antar emiten)
```

Berkas tiap tahap dipancarkan **live via SSE** ke ruang sidang — proses berpikirnya diperlihatkan, bukan black box.

## Fitur inti

| Fitur | Kenapa beda |
|---|---|
| **Memorandum Sidang** | Memo riset terstruktur: tiap angka bersitasi endpoint Sectors, peringkat kekayaan informasi A/B/C (lapisan kejujuran soal keterbatasan data) |
| **Debat transparan** | Proses berpikir AI diperlihatkan (jaksa vs pembela, 2 ronde), bukan black box |
| **Audit Sumber Data** | Tiap sidang mencatat ±13 panggilan: endpoint, parameter, status cache. `hit` = 0 kredit — bisa ditunjukkan ke juri, bukan diklaim |
| **Jurnal + post-mortem** | Akuntabilitas: putusan lama dinilai ulang terhadap harga yang benar-benar terjadi, lewat 9 cabang evaluasi. Alat ini mempublikasikan kesalahannya sendiri |
| **Papan Bukti Detektif** | Graf kepemilikan, jejak broker, dan benang bukti antar emiten; pemakaian LLM kedua — untuk penelusuran, bukan putusan |
| **Analis Anti-Gorengan** | Red flag khas Indonesia (suspensi, free float mini) dari data yang tidak dimiliki framework global |
| **Antarmuka dwi-bahasa** | EN (default) / ID, saklar di kepala halaman. Antarmuka saja — konten yang dihasilkan LLM tetap Bahasa Indonesia |

## Menjalankan sendiri

Butuh **Python 3.12** (conda) dan **Node 18+**.

### Backend

```bash
cd backend
conda env create -f environment.yml      # env bernama sidang-backend
conda activate sidang-backend
cp .env.example .env                     # isi SECTORS_API_KEY + OLLAMA_API_KEY
uvicorn app.main:app --reload            # http://localhost:8000  (docs: /docs)
```

`.env` **jangan pernah di-commit**. Untuk mencoba tanpa menghabiskan kredit Sectors, biarkan `SECTORS_MODE=fixture` — semua data dilayani dari fixture lokal, 0 kredit, 0 jaringan.

### Frontend

```bash
cd frontend
npm install
npm run dev                              # http://localhost:5173
```

| Perintah | Guna |
|---|---|
| `npm run dev` | Dev server (butuh backend jalan) |
| `npm run build` | Typecheck + build produksi |
| `npm run typecheck` | `tsc -b` |
| `npm run mock:check` | Validasi berkas mock terhadap kontrak |
| `npm run mock:e2e` | Replay alur mock end-to-end |

**Demo tanpa backend:** set `VITE_USE_MOCK=1`, lalu `npm run dev` — seluruh alur sidang direplay dari fixture, tidak perlu Python maupun API key. Rincian variabel di [`frontend/README.md`](frontend/README.md).

### Tes

```bash
cd backend && pytest
```

## Halaman

| Rute | Isi |
|---|---|
| `/` | Beranda — masalah, cara kerja, CTA |
| `/dashboard` | Berkas Perkara — daftar & pencarian emiten, mulai sidang |
| `/trial/:trialId` | Ruang Sidang — feed 5 analis + debat, live via SSE |
| `/memo/:trialId` | Memorandum Sidang |
| `/journal` | Jurnal Sidang — arsip putusan |
| `/journal/:memoId/postmortem` | Post-mortem — putusan lama vs harga sekarang |
| `/ticker/:ticker` | Berkas emiten — riwayat sidang + grafik harga arsip |
| `/board` | Papan Bukti Detektif |

Catatan: `/memo/…` memakai **trial id** (`tr_…`), `/journal/…/postmortem` memakai **memo id** (`mm_…`).

## Arsitektur & stack

| Komponen | Pilihan |
|---|---|
| Backend | Python 3.12 + FastAPI, orkestrasi graph **buatan sendiri** (bukan klien framework agen), SSE streaming |
| Data | Sectors REST API v2 (client tipis) + SQLite: `trials`, `memos`, `events`, `cache`, `api_archive`, `tickers`, `price_series` |
| Cache | TTL 7 hari **plus arsip permanen** — payload yang sudah dibayar tidak pernah dibeli ulang, dan tanggal ambil aslinya tetap tercatat |
| Frontend | React 18 + Vite + TypeScript + Tailwind, `@xyflow/react` untuk Papan Bukti. **Empat dependensi runtime** — i18n, formatter, dan komponen ditulis sendiri |
| LLM | Ollama cloud (OpenAI-compatible), tiga slot model terpisah: analis / debat / hakim (lihat `backend/.env.example`) |

## Konteks hackathon

Dibangun untuk [Sectors Hackathon Indonesia 2026](https://hackathon.sectors.app) — **Track 1: AI Agents & Assistants** (custom multi-agent orchestration, LLM di inti produk), periode 19 Agu – 30 Sep 2026.

- Sectors API/MCP = sumber data inti (hapus Sectors → produk kehilangan jantungnya)
- **Bukan** rekomendasi investasi — alat bantu riset & analisis, putusan berupa kategori riset + pertanyaan verifikasi
- **Tanpa** eksekusi trading otomatis

## Batasan yang disengaja

- **Konten LLM berbahasa Indonesia.** Yang dwi-bahasa adalah antarmukanya. Pesan galat dari backend juga tetap Indonesia di mode EN — dan itu ditulis apa adanya di UI, bukan disembunyikan.
- **Putusan bukan sinyal beli/jual.** Keluarannya kategori riset, red flag, dan pertanyaan verifikasi yang harus dijawab investor sendiri.
- **Node kebijakan/regulasi** di Papan Bukti ditunda — lihat `docs/ROADMAP.md`.

## Dokumentasi proyek

| File | Isi |
|---|---|
| [`IDEA.md`](IDEA.md) | Master plan: konsep, riset pasar, arsitektur 8 agen, anggaran kredit, rencana 3 minggu |
| [`docs/CONTRACT.md`](docs/CONTRACT.md) | Kontrak API backend ↔ frontend (tipe, endpoint, jaminan bentuk data) |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Rencana lanjutan + yang sengaja ditunda |
| [`docs/SUBMISSION.md`](docs/SUBMISSION.md) | Naskah submission: problem statement, track, storyboard video, post medsos |
| [`sectors-docs-digest.md`](sectors-docs-digest.md) | Digest teknis Sectors API/MCP: endpoint, aturan tagihan kredit, resep resmi & celah diferensiasi |
| [`riset-hackathon-global.md`](riset-hackathon-global.md) | Riset hackathon finance global: pemenang, tren, pola kemenangan |
| [`frontend/README.md`](frontend/README.md) · [`backend/README.md`](backend/README.md) | Rincian per sisi |

---

> ⚠️ **Disclaimer:** SIDANG adalah alat bantu riset dan analisis informasi pasar, **bukan** rekomendasi investasi. Keputusan investasi sepenuhnya tanggung jawab Anda. DYOR — dan biar SIDANG yang memulai risetnya.
