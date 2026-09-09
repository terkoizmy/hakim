# SIDANG — Sidang Pasar Modal Indonesia

> **Master Idea · Sectors Hackathon Indonesia 2026 · Track 1: AI Agents & Assistants**

**Tagline:** *"Sebelum beli, aduli dulu."*
**Pun killer:** Indonesia punya **20,3 juta SID** (Single Investor ID). **Setiap SID butuh SIDANG.**

---

## 1. One-liner

**SIDANG** adalah "pengadilan saham" berbasis multi-agent AI: kasih ticker IDX apa pun → lima analis data memeriksa bukti dari data Sectors → jaksa (bear) dan pembela (bull) berdebat → hakim merumuskan **memorandum riset** yang jujur, terstruktur, berbahasa Indonesia, dalam ~5 menit.

Bukan "AI yang bilang BELI". **Second opinion terstruktur sebelum kamu menekan tombol beli.**

---

## 2. Masalahnya (berbasis riset, bukan asumsi)

| Fakta pasar | Sumber |
|---|---|
| Investor pasar modal Indonesia mencapai **20,32 juta SID** akhir 2025, **+36% YoY** | [Antara](https://www.antaranews.com/berita/5327392/jumlah-investor-pasar-modal-ri-capai-2032-juta-sid-di-akhir-2025), [Kontan](https://investasi.kontan.co.id/news/ksei-catat-sid-pasar-modal-naik-36-jadi-202-juta-per-24-desember-2025) |
| **Milenial & Gen Z = penopang utama** jumlah investor (dominasi jumlah, bukan aset) | [SWA/OJK](https://swa.co.id/read/466125/ojk-milenial-dan-gen-z-masih-jadi-penopang-utama-investor-pasar-modal), [kabarbaik](https://kabarbaik.co/generasi-muda-dominasi-jumlah-investor-pasar-modal-aset-masih-dikuasai-investor-senior/) |
| **Saham gorengan** = isu panas 2025–2026, investor ritel dirugikan | [Kompas](https://money.kompas.com/read/2026/02/15/153709826/kenali-ciri-saham-gorengan-begini-strategi-aman-investor-ritel), [Kontan](https://investasi.kontan.co.id/news/isu-saham-gorengan-jadi-sorotan-ini-risikonya-dan-cara-mengantisipasi), [TrenAsia](https://www.trenasia.id/tren-ekbis/menilik-kerugian-investor-akibat-saham-gorengan) |
| Sekuritas besar (Stockbit, IPOT) sudah mengirimi fitur AI ke investor ritel → **permintaan tervalidasi** | [Stockbit AI Reports](https://snips.stockbit.com/fitur-stockbit/ai-reports-stockbit-inovasi-ai-dari-sekuritas-terbaik-dan-aman-di-indonesia), [IPOT/Liputan6](https://www.liputan6.com/saham/read/8245875/ipot-kenalkan-analisis-investasi-berbasis-kecerdasan-buatan) |

**Gap-nya:** equity research yang layak hanya untuk institusi. Investor ritel muda yang baru masuk:
1. Tidak punya akses riset analis (mahal, institusional, bahasa Inggris).
2. Rentan FOMO & saham gorengan (tidak tahu cek red flag: suspensi, free float, anomali volume).
3. Tidak bisa membaca arus dana institusi/asing — padahal datanya *ada*.

**Job-to-be-done:** *"Saya mau beli BBCA/CUAN/[ticker], tapi saya bukan analis. Selidiki ini buat saya — kasih tahu sisi bullish-nya, sisi bearish-nya, dan red flag-nya — 5 menit, Bahasa Indonesia, dengan data nyata."*

---

## 3. Produknya

### Alur pengguna
```
User: "sidang CUAN"
  → SIDANG berlangsung (streaming, bisa ditonton):
     [1] 5 Analis mengumpulkan & merangkum bukti dari data Sectors (paralel)
     [2] Jaksa (bear) vs Pembela (bull) berdebat 2 ronde
     [3] Hakim Ketua mengucapkan putusan
  → MEMORANDUM SIDANG (halaman report, bisa di-share)
  → Tersimpan di JURNAL SIDANG
```

### Memorandum Sidang (output)
1. **Ringkasan eksekutif** (1 paragraf)
2. **Peringkat kekayaan informasi A/B/C** — seberapa lengkap datanya; membedakan "data memadai" vs "estimasi" (lapisan kejujuran)
3. **Fakta kunci** — angka + sitasi endpoint Sectors (harga, valuasi, arus dana, insider, suspensi)
4. **Tesis Pembelaan (bull)** — dengan data
5. **Tesis Penuntutan (bear)** — inversi Munger: jalur kegagalan, "kenapa orang cerdas tidak membeli?"
6. **Bukti smart money & insider** — akumulasi broker institusi, foreign flow, transaksi direksi
7. **Cek gorengan / red flags** — riwayat suspensi, free float, aksi korporasi, anomali
8. **Putusan komite** — bukan BELI/JUAL, tapi kategori riset: *Layak diteliti lebih dalam / Perlu kehati-hatian / Red flag berat* + **daftar pertanyaan yang harus dijawab user sendiri**
9. **Disclaimer**: alat bantu riset & analisis, bukan rekomendasi investasi

### Jurnal Sidang (fitur pembeda kedua)
Setiap memo tersimpan. Halaman **"Rekap Sidang"**: memo lama vs pergerakan harga sejak memo itu ditulis (post-mortem). Komite yang bisa dipertanggungjawabkan = trust. (Dan bahan demo yang brutal bagus.)

---

## 4. Arsitektur (MVP, solo-buildable)

### Tim agent — dibangun sendiri, bukan fork

| Agen | Tugas | Data Sectors (v2) |
|---|---|---|
| **Analisis Fundamental** | Esensi bisnis (lensa Duan), parit (lensa Buffett), valuasi vs peers | Company Report (sections), Quarterly Financials, Revenue Segments, Subsector Report, Companies Screener (peers by subsector) |
| **Analisis Harga** | Momentum, vs indeks, konteks top movers | Daily Transaction Data (≤90d), Index Daily, Top Company Movers |
| **Smart Money** *(unik Sectors)* | Akumulasi/distribusi broker institusi vs ritel, arus asing | Top Buyers/Sellers Per Symbol, Broker Registry (cohort institusi/asing), Daily Net Foreign Inflow |
| **Insider** *(unik Sectors)* | Transaksi direksi & pemegang saham besar | Company Filings (filter transaksi buy/sell insider) |
| **Anti-Gorengan** *(sangat lokal)* | Red flags: suspensi, free float mini, aksi korporasi berisiko | Stock Suspensions (dengan alasan resmi), Free Float Screener, Corporate Actions |
| **Jaksa (bear)** | Argumen penuntut terkuat — inversi Munger | Rangkuman 5 analis |
| **Pembela (bull)** | Argumen pembelaan terkuat | Rangkuman 5 analis |
| **Hakim Ketua** | Menimbang debat → memorandum + skor + pertanyaan verifikasi | Semua di atas + Jurnal Sidang (memori) |

**Orkestrasi:** graph sederhana sendiri (Python; LangGraph opsional, atau asyncio + routing manual — pola TradingAgents dipelajari, kode ditulis ulang: `analysts → researchers (2 ronde) → judge`, skip trader/portfolio manager/backtesting yang gak relevan).

### Stack MVP
- **Backend**: Python + FastAPI, SSE streaming (progres sidang ditonton live)
- **Data**: Sectors REST API v2 (client tipis buatan sendiri + cache respons) — dipilih di atas MCP untuk **kontrol kredit presisi**: `sections` eksplisit per analis (1 kredit/section vs default 8), screening `where` terstruktur (1 kredit) alih-alih `q=` natural language (3 kredit). MCP (`https://sectors-mcp.supertype.ai/mcp`, 65+ tools, auth `Bearer <key>`) dipakai untuk eksplorasi/dev via klien AI, bukan jalur produksi
- **Storage**: SQLite (jurnal sidang + cache) — *ponytail: satu file DB, cukup untuk hackathon*
- **Frontend**: satu halaman web (React/Vite): input ticker → live feed sidang → memo → jurnal
- **LLM**: model murah untuk 5 analis (tugasnya grounded-summarization), model lebih kuat untuk jaksa/pembela/hakim. ~12–18 panggilan LLM per sidang.

### Anggaran (berbasis aturan tagihan riil — hasil riset pricing)
Aturan tagihan: 2xx = biaya endpoint (mayoritas 1 kredit); **company report = 1 kredit per section** (default 8 section = 8 kredit → selalu pass `sections` eksplisit); screener `where` = 1 kredit, `q=` NL = **3 kredit** (hindari); 404 = 1; 400/401/403/429/5xx = gratis; hasil kosong tetap ditagih.

**Budget per sidang** (sections dibagi antar analis + cache lintas-sidang):

| Panggilan | Kredit |
|---|---|
| Company report `sections=financials,valuation,peers,management,ownership` (dipakai bersama Fundamental + Insider) | 5 |
| Quarterly financials + revenue segments | 2 |
| Daily tx + index daily + top movers | 3 |
| Broker top buyers/sellers + foreign flow (registry di-cache sekali) | 2 |
| Filings insider | 1 |
| Suspensi + free float + corporate actions | 3 |
| **Total per sidang** | **≈16** |

→ Grant 1.000 kredit ≈ **±60 sidang** (+cache menaikkan). Mode dev pakai fixture/cache — replay tanpa kredit.

- **Biaya LLM**: out of pocket, model murah untuk analis ≈ $0,05–0,15/sidang.

---

## 5. Tulang punggung analisis: kerangka 4 maestro

Diferensiasi metodologi (bukan sekadar "AI chatbot"):
- **Duan Yongping** — esensi bisnis: "bisnis yang benar", satu kalimat keunggulan
- **Buffett** — parit ekonomi: 5 jenis parit, "apakah parit ini ada 10 tahun lagi?"
- **Munger** — inversi: "di mana kemungkinan terbesar saya salah?", jalur kegagalan
- **Li Lu** — posisi dalam pergeseran tren jangka panjang
- Plus: **peringkat kekayaan informasi A/B/C** di tiap memo — jujur soal keterbatasan data (saham baru/sepi = kelas C → memo menyebut pertanyaan yang wajib diverifikasi user)

---

## 6. Diferensiasi (kenapa juri harus pilih ini)

| Pesaing / pola | Mereka | SIDANG |
|---|---|---|
| Stockbit AI Reports | Peringkas dokumen keterbukaan info (1 dokumen → bullet) | Analisis multi-perspektif seluruh perusahaan, debat transparan, arus dana institusi, jurnal post-mortem |
| TradingAgents (framework) | Data pasar AS (Reddit/AlphaVantage), output keputusan trading, fork = karya orang lain | Data IDX unik Sectors, orkestrasi & prompt buatan sendiri, output = memo riset + disclaimer |
| Chatbot saham generik | 1 LLM, 1 panggilan, sering halusinasi tanpa sitasi | Multi-agent grounded: tiap angka punya sitasi endpoint, analyst tak bisa ngarang (data via tools) |
| Sectors.app sendiri (+ AI Search & AI Chat berbayarnya) | Data mentah + jawaban AI single-model | **Perilaku komite**: debat adversarial, memo bersitasi, jurnal post-mortem — bukan sekadar "AI + data Sectors" |
| Resep resmi Sectors docs (FinArena "human-agent") | 3 agen 1-tool + synthesizer → BUY/HOLD/AVOID + label sizing statis; tanpa debat, tanpa data news/filings/broker-flow nyata, tanpa memori, tanpa UI | Semua celah itu kami isi: debat jaksa vs pembela, 3 agen data-unik, jurnal post-mortem, UI produk |

**Sudut teknikal yang gak dimiliki siapa pun:** tiga analis yang secara struktural mustahil ada di framework AS — **Smart Money** (cohort broker institusi/asing), **Insider filings**, **Anti-Gorengan** (suspensi + free float). Ini tepat di kriteria "innovative use of Sectors API".

---

## 7. Pemetaan kriteria juri (total 100%)

| Kriteria | Bobot | Cara SIDANG menang |
|---|---|---|
| Real-world usability | **40%** | Persona nyata & masif (20,3 jt investor, dominan milenial/Gen Z), pain nyata (gorengan, no access ke riset), produk bisa dipakai HARI INI oleh siapa pun yang mau beli saham |
| Video demo & storytelling | **30%** | Demo = menonton jaksa vs pembela berdebat soal ticker nyata (CUAN?) + halaman Rekap Sidang yang menunjukkan memo 3 minggu lalu vs harga hari ini. Sinematik secara natural. |
| Technical depth & execution | **30%** | Orkestrasi custom (bukan fork), 3 agen data-unik-Sectors, memo terstruktur dengan sitasi, peringkat kekayaan informasi, jurnal + post-mortem, repo bersih & runnable |

---

## 8. Kepatuhan aturan (checklist)

- [x] Track 1 qualifying test: custom-built agent logic/orchestration (graph, peran, protokol debat — semua kode sendiri; bukan klien jadi + prompt)
- [x] Sectors sebagai sumber inti (hapus Sectors → produk kehilangan jantungnya)
- [x] Tanpa eksekusi trading otomatis (murni analisis)
- [x] Bukan nasihat finansial: putusan = kategori riset + pertanyaan verifikasi, disclaimer di tiap memo, posisi "alat bantu riset & analisis"
- [x] Repo dibuat di dalam build period (19 Agu–30 Sep 2026), commit history bersih dari kode pra-event
- [x] Freeze total setelah submit (exception hanya leak kredensial: revoke dulu, commit hanya penghapusan)
- [x] AI coding tools boleh tanpa disclosure
- [ ] Onboarding sectors.app selesai SEBELUM nulis kode proyek (wajib per peserta)
- [ ] Klaim 1.000 kredit setelah onboarding (kunci roster — mantapkan tim dulu)

---

## 9. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Halusinasi angka | Analyst hanya menerima data via tool; hakim dilarang pakai fakta tanpa sitasi; verifikasi angka kunci terprogram |
| Latensi sidang 2–4 menit | Streaming feed = fitur (menonton), bukan bug; cache respons |
| Kredit 1.000 habis | Cache agresif, scope panggilan per analis ketat, demo fokus 3–5 ticker |
| Scope creep | Yang TIDAK ada di MVP: portfolio manager, backtesting, alert terjadwal, chat memory panjang, multi-bahasa. Semua "nice to have" dicatat, tidak dibangun |
| Sendirian | Semua komponen dipotong ke ukuran 3 minggu; jika dapat teman → tambah polish UI + video |

---

## 10. Rencana eksekusi 3 minggu (9 → 30 Sep 2026)

### Minggu 1 (9–15 Sep) — Fondasi & end-to-end dini
- Daftar tim (solo) di portal, selesaikan onboarding sectors.app, klaim 1.000 kredit
- Init repo publik (commit pertama di dalam build period!)
- Sectors client + cache + env API key
- Orchestrator v0: 2 analis (Fundamental + Harga) → memo markdown CLI. **Target: satu ticker, end-to-end, sebelum 15 Sep.**

### Minggu 2 (16–22 Sep) — Komite lengkap
- 5 analis lengkap (tambah Smart Money, Insider, Anti-Gorengan)
- Jaksa vs Pembela (2 ronde) + Hakim Ketua
- FastAPI + SSE + UI web satu halaman: input ticker → live feed → memo

### Minggu 3 (23–29 Sep) — Poles & kemas
- Jurnal Sidang + halaman Rekap Sidang (post-mortem)
- Polish UI (skill frontend-design saat pembangunan)
- Uji 3–5 ticker nyata (contoh: 1 blue chip BBCA, 1 gorengan-ish untuk demo anti-gorengan bekerja, 1 saham baru)
- Teaser 1 menit (klimaks debat) + video judging ≤3 menit (masalah → audiens → sidang → memo → rekap)
- Post medsos dengan template thumbnail + tag akun Sectors

### 30 Sep — Submit pagi-pagi (jangan pas tengah malam), repo freeze total.

---

## 11. Checklist submission

- [ ] Repo publik, tanpa API key, tetap publik ≥90 hari setelah pemenang diumumkan
- [ ] Teaser 1 menit — publik di YouTube/medsos
- [ ] Video judging ≤3 menit — publik/unlisted (YT, Drive link-sharing, Loom)
- [ ] Problem statement 1 kalimat: *"SIDANG membantu 20 juta investor ritel Indonesia menguji ide beli sahamnya melalui sidang AI multi-agent berbasis data — sebelum uangnya keluar."* (draft, boleh dirapatkan)
- [ ] Pilihan track (AI Agents & Assistants) + nama anggota tim
- [ ] Post medsos (IG/LinkedIn/Threads/TikTok) tag akun resmi Sectors + template thumbnail Canva

---

## 12. Sumber riset

- KSEI/portal: [Antara — 20,32 jt SID](https://www.antaranews.com/berita/5327392/jumlah-investor-pasar-modal-ri-capai-2032-juta-sid-di-akhir-2025) · [Kontan — +36%](https://investasi.kontan.co.id/news/ksei-catat-sid-pasar-modal-naik-36-jadi-202-juta-per-24-desember-2025) · [Statistik publik KSEI](https://web.ksei.co.id/files/Statistik_Publik_Desember_2025.pdf)
- Demografi: [SWA/OJK — milenial & Gen Z penopang](https://swa.co.id/read/466125/ojk-milenial-dan-gen-z-masih-jadi-penopang-utama-investor-pasar-modal)
- Saham gorengan: [Kompas](https://money.kompas.com/read/2026/02/15/153709826/kenali-ciri-saham-gorengan-begini-strategi-aman-investor-ritel) · [Kontan](https://investasi.kontan.co.id/news/isu-saham-gorengan-jadi-sorotan-ini-risikonya-dan-cara-mengantisipasi) · [TrenAsia](https://www.trenasia.id/tren-ekbis/menilik-kerugian-investor-akibat-saham-gorengan)
- Kompetitor: [Stockbit AI Reports](https://snips.stockbit.com/fitur-stockbit/ai-reports-stockbit-inovasi-ai-dari-sekuritas-terbaik-dan-aman-di-indonesia) · [IPOT AI — Liputan6](https://www.liputan6.com/saham/read/8245875/ipot-kenalkan-analisis-investasi-berbasis-kecerdasan-buatan) · [AgentPit (global)](https://www.agentpit.io/en)
- Referensi pola multi-agent: [TradingAgents (TauricResearch)](https://github.com/TauricResearch/TradingAgents) — dipelajari polanya, kode ditulis ulang sendiri
- Hackathon: [halaman tracks](https://hackathon.sectors.app/#tracks) · [rules](https://hackathon.sectors.app/rules)
- API: [docs.sectors.app](https://docs.sectors.app) · [llms.txt index endpoint](https://docs.sectors.app/llms.txt)

---

---

## Lampiran teknis (hasil riset dokumentasi Sectors, 9 Sep 2026 — detail lengkap di `sectors-docs-digest.md`)

### Autentikasi & base URL
- **REST v2**: `https://api.sectors.app/v2` — header `Authorization: <API_KEY>` (raw key, **tanpa** prefix `Bearer`). v1 sudah mati (410 Gone).
- **MCP**: `https://sectors-mcp.supertype.ai/mcp` — header `Authorization: Bearer <API_KEY>` (prefix wajib, tanpa itu 401). 65+ tools (IDX/SGX/KLSE + mining), IDX ticker tanpa suffix `.JK`.
- API key dari sectors.app/api (plan Insider; grant hackathon = 1.000 kredit).

### Endpoint per agen (jalur final diverifikasi via `/schema.json` saat implementasi)
| Agen | Endpoint | Catatan kredit |
|---|---|---|
| Fundamental | `GET /v2/company/report/{sym}/?sections=financials,valuation,peers,dividend` + quarterly financials + segments | 1/section — jangan default all-8 |
| Harga | `/v2/transaction/daily`, `/v2/transaction/index-daily`, `/v2/ranking/top-changes` | 1/servis |
| Smart Money | broker top buyers/sellers per symbol + foreign-flow-by-symbol (+ broker-registry sekali, di-cache) | 1/servis |
| Insider | `/v2/news/filings` (filter buy/sell insider) + report `sections=management,ownership` | ownership = major shareholders, top transactions, **institutional flow, whale investors, conglomerates group** |
| Anti-Gorengan | `/v2/news/suspensions` (alasan resmi + link PDF), screener free-float, corporate actions | 1/servis |
| Screener peers | `GET /v2/companies/?where=...&order_by=...` | `where` = 1 kredit; `q=` NL = 3 |

### Kemampuan screener (untuk peer comparison)
- SQL-like: `=,!=,>,>=,<,<=,like,in`, `and`/`or`; notasi bracket `revenue[2023]`, `revenue_q[Q1-2024]`, `forecast_eps_growth[2025]`; aritmetika dua sisi.
- 200+ field: market_cap, forward_pe, **intrinsic_value**, esg_score, yield_ttm, roe_ttm, **rasio bank (NPL, CAR, LDR, CASA, NIM)**, forecast, peer averages, free_float, `tags`/`indices` (array `in`), bahkan `key_executives_name`/`major_shareholders_name`.
- `limit` max 200; response menyertakan `llm_translation` (terjemahan NL→param) — berguna debugging.
- "Tahun fiskal terbaru": Jan–Apr = tahun audit sebelumnya.

### Diferensiasi vs recipe resmi (juri mengenal resep-resep ini)
- **04-human-agent (FinArena, Jun 2026)**: profil risiko → 3 agen spesialis (masing-masing 1 tool) → Universal Expert synthesizer → BUY/HOLD/AVOID + label sizing statis. **Tidak punya**: debat adversarial, loop judge/critic, data news/filings/broker/foreign-flow nyata, model heterogen, MCP, memori, backtest, UI produk.
- **03-multiagent (OpenAI SDK)**: screener→researcher sekuensial + evaluator pass/fail 3 ronde. Tanpa debat bull/bear, tanpa jurnal.
- **02-tool-use**: single-agent function calling — baseline saja.
- → Ruang terbuka untuk SIDANG: adversarial debate + heterogeneous roles + real news/filings/flows + jurnal/memori + UI produk.

### Catatan data lain
- Coverage IDX 99,99% (950+ ticker, refresh harian); SGX ~80%.
- Rate limit dipublikasikan sebagai angka plan-gated (429 = sinyal upgrade) — jaga backoff di client.
- Sumber discovery ramah agent: `docs.sectors.app/llms.txt`, `/schema.json` (OpenAPI), semua halaman docs bisa di-fetch sebagai `.md`.