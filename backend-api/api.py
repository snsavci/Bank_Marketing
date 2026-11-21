# File: backend-api/api.py
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator, ValidationError
import pickle
import json
import pandas as pd
import numpy as np
from fastapi.middleware.cors import CORSMiddleware

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("bank_marketing_api")

app = FastAPI(
    title="Bank Marketing Prediction API",
    description="Term Deposit Subscription Prediction",
    version="1.0.0",
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained Random Forest model
try:
    with open('models/bank_marketing_rf_model.pkl', 'rb') as file:
        model = pickle.load(file)
    logger.info("Model loaded successfully from models/bank_marketing_rf_model.pkl")
except FileNotFoundError:
    logger.critical("Model file not found in 'models/' directory.")
    raise RuntimeError("Error: Model file not found in 'models/' directory.")
except Exception as e:
    logger.critical(f"Error loading model: {str(e)}")
    raise RuntimeError(f"Error loading model: {str(e)}")

# Load expected feature columns list
try:
    with open('config/feature_cols.json', 'r') as file:
        FEATURE_COLS = json.load(file)
    logger.info(f"Feature list loaded successfully. Total features: {len(FEATURE_COLS)}")
except FileNotFoundError:
    logger.critical("Feature list file not found in 'config/' directory.")
    raise RuntimeError("Error: Feature list file not found in 'config/' directory.")

# Load optimal classification threshold if available
try:
    with open('config/optimal_threshold.json', 'r') as file:
        threshold_data = json.load(file)
        PREDICTION_THRESHOLD = threshold_data.get('optimal_threshold', 0.6)
    logger.info(f"Prediction threshold loaded: {PREDICTION_THRESHOLD}")
except FileNotFoundError:
    PREDICTION_THRESHOLD = 0.6
    logger.warning("optimal_threshold.json not found. Using default threshold: 0.6")

CATEGORICAL_COLS = [
    'job', 'marital', 'education', 'contact', 'month', 'poutcome'
]

CONFIDENCE_HIGH_THRESHOLD = 0.3
CONFIDENCE_MEDIUM_THRESHOLD = 0.15


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


@app.get("/health")
async def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "ok",
        "model": "Random Forest Classifier",
        "threshold": PREDICTION_THRESHOLD,
        "feature_count": len(FEATURE_COLS),
    }


@app.post("/predict")
async def predict_subscription(data: CustomerInput):
    logger.info(f"Prediction request received: age={data.age}, job={data.job}, balance={data.balance}")
    try:
        input_dict = data.model_dump()
        input_df = pd.DataFrame([input_dict])

        # Convert yes/no strings to binary 1/0
        binary_map = {'yes': 1, 'no': 0}
        for col in ['default', 'housing', 'loan']:
            input_df[col] = input_df[col].map(binary_map)

        # One-hot encode categorical features by hand. pd.get_dummies(drop_first=True)
        # must not be used here: on a single row it drops the only category present,
        # so every categorical value would be ignored. The baseline category dropped
        # at training time has no column in FEATURE_COLS, so it stays all-zero below.
        for col in CATEGORICAL_COLS:
            input_df[f"{col}_{input_df.at[0, col]}"] = 1
        input_df = input_df.drop(columns=CATEGORICAL_COLS)

        # Fill missing columns so input matches model expected features
        missing_cols = set(FEATURE_COLS) - set(input_df.columns)
        for c in missing_cols:
            input_df[c] = 0

        final_input_df = input_df[FEATURE_COLS]

        # Calculate predicted probability
        prediction_proba = model.predict_proba(final_input_df)[0][1]

        # Apply classification threshold
        final_prediction = 1 if prediction_proba >= PREDICTION_THRESHOLD else 0

        # Additional business rules
        if prediction_proba < 0.3:
            logger.info(f"Low probability rule applied: proba={prediction_proba:.4f} < 0.3, set to No")
            final_prediction = 0
        elif (input_dict['balance'] < 100
              and input_dict['age'] < 25
              and input_dict['poutcome'] == 'unknown'
              and prediction_proba < 0.5):
            logger.info(
                f"Rule applied for young low-balance customer with unknown history "
                f"(proba={prediction_proba:.4f}), set to No"
            )
            final_prediction = 0

        # Determine confidence label
        confidence_distance = abs(prediction_proba - 0.5)
        confidence_level = (
            "High" if confidence_distance > CONFIDENCE_HIGH_THRESHOLD
            else "Medium" if confidence_distance > CONFIDENCE_MEDIUM_THRESHOLD
            else "Low"
        )

        logger.info(
            f"Prediction complete: result={'Yes' if final_prediction else 'No'}, "
            f"proba={prediction_proba:.4f}, confidence={confidence_level}"
        )

        return {
            "prediction_status": "Success",
            "subscription_predicted": "Yes" if final_prediction == 1 else "No",
            "probability_of_yes": round(prediction_proba, 4),
            "confidence_level": confidence_level,
        }

    except ValueError as e:
        logger.warning(f"Validation error in prediction: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
    except Exception as e:
        # Log stack trace internally without exposing details to client
        logger.exception(f"Unexpected error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")