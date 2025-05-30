const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/layanan', (req, res) => {
  res.render('layanan')
})

app.get('/layanan/prediksi', (req, res) => {
  res.render('prediksi')
})
app.get('/layanan/klasifikasi', (req, res) => {
  res.render('klasifikasi')
})
app.get('/layanan/segmentasi', (req, res) => {
  res.render('segmentasi')
})
app.get('/layanan/rekomendasi', (req, res) => {
  res.render('rekomendasi')
})

app.get('/info', (req, res) => {
    res.render('info');
});

// Jalankan server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
