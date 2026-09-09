# SIDANG ⚖️🐂🐻

> **"Sebelum beli, adili dulu."** — 20,3 juta investor ritel Indonesia punya SID. Setiap SID butuh SIDANG.

**SIDANG** adalah "pengadilan saham" berbasis multi-agent AI untuk pasar modal Indonesia. Kasih ticker IDX apa pun → lima analis data memeriksa bukti dari [Sectors API](https://docs.sectors.app) → jaksa (bear) dan pembela (bull) berdebat → hakim merumuskan **memorandum riset** berbahasa Indonesia, bersitasi, dalam ±5 menit.

**Bukan "AI yang bilang BELI" — second opinion terstruktur sebelum kamu menekan tombol beli.**

---

## Masalahnya

- **20,32 juta investor ritel** Indonesia (akhir 2025, +36% YoY), dominan milenial & Gen Z — pengalaman minim, aset kecil
- **Saham gorengan** = isu nasional 2025–2026; investor ritel tidak tahu cek red flag (suspensi, free float, anomali)
- **Equity research** yang layak hanya milik institusi — mahal, bahasa Inggris, tidak ada untuk investor kecil
- Arus dana institusi/asing & transaksi insider *tersedia sebagai data* — tapi ritel tidak bisa membacanya

## Cara kerja

```
User: "sidang CUAN"
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
```

## Fitur inti

| Fitur | Kenapa beda |
|---|---|
| **Memorandum Sidang** | Memo riset terstruktur: tiap angka bersitasi endpoint Sectors, peringkat kekayaan informasi A/B/C (lapisan kejujuran soal keterbatasan data) |
| **Debat transparan** | Proses berpikir AI diperlihatkan (jaksa vs pembela), bukan black box |
| **Jurnal Sidang** | Akuntabilitas: putusan komite di masa lalu bisa dibandingkan dengan harga sekarang |
| **Analis Anti-Gorengan** | Red flag khas Indonesia (suspensi, free float mini) dari data yang tidak dimiliki framework global |

## Konteks hackathon

Dibangun untuk [Sectors Hackathon Indonesia 2026](https://hackathon.sectors.app) — **Track 1: AI Agents & Assistants** (custom multi-agent orchestration, LLM di inti produk).

- Sectors API/MCP = sumber data inti (hapus Sectors → produk kehilangan jantungnya)
- **Bukan** rekomendasi investasi — alat bantu riset & analisis, putusan berupa kategori riset + pertanyaan verifikasi
- **Tanpa** eksekusi trading otomatis

## Stack (rencana)

| Komponen | Pilihan |
|---|---|
| Backend | Python + FastAPI, orkestrasi graph custom, SSE streaming |
| Data | Sectors REST API v2 (client tipis + cache), SQLite untuk jurnal & cache |
| Frontend | Satu halaman web (React/Vite): input ticker → live feed sidang → memo → jurnal |
| LLM | Model murah untuk 5 analis (grounded summarization), model kuat untuk debat & hakim |

## Status

**Fase 0 — Perencanaan selesai, menunggu pembangunan (Minggu 1–3, Sep 2026).**
Rencana eksekusi lengkap di `IDEA.md` §10.

## Dokumentasi proyek

| File | Isi |
|---|---|
| [`IDEA.md`](IDEA.md) | Master plan: konsep, riset pasar, arsitektur 8 agen, anggaran kredit, rencana 3 minggu |
| [`sectors-docs-digest.md`](sectors-docs-digest.md) | Digest teknis Sectors API/MCP: endpoint, aturan tagihan kredit, resep resmi & celah diferensiasi |
| [`riset-hackathon-global.md`](riset-hackathon-global.md) | Riset hackathon finance global: pemenang, tren, pola kemenangan |

---

> ⚠️ **Disclaimer:** SIDANG adalah alat bantu riset dan analisis informasi pasar, **bukan** rekomendasi investasi. Keputusan investasi sepenuhnya tanggung jawab Anda. DYOR — dan biar SIDANG yang memulai risetnya.