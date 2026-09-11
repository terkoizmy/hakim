# 📋 Project Hakim — Handoff & Implementation Summary

Dokumen ini ditujukan sebagai panduan handoff bagi agent atau pengembang berikutnya yang akan melanjutkan pengembangan proyek **Hakim** (Forensic Investment Courtroom & Detective Investigation Board untuk Bursa Efek Indonesia / IDX).

---

## 1. 🎯 Ikhtisar Proyek (Project Overview)
**Hakim** adalah platform analisis investasi berbasis AI dengan pendekatan *investigatif & persidangan forensik*.
Platform ini menggabungkan:
- **Ruang Sidang AI (Courtroom / `/sidang`)**: Simulasi persidangan saham dengan jaksa, pembela, saksi ahli, dan hakim untuk menguji kelayakan emiten.
- **Papan Investigasi Detektif (Detective Board / `/board`)**: Kanvas graf interaktif (React Flow) yang menghubungkan emiten dengan pemegang saham pengendali, jajaran direksi/komisaris, konglomerasi/grup terafiliasi, red flag, dan temuan forensik dari persidangan masa lalu.
- **Jurnal & Memo Forensik (`/jurnal`, `/memo`)**: Catatan putusan (*verdict*) sidang masa lalu beserta post-mortem kinerja saham.

---

## 2. 🚀 Pekerjaan yang Telah Diselesaikan (Completed Work)

### A. Refaktor & Integrasi Backend Detective Board (`backend/app/board.py`)
- **Live Sectors API v2 Integration**:
  - Mengubah pemanggilan endpoint Sectors API v2 untuk mengambil semua bagian data real: `overview,financials,valuation,peers,management,ownership,dividend`.
  - Normalisasi data persentase pemegang saham (`share_percentage` format desimal $\to$ format persen 0–100%).
  - Pemetaan jajaran eksekutif kunci (*key executives*) dan direksi/komisaris ke dalam node graf.
- **Konglomerasi & Cross-Holding Detection**:
  - Pengelompokan cerdas pemegang saham ke grup konglomerasi (Grup Djarum, Barito Pacific, Salim, Sinar Mas, Astra, BUMN/Danantara, Institusi Global).
  - Penandaan relasi *cross-holding* kepemilikan saham silang antar entitas.
- **Metrik Benchmark & Risk Scorecard**:
  - Kalkulasi metrik finansial emiten (PER, PBV, ROE, Debt/Equity, Net Margin) dibanding rata-rata sektor/peers.
  - Pembuatan skor risiko tata kelola (*governance*), finansial, dan valuasi secara dinamis.
- **AI Detective Insights & Real-Time Chat**:
  - Integrasi endpoint `/api/board/{ticker}` dan `/api/board/{ticker}/chat` untuk memberikan narasi investigasi berbasis data real.

### B. Refaktor Frontend Detective Board (`frontend/src/pages/DetectiveBoardPage.tsx`)
- **Tipe Data Bersih (`frontend/src/types/board.ts`)**:
  - Dibuat mandiri tanpa dependensi file mock lokal.
  - Menyediakan styling metadata `EDGE_META` dan `NODE_TYPE_META`.
- **Integrasi Live Data**:
  - Menggunakan `api.fetchBoard(ticker)` dan `api.fetchJournal(100)` secara langsung.
  - Sidebar kiri memfilter emiten yang telah lolos sidang dengan kategori **Layak Diteliti Lanjut** (`layak_diteliti_lanjut`) dan **Perlu Kehati-hatian** (`perlu_kehati_hatian`).
  - Dilengkapi *state loader*, *error recovery* (*"Coba Muat Ulang"*), dan *drawer deep dive* interaktif (grafik harga historis & benchmark komparasi sektor).

