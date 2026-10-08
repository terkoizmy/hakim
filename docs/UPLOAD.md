# UPLOAD — urutan unggah & teks siap tempel

> Pendamping `docs/SUBMISSION.md`. Semua isian formulirnya ada di sana; dokumen
> ini hanya soal **mengunggah** dan teks yang perlu disalin ke kolomnya.

Berkas yang diunggah:

| Berkas | Isi | Catatan |
|---|---|---|
| `hakim-teaser/out/teaser-16x9-judging.mp4` | video judging | **170,2 s** (batas 180) · 1920×1080 · 28,5 MB |
| `hakim-teaser/out/teaser-9x16-judging.mp4` | video judging vertikal | 1080×1920 · 14,4 MB — Reels/Shorts/TikTok |
| `hakim-teaser/out/thumbnail-judging.png` | thumbnail YouTube | 1280×720 · 398 KB (batas 2 MB) |
| `hakim-teaser/out/teaser-16x9.mp4` · `teaser-9x16.mp4` | **teaser 60 detik** (Item 3) | 58 s · sudah ada sebelum perombakan |
| repo `https://github.com/terkoizmy/hakim` | repo publik | 117 berkas, 400 KiB |

---

## Di mana mengunggah? YouTube, Drive, atau Loom?

Aturan panitianya (tercatat di `IDEA.md` §checklist): *"publik/unlisted (YT, Drive
link-sharing, Loom)"* — **ketiganya sah**. Rekomendasinya:

| Tempat | Pakai untuk | Alasan |
|---|---|---|
| **YouTube** | video judging **dan** teaser | streaming adaptif (juri tidak perlu mengunduh 28 MB), bisa di-embed di post medsos, ada babak/timestamp + thumbnail + pemutar ponsel yang rapi. Teaser juga **wajib publik** — di Drive, "publik" tidak punya arti yang sama |
| **Google Drive** | **cadangan master** | folder `hakim-teaser/out/upload/` sudah siap di-drag: video judging 16:9 & 9:16, teaser 16:9 & 9:16, thumbnail, SRT, dan zip kode sumber (1,4 MB) |
| Loom | tidak perlu | tidak menambah apa pun untuk kebutuhan ini |

Kalau Drive dipakai sebagai tautan **utama**, setel sharing ke *Anyone with the
link — Viewer*. Drive yang masih "Restricted" adalah kesalahan paling sering, dan
juri tidak akan mengejar aksesnya. Perhitungkan juga kuota harian Drive untuk
berkas 28 MB yang ditonton banyak orang sekaligus.

---

## 1️⃣ Repo (paling dulu)

Repo harus publik **sebelum** video diunggah — deskripsi video menyebutnya.

```powershell
cd C:\Users\terkoiz\Documents\hackathon\hakim
git add -A
git commit -m "fix(board): panel tanya-AI pindah ke bawah kanvas + model LLM yang hidup

- panel chat duduk di kolom tengah bawah kanvas (sesuai sketsa ROADMAP §2);
  tinggi baris dikunci lg:grid-rows-[1154px] supaya kolom kiri/kanan tidak
  meregang mengikuti panjang daftar emiten
- harga di kartu grafik tidak lagi hardcode per ticker: titik terakhir
  priceHistory, kalau tidak price_at_trial jurnal, kalau tidak '—'
- MODEL_*: deepseek-v4-flash:0731 (di-retire Ollama 25 Sep) -> deepseek-v4.1-flash
- docs/ROADMAP.md §7: temuan lengkapnya

Terverifikasi: pytest 119 lulus · tsc -b bersih · vite build bersih ·
chat papan dijawab LLM untuk 6/6 emiten yang lolos sidang (0 kredit Sectors)"
git push
```

Sekali lagi pastikan tidak ada kunci yang ikut (harus kosong):

```powershell
git grep -nE "sk_live|api_key\s*=\s*[\"'][A-Za-z0-9]{8}" -- . | Select-String -NotMatch "SUBMISSION.md"
git ls-files | Select-String "\.env"
```

Yang kedua hanya boleh memunculkan `.env.example`.

---

## 2️⃣ Video judging → YouTube

**Judul** (≤100 karakter):

```
SIDANG — pengadilan saham berbasis AI untuk IDX | Sectors Hackathon 2026
```

**Deskripsi** (siap tempel; babak di bawah wajib ≥10 detik per babak — itu
sebabnya ada yang digabung):

