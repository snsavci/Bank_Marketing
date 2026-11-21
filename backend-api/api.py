# File: backend-api/api.py
import logging
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import pickle
import json
import pandas as pd
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

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_THRESHOLD = 0.6


def load_artifacts():
    """Load the trained model, the expected feature columns and the decision threshold."""
    try:
        with open(BASE_DIR / 'models' / 'bank_marketing_rf_model.pkl', 'rb') as file:
            model = pickle.load(file)
        with open(BASE_DIR / 'config' / 'feature_cols.json', 'r') as file:
            feature_cols = json.load(file)
    except Exception as e:
        logger.critical(f"Error loading model artifacts: {e}")
        raise RuntimeError(f"Error loading model artifacts: {e}")

    # The forest was pickled with n_jobs=-1. For a single row the thread pool
    # overhead costs more than the prediction itself.
    model.n_jobs = 1

    # The threshold file is optional, the other two are required.
    try:
        with open(BASE_DIR / 'config' / 'optimal_threshold.json', 'r') as file:
            threshold = json.load(file).get('optimal_threshold', DEFAULT_THRESHOLD)
    except FileNotFoundError:
        threshold = DEFAULT_THRESHOLD
        logger.warning(f"optimal_threshold.json not found. Using default threshold: {threshold}")

    logger.info(f"Artifacts loaded: {len(feature_cols)} features, threshold={threshold}")
    return model, feature_cols, threshold


model, FEATURE_COLS, PREDICTION_THRESHOLD = load_artifacts()

CATEGORICAL_COLS = [
    'job', 'marital', 'education', 'contact', 'month', 'poutcome'
]

CONFIDENCE_HIGH_THRESHOLD = 0.3
CONFIDENCE_MEDIUM_THRESHOLD = 0.15


YesNo = Literal['yes', 'no']


class CustomerInput(BaseModel):
    age: int = Field(ge=18, le=120)
    job: Literal['management', 'technician', 'blue-collar', 'admin.', 'services',
                 'retired', 'self-employed', 'unemployed', 'housemaid', 'student',
                 'entrepreneur', 'unknown']
    marital: Literal['married', 'single', 'divorced']
    education: Literal['primary', 'secondary', 'tertiary', 'unknown']
    default: YesNo
    balance: float = Field(ge=0, le=10_000_000)
    housing: YesNo
    loan: YesNo
    contact: Literal['cellular', 'telephone', 'unknown']
    day: int = Field(ge=1, le=31)
    month: Literal['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                   'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    campaign: int = Field(ge=1, le=50)
    pdays: int = Field(ge=-1, le=999)
    previous: int = Field(ge=0, le=50)
    poutcome: Literal['unknown', 'failure', 'other', 'success']


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
def predict_subscription(data: CustomerInput):
    logger.info("Prediction request received")
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
        final_input_df = input_df.reindex(columns=FEATURE_COLS, fill_value=0)

        # Calculate predicted probability
        prediction_proba = model.predict_proba(final_input_df)[0][1]

        # Apply classification threshold
        final_prediction = 1 if prediction_proba >= PREDICTION_THRESHOLD else 0

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
            "subscription_predicted": "Yes" if final_prediction == 1 else "No",
            "probability_of_yes": round(prediction_proba, 4),
            "confidence_level": confidence_level,
        }

    except Exception as e:
        # Log stack trace internally without exposing details to client
        logger.exception(f"Unexpected error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")