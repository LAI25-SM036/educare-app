# Educare

**Educare** adalah platform web terpadu yang dirancang untuk mengatasi tantangan sekolah menengah dalam pengelolaan data siswa dan perencanaan intervensi belajar. Platform ini bertujuan untuk mengatasi masalah proses manual dan terpisah dalam pencatatan nilai, kehadiran, dan latar belakang keluarga siswa, yang sering kali menyebabkan perencanaan pembelajaran menjadi reaktif, terlambat, dan kurang tepat sasaran. Dengan pendekatan berbasis data, Educare membantu sekolah membuat keputusan yang lebih proaktif dan akurat.

## Struktur dan Fungsi File

Berikut adalah struktur direktori proyek beserta fungsi masing-masing komponen:

- **data/**

  - **templates/**: Berisi file Excel template.
  - **hasil/**: Berisi hasil pemrosesan model-model machine learning pada fitur layanan.

- **models/** : Berisi model-model machine learning seperti `klasifikasi-model`, `prediksi-model`, `segmentasi-model`, dan `rekomendasi-model`.

- **src/**

  - **controllers/**: Berisi file seperti `modelController.js` yang menangani logika bisnis, termasuk pemrosesan machine learning menggunakan skrip Python.
  - **css/**: Menyimpan file CSS untuk styling halaman (saat ini kosong, styling utama menggunakan Tailwind CSS via CDN).
  - **img/**: Menyimpan gambar yang digunakan dalam aplikasi, seperti logo dan ikon.
  - **routes/**: Berisi `routes.js` yang mendefinisikan rute aplikasi.
  - **utils/**: Berisi skrip Python yang digunakan untuk menjalankan model machine learning.
  - **views/**: Berisi file EJS untuk rendering halaman, seperti:
    - `index.ejs`: Halaman utama.
    - `layanan.ejs`: Halaman daftar layanan.
    - `prediksi.ejs`, `klasifikasi.ejs`, `segmentasi.ejs`, `rekomendasi.ejs`: Halaman untuk menggunakan fitur layanan.
    - `info.ejs`: Halaman informasi.

- **server.js**: File utama yang menjalankan aplikasi server menggunakan Express.
- **.env**: File untuk menyimpan variabel lingkungan, seperti konfigurasi port atau secret key untuk sesi.

## Cara Menjalankan Website di Local

Berikut adalah langkah-langkah untuk menjalankan aplikasi **Educare** di komputer Anda:

### Langkah 1: Clone Repositori

Clone repositori proyek ke komputer Anda:

```bash
git clone <URL_REPOSITORI>
```

### Langkah 2: Install Dependensi

Arahkan terminal ke folder proyek dan jalankan perintah berikut untuk menginstal semua dependensi Node.js yang dibutuhkan:

```bash
npm install
```

### Langkah 3: Konfigurasi Variabel Lingkungan

Buat file `.env` di root proyek dan tambahkan konfigurasi berikut (sesuaikan jika perlu):

```env
PORT=3000
SESSION_SECRET=your-secret-key
```

- `PORT`: Port tempat aplikasi akan berjalan (default: 3000).
- `SESSION_SECRET`: Kunci rahasia untuk sesi (ganti dengan string yang aman di produksi).

### Langkah 4: Menjalankan Aplikasi

Jalankan aplikasi dengan perintah berikut:

```bash
npm run start
```

### Langkah 5: Buka Link Website

Buka browser dan akses:

```
http://localhost:3000
```

## Kontribusi

Jika Anda ingin berkontribusi pada proyek ini, silakan buat _pull request_ atau laporkan _issue_ di repositori.

© 2025 EduCare. All rights reserved.