```
Setiap hari ribuan investor ritel Indonesia menerima sinyal beli dari AI — dan hampir tidak ada yang bisa menjelaskan dari mana angkanya datang.

SIDANG adalah pengadilan saham berbasis multi-agent AI. Kasih satu ticker IDX: lima analis memeriksa bukti dari Sectors API, jaksa dan pembela berdebat dua ronde, lalu hakim merumuskan memorandum riset yang setiap angkanya tersitasi ke endpoint asalnya.

Bukan "AI bilang BELI" — keluarannya putusan, red flag, dan pertanyaan verifikasi yang wajib Anda jawab dulu. Dan SIDANG menilai kembali putusan lamanya terhadap harga yang benar-benar terjadi.

Babak:
0:00 Pembuka
0:03 Masalah & audiens — 20,32 juta investor ritel Indonesia
0:43 SIDANG: dari masalah ke putusan
0:57 Lima analis bekerja — bukti dari Sectors API
1:10 Jaksa vs pembela, dua ronde
1:28 Fakta kunci & tabel Audit Sumber Data
1:41 Post-mortem: alat ini menilai putusannya sendiri
2:01 Di balik layar: 8 agen & Sectors API
2:27 Disiplin kredit & arsip permanen

Dibangun untuk Sectors Hackathon Indonesia 2026 — Track 1: AI Agents & Assistants.

SIDANG adalah alat bantu riset dan analisis informasi pasar, bukan rekomendasi investasi. Keputusan investasi sepenuhnya tanggung jawab Anda.

#SectorsHackathon #AIAgents #PasarModal
```

**Tag:** `Sectors Hackathon, AI Agents, IDX, saham Indonesia, multi-agent AI, equity research, pasar modal, SIDANG`

**Setelan yang mudah terlewat:**

| Kolom | Nilai | Kenapa |
|---|---|---|
| Visibilitas | **Publik** | aturan mengizinkan publik *atau* unlisted; publik bisa ditautkan dari post medsos dan tidak menghalangi juri |
| Thumbnail | unggah `thumbnail-judging.png` | kalau tidak, YouTube memilih frame acak |
| Bahasa video | Indonesia | |
| Kategori | Science & Technology | |
| "Bukan untuk anak" | ya | |
| **Konten sintetis/altered** | **ya** | narasinya suara TTS — YouTube meminta pengungkapan untuk konten semacam ini |
| Subtitle | **jangan** unggah `teaser.srt` | subtitle sudah dibakar di dalam video untuk bagian rekaman UI; menambah CC akan tampil dobel |
| Playlist | (boleh) "SIDANG — Sectors Hackathon 2026" | mengelompokkan teaser + judging |

Isi formulir: `https://youtu.be/<id>` — pakai yang **unlisted/publik**, bukan link
Studio.

---

## 3️⃣ Post media sosial

Pakai **video 9:16** (`teaser-9x16-judging.mp4` atau teaser 58 detik) supaya
utuh di layar ponsel. Ganti `@sectors` dengan handle resmi yang diminta formulir.

**LinkedIn** (audiens paling cocok):

```
Setiap hari ribuan investor ritel Indonesia menerima sinyal beli dari AI — dan hampir tidak ada yang bisa menjelaskan dari mana angkanya datang.

Kami membangun SIDANG: pengadilan saham berbasis multi-agent AI. Kasih satu ticker IDX, lalu lima analis memeriksa bukti dari data Sectors, jaksa dan pembela berdebat, dan hakim merumuskan memorandum riset yang setiap angkanya tersitasi ke endpoint asalnya.

Yang membedakannya: SIDANG tidak bilang BELI. Ia memberi putusan, red flags, dan pertanyaan verifikasi yang wajib Anda jawab sebelum uang Anda keluar. Dan ia menilai kembali putusan lamanya terhadap harga yang benar-benar terjadi.

Dibangun untuk @sectors Hackathon Indonesia 2026 — Track 1: AI Agents & Assistants.

#SectorsHackathon #AIAgents #PasarModal
```

**Threads / TikTok (caption pendek):**

```
Kami bikin pengadilan untuk saham. Lima analis AI mengumpulkan bukti, jaksa vs pembela berdebat 2 ronde, hakim menjatuhkan putusan — dan tiap angka bisa Anda lacak sampai endpoint asalnya. Bukan "AI bilang BELI". @sectors #SectorsHackathon
```

---

## Checklist akhir

- [ ] Repo publik, commit ter-push, tanpa kunci
- [ ] Video judging ≤3 menit terunggah (publik/unlisted) — **170,2 s** ✅
- [ ] Thumbnail terpasang
- [ ] Pengungkapan konten sintetis dicentang (narasi TTS)
- [ ] Post medsos terunggah, akun resmi Sectors ter-tag
- [ ] URL video + URL post disalin ke formulir submission

> Kalau teaser 60 detik (Item 3) belum diunggah ulang setelah perombakan ini:
> isinya tidak terpengaruh (varian teaser tidak memakai komik maupun kartu agen),
> hanya ukuran subtitle-nya yang masih versi lama. Menyamakan cukup dengan
> `python make_teaser.py` dan `python make_teaser.py --variant no-trial`.
