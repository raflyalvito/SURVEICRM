# SURVEICRM 📊

Website platform survei kuesioner digital berbasis web statis untuk keperluan tugas mata kuliah **Customer Relationship Management (CRM)**. Mahasiswa dapat membuat kuesioner survei, membagikan tautan langsung (link) ke responden lewat WhatsApp atau media sosial, dan memantau rekapitulasi hasil kepuasan pelanggan secara real-time dari perangkat mana pun.

Aplikasi ini **100% gratis di-hosting di GitHub Pages** tanpa perlu menyewa server/backend, menggunakan **Firebase Firestore** sebagai basis data cloud real-time.

---

## 🚀 Fitur Utama (MVP)

1. **Dashboard Mahasiswa (Admin)**:
   - Pantau seluruh survei aktif dan total respon yang terkumpul.
   - Status koneksi database (Cloud Firestore vs Mode Demo Lokal).
   - Salin link survei dalam 1 klik atau bagikan langsung via WhatsApp dengan pesan undangan otomatis.
2. **Survey Builder Interaktif**:
   - Pembuatan kuesioner dengan 3 tipe pertanyaan:
     - **Pilihan Ganda (*Multiple Choice*)**: Menampung opsi jawaban bebas.
     - **Skala Penilaian (1–5 Likert/Rating)**: Ideal untuk mengukur kepuasan pelanggan (*Customer Satisfaction Score*).
     - **Teks Singkat / Esai**: Untuk masukan, kritik, dan saran responden.
   - Fitur atur urutan pertanyaan (naik/turun) dan toggle wajib diisi (*required*).
3. **Halaman Responden Publik (Mobile-First)**:
   - Akses via tautan langsung (`survey.html?id=...`).
   - **Tanpa Login**: Responden langsung mengisi kuesioner tanpa perlu registrasi.
   - Tampilan ramah layar smartphone, waktu muat cepat, dan validasi pengisian otomatis.
   - Konfirmasi pesan terima kasih setelah jawaban berhasil terkirim.
4. **Rekapitulasi & Analisis Hasil CRM**:
   - Pembaruan hasil secara *real-time* (*live update*) saat responden mengisi.
   - Visualisasi persentase dan bar chart per opsi pilihan ganda.
   - Perhitungan skor rata-rata skala kepuasan (misal `4.5 / 5.0`) dan distribusi nilai 1–5.
   - Feed daftar jawaban teks/esai dengan waktu pengisian.
   - **Fitur Ekspor CSV**: Unduh seluruh respon mentah ke format CSV/Excel untuk mempermudah penyusunan laporan tugas CRM.
5. **Mode Demo Otomatis**:
   - Jika belum menghubungkan Firebase, aplikasi otomatis berjalan dalam **Mode Demo (LocalStorage)** lengkap dengan contoh data survei CRM bawaan.

---

