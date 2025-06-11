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
- **.env.example**: File contoh untuk konfigurasi variabel lingkungan, seperti port atau secret key untuk sesi.

## Cara Menjalankan Website di Local

Berikut adalah langkah-langkah untuk menjalankan aplikasi **Educare** di komputer Anda:

### Langkah 1: Clone Repositori

Clone repositori proyek ke komputer Anda:

```bash
git clone https://github.com/LAI25-SM036/educare-app.git
```

### Langkah 2: Install Dependensi

Arahkan terminal ke folder proyek dan jalankan perintah berikut untuk menginstal semua dependensi Node.js yang dibutuhkan:

```bash
npm install
```

### Langkah 3: Instal Dependensi Python

Fitur pada proyek ini melibatkan pemrosesan machine learning, pastikan Anda memiliki Python terinstal, lalu instal dependensi Python berikut:

```bash
pip install -r requirements.txt
```

### Langkah 4: Konfigurasi Variabel Lingkungan

Salin file `.env.example` menjadi `.env` di root proyek:

```bash
cp .env.example .env
```

Kemudian, buka file `.env` dan sesuaikan konfigurasi berikut (jika perlu):

```env
PORT=3000
SESSION_SECRET=your-secret-key
```

- `PORT`: Port tempat aplikasi akan berjalan (default: 3000).
- `SESSION_SECRET`: Kunci rahasia untuk sesi (ganti dengan string yang aman di produksi).

### Langkah 5: Menjalankan Aplikasi

Jalankan aplikasi dengan perintah berikut:

```bash
npm run start
```

### Langkah 6: Buka Link Website

Buka browser dan akses:

```
http://localhost:3000
```

## Cara Menjalankan Website Menggunakan Docker

Berikut adalah langkah-langkah untuk menjalankan aplikasi **Educare** menggunakan Docker:

### Langkah 1: Pastikan Docker Terinstal

Pastikan Anda telah menginstal [Docker](https://www.docker.com/get-started) di komputer Anda.

### Langkah 2: Clone Repositori (Jika Belum)

Jika belum meng-clone repositori, lakukan dengan perintah:

```bash
git clone https://github.com/LAI25-SM036/educare-app.git
```

### Langkah 3: Konfigurasi Variabel Lingkungan

Salin file `.env.example` menjadi `.env` di root proyek:

```bash
cp .env.example .env
```

Kemudian, edit file `.env` untuk memastikan konfigurasi berikut (sesuaikan jika perlu):

```env
PORT=5000
SESSION_SECRET=cb1302c63faeb79b754e34cd355ad87e025f4fd3e86bdd98589a320192b0cfec
NODE_ENV=production
```

Catatan: Port diatur ke `5000` sesuai dengan `Dockerfile`.

### Langkah 4: Build Docker Image

Arahkan terminal ke folder proyek yang berisi `Dockerfile`, lalu jalankan perintah berikut untuk membangun image Docker:

```bash
docker build -t educare-app .
```

- `-t educare-app`: Memberi nama image sebagai `educare-app`.
- `.`: Menunjukkan bahwa `Dockerfile` ada di direktori saat ini.

### Langkah 5: Jalankan Kontainer

Jalankan kontainer dari image yang telah dibuat dengan perintah berikut:

```bash
docker run -d -p 5000:5000 --env-file .env educare-app
```

- `-d`: Menjalankan kontainer di latar belakang.
- `-p 5000:5000`: Memetakan port 5000 di host ke port 5000 di kontainer.
- `--env-file .env`: Menggunakan file `.env` untuk variabel lingkungan.
- `educare-app`: Nama image yang dibuat.

### Langkah 6: Buka Link Website

Buka browser dan akses:

```
http://localhost:5000
```

### Langkah 7: Menghentikan Kontainer

Untuk menghentikan kontainer, cari ID kontainer dengan perintah:

```bash
docker ps
```

Kemudian hentikan kontainer dengan:

```bash
docker stop <CONTAINER_ID>
```

## Kontribusi

Jika Anda ingin berkontribusi pada proyek ini, silakan buat _pull request_ atau laporkan _issue_ di repositori.

© 2025 EduCare. All rights reserved.
