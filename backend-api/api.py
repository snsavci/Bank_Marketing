# File: backend-api/api.py
from fastapi import FastAPI
from pydantic import BaseModel
import pickle
import json
import pandas as pd
import numpy as np

# Initialize the FastAPI app
app = FastAPI()

# --- Load Model and Feature List ---
# Load the pre-trained Random Forest model
try:
    with open('bank_marketing_rf_model.pkl', 'rb') as file:
        model = pickle.load(file)
except FileNotFoundError:
    raise RuntimeError("ERROR: Model file not found. Ensure 'bank_marketing_rf_model.pkl' is in the backend-api folder.")

# Load the feature column list
try:
    with open('feature_cols.json', 'r') as file:
        FEATURE_COLS = json.load(file)
except FileNotFoundError:
    raise RuntimeError("ERROR: Feature list file not found. Ensure 'feature_cols.json' is in the backend-api folder.")

# Define the list of CATEGORICAL columns used for One-Hot Encoding
CATEGORICAL_COLS = [
    'job', 'marital', 'education', 'contact', 'month', 'poutcome'
]

# --- Data Input Schema ---
# Define the structure of the incoming data from the React Native app
# Must match the columns used in the original EDA/Preprocessing, excluding 'duration'.
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
    # Convert input Pydantic model to a dictionary
    input_dict = data.model_dump()

    # Create a DataFrame from the single input record
    input_df = pd.DataFrame([input_dict])
    
    # --- Data Preprocessing Pipeline ---
    
    # 1. Binary Mapping (Yes/No to 1/0)
    binary_map = {'yes': 1, 'no': 0}
    for col in ['default', 'housing', 'loan']:
        input_df[col] = input_df[col].map(binary_map)
    
    # 2. One-Hot Encoding for categorical features
    # Ensure the columns list is used in pd.get_dummies
    input_df = pd.get_dummies(input_df, columns=CATEGORICAL_COLS, drop_first=True)
    
    # 3. Align Columns (CRITICAL STEP for model consistency)
    missing_cols = set(FEATURE_COLS) - set(input_df.columns)
    for c in missing_cols:
        input_df[c] = 0
        
    # Reorder columns to match the trained model's expected order
    final_input_df = input_df[FEATURE_COLS]
    
    # 4. Predict
    # Get probability for class 1 (Subscription 'Yes')
    prediction_proba = model.predict_proba(final_input_df)[0][1]
    
    # Get the final prediction (0 or 1)
    final_prediction = int(model.predict(final_input_df)[0])
    
    # Return the result
    return {
        "prediction_status": "Success",
        "subscription_predicted": "Yes" if final_prediction == 1 else "No",
        "probability_of_yes": round(prediction_proba, 4)
    }