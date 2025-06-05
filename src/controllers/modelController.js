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

        // Tentukan kategori skor
        let score_category;
        if (predicted_exam_score < 60) {
          score_category = "Low";
        } else if (predicted_exam_score >= 60 && predicted_exam_score < 80) {
          score_category = "Medium";
        } else {
          score_category = "High";
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
          Internet_Access_Yes: data[index].Internet_Access,
          Family_Income_Low: data[index].Family_Income_Low,
          Family_Income_Medium: data[index].Family_Income_Medium,
          School_Type_Public: data[index].School_Type_Public,
          Peer_Influence_Neutral: data[index].Peer_Influence_Neutral,
          Peer_Influence_Positive: data[index].Peer_Influence_Positive,
          Learning_Disabilities_Yes: data[index].Learning_Disabilities_Yes,
          Gender_Male: data[index].Gender_Male,
          predicted_exam_score,
          score_category,
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
};

module.exports = modelController;
