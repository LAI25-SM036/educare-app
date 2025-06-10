import json
import pandas as pd
import joblib
import sys
import os
import traceback
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Tentukan path absolut ke direktori models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCALER_PATH = os.path.join(BASE_DIR, "models", "rekomendasi-model", "scaler_interest.pkl")
ITEM_FLAGS_PATH = os.path.join(BASE_DIR, "models", "rekomendasi-model", "item_flags.pkl")

print(f"BASE_DIR: {BASE_DIR}")
print(f"SCALER_PATH: {SCALER_PATH}")
print(f"ITEM_FLAGS_PATH: {ITEM_FLAGS_PATH}")

# Daftar kolom interest yang diharapkan untuk item_flags
required_interest_cols = [
    "math_adv", "physics", "chemistry", "biology",
    "history_adv", "economics", "sociology", "geography", "informatics"
]

# Pemetaan dari kolom input pengguna ke kolom item_flags
input_to_item_mapping = {
    "interest_math": "math_adv",
    "interest_physics": "physics",
    "interest_chemistry": "chemistry",
    "interest_biology": "biology",
    "interest_history": "history_adv",
    "interest_economics": "economics",
    "interest_sociology": "sociology",
    "interest_geography": "geography",
    "interest_informatics": "informatics"
}

# Mapping label ke nama paket
label_to_package = {1: "IPA", 2: "IPS", 3: "Campuran"}

# Load scaler dan item flags
try:
    scaler_interest = joblib.load(SCALER_PATH)
    item_flags = pd.read_pickle(ITEM_FLAGS_PATH)
    print(f"Columns in item_flags: {item_flags.columns.tolist()}")
    print("Scaler and item flags loaded successfully")
except FileNotFoundError as e:
    print(json.dumps({"error": f"File not found: {str(e)}"}), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(json.dumps({"error": f"Failed to load files: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Validasi kolom di item_flags
try:
    missing_cols = [col for col in required_interest_cols if col not in item_flags.columns]
    if missing_cols:
        print(json.dumps({"error": f"Missing columns in item_flags.pkl: {missing_cols}"}), file=sys.stderr)
        sys.exit(1)
    X_item_flags = item_flags[required_interest_cols].values
    print("Item flag matrix prepared successfully")
except Exception as e:
    print(json.dumps({"error": f"Failed to prepare item flags: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
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

# Validasi kolom input pengguna
try:
    input_cols = list(input_to_item_mapping.keys()) + ["student_id"]
    missing_cols = [col for col in input_cols if col not in df.columns]
    if missing_cols:
        print(json.dumps({"error": f"Missing required columns in input: {missing_cols}"}), file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(json.dumps({"error": f"Column validation failed: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Petakan kolom input ke kolom item_flags
try:
    df_mapped = df.rename(columns=input_to_item_mapping)
    print(f"DataFrame after mapping columns: {df_mapped.columns.tolist()}")
except Exception as e:
    print(json.dumps({"error": f"Failed to map input columns: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Extract dan scale interest
try:
    user_interest = df_mapped[required_interest_cols].values
    X_new_interest = scaler_interest.transform(user_interest)
    print("Interest data scaled successfully")
except Exception as e:
    print(json.dumps({"error": f"Failed to scale interest data: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Hitung cosine similarity
try:
    sim_new = cosine_similarity(X_new_interest, X_item_flags)
    print("Cosine similarity calculated successfully")
except Exception as e:
    print(json.dumps({"error": f"Cosine similarity calculation failed: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Prediksi label
try:
    y_new_pred = np.argmax(sim_new, axis=1) + 1
    print("Predictions generated successfully")
except Exception as e:
    print(json.dumps({"error": f"Prediction failed: {str(e)}", "traceback": traceback.format_exc()}), file=sys.stderr)
    sys.exit(1)

# Format output
output = [
    {
        "student_id": str(row["student_id"]),
        "predicted_label": int(pred),
        "predicted_package": label_to_package[int(pred)]
    }
    for pred, row in zip(y_new_pred, df.to_dict("records"))
]
print(json.dumps(output))