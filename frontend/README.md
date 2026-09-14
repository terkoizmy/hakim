# SIDANG — Frontend

Panel sidang interaktif untuk **SIDANG** (stock court berbasis agen): 5 analis menggali bukti dari Sectors API → jaksa (bear) vs pembela (bull) berdebat 2 ronde → hakim menulis memorandum riset.

Frontend ini adalah klien tipis: seluruh data — termasuk memo, papan bukti, dan balasan chat — datang dari backend lewat REST + SSE. Tidak ada data contoh yang ditanam di sisi frontend.

## Menjalankan

Backend harus jalan lebih dulu (lihat `../backend/README.md`), lalu:

```bash
npm install
npm run dev        # http://localhost:5173 (Vite)
```

Contoh berkas env: salin `.env.example` → `.env.local`.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `VITE_API_BASE` | `http://localhost:8000` | Root API backend (REST + SSE). |

Untuk menjalankan sidang di atas data contoh tanpa memakai kredit Sectors, set `SECTORS_MODE=fixture` di backend — bukan di frontend. Frontend membaca mode yang **sebenarnya** dari payload `trial_started` dan menampilkan penanda `fixture` di bilah perkara.

## Perintah

```bash
npm run build       # tsc -b && vite build
npm run typecheck   # tsc -b (tanpa bundle)
npm run preview     # serve hasil build
```

`typecheck` adalah pengaman utama proyek ini: kamus Indonesia ditulis `satisfies typeof en`, jadi satu kunci terjemahan yang kurang langsung menggagalkan build.

## Struktur

```
src/
  api/          StreamClient (sse.ts) + RestClient (rest.ts) — HTTP/SSE nyata ke backend
  i18n/         LangProvider, useLang(), t(), renderRich(), dict/ (en kanonik + id), format.ts
  state/        trialReducer — event SSE → state UI
  hooks/        useTrialStream — koneksi, reconnect (backoff), resume via Last-Event-ID
  pages/        Home, Dashboard, Courtroom, Memo, Journal, Postmortem, TickerDetail,
                DetectiveBoard, NotFound
  components/   AppShell, icons, PriceChart, InfoBadge, VerdictBadge
  styles/       tokens.css (desain token) · base.css (primitif) · app.css (halaman)
  types/        contract.ts — transkripsi 1 : 1 CONTRACT.md · board.ts — tipe papan bukti
```

## Catatan

- **Dwi-bahasa, default Inggris.** Saklar `ID | EN` di header; pilihan disimpan di `localStorage` (`sidang.lang`). Yang diterjemahkan hanya chrome UI — putusan, argumen, ringkasan analis, dan balasan chat tetap Bahasa Indonesia karena dihasilkan backend. Panel chat papan mencantumkan keterangan kecil soal ini.
- Tema "ruang sidang" gelap dengan aksen kuningan (brass).
- `StreamClient`/`RestClient` adalah satu-satunya pintu ke backend; halaman tidak pernah tahu bagaimana datanya diambil.
- Hanya boleh menulis di bawah `frontend/` — backend & `docs/` dipegang orkestrator.
