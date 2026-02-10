# File: backend-api/api.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator, ValidationError
import pickle
import json
import pandas as pd
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

# FastAPI instance
app = FastAPI()

# --- CORS Settings ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load Model and Feature List (Updated Paths) ---
# 1. Model Loading (from the models folder)
try:
    with open('models/bank_marketing_rf_model.pkl', 'rb') as file:
        model = pickle.load(file)
except FileNotFoundError:
    raise RuntimeError("Error: Model file not found in 'models/' directory.")
except Exception as e:
    import sklearn
    raise RuntimeError(f"Error loading model: {str(e)}")

# 2. Loading the Feature List (from the config folder)
try:
    with open('config/feature_cols.json', 'r') as file:
        FEATURE_COLS = json.load(file)
except FileNotFoundError:
    raise RuntimeError("Error: Feature list file not found in 'config/' directory.")

# 3. Threshold Value Loading (from the config folder)
try:
    with open('config/optimal_threshold.json', 'r') as file:
        threshold_data = json.load(file)
        PREDICTION_THRESHOLD = threshold_data.get('optimal_threshold', 0.6)
except FileNotFoundError:
    PREDICTION_THRESHOLD = 0.6

# List of categorical columns
CATEGORICAL_COLS = [
    'job', 'marital', 'education', 'contact', 'month', 'poutcome'
]

# --- Data Input Schema (Eksiksiz Tüm Validatorlar) ---
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
    
    @field_validator('age')
    @classmethod
    def validate_age(cls, v):
        if v < 18 or v > 120:
            raise ValueError('Age must be between 18 and 120 years')
        return v
    
    @field_validator('balance')
    @classmethod
    def validate_balance(cls, v):
        if v < 0:
            raise ValueError('Balance cannot be negative')
        if v > 10000000:
            raise ValueError('Balance value is too high (max: 10,000,000)')
        return v
    
    @field_validator('day')
    @classmethod
    def validate_day(cls, v):
        if v < 1 or v > 31:
            raise ValueError('Day must be between 1 and 31')
        return v
    
    @field_validator('campaign')
    @classmethod
    def validate_campaign(cls, v):
        if v < 1 or v > 50:
            raise ValueError('Campaign count must be between 1 and 50')
        return v
    
    @field_validator('pdays')
    @classmethod
    def validate_pdays(cls, v):
        if v < -1 or v > 999:
            raise ValueError('Pdays must be between -1 and 999')
        return v
    
    @field_validator('previous')
    @classmethod
    def validate_previous(cls, v):
        if v < 0 or v > 50:
            raise ValueError('Previous count must be between 0 and 50')
        return v
    
    @field_validator('job')
    @classmethod
    def validate_job(cls, v):
        valid_jobs = ['management', 'technician', 'blue-collar', 'admin.', 'services', 
                      'retired', 'self-employed', 'unemployed', 'housemaid', 'student', 
                      'entrepreneur', 'unknown']
        if v not in valid_jobs:
            raise ValueError(f'Invalid job. Must be one of: {", ".join(valid_jobs)}')
        return v
    
    @field_validator('marital')
    @classmethod
    def validate_marital(cls, v):
        valid_marital = ['married', 'single', 'divorced']
        if v not in valid_marital:
            raise ValueError(f'Invalid marital status. Must be one of: {", ".join(valid_marital)}')
        return v
    
    @field_validator('housing', 'loan', 'default')
    @classmethod
    def validate_yes_no(cls, v):
        if v not in ['yes', 'no']:
            raise ValueError('Must be either "yes" or "no"')
        return v
    
    @field_validator('poutcome')
    @classmethod
    def validate_poutcome(cls, v):
        valid_poutcome = ['unknown', 'failure', 'other', 'success']
        if v not in valid_poutcome:
            raise ValueError(f'Invalid previous outcome. Must be one of: {", ".join(valid_poutcome)}')
        return v
    
    @field_validator('education')
    @classmethod
    def validate_education(cls, v):
        valid_education = ['primary', 'secondary', 'tertiary', 'unknown']
        if v not in valid_education:
            raise ValueError(f'Invalid education. Must be one of: {", ".join(valid_education)}')
        return v
    
    @field_validator('contact')
    @classmethod
    def validate_contact(cls, v):
        valid_contact = ['cellular', 'telephone', 'unknown']
        if v not in valid_contact:
            raise ValueError(f'Invalid contact. Must be one of: {", ".join(valid_contact)}')
        return v
    
    @field_validator('month')
    @classmethod
    def validate_month(cls, v):
        valid_months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        if v not in valid_months:
            raise ValueError(f'Invalid month. Must be one of: {", ".join(valid_months)}')
        return v

# --- Prediction Endpoint ---
@app.post("/predict")
async def predict_subscription(data: CustomerInput):
    try:
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
        
        # 4. Predict with probability
        prediction_proba = model.predict_proba(final_input_df)[0][1]
        
        # 5. Apply threshold optimization
        final_prediction = 1 if prediction_proba >= PREDICTION_THRESHOLD else 0
        
        # 6. Additional business logic validation
        age = input_dict['age']
        balance = input_dict['balance']
        poutcome = input_dict['poutcome']
        
        if prediction_proba < 0.3:
            final_prediction = 0
        elif balance < 100 and age < 25 and poutcome == 'unknown' and prediction_proba < 0.5:
            final_prediction = 0
        
        return {
            "prediction_status": "Success",
            "subscription_predicted": "Yes" if final_prediction == 1 else "No",
            "probability_of_yes": round(prediction_proba, 4),
            "confidence_level": "High" if abs(prediction_proba - 0.5) > 0.3 else "Medium" if abs(prediction_proba - 0.5) > 0.15 else "Low"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}\n{error_details}")