import json
import pandas as pd
import joblib
import sys
import os
import traceback

# Tentukan path absolut ke direktori models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, "models", "klasifikasi-model", "xgb_clmodel.pkl")

print(f"BASE_DIR: {BASE_DIR}")
print(f"MODEL_PATH: {MODEL_PATH}")

# Daftar kolom yang diharapkan oleh model
expected_cols = [
    "n_sikap_a",
    "n_kejuruan",
    "mother_work_lainnya",
    "n_mat",
    "n_por",
    "n_agama",
    "n_bjawa",
    "mother_salary_sangat_rendah",
    "father_salary_tidak_berpenghasilan",
    "n_bindo",
    "extracurricular_tidak",
    "father_edu_smp_sederajat",
    "father_work_buruh",
    "mother_salary_cukup_rendah",
    "mother_work_buruh",
]

# Load model
try:
    model = joblib.load(MODEL_PATH)
    print("Model loaded successfully")
except FileNotFoundError:
    print(json.dumps({"error": f"Model file not found at {MODEL_PATH}"}), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(json.dumps({"error": f"Failed to load model: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Read input
try:
    input_data = json.loads(sys.stdin.read())
    print("Input JSON parsed successfully")
except json.JSONDecodeError as e:
    print(json.dumps({"error": f"Invalid JSON input: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Create DataFrame
try:
    df = pd.DataFrame(input_data)
    print(f"DataFrame created with columns: {df.columns.tolist()}")
except Exception as e:
    print(json.dumps({"error": f"Failed to create DataFrame: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Ensure all columns are numeric
try:
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
except Exception as e:
    print(json.dumps({"error": f"Failed to convert columns to numeric: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Reindex to match expected columns
try:
    df = df.reindex(columns=expected_cols, fill_value=0)
    print(f"DataFrame reindexed with columns: {df.columns.tolist()}")
except Exception as e:
    print(json.dumps({"error": f"Failed to reindex DataFrame: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Predict
try:
    predictions = model.predict(df)
    print("Predictions generated successfully")
except Exception as e:
    print(json.dumps({"error": f"Prediction failed: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Output results
output = [{"predicted_final_score": int(pred)} for pred in predictions]
print(json.dumps(output))