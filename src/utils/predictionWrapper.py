import json
import pandas as pd
import joblib
import sys
import os

# Tentukan path absolut ke direktori models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(BASE_DIR, "models", "prediksi-model", "default_lrModel.pkl")

print(f"BASE_DIR: {BASE_DIR}")
print(f"MODEL_PATH: {MODEL_PATH}")

# Load model
try:
    model = joblib.load(MODEL_PATH)
    print("Model loaded successfully")
except FileNotFoundError:
    print(json.dumps({"error": f"Model file not found at {MODEL_PATH}"}))
    sys.exit(1)

# Define expected columns
expected_cols = [
    "Hours_Studied", "Attendance", "Sleep_Hours", "Previous_Scores", "Tutoring_Sessions",
    "Physical_Activity", "Parental_Involvement_Low", "Parental_Involvement_Medium",
    "Access_to_Resources_Low", "Access_to_Resources_Medium", "Extracurricular_Activities_Yes",
    "Motivation_Level_Low", "Motivation_Level_Medium", "Internet_Access_Yes",
    "Family_Income_Low", "Family_Income_Medium", "School_Type_Public",
    "Peer_Influence_Neutral", "Peer_Influence_Positive", "Learning_Disabilities_Yes",
    "Gender_Male"
]

# Read input
try:
    input_data = json.loads(sys.stdin.read())
    print("Input JSON parsed successfully")
except json.JSONDecodeError as e:
    print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
    sys.exit(1)

# Create DataFrame
df = pd.DataFrame(input_data)
print(f"DataFrame created with columns: {df.columns.tolist()}")

# Ensure all columns are numeric
for col in df.columns:
    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

# Reindex to match expected columns
df = df.reindex(columns=expected_cols, fill_value=0)
print(f"DataFrame reindexed with columns: {df.columns.tolist()}")

# Predict
try:
    predictions = model.predict(df)
    print("Predictions generated successfully")
except Exception as e:
    print(json.dumps({"error": f"Prediction failed: {str(e)}"}))
    sys.exit(1)

# Output results
output = [{"predicted_exam_score": float(pred)} for pred in predictions]
print(json.dumps(output))