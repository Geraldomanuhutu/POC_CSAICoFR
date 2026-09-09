# ICOFR/Control — Prototipe Control Self-Assessment

Prototipe alur kerja **Control Self-Assessment (CSA) untuk Internal Control over Financial Reporting**. Satu berkas HTML tanpa backend, tanpa dependency runtime, tanpa build step.

> **Ini bukan aplikasi.** Ini spesifikasi kebutuhan yang bisa diklik, dibuat supaya pembahasan dengan vendor berangkat dari alur yang sama dan tidak ditafsirkan sendiri-sendiri. Lihat [Batasan](#batasan-yang-belum-nyata) sebelum menyimpulkan apa pun soal kemampuan AI.

---

## Buka prototipe

Versi live: _(isi setelah GitHub Pages aktif — lihat [Deploy](#deploy-ke-github-pages))_

Jalankan lokal — cukup buka `index.html` di browser, atau:

```bash
npm start          # http://localhost:3000
```

---

## Alur yang dicakup

Tiga peran, satu siklus penuh, sesuai pemisahan lini pertahanan.

| Peran | Lini | Yang bisa dilakukan |
|---|---|---|
| Orchestrator | Line 2 | Susun testing procedure, atur prompt validasi per dokumen, alokasikan CSA ke unit kerja, pantau progres |
| Preparer | Line 1 | Unggah sampel transaksi dan dokumen pendukung, jalankan analisis, kirim ke reviewer |
| Reviewer | Line 1.5 | Tinjau insight, override verdict dengan justifikasi wajib, tandai potensi halusinasi AI, terbitkan nota dinas |

Pemetaan scope bekerja di tiga tingkat — **Organizational Area**, **Organizational Unit**, dan **Working Unit**. Memilih di tingkat area atau cabang otomatis diturunkan ke seluruh unit kerja di bawahnya, karena pemilihan satu per satu tidak realistis untuk ratusan unit.

---

## Skenario demo (± 3 menit)

**1 — Orchestrator**

1. Login sebagai Orchestrator → **New assessment**
2. Baris "Identitas pemohon (KTP)" → **Configure** → **Generate with AI** → **Save prompt**
3. **Map organizational scope** → pilih tingkat *Organizational Unit* → centang satu cabang → **Add to scope** (perhatikan cascade ke dua unit kerja)
4. **Dispatch CSA**

**2 — Preparer**

5. Sign out → login sebagai Preparer → **See details**
6. Unggah `Sample.xlsx` → **Next**
7. Unggah ketiga dokumen pendukung → **Analyse supporting documents**
8. **Submit to reviewer**

**3 — Reviewer**

9. Sign out → login sebagai Reviewer → **Review**
10. Klik ikon 👁 pada step 6 → tampil rationale, evidence yang dipakai, dan pratinjau dokumen sumber
11. **OVERRIDE** step 6 → ubah ke PASS → isi justifikasi → centang *Flag possible AI hallucination* → simpan
12. Buka tab **Audit trail** — seluruh aksi tercatat
13. **Mark as complete** → **Generate CSA report** → isi nomor nota dinas → **Preview Word report**

Data demo tersimpan di `localStorage` browser. Tombol **Reset data demo** ada di halaman login.

---

## Titik diskusi yang sengaja ditonjolkan

Hasil analisis pada prototipe direplikasi persis dari demo vendor, **termasuk dua verdict yang keliru**:

- **Step 5** — AI menyatakan FAIL karena jumlah permohonan "tidak lebih rendah atau sama dengan" plafond, padahal kedua nilai sama persis (Rp 50.000.000) dan prosedur berbunyi *lebih rendah **atau sama dengan***. Seharusnya PASS.
- **Step 6** — AI menyatakan FAIL karena "2 tahun" dan "24 bulan" berbeda format, padahal nilainya setara. Reviewer harus melakukan override.

Dua dari enam langkah salah, pada demo yang dipilih sendiri oleh vendor. Implikasinya bukan bahwa pendekatannya buruk, melainkan bahwa **lapisan reviewer manusia tetap wajib**, dan penghematan efisiensi berada pada pengumpulan bukti serta penyusunan kertas kerja — bukan pada *judgment*. Karena itu mekanisme **override + justifikasi wajib + penanda halusinasi + audit trail** diperlakukan sebagai kebutuhan utama di prototipe ini, bukan pelengkap.

---

## Batasan yang belum nyata

Semua hal berikut disimulasikan dan **harus disebutkan di awal presentasi**:

- **Lapisan AI ditulis tetap (hardcoded).** Tidak ada model, OCR, maupun ekstraksi dokumen. Inilah bagian tersulit dan paling berisiko, dan justru bagian yang belum terbukti.
- **Unggah berkas disimulasikan.** Mengklik tombol unggah langsung menetapkan nama berkas; berkas asli tidak dibaca.
- **Satu sampel transaksi.** Perilaku pada ratusan sampel, penomoran, dan paginasi belum diuji.
- **Unduhan laporan berupa pratinjau.** Belum menghasilkan `.docx` atau `.xlsx`.
- **Tanpa autentikasi, tanpa server, tanpa basis data.** Pemilihan peran hanya sakelar tampilan; status tersimpan di browser masing-masing.

---

## Pertanyaan yang perlu dijawab vendor

1. Berapa akurasi ekstraksi minimum yang dijamin untuk dokumen hasil pindai dan foto, dan diukur pada kumpulan uji seperti apa?
2. Model dijalankan di mana? Bila data nasabah (NIK, nama, plafond) keluar ke layanan pihak ketiga, bagaimana pemenuhan ketentuan perlindungan data pribadi dan kerahasiaan nasabah?
3. Siapa yang bertanggung jawab bila verdict yang keliru lolos ke kertas kerja dan menjadi temuan audit?
4. Apakah rationale dan evidence tersimpan permanen agar hasil dapat direproduksi saat pengujian ulang oleh auditor eksternal?
5. Bagaimana perubahan prompt validasi dikendalikan — siapa yang berwenang, dan bagaimana versinya terlacak?
6. Berapa total biaya kepemilikan tiga tahun, termasuk pemeliharaan model dan penyesuaian saat RCM berubah?

---

## Pengembangan

```bash
npm install --no-save jsdom
npm test
```

Smoke test menjalankan siklus penuh ketiga peran secara headless — 60 pemeriksaan mencakup keadaan tombol, pemetaan scope bertingkat, pencarian, reset analisis saat dokumen dihapus, justifikasi override yang wajib diisi, siklus tolak-kirim ulang, dan pengikatan data pada nota dinas. Test ini juga berjalan otomatis di CI sebelum deploy.

Seluruh aplikasi berada di `index.html`: CSS di `<style>`, state dan tampilan di `<script>` paling bawah. Titik penyuntingan utama — `PROCEDURES`, `DOC_REQS`, `AI_RESULTS`, `ORG_UNITS`, dan `SAMPLE_ROW` — berada di awal blok skrip, sehingga isi kontrol dapat diganti tanpa menyentuh logika.

---

## Deploy ke GitHub Pages

1. Push ke branch `main`
2. **Settings → Pages → Source: GitHub Actions**
3. Alur kerja `.github/workflows/deploy.yml` menjalankan smoke test lalu menerbitkan situs
4. Salin URL hasil deploy ke bagian [Buka prototipe](#buka-prototipe)

Bila repositori bersifat privat, GitHub Pages memerlukan paket berbayar. Alternatif untuk presentasi: jalankan lokal, atau unggah `index.html` ke Netlify Drop.

---

## Status

Prototipe. Bukan untuk produksi, tidak memuat data nasabah sungguhan, dan tidak boleh dipakai sebagai bukti pengendalian.