### C. Pembersihan Dependensi Mock Data Frontend
- Menghapus ketergantungan pada folder `frontend/src/mocks/` dan `frontend/src/data/`.
- Memperbaiki impor pada `frontend/src/api/mockRest.ts` dan `frontend/src/api/mockSse.ts` menggunakan *safe fallback stubs* agar bundler Vite tidak menghasilkan error kompilasi.
- Memastikan frontend berjalan dalam mode real live (`VITE_USE_MOCK=0`).

---

## 3. 📂 Peta File Kunci (Key Files Map)

### Backend (`/backend`)
| File | Deskripsi |
| :--- | :--- |
| [`backend/app/board.py`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/backend/app/board.py) | Generator graf investigasi (nodes, edges, risk scorecard, benchmark) berbasis Sectors API & database memo |
| [`backend/app/main.py`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/backend/app/main.py) | Entrypoint FastAPI REST API & SSE streaming |
| [`backend/app/models.py`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/backend/app/models.py) | Model data Pydantic untuk kontrak response REST/SSE |
| [`backend/app/sectors/client.py`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/backend/app/sectors/client.py) | Klien HTTP Sectors API v2 |
| [`backend/app/db.py`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/backend/app/db.py) | Database SQLite lokal untuk persistence memo sidang & audit log |

### Frontend (`/frontend`)
| File | Deskripsi |
| :--- | :--- |
| [`frontend/src/pages/DetectiveBoardPage.tsx`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/frontend/src/pages/DetectiveBoardPage.tsx) | Halaman Papan Investigasi Detektif (React Flow graph canvas, filters, inspector drawer, AI chat) |
| [`frontend/src/types/board.ts`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/frontend/src/types/board.ts) | Definisi TypeScript untuk nodes, edges, dan scorecard graf detektif |
| [`frontend/src/api/rest.ts`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/frontend/src/api/rest.ts) | Klien REST API live (fetch board, memo, journal, tickers, health) |
| [`frontend/src/api/mockRest.ts`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/frontend/src/api/mockRest.ts) | Mock REST client (sudah distub mandiri tanpa impor mock file) |
| [`frontend/src/api/mockSse.ts`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/frontend/src/api/mockSse.ts) | Mock SSE client (sudah distub mandiri tanpa impor mock file) |
| [`frontend/src/config.ts`](file:///C:/Users/terkoiz/Documents/hackathon/hakim/frontend/src/config.ts) | Konfigurasi runtime frontend (`VITE_USE_MOCK`, `VITE_API_BASE`) |

---

## 4. ⚙️ Panduan Menjalankan Lingkungan (How to Run)

### Backend
1. Masuk ke direktori `backend/`:
   ```bash
   cd backend
   ```
2. Pastikan file `.env` memiliki kredensial API yang valid:
   ```env
   SECTORS_API_KEY=your_sectors_api_key
   OPENAI_API_KEY=your_llm_api_key (opsional jika pakai mode streaming agen)
   ```
3. Jalankan server FastAPI:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend
1. Masuk ke direktori `frontend/`:
   ```bash
   cd frontend
   ```
2. Pastikan file `.env` diatur ke mode live:
   ```env
   VITE_USE_MOCK=0
   VITE_API_BASE=http://localhost:8000
   ```
3. Jalankan dev server Vite:
   ```bash
   npm run dev
   ```

---

## 5. 💡 Rekomendasi Langkah Selanjutnya untuk Agent Berikutnya (Next Steps)
1. **Penyempurnaan AI Chat di Papan Detektif**:
   - Menghubungkan chatbot papan detektif di backend (`backend/app/board.py` $\to$ `chat_board`) dengan LLM agent yang dapat melakukan *graph traversal* (mis. menjawab pertanyaan "siapa pengendali bersama antara emiten A dan emiten B?").
2. **Export / Share Investigation**:
   - Menambahkan fitur ekspor kanvas investigasi (PNG/PDF) untuk laporan riset pengguna.
3. **Penyempurnaan Clustering Visual**:
   - Menambahkan visual hull/grouping visual otomatis di React Flow untuk node-node yang termasuk dalam satu konglomerasi/grup pemilik yang sama.
