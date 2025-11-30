# File: backend-api/api.py
from fastapi import FastAPI
from pydantic import BaseModel
import pickle
import json
import pandas as pd
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

# FastAPI instance
app = FastAPI()
origins = [
    "http://localhost",
    "http://127.0.0.1",
    "http://192.168.1.96:8081", # Örn: RN uygulamasının çalıştığı port.
    "http://192.168.1.96", # Sizin yerel IP adresiniz
    "http://0.0.0.0",
    "*" # Geliştirme aşamasında her yerden gelen isteklere izin verir (Basitleştirmek için)
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Yeterli güvenlik kontrolü olmadığından * kullanıyoruz
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- Load Model and Feature List ---
# Load the pre-trained Random Forest model
try:
    with open('bank_marketing_rf_model.pkl', 'rb') as file:
        model = pickle.load(file)
except FileNotFoundError:
    raise RuntimeError("Error: Model file not found.")

# Load the feature column list
try:
    with open('feature_cols.json', 'r') as file:
        FEATURE_COLS = json.load(file)
except FileNotFoundError:
    raise RuntimeError("Error: Feature list file not found.")

# Define the list of CATEGORICAL columns used for One-Hot Encoding
CATEGORICAL_COLS = [
    'job', 'marital', 'education', 'contact', 'month', 'poutcome'
]

# --- Data Input Schema (Matching React Native Input) ---
class CustomerInput(BaseModel):
    age: int
    job: str
    marital: str
    education: str
    default: str
    balance: float
    housing: str
    loan: str
    contact: str
    day: int
    month: str
    campaign: int
    pdays: int
    previous: int
    poutcome: str

# --- Prediction Endpoint ---
@app.post("/predict")
def predict_subscription(data: CustomerInput):
    input_dict = data.model_dump()
    input_df = pd.DataFrame([input_dict])
    
    # 1. Binary Mapping (Yes/No to 1/0)
    binary_map = {'yes': 1, 'no': 0}
    for col in ['default', 'housing', 'loan']:
        input_df[col] = input_df[col].map(binary_map)
    
    # 2. One-Hot Encoding
    input_df = pd.get_dummies(input_df, columns=CATEGORICAL_COLS, drop_first=True)
    
    # 3. Align Columns (CRITICAL)
    missing_cols = set(FEATURE_COLS) - set(input_df.columns)
    for c in missing_cols:
        input_df[c] = 0
        
    final_input_df = input_df[FEATURE_COLS]
    
    # 4. Predict
    prediction_proba = model.predict_proba(final_input_df)[0][1]
    final_prediction = int(model.predict(final_input_df)[0])
    
    return {
        "prediction_status": "Success",
        "subscription_predicted": "Yes" if final_prediction == 1 else "No",
        "probability_of_yes": round(prediction_proba, 4)
    }