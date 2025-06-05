const express = require("express");
const session = require("express-session");
const multer = require("multer");
const router = express.Router();
const modelController = require("../controllers/modelController");
const path = require("path");
const fs = require("fs").promises;
const dayjs = require("dayjs");
const upload = multer();

// Konfigurasi session middleware
router.use(
  session({
    secret: process.env.SESSION_SECRET || "educare-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
);

router.get("/", (req, res) => {
  res.render("index");
});

router.get("/layanan", (req, res) => {
  res.render("layanan");
});

router.get("/layanan/prediksi", (req, res) => {
  res.render("prediksi");
});

router.post(
  "/layanan/prediksi",
  upload.single("excelFile"),
  (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File Excel tidak ditemukan",
      });
    }
    next();
  },
  modelController.createPrediksiNilai,
);

router.get("/layanan/prediksi/template", async (req, res) => {
  const filePath = path.join(
    __dirname,
    "../../data/templates/student_performance_input_user.xlsx",
  );
  try {
    await fs.access(filePath);
    res.download(filePath, "student_performance_input_user.xlsx", (err) => {
      if (err) {
        console.error("Error downloading template file:", err);
        res.status(500).json({
          success: false,
          message: "Gagal mengunduh file template",
        });
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: "File template tidak ditemukan",
    });
  }
});

router.get("/layanan/prediksi/download", async (req, res) => {
  const userPredictionFile = req.session.predictionFilePath;

  if (!userPredictionFile) {
    return res.status(404).json({
      success: false,
      message: "File hasil prediksi tidak ditemukan untuk pengguna ini",
    });
  }

  try {
    await fs.access(userPredictionFile);
    res.download(
      userPredictionFile,
      path.basename(userPredictionFile),
      (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          res.status(500).json({
            success: false,
            message: "Gagal mengunduh file hasil prediksi",
          });
        }
      },
    );
  } catch (error) {
    console.error("Error accessing file:", error);
    res.status(404).json({
      success: false,
      message: "File hasil prediksi tidak ditemukan",
    });
  }
});

router.get("/layanan/klasifikasi", (req, res) => {
  res.render("klasifikasi");
});

router.get("/layanan/segmentasi", (req, res) => {
  res.render("segmentasi");
});

router.get("/layanan/rekomendasi", (req, res) => {
  res.render("rekomendasi");
});

router.get("/info", (req, res) => {
  res.render("info");
});

module.exports = router;
