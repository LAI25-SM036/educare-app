import json
import pandas as pd
import joblib
import sys
import os
import traceback

# Tentukan path absolut ke direktori models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCALER_PATH = os.path.join(BASE_DIR, "models", "segmentasi-model", "minmax_scaler.pkl")
PCA_PATH = os.path.join(BASE_DIR, "models", "segmentasi-model", "pca_transformer.pkl")
KMEANS_PATH = os.path.join(BASE_DIR, "models", "segmentasi-model", "kmeans_pca_model.pkl")

print(f"BASE_DIR: {BASE_DIR}")
print(f"SCALER_PATH: {SCALER_PATH}")
print(f"PCA_PATH: {PCA_PATH}")
print(f"KMEANS_PATH: {KMEANS_PATH}")

# Daftar kolom yang diharapkan oleh model
expected_cols = [
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
]

# Load scaler, PCA transformer, dan model K-Means
try:
    scaler = joblib.load(SCALER_PATH)
    print("Scaler loaded successfully")
except FileNotFoundError:
    print(json.dumps({"error": f"Scaler file not found at {SCALER_PATH}"}), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(json.dumps({"error": f"Failed to load scaler: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

try:
    pca_transformer = joblib.load(PCA_PATH)
    print("PCA transformer loaded successfully")
except FileNotFoundError:
    print(json.dumps({"error": f"PCA file not found at {PCA_PATH}"}), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(json.dumps({"error": f"Failed to load PCA transformer: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

try:
    kmeans_model = joblib.load(KMEANS_PATH)
    print("K-Means model loaded successfully")
except FileNotFoundError:
    print(json.dumps({"error": f"K-Means model file not found at {KMEANS_PATH}"}), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(json.dumps({"error": f"Failed to load K-Means model: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
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

# Scale the data
try:
    scaled_data = scaler.transform(df)
    print("Data scaled successfully")
except Exception as e:
    print(json.dumps({"error": f"Scaling failed: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Apply PCA transformation
try:
    pca_data = pca_transformer.transform(scaled_data)
    print("PCA transformation applied successfully")
except Exception as e:
    print(json.dumps({"error": f"PCA transformation failed: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Predict clusters
try:
    clusters = kmeans_model.predict(pca_data)
    print("Clusters predicted successfully")
except Exception as e:
    print(json.dumps({"error": f"Clustering failed: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Output results
output = [{"predicted_cluster": int(cluster)} for cluster in clusters]
print(json.dumps(output))