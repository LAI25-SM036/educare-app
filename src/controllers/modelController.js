const fs = require("fs").promises;
const path = require("path");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const { PythonShell } = require("python-shell");
const xlsx = require("xlsx");

dayjs.extend(utc);
dayjs.extend(timezone);

const modelController = {
  createPrediksiNilai: async (req, res) => {
    try {
      // Validasi file
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No Excel file uploaded." });
      }

      // Baca file Excel
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      let data = xlsx.utils.sheet_to_json(sheet);

      // Validasi kolom yang diperlukan
      const requiredColumns = [
        "Hours_Studied",
        "Attendance",
        "Sleep_Hours",
        "Previous_Scores",
        "Tutoring_Sessions",
        "Physical_Activity",
        "Parental_Involvement_Low",
        "Parental_Involvement_Medium",
        "Access_to_Resources_Low",
        "Access_to_Resources_Medium",
        "Extracurricular_Activities_Yes",
        "Motivation_Level_Low",
        "Motivation_Level_Medium",
        "Internet_Access_Yes",
        "Family_Income_Low",
        "Family_Income_Medium",
        "School_Type_Public",
        "Peer_Influence_Neutral",
        "Peer_Influence_Positive",
        "Learning_Disabilities_Yes",
        "Gender_Male",
      ];

      const inputColumns = Object.keys(data[0] || {});
      const missingColumns = requiredColumns.filter(
        (col) => !inputColumns.includes(col),
      );
      if (missingColumns.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required columns: ${missingColumns.join(", ")}`,
        });
      }

      // Cari kolom Student (case-insensitive)
      const studentColumn = inputColumns.find(
        (col) => col.toLowerCase() === "student",
      );
      if (!studentColumn) {
        console.warn(
          "Warning: Kolom 'Student' tidak ditemukan di input Excel, menggunakan nilai default",
        );
      }

      // Konversi data ke format yang sesuai, pertahankan kolom Student
      const originalData = [...data];
      data = data.map((row) => {
        const cleanedRow = {};
        requiredColumns.forEach((col) => {
          let value = row[col];
          // Konversi 'ya'/'tidak' ke 1/0 untuk kolom boolean
          if (["ya", "tidak"].includes(value)) {
            value = value === "ya" ? 1 : 0;
          }
          cleanedRow[col] = value;
        });
        // Tambahkan kolom Student jika ada
        if (studentColumn) {
          cleanedRow.Student = row[studentColumn];
        }
        return cleanedRow;
      });

      // Siapkan input untuk model Python
      const modelInput = data;

      // Konfigurasi PythonShell
      const options = {
        mode: "text",
        scriptPath: path.join(__dirname, "../utils"),
        pythonPath: "python",
        args: [],
      };

      // Jalankan skrip Python
      const results = await new Promise((resolve, reject) => {
        const pyshell = new PythonShell("predictionWrapper.py", options);
        pyshell.send(JSON.stringify(modelInput));

        let resultData = "";
        pyshell.on("message", (message) => {
          resultData += message + "\n";
        });

        pyshell.on("error", (err) => {
          console.error("PythonShell error:", err);
        });

        pyshell.on("stderr", (stderr) => {
          console.error("Python stderr:", stderr);
        });

        pyshell.end((err) => {
          if (err) {
            console.error("Python Error:", err);
            console.error("Python stderr output:", resultData);
            reject(err);
          } else {
            try {
              const jsonMatch = resultData.match(/(\[\{.*\}\])/s);
              if (jsonMatch && jsonMatch[1]) {
                const parsedResult = JSON.parse(jsonMatch[1]);
                resolve(parsedResult);
              } else {
                console.error("No valid JSON found in:", resultData);
                reject(new Error("No valid JSON found in output"));
              }
            } catch (parseError) {
              console.error("Error parsing Python output:", parseError);
              reject(new Error("Failed to process prediction result"));
            }
          }
        });
      });

      if (!results || !Array.isArray(results)) {
        return res
          .status(400)
          .json({ success: false, message: "Model prediction failed" });
      }

      // Proses hasil prediksi untuk setiap siswa
      const timestamp = dayjs().tz("Asia/Jakarta").toISOString();
      const predictions = originalData.map((row, index) => {
        const predicted_exam_score = results[index]?.predicted_exam_score;
        if (!predicted_exam_score) {
          throw new Error(`Prediction missing for row ${index}`);
        }

        return {
          id: Date.now() + index,
          student: studentColumn ? row[studentColumn] : `Student_${index + 1}`,
          Hours_Studied: data[index].Hours_Studied,
          Attendance: data[index].Attendance,
          Sleep_Hours: data[index].Sleep_Hours,
          Previous_Scores: data[index].Previous_Scores,
          Tutoring_Sessions: data[index].Tutoring_Sessions,
          Physical_Activity: data[index].Physical_Activity,
          Parental_Involvement_Low: data[index].Parental_Involvement_Low,
          Parental_Involvement_Medium: data[index].Parental_Involvement_Medium,
          Access_to_Resources_Low: data[index].Access_to_Resources_Low,
          Access_to_Resources_Medium: data[index].Access_to_Resources_Medium,
          Extracurricular_Activities_Yes:
            data[index].Extracurricular_Activities_Yes,
          Motivation_Level_Low: data[index].Motivation_Level_Low,
          Motivation_Level_Medium: data[index].Motivation_Level_Medium,
          Internet_Access_Yes: data[index].Internet_Access_Yes,
          Family_Income_Low: data[index].Family_Income_Low,
          Family_Income_Medium: data[index].Family_Income_Medium,
          School_Type_Public: data[index].School_Type_Public,
          Peer_Influence_Neutral: data[index].Peer_Influence_Neutral,
          Peer_Influence_Positive: data[index].Peer_Influence_Positive,
          Learning_Disabilities_Yes: data[index].Learning_Disabilities_Yes,
          Gender_Male: data[index].Gender_Male,
          predicted_exam_score,
          created_at: timestamp,
          updated_at: timestamp,
        };
      });

      // Simpan file Excel prediksi
      try {
        const sessionId = req.sessionID;
        const timestampStr = dayjs()
          .tz("Asia/Jakarta")
          .format("YYYYMMDD_HHmmss");
        const userPredictionsDir = path.join(
          __dirname,
          "../../data/hasil/prediksi",
        );
        const userPredictionFile = path.join(
          userPredictionsDir,
          `predictions_${sessionId}_${timestampStr}.xlsx`,
        );

        // Pastikan direktori ada
        await fs.mkdir(userPredictionsDir, { recursive: true });

        // Format data untuk Excel
        const excelData = predictions.map((pred, index) => ({
          ID: index + 1,
          Student: pred.student,
          Hours_Studied: pred.Hours_Studied,
          Attendance: pred.Attendance,
          Sleep_Hours: pred.Sleep_Hours,
          Previous_Scores: pred.Previous_Scores,
          Tutoring_Sessions: pred.Tutoring_Sessions,
          Physical_Activity: pred.Physical_Activity,
          Parental_Involvement_Low: pred.Parental_Involvement_Low,
          Parental_Involvement_Medium: pred.Parental_Involvement_Medium,
          Access_to_Resources_Low: pred.Access_to_Resources_Low,
          Access_to_Resources_Medium: pred.Access_to_Resources_Medium,
          Extracurricular_Activities_Yes: pred.Extracurricular_Activities_Yes,
          Motivation_Level_Low: pred.Motivation_Level_Low,
          Motivation_Level_Medium: pred.Motivation_Level_Medium,
          Internet_Access_Yes: pred.Internet_Access_Yes,
          Family_Income_Low: pred.Family_Income_Low,
          Family_Income_Medium: pred.Family_Income_Medium,
          School_Type_Public: pred.School_Type_Public,
          Peer_Influence_Neutral: pred.Peer_Influence_Neutral,
          Peer_Influence_Positive: pred.Peer_Influence_Positive,
          Learning_Disabilities_Yes: pred.Learning_Disabilities_Yes,
          Gender_Male: pred.Gender_Male,
          Predicted_Exam_Score: pred.predicted_exam_score,
        }));

        // Log data Excel
        console.log("Excel Output Data:", JSON.stringify(excelData, null, 2));

        // Buat worksheet dan workbook
        const worksheet = xlsx.utils.json_to_sheet(excelData);
        const newWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(newWorkbook, worksheet, "Sheet1");

        // Tulis ke file Excel
        await xlsx.writeFile(newWorkbook, userPredictionFile);
        console.log(`Predictions saved to ${userPredictionFile}`);

        // Simpan path file ke session
        req.session.predictionFilePath = userPredictionFile;

        // Jadwalkan penghapusan file setelah 1 jam (3600 detik)
        setTimeout(async () => {
          try {
            await fs.unlink(userPredictionFile);
            console.log(`File deleted after 1 hour: ${userPredictionFile}`);
          } catch (err) {
            console.error(`Error deleting file ${userPredictionFile}:`, err);
          }
        }, 3600 * 1000);
      } catch (error) {
        console.error("Error saving prediction data to Excel:", error);
        return res.status(400).json({
          success: false,
          message: "Failed to save prediction data to Excel",
        });
      }

      // Kembalikan respons
      return res.status(201).json({
        success: true,
        data: predictions,
        message: "Predictions created successfully.",
      });
    } catch (error) {
      console.error("Error processing prediction:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  createKlasifikasi: async (req, res) => {
    try {
      // Validasi file
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No Excel file uploaded." });
      }

      // Baca file Excel
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      let data = xlsx.utils.sheet_to_json(sheet);

      // Validasi kolom yang diperlukan
      const requiredColumns = [
        "n_sikap_A",
        "n_kejuruan",
        "mother_work_Lainnya",
        "n_mat",
        "n_por",
        "n_agama",
        "n_bjawa",
        "mother_salary_Sangat Rendah",
        "father_salary_Tidak Berpenghasilan",
        "n_bindo",
        "extracurricular_tidak",
        "father_edu_SMP sederajat",
        "father_work_Buruh",
        "mother_salary_Cukup Rendah",
        "mother_work_Buruh",
      ];

      const inputColumns = Object.keys(data[0] || {});
      const missingColumns = requiredColumns.filter(
        (col) => !inputColumns.includes(col),
      );
      if (missingColumns.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required columns: ${missingColumns.join(", ")}`,
        });
      }

      // Konversi data ke format numerik (0/1) untuk kolom boolean
      const originalData = [...data];
      data = data.map((row) => {
        const cleanedRow = {};
        requiredColumns.forEach((col) => {
          let value = row[col];
          // Konversi boolean (TRUE/FALSE) atau string ('ya'/'tidak') ke 0/1
          if (typeof value === "boolean") {
            value = value ? 1 : 0;
          } else if (["ya", "tidak"].includes(value)) {
            value = value === "ya" ? 1 : 0;
          } else if (typeof value === "string") {
            // Konversi string TRUE/FALSE ke 0/1
            if (value.toLowerCase() === "true") value = 1;
            else if (value.toLowerCase() === "false") value = 0;
          }
          cleanedRow[col] = value;
        });
        return cleanedRow;
      });

      // Siapkan input untuk model Python
      const modelInput = data;

      // Konfigurasi PythonShell
      const options = {
        mode: "text",
        scriptPath: path.join(__dirname, "../utils"),
        pythonPath: "python",
        args: [],
      };

      // Jalankan skrip Python
      const results = await new Promise((resolve, reject) => {
        const pyshell = new PythonShell("classificationWrapper.py", options);
        pyshell.send(JSON.stringify(modelInput));

        let resultData = "";
        pyshell.on("message", (message) => {
          resultData += message + "\n";
        });

        pyshell.on("error", (err) => {
          console.error("PythonShell error:", err);
        });

        pyshell.on("stderr", (stderr) => {
          console.error("Python stderr:", stderr);
        });

        pyshell.end((err) => {
          if (err) {
            console.error("Python Error:", err);
            console.error("Python stderr output:", resultData);
            reject(err);
          } else {
            try {
              const jsonMatch = resultData.match(/(\[\{.*\}\])/s);
              if (jsonMatch && jsonMatch[1]) {
                const parsedResult = JSON.parse(jsonMatch[1]);
                resolve(parsedResult);
              } else {
                console.error("No valid JSON found in:", resultData);
                reject(new Error("No valid JSON found in output"));
              }
            } catch (parseError) {
              console.error("Error parsing Python output:", parseError);
              reject(new Error("Failed to process classification result"));
            }
          }
        });
      });

      if (!results || !Array.isArray(results)) {
        return res
          .status(400)
          .json({ success: false, message: "Model classification failed" });
      }

      // Proses hasil klasifikasi untuk setiap siswa
      const classifications = originalData.map((row, index) => {
        const predicted_final_score = results[index]?.predicted_final_score;
        if (predicted_final_score === undefined) {
          throw new Error(`Classification missing for row ${index}`);
        }

        return {
          ...row,
          Predicted_Final_Score: predicted_final_score,
        };
      });

      // Simpan file Excel klasifikasi
      try {
        const sessionId = req.sessionID;
        const timestampStr = dayjs()
          .tz("Asia/Jakarta")
          .format("YYYYMMDD_HHmmss");
        const userClassificationsDir = path.join(
          __dirname,
          "../../data/hasil/klasifikasi",
        );
        const userClassificationFile = path.join(
          userClassificationsDir,
          `classifications_${sessionId}_${timestampStr}.xlsx`,
        );

        // Pastikan direktori ada
        await fs.mkdir(userClassificationsDir, { recursive: true });

        // Format data untuk Excel
        const excelData = classifications.map((cls, index) => ({
          ID: index + 1,
          n_sikap_A: cls.n_sikap_A,
          n_kejuruan: cls.n_kejuruan,
          mother_work_Lainnya: cls.mother_work_Lainnya,
          n_mat: cls.n_mat,
          n_por: cls.n_por,
          n_agama: cls.n_agama,
          n_bjawa: cls.n_bjawa,
          mother_salary_Sangat_Rendah: cls.mother_salary_Sangat_Rendah,
          father_salary_Tidak_Berpenghasilan:
            cls.father_salary_Tidak_Berpenghasilan,
          n_bindo: cls.n_bindo,
          extracurricular_tidak: cls.extracurricular_tidak,
          father_edu_SMP_sederajat: cls.father_edu_SMP_sederajat,
          father_work_Buruh: cls.father_work_Buruh,
          mother_salary_Cukup_Rendah: cls.mother_salary_Cukup_Rendah,
          mother_work_Buruh: cls.mother_work_Buruh,
          Predicted_Final_Score: cls.Predicted_Final_Score,
        }));

        // Buat worksheet dan workbook
        const worksheet = xlsx.utils.json_to_sheet(excelData);
        const newWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(newWorkbook, worksheet, "Sheet1");

        // Tulis ke file Excel
        await xlsx.writeFile(newWorkbook, userClassificationFile);
        console.log(`Classifications saved to ${userClassificationFile}`);

        // Simpan path file ke session
        req.session.classificationFilePath = userClassificationFile;

        // Jadwalkan penghapusan file setelah 1 jam (3600 detik)
        setTimeout(async () => {
          try {
            await fs.unlink(userClassificationFile);
            console.log(`File deleted after 1 hour: ${userClassificationFile}`);
          } catch (err) {
            console.error(
              `Error deleting file ${userClassificationFile}:`,
              err,
            );
          }
        }, 3600 * 1000);
      } catch (error) {
        console.error("Error saving classification data to Excel:", error);
        return res.status(400).json({
          success: false,
          message: "Failed to save classification data to Excel",
        });
      }

      // Kembalikan respons
      return res.status(201).json({
        success: true,
        data: classifications,
        message: "Classifications created successfully.",
      });
    } catch (error) {
      console.error("Error processing classification:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  createSegmentasi: async (req, res) => {
    try {
      // Validasi file
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No Excel file uploaded." });
      }

      // Baca file Excel
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      let data = xlsx.utils.sheet_to_json(sheet);

      // Validasi kolom yang diperlukan
      const requiredColumns = [
        "n_kejuruan",
        "n_mat",
        "n_por",
        "n_agama",
        "n_bjawa",
        "n_bindo",
        "n_sikap_a",
        "mother_work_lainnya",
        "mother_salary_sangat_rendah",
        "father_salary_tidak_berpenghasilan",
        "extracurricular_tidak",
        "father_edu_smp_sederajat",
        "father_work_buruh",
        "mother_salary_cukup_rendah",
        "mother_work_buruh",
      ];

      const inputColumns = Object.keys(data[0] || {});
      const missingColumns = requiredColumns.filter(
        (col) => !inputColumns.includes(col),
      );
      if (missingColumns.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required columns: ${missingColumns.join(", ")}`,
        });
      }

      // Konversi data ke format numerik (0/1) untuk kolom boolean
      const originalData = [...data];
      data = data.map((row) => {
        const cleanedRow = {};
        requiredColumns.forEach((col) => {
          let value = row[col];
          // Konversi boolean (TRUE/FALSE) atau string ('ya'/'tidak') ke 0/1
          if (typeof value === "boolean") {
            value = value ? 1 : 0;
          } else if (["ya", "tidak"].includes(value)) {
            value = value === "ya" ? 1 : 0;
          } else if (typeof value === "string") {
            // Konversi string TRUE/FALSE ke 0/1
            if (value.toLowerCase() === "true") value = 1;
            else if (value.toLowerCase() === "false") value = 0;
          }
          cleanedRow[col] = value;
        });
        return cleanedRow;
      });

      // Siapkan input untuk model Python
      const modelInput = data;

      // Konfigurasi PythonShell
      const options = {
        mode: "text",
        scriptPath: path.join(__dirname, "../utils"),
        pythonPath: "python",
        args: [],
      };

      // Jalankan skrip Python
      const results = await new Promise((resolve, reject) => {
        const pyshell = new PythonShell("segmentasiWrapper.py", options);
        pyshell.send(JSON.stringify(modelInput));

        let resultData = "";
        pyshell.on("message", (message) => {
          resultData += message + "\n";
        });

        pyshell.on("error", (err) => {
          console.error("PythonShell error:", err);
        });

        pyshell.on("stderr", (stderr) => {
          console.error("Python stderr:", stderr);
        });

        pyshell.end((err) => {
          if (err) {
            console.error("Python Error:", err);
            console.error("Python stderr output:", resultData);
            reject(err);
          } else {
            try {
              const jsonMatch = resultData.match(/(\[\{.*\}\])/s);
              if (jsonMatch && jsonMatch[1]) {
                const parsedResult = JSON.parse(jsonMatch[1]);
                resolve(parsedResult);
              } else {
                console.error("No valid JSON found in:", resultData);
                reject(new Error("No valid JSON found in output"));
              }
            } catch (parseError) {
              console.error("Error parsing Python output:", parseError);
              reject(new Error("Failed to process segmentation result"));
            }
          }
        });
      });

      if (!results || !Array.isArray(results)) {
        return res
          .status(400)
          .json({ success: false, message: "Model segmentation failed" });
      }

      // Proses hasil segmentasi untuk setiap siswa
      const segmentations = originalData.map((row, index) => {
        const predicted_cluster = results[index]?.predicted_cluster;
        if (predicted_cluster === undefined) {
          throw new Error(`Segmentation missing for row ${index}`);
        }

        return {
          ...row,
          Predicted_Cluster: predicted_cluster,
        };
      });

      // Simpan file Excel segmentasi
      try {
        const sessionId = req.sessionID;
        const timestampStr = dayjs()
          .tz("Asia/Jakarta")
          .format("YYYYMMDD_HHmmss");
        const userSegmentationsDir = path.join(
          __dirname,
          "../../data/hasil/segmentasi",
        );
        const userSegmentationFile = path.join(
          userSegmentationsDir,
          `segmentations_${sessionId}_${timestampStr}.xlsx`,
        );

        // Pastikan direktori ada
        await fs.mkdir(userSegmentationsDir, { recursive: true });

        // Format data untuk Excel
        const excelData = segmentations.map((seg, index) => ({
          ID: index + 1,
          n_kejuruan: seg.n_kejuruan,
          n_mat: seg.n_mat,
          n_por: seg.n_por,
          n_agama: seg.n_agama,
          n_bjawa: seg.n_bjawa,
          n_bindo: seg.n_bindo,
          n_sikap_a: seg.n_sikap_a,
          mother_work_lainnya: seg.mother_work_lainnya,
          mother_salary_sangat_rendah: seg.mother_salary_sangat_rendah,
          father_salary_tidak_berpenghasilan:
            seg.father_salary_tidak_berpenghasilan,
          extracurricular_tidak: seg.extracurricular_tidak,
          father_edu_smp_sederajat: seg.father_edu_smp_sederajat,
          father_work_buruh: seg.father_work_buruh,
          mother_salary_cukup_rendah: seg.mother_salary_cukup_rendah,
          mother_work_buruh: seg.mother_work_buruh,
          Predicted_Cluster: seg.Predicted_Cluster,
        }));

        // Buat worksheet dan workbook
        const worksheet = xlsx.utils.json_to_sheet(excelData);
        const newWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(newWorkbook, worksheet, "Sheet1");

        // Tulis ke file Excel
        await xlsx.writeFile(newWorkbook, userSegmentationFile);
        console.log(`Segmentations saved to ${userSegmentationFile}`);

        // Simpan path file ke session
        req.session.segmentationFilePath = userSegmentationFile;

        // Jadwalkan penghapusan file setelah 1 jam (3600 detik)
        setTimeout(async () => {
          try {
            await fs.unlink(userSegmentationFile);
            console.log(`File deleted after 1 hour: ${userSegmentationFile}`);
          } catch (err) {
            console.error(`Error deleting file ${userSegmentationFile}:`, err);
          }
        }, 3600 * 1000);
      } catch (error) {
        console.error("Error saving segmentation data to Excel:", error);
        return res.status(400).json({
          success: false,
          message: "Failed to save segmentation data to Excel",
        });
      }

      // Kembalikan respons
      return res.status(201).json({
        success: true,
        data: segmentations,
        message: "Segmentations created successfully.",
      });
    } catch (error) {
      console.error("Error processing segmentation:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  createRekomendasi: async (req, res) => {
    try {
      // Validasi file
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No Excel file uploaded." });
      }

      // Baca file Excel
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      let data = xlsx.utils.sheet_to_json(sheet);

      // Validasi kolom yang diperlukan
      const requiredColumns = [
        "student_id",
        "interest_math",
        "interest_physics",
        "interest_chemistry",
        "interest_biology",
        "interest_history",
        "interest_economics",
        "interest_sociology",
        "interest_geography",
        "interest_informatics",
      ];

      const inputColumns = Object.keys(data[0] || {});
      const missingColumns = requiredColumns.filter(
        (col) => !inputColumns.includes(col),
      );
      if (missingColumns.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required columns: ${missingColumns.join(", ")}`,
        });
      }

      // Siapkan input untuk model Python
      const modelInput = data.map((row) => ({
        student_id: row.student_id,
        interest_math: row.interest_math,
        interest_physics: row.interest_physics,
        interest_chemistry: row.interest_chemistry,
        interest_biology: row.interest_biology,
        interest_history: row.interest_history,
        interest_economics: row.interest_economics,
        interest_sociology: row.interest_sociology,
        interest_geography: row.interest_geography,
        interest_informatics: row.interest_informatics,
      }));

      // Konfigurasi PythonShell
      const options = {
        mode: "text",
        scriptPath: path.join(__dirname, "../utils"),
        pythonPath: "python",
        args: [],
      };

      // Jalankan skrip Python
      const results = await new Promise((resolve, reject) => {
        const pyshell = new PythonShell("recommendationWrapper.py", options);
        pyshell.send(JSON.stringify(modelInput));

        let resultData = "";
        pyshell.on("message", (message) => {
          resultData += message + "\n";
        });

        pyshell.on("error", (err) => {
          console.error("PythonShell error:", err);
        });

        pyshell.on("stderr", (stderr) => {
          console.error("Python stderr:", stderr);
        });

        pyshell.end((err) => {
          if (err) {
            console.error("Python Error:", err);
            reject(err);
          } else {
            try {
              const jsonMatch = resultData.match(/(\[\{.*\}\])/s);
              if (jsonMatch && jsonMatch[1]) {
                const parsedResult = JSON.parse(jsonMatch[1]);
                resolve(parsedResult);
              } else {
                console.error("No valid JSON found in:", resultData);
                reject(new Error("No valid JSON found in output"));
              }
            } catch (parseError) {
              console.error("Error parsing Python output:", parseError);
              reject(new Error("Failed to process recommendation result"));
            }
          }
        });
      });

      if (!results || !Array.isArray(results)) {
        return res
          .status(400)
          .json({ success: false, message: "Model recommendation failed" });
      }

      // Proses hasil rekomendasi
      const timestamp = dayjs().tz("Asia/Jakarta").toISOString();
      const recommendations = results.map((result, index) => ({
        id: Date.now() + index,
        student_id: result.student_id,
        predicted_label: result.predicted_label,
        predicted_package: result.predicted_package,
        created_at: timestamp,
        updated_at: timestamp,
      }));

      // Simpan file Excel rekomendasi
      try {
        const sessionId = req.sessionID;
        const timestampStr = dayjs()
          .tz("Asia/Jakarta")
          .format("YYYYMMDD_HHmmss");
        const userRecommendationsDir = path.join(
          __dirname,
          "../../data/hasil/rekomendasi",
        );
        const userRecommendationFile = path.join(
          userRecommendationsDir,
          `recommendations_${sessionId}_${timestampStr}.xlsx`,
        );

        // Pastikan direktori ada
        await fs.mkdir(userRecommendationsDir, { recursive: true });

        // Format data untuk Excel
        const excelData = recommendations.map((rec, index) => ({
          ID: index + 1,
          Student_ID: rec.student_id,
          Predicted_Label: rec.predicted_label,
          Predicted_Package: rec.predicted_package,
        }));

        // Buat worksheet dan workbook
        const worksheet = xlsx.utils.json_to_sheet(excelData);
        const newWorkbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(newWorkbook, worksheet, "Sheet1");

        // Tulis ke file Excel
        await xlsx.writeFile(newWorkbook, userRecommendationFile);
        console.log(`Recommendations saved to ${userRecommendationFile}`);

        // Simpan path file ke session
        req.session.recommendationFilePath = userRecommendationFile;

        // Jadwalkan penghapusan file setelah 1 jam
        setTimeout(async () => {
          try {
            await fs.unlink(userRecommendationFile);
            console.log(`File deleted after 1 hour: ${userRecommendationFile}`);
          } catch (err) {
            console.error(
              `Error deleting file ${userRecommendationFile}:`,
              err,
            );
          }
        }, 3600 * 1000);
      } catch (error) {
        console.error("Error saving recommendation data to Excel:", error);
        return res.status(400).json({
          success: false,
          message: "Failed to save recommendation data to Excel",
        });
      }

      // Kembalikan respons
      return res.status(201).json({
        success: true,
        data: recommendations,
        message: "Recommendations created successfully.",
      });
    } catch (error) {
      console.error("Error processing recommendation:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = modelController;
