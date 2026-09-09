# SIDANG — Frontend

Panel sidang interaktif untuk **SIDANG** (stock court berbasis agen): 5 analis menggali bukti dari Sectors API → jaksa (bear) vs pembela (bull) berdebat 2 ronde → hakim menulis memorandum riset.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173 (Vite)
```

### Mode Mock vs Live

- **Mock (default jalan tanpa backend):** set `VITE_USE_MOCK=1`. Replay alur `src/mocks/stream-BBCA.jsonl` lewat SSE palsu, feed REST palsu, dan jurnal/post-mortem fixture. Cocok untuk demo & development frontend.
- **Live (backend):** biarkan `VITE_USE_MOCK` kosong, set `VITE_API_BASE` ke root backend (default `http://localhost:8000`).

Contoh berkas: salin `.env.example` → `.env.local`, lalu ubah nilainya.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `VITE_API_BASE` | `http://localhost:8000` | Root API backend (REST + SSE). |
| `VITE_USE_MOCK` | — | `1` = pakai mock SSE/REST. |
| `VITE_MOCK_SPEED` | `1` | Faktor laju replay mock (`2` = 2× lebih cepat). |
| `VITE_MOCK_DROP_ONCE` | — | `1` = simulasikan sekali koneksi putus saat replay (uji reconnect). |
| `VITE_MOCK_SKIP_FILLER_MS` | `900` | Jeda maksimum antar-event mock dalam milidetik. |

## Perintah

```bash
npm run build       # tsc -b && vite build
npm run typecheck   # tsc -b (tanpa bundle)
npm run mock:check  # validasi seluruh alur JSONL mock
npm run mock:e2e    # uji alur mock end-to-end (Vite SSR, tanpa browser)
npm run preview     # serve hasil build
```

## Struktur

```
src/
  api/          StreamClient (sse.ts) + mock (mockSse.ts, mockRest.ts, mockData.ts, mockStore.ts)
  mocks/        stream-BBCA.jsonl + fixture jurnal & post-mortem (journal.ts)
  state/        trialReducer — event SSE → state UI
  hooks/        useTrialStream — koneksi, reconnect (backoff), resume
  pages/        Home, Courtroom, Memo, Journal, Postmortem, NotFound
  components/   AppShell, icons
  styles/       tokens.css (desain token) · base.css (primitif) · app.css (halaman)
  types/        contract.ts — transkripsi 1 : 1 CONTRACT.md
```

## Catatan

- UI berbahasa Indonesia; tema "ruang sidang" gelap dengan aksen kuningan (brass).
- `StreamClient` punya antarmuka identik untuk live & mock — UI tidak peduli sumber data.
- Mock `memo_ready` menulis memo ke `mockStore` agar halaman `/memo/:trialId` & jurnal dapat mengakses lintas rute.
- Hanya boleh menulis di bawah `frontend/` — backend & `docs/` dipegang orkestrator.
