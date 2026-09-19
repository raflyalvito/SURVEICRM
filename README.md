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

## 📂 Struktur File

```
SURVEICRM/
├── index.html              # Dashboard Admin/Mahasiswa (Daftar survei, status Firebase, aksi cepat)
├── create.html             # Survey Builder (Form buat pertanyaan survei)
├── survey.html             # Halaman Publik Responden (Akses via ?id=..., tanpa login)
├── results.html            # Halaman Rekap Hasil (Analisis jawaban & ekspor CSV)
├── css/
│   └── style.css           # Styling kustom (animasi toast, kartu responsif, rating)
├── js/
│   ├── firebase-config.js  # Konfigurasi Firebase Firestore v10 & layer LocalStorage
│   ├── ui-utils.js         # Utilitas toast, clipboard copy, share WhatsApp
│   ├── app-dashboard.js    # Logika dashboard survei (index.html)
│   ├── app-builder.js      # Logika pembuat kuesioner (create.html)
│   ├── app-survey.js       # Logika responden pengisi survei (survey.html)
│   └── app-results.js      # Logika analisis & ekspor data CSV (results.html)
└── README.md               # Dokumentasi lengkap
```

---

## ⚡ Cara Menjalankan Secara Lokal

Anda dapat langsung membuka file `index.html` di browser mana pun (Google Chrome, Microsoft Edge, Mozilla Firefox) hanya dengan **klik ganda** (*double click*).

Aplikasi langsung dapat digunakan untuk membuat survei dan menguji pengisian karena telah dilengkapi sistem penyimpanan demo lokal bawaan.

---

## ☁️ Panduan Setup Firebase Firestore (Gratis)

Untuk menghubungkan survei Anda ke cloud agar responden dapat mengisi dari HP masing-masing dan data tersimpan terpusat:

### Langkah 1: Buat Project Firebase
1. Buka [Firebase Console](https://console.firebase.google.com/) dan login menggunakan akun Google Anda.
2. Klik **"Add project"** (Tambah project), beri nama (misal: `surveicrm-tugas`), lalu klik **Continue** sampai selesai.

### Langkah 2: Buat Firestore Database
1. Pada menu navigasi sebelah kiri, pilih **Build** &rarr; **Firestore Database**.
2. Klik **Create database**.
3. Pilih lokasi server (misal: `asia-southeast2` (Jakarta) atau default `nam5 (United States)`).
4. Pada pilihan aturan awal, pilih **"Start in test mode"**, lalu klik **Create**.

### Langkah 3: Konfigurasi Aturan Keamanan (Security Rules)
Agar responden publik dapat membaca survei dan mengirimkan jawaban tanpa harus login, buka tab **Rules** di Firestore Database dan pastikan kodenya seperti ini:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
*Klik tombol **Publish** untuk menerapkan aturan.*

### Langkah 4: Ambil Kunci Konfigurasi Web
1. Klik ikon gerigi ⚙️ (Project settings) di pojok kiri atas.
2. Gulir ke bawah pada bagian **Your apps**, lalu klik ikon Web **`</>`**.
3. Daftarkan nama app (misal: `SURVEICRM Web`), lalu klik **Register app**.
4. Anda akan melihat objek `firebaseConfig` seperti contoh berikut:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "surveicrm-tugas.firebaseapp.com",
     projectId: "surveicrm-tugas",
     storageBucket: "surveicrm-tugas.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef"
   };
   ```

### Langkah 5: Masukkan ke SURVEICRM
Anda memiliki 2 cara mudah untuk memasukkan konfigurasi ini:
- **Cara 1 (Melalui Tampilan Web)**: Buka `index.html`, klik tombol **"Firebase"** atau klik badge status di atas, lalu salin-tempel `apiKey` dan `projectId`, lalu klik **Simpan & Hubungkan**.
- **Cara 2 (Langsung di File)**: Buka file [js/firebase-config.js](file:///c:/Users/ASUS/OneDrive/Desktop/SURVEICRM/js/firebase-config.js) dan isi objek `DEFAULT_FIREBASE_CONFIG` di baris ke-8.

---

## 🌐 Panduan Hosting Gratis di GitHub Pages

Karena proyek ini adalah situs web statis (HTML, CSS, JS), Anda dapat mempublikasikannya secara gratis di **GitHub Pages**:

### Langkah 1: Buat Repositori di GitHub
1. Buka [GitHub](https://github.com/) dan buat repositori baru (misal: `SURVEICRM`).
2. Atur repositori sebagai **Public**.

### Langkah 2: Unggah Kode ke GitHub
Jalankan perintah berikut di terminal/PowerShell di dalam folder proyek ini:

```powershell
git init
git add .
git commit -m "Inisialisasi aplikasi SURVEICRM"
git branch -M main
git remote add origin https://github.com/USERNAME_GITHUB_ANDA/SURVEICRM.git
git push -u origin main
```

### Langkah 3: Aktifkan GitHub Pages
1. Di halaman repositori GitHub Anda, buka menu **Settings** &rarr; **Pages**.
2. Pada bagian **Build and deployment** &rarr; **Branch**:
   - Pilih Branch: **`main`**
   - Pilih Folder: **`/(root)`**
3. Klik tombol **Save**.
4. Tunggu sekitar 1–2 menit. Website Anda akan aktif di alamat:
   `https://USERNAME_GITHUB_ANDA.github.io/SURVEICRM/`

---

## 📝 Tips Penggunaan untuk Tugas Kuliah CRM

1. **Menyusun Survei**:
   - Gunakan pertanyaan Skala 1–5 untuk mengukur dimensi kualitas pelayanan (misal: *Tangibles, Reliability, Responsiveness, Assurance, Empathy*).
   - Gunakan pertanyaan Pilihan Ganda untuk memetakan demografi atau frekuensi pembelian pelanggan.
   - Gunakan Teks Singkat untuk menangkap *Voice of Customer* (saran & kritik terbuka).
2. **Distribusi Tautan**:
   - Klik tombol **"WhatsApp"** di dashboard atau halaman hasil untuk membagikan pesan kuesioner yang rapi ke grup responden.
3. **Menganalisis & Ekspor Data**:
   - Buka halaman **Lihat Hasil**.
   - Perhatikan skor rata-rata untuk mengetahui tingkat kepuasan pelanggan secara kuantitatif.
   - Klik **"Ekspor CSV / Excel"** untuk mengunduh seluruh data mentah dan masukkan ke bab pembahasan laporan tugas kuliah Anda.
