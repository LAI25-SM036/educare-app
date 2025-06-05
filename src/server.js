const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const routes = require("./routes/routes");
require("dotenv").config();

const app = express();

// Konfigurasi view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/img", express.static(path.join(__dirname, "img")));

// Rute
app.use("/", routes);

// Penanganan error global
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).send("Terjadi kesalahan pada server!");
});

// Jalankan server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

// Tangani unhandled rejection
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});
