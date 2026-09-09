# Riset Global: Hackathon Finance & Tren Topik (kompilasi final)

> Disusun 9 Sep 2026 untuk validasi strategi **SIDANG** (Sectors Hackathon Indonesia 2026).
> Pasangan dokumen: `IDEA.md` (master plan + riset pasar Indonesia) · `sectors-docs-digest.md` (riset teknis API Sectors).

---

## A. Hackathon finance di luar Indonesia — pemenang & idenya

### 1. DTCC Innovate 2025 (AS — infrastruktur pasar finansial; 250+ peserta, grant total $250k+)
Sumber: [DTCC announcement](https://www.dtcc.com/dtcc-connection/articles/2025/april/02/dtcc-announces-winners-from-first-ai-powered-hackathon)

| Juara | Proyek | Ide inti |
|---|---|---|
| 🥇 Gold $100k | **Team CIBC** — Automated Regulatory Change Management | GenAI otomasi evaluasi dokumen regulasi: deteksi perubahan, pastikan kepatuhan. Estimasi hemat "berbulan-bulan kerja per orang per tahun" |
| 🥈 Silver $75k | **Cyber ThirdEye** (DTCC + Standard Chartered dll.) | Platform scoring risiko cyber vendor pihak ketiga — satu dashboard untuk CISO |
| 🥉 Bronze $40k | **Team Xypher** (Deutsche Bank) — AI Trade Settlement | Verifikasi trade + deteksi error + prediksi kebutuhan likuiditas + agen AI deteksi "daisy chain" |
| Akademik $40k | **Cipher Sentinel** (Duke University) | AML real-time untuk dompet digital |
| Vendor | **Accenture** | GenAI evaluasi dokumen regulasi (otomasi kepatuhan) |

**Kutipan juri yang penting:** *"a simple yet impactful design... an intuitive solution that can be operationalized by firms immediately"* + *"condenses a process that typically takes many hours."*

### 2. DTCC i-Hack 2025 India (Drishtikon)
Sumber: [repo pemenang](https://github.com/finos-labs/dtcc-i-h-2025-drishtikon)

**Pemenang: "Investica"** — asisten finansial AI untuk investor ritel dengan **7 agen spesialis**:
- Routing Agent (Claude + Bedrock), Portfolio Assessor (Pydantic AI), Trade Executor (LangGraph), Post-Trade Manager (**MCP protocol**), Financial Analyst (financialdatasets.ai), Zerodha Agent (Kite API), Output Agent (Streamlit)
- Fitur: memory persisten, chat NL, orkestrasi workflow, analisis fundamental + risiko

### 3. MumbaiHacks 2025 (3.500+ peserta — hackathon agentic AI terbesar dunia, India)
Sumber: [post pemenang fintech track](https://www.linkedin.com/posts/shravanirasam02_mumbaihacks-fintech-winners-activity-7400959750026330112-XoIf) · [runner-up](https://www.linkedin.com/posts/ketan-kunkalikar-9393b6225_we-ranked-second-at-mumbaihacks-2025-activity-7401587331159429121-kued)

| Juara | Proyek | Ide inti |
|---|---|---|
| 🥇 Fintech track (₹2,5 lakh, top-5 dari 3.500+) | **MoneyMitra** (Team Coding Gurus) | Asisten finansial pribadi (web + mobile app, dibangun di dalam 48 jam). Juri sampai bertanya: "ini benar-benar jalan atau cuma desain Figma?" — **UI polish + produk nyata yang menang** |
| 🥈 | **Ops copilot** | Agen web-browsing yang otomasi tugas harian Ops Specialist bank |

### 4. SingHacks 2025 (Tenity, Singapura — hackathon fintech agentic AI pertama di Asia; 270 peserta; didukung Julius Baer, Hedera, Ancileo×MSIG, AMD, Visa, Groq)
Sumber: [Tenity](https://www.tenity.com/tenity-concludes-singhacks-asias-first-fintech-focused-hackathon-for-agentic-ai/)

- **Track & pemenang tahap 1:** RegTech Intelligence (Julius Baer) — finalis **Fraudbusters**, **DINNR**; Empowered Finance (Hedera) — finalis **Agents of SIT**, **ProvidAI**, **The Trading Thing**; Conversational Insurance (Ancileo×MSIG) — finalis **Rep Monkeys**, **Guardian of Agents**, **NTU SAARS**
- Semua track = **"build agentic AI systems that..."** — agen AI adalah format resmi, bukan tema opsional

### 5. Coinbase "Agents in Action" Hackathon 2025
Sumber: [AgentVault di Devfolio](https://devfolio.co/projects/agentvault-742f)

**AgentVault** (proyek unggulan) — agen investasi crypto otonom: FinBERT-LSTM, eksekusi <500ms via CDP Wallet + x402, MPC security, dan — yang relevan buat kita — **audit trail on-chain: bukti logika keputusan tiap aksi agen yang bisa diverifikasi publik**. Akuntabilitas agen dijual sebagai fitur utama.

### 6. IBM watsonx Agentic AI Hackathon 2025
Sumber: [FinAgentPro repo](https://github.com/HalimaF/FinAgentPro)

**FinAgentPro** — platform multi-agent otomasi operasi finansial (klasifikasi expense, invoice, fraud detection, cashflow forecasting, chat) diorkestrasi watsonx. Bukti kategori "multi-agent financial ops" sudah mapan di level enterprise.

### 7. Konteks produk (bukan hackathon, tapi pembanding langsung)
- **[AgentPit](https://www.agentpit.io/en)** — produk komersial multi-agent stock analysis (global) — kategori kita sudah jadi pasar
- **[TradingAgents](https://github.com/TauricResearch/TradingAgents)** (Tauric Research) — framework open-source multi-agent trading firm: analysts → bull/bear debate → trader → risk → PM (LangGraph). Referensi pola untuk SIDANG; kode ditulis ulang sendiri

---

## B. Tren makro fintech 2026

- **[CB Insights — 9 Fintech Predictions 2026](https://www.cbinsights.com/research/report/fintech-predictions-2026/)**: kalimat kunci — ***"AI agents are starting to move money autonomously."*** Agentic AI + neobank jadi bank penuh (Chime IPO, Nubank charter) + Robinhood jadi superapp + BNPL jadi bank.
- **[KPMG Pulse of Fintech H1 2026](https://assets.kpmg.com/content/dam/kpmgsites/xx/pdf/2026/08/pulse-of-fintech-h1-2026.pdf)** & **[JPMorgan Fintech Trends 2026](https://www.jpmorgan.com/content/dam/jpmorgan/documents/cb/insights/technology/jpm-2026-fintech-industry-trends-report.pdf)** — pendukung arus utama yang sama: AI/agensi = pendorong utama.

**Kesimpulan tren:** "AI + finance" sudah lewat puncak hype-nya sebagai fitur; yang naik sekarang adalah **produk yang memperlihatkan cara AI berpikir dan bertanggung jawab** (agensi, debat, audit trail, keputusan terverifikasi) — bukan sekadar "AI yang menjawab".

---

## C. Pola kemenangan (lintas-event)

1. **Agentic AI = format raja 2025–2026** — dari DTCC (institusional) sampai MumbaiHacks (ritel), hackathon secara eksplisit mensyaratkan/mengarahkan peserta ke sistem agen
2. **Juri memberi penghargaan pada "bisa dipakai segera", bukan "paling canggih"** — kutipan DTCC ("simple yet impactful, operationalized immediately") persis filosofi rubrik Sectors (usability 40%)
3. **Institusional → automasi kepatuhan & risiko** (regulatory change, AML, cyber scoring, settlement) — pain paling mahal & paling measurable
4. **Ritel → asisten finansial pribadi & agen portofolio** (MoneyMitra, Investica) — keduanya multi-agent, keduanya menang
5. **UI polish + produk yang benar-benar jalan memisahkan juara 1 dari yang lain** (juri MumbaiHacks menyangsikan apakah UI pemenang nyata; pemenang DTCC dipuji karena intuitif)
6. **Akuntabilitas agen muncul sebagai fitur pemenang** (audit trail on-chain AgentVault) — kepercayaan pada keputusan AI = isu berikutnya, dan yang menjawabnya unggul

---

## D. Validasi & penyesuaian untuk SIDANG

| Temuan riset global | Dampak ke SIDANG |
|---|---|
| Multi-agent keuangan ritel MENANG (Investica — DTCC India; MoneyMitra — MumbaiHacks) | ✅ Kategori terbukti menang. Bukan eksperimen |
| Semua pemenang ritel di **portofolio/eksekusi/ops** — tidak ada di **"sidang pra-keputusan"** | ✅ Jalur kita kosong: second opinion adversarial sebelum beli + tanpa eksekusi (yang di hackathon kita memang dilarang) |
| Juri memuji "operationalized immediately" & produk nyata | ✅ Sudah jadi desain kita (MVP end-to-end dini Minggu 1); **perkuat: anggarkan waktu ekstra untuk UI polish** — juri menanyakan "Figma atau nyata?" |
| Audit trail/akuntabilitas = fitur pemenang (AgentVault) | ✅ Jurnal Sidang (post-mortem memo vs harga) = audit trail versi kita. Naikkan prioritas: bukan nice-to-have, ini senjata 30% video |
| Automasi kepatuhan dominan di track institusional | ℹ️ Tidak relevan langsung (kita ritel), tapi menegaskan pola: **pain nyata yang measurable menang** — pain kita (gorengan, FOMO, no-access riset) sudah diangka di `IDEA.md` §2 |

**Kesimpulan:** riset global mengkonfirmasi kategori, mengosongkan jalur diferensiasi, dan memberi 2 penyesuaian eksekusi: (1) UI polish naik prioritas, (2) Jurnal Sidang dipromosikan jadi fitur andalan, bukan tambahan. Tidak ada perubahan pada konsep inti.

---

## E. Catatan metodologi

- Semua klaim diberi sumber URL; halaman dibaca langsung (Playwright) pada 9 Sep 2026
- Beberapa sumber sekunder gagal diakses (403/404: exhibit.tech, cxotoday, curriculum-magazine) — tidak mengurangi kesimpulan karena sumber primer lain tersedia
- Dua riset mendalam tambahan (daftar pemenang Money20/20, Plaid, Mastercard, JPMC, Bloomberg, Nasdaq, Alpaca, Kaggle, devpost) berjalan di background saat kompilasi ini — jika hasilnya mendarat, akan dilampirkan sebagai "Gelombang 2" di file ini