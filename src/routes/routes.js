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
    "../../data/templates/example_prediction_input_user.xlsx",
  );
  try {
    await fs.access(filePath);
    res.download(filePath, "example_prediction_input_user.xlsx", (err) => {
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

router.post(
  "/layanan/klasifikasi",
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
  modelController.createKlasifikasi,
);

router.get("/layanan/klasifikasi/template", async (req, res) => {
  const filePath = path.join(
    __dirname,
    "../../data/templates/example_classification_input_user.xlsx",
  );
  try {
    await fs.access(filePath);
    res.download(filePath, "example_classification_input_user.xlsx", (err) => {
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

router.get("/layanan/klasifikasi/download", async (req, res) => {
  const userClassificationFile = req.session.classificationFilePath;
  if (!userClassificationFile) {
    return res.status(404).json({
      success: false,
      message: "File hasil klasifikasi tidak ditemukan untuk pengguna ini",
    });
  }
  try {
    await fs.access(userClassificationFile);
    res.download(
      userClassificationFile,
      path.basename(userClassificationFile),
      (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          res.status(500).json({
            success: false,
            message: "Gagal mengunduh file hasil klasifikasi",
          });
        }
      },
    );
  } catch (error) {
    console.error("Error accessing file:", error);
    res.status(404).json({
      success: false,
      message: "File hasil klasifikasi tidak ditemukan",
    });
  }
});

router.get("/layanan/segmentasi", (req, res) => {
  res.render("segmentasi");
});

router.post(
  "/layanan/segmentasi",
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
  modelController.createSegmentasi,
);

router.get("/layanan/segmentasi/template", async (req, res) => {
  const filePath = path.join(
    __dirname,
    "../../data/templates/example_segmentation_input_user.xlsx",
  );
  try {
    await fs.access(filePath);
    res.download(filePath, "example_segmentation_input_user.xlsx", (err) => {
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

router.get("/layanan/segmentasi/download", async (req, res) => {
  const userSegmentationFile = req.session.segmentationFilePath;
  if (!userSegmentationFile) {
    return res.status(404).json({
      success: false,
      message: "File hasil segmentasi tidak ditemukan untuk pengguna ini",
    });
  }
  try {
    await fs.access(userSegmentationFile);
    res.download(
      userSegmentationFile,
      path.basename(userSegmentationFile),
      (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          res.status(500).json({
            success: false,
            message: "Gagal mengunduh file hasil segmentasi",
          });
        }
      },
    );
  } catch (error) {
    console.error("Error accessing file:", error);
    res.status(404).json({
      success: false,
      message: "File hasil segmentasi tidak ditemukan",
    });
  }
});

router.get("/layanan/rekomendasi", (req, res) => {
  res.render("rekomendasi");
});

router.post(
  "/layanan/rekomendasi",
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
  modelController.createRekomendasi,
);

router.get("/layanan/rekomendasi/template", async (req, res) => {
  const filePath = path.join(
    __dirname,
    "../../data/templates/example_recommendation_system_input_user.xlsx",
  );
  try {
    await fs.access(filePath);
    res.download(
      filePath,
      "example_recommendation_system_input_user.xlsx",
      (err) => {
        if (err) {
          console.error("Error downloading template file:", err);
          res.status(500).json({
            success: false,
            message: "Gagal mengunduh file template",
          });
        }
      },
    );
  } catch (error) {
    res.status(404).json({
      success: false,
      message: "File template tidak ditemukan",
    });
  }
});

router.get("/layanan/rekomendasi/download", async (req, res) => {
  const userRecommendationFile = req.session.recommendationFilePath;
  if (!userRecommendationFile) {
    return res.status(404).json({
      success: false,
      message: "File hasil rekomendasi tidak ditemukan untuk pengguna ini",
    });
  }
  try {
    await fs.access(userRecommendationFile);
    res.download(
      userRecommendationFile,
      path.basename(userRecommendationFile),
      (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          res.status(500).json({
            success: false,
            message: "Gagal mengunduh file hasil rekomendasi",
          });
        }
      },
    );
  } catch (error) {
    console.error("Error accessing file:", error);
    res.status(404).json({
      success: false,
      message: "File hasil rekomendasi tidak ditemukan",
    });
  }
});

router.get("/info", (req, res) => {
  res.render("info");
});

module.exports = router;
