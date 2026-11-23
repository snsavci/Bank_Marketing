# File: backend-api/api.py
import logging
import math
import warnings
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator
import pickle
import json
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from sklearn.exceptions import InconsistentVersionWarning

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

# Origins of the Expo web dev server (npm run web). Native Expo Go builds are
# not subject to CORS. Add the new origin here if Expo starts on another port.
ALLOWED_ORIGINS = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent


def load_artifacts():
    """Load the trained pipeline (one-hot encoding + random forest) and the decision threshold.

    Both files are written by notebook/eda-and-modeling.ipynb. There is no fallback
    threshold: the right value depends on the trained model, so a missing file is an error.
    Anything wrong with either file stops the start-up here instead of surfacing on a request.
    """
    try:
        with open(BASE_DIR / 'models' / 'bank_marketing_rf_model.pkl', 'rb') as file:
            # Unpickling a model saved by another scikit-learn version only emits a warning and then
            # predicts from a layout that may have changed. Turn that warning into a start-up error.
            with warnings.catch_warnings():
                warnings.simplefilter('error', InconsistentVersionWarning)
                model = pickle.load(file)
        with open(BASE_DIR / 'config' / 'optimal_threshold.json', 'r') as file:
            threshold = json.load(file)['optimal_threshold']
        if not (isinstance(threshold, float) and 0 < threshold < 1):
            raise ValueError(f"optimal_threshold must be a number strictly between 0 and 1, got {threshold!r}")
    except Exception as e:
        logger.critical(f"Error loading model artifacts: {e}")
        raise RuntimeError(f"Error loading model artifacts: {e}") from e

    logger.info(f"Artifacts loaded: {len(model.feature_names_in_)} input fields, threshold={threshold}")
    return model, threshold


model, PREDICTION_THRESHOLD = load_artifacts()

YesNo = Literal['yes', 'no']


class CustomerInput(BaseModel):
    """The fields the form asks for. Their names must match the columns the pipeline was trained on."""

    # The old 15-field client also sends day, month, contact, education, default and loan.
    # The model does not use them, so they are dropped instead of rejected.
    model_config = ConfigDict(extra='ignore')

    age: int = Field(ge=18, le=120)
    job: Literal['management', 'technician', 'blue-collar', 'admin.', 'services',
                 'retired', 'self-employed', 'unemployed', 'housemaid', 'student',
                 'entrepreneur', 'unknown']
    marital: Literal['married', 'single', 'divorced']
    balance: float = Field(ge=-10_000_000, le=10_000_000)
    housing: YesNo
    # Contacts in the current campaign. The training data tops out at 63 (4 rows above 50);
    # trees treat anything above their last split the same, so 50 is a sanity limit only.
    campaign: int = Field(ge=1, le=50)
    # The three fields below describe one fact: was the customer contacted in an earlier
    # campaign, and how did it end. See the validator.
    pdays: int = Field(ge=-1, le=999)
    # Same sanity-limit reasoning as campaign: the training data tops out at 275 (4 rows above 50).
    previous: int = Field(ge=0, le=50)
    poutcome: Literal['unknown', 'failure', 'other', 'success']

    @model_validator(mode='after')
    def previous_campaign_fields_agree(self):
        """Two rules, both of which hold for all 45,211 training rows:
        1. previous=0 and pdays=-1 mean "not contacted in an earlier campaign" and go together.
        2. A recorded outcome (failure, other, success) needs an earlier contact.
        The reverse is not required: 5 training rows (2 subscribed) have earlier contacts but
        poutcome 'unknown', which is a real state ("contacted, outcome not recorded")."""
        if (self.previous == 0) != (self.pdays == -1):
            raise ValueError("previous and pdays disagree: previous=0 goes with pdays=-1 "
                             "(not contacted before), previous >= 1 needs pdays >= 0")
        if self.poutcome != 'unknown' and self.previous == 0:
            raise ValueError(f"poutcome '{self.poutcome}' needs an earlier contact (previous >= 1)")
        return self


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Same 422 body as FastAPI's default, except that a NaN or Infinity the client sent is not echoed back.

    Python's JSON parser accepts NaN and Infinity. FastAPI puts the rejected value into the
    error ("input"), and serialising it for the response then fails with a 500."""
    errors = [
        {key: value for key, value in error.items()
         if not (key == "input" and isinstance(value, float) and not math.isfinite(value))}
        for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(errors)})


@app.get("/health")
async def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "ok",
        "model": "Random Forest Classifier",
        "threshold": PREDICTION_THRESHOLD,
        "feature_count": len(model.feature_names_in_),
    }


@app.post("/predict")
def predict_subscription(data: CustomerInput):
    logger.info("Prediction request received")
    try:
        # The pipeline picks its columns by name and one-hot encodes the text values itself.
        input_df = pd.DataFrame([data.model_dump()])

        # Calculate predicted probability
        prediction_proba = model.predict_proba(input_df)[0][1]

        # Apply classification threshold
        final_prediction = 1 if prediction_proba >= PREDICTION_THRESHOLD else 0

        logger.info(
            f"Prediction complete: result={'Yes' if final_prediction else 'No'}, "
            f"proba={prediction_proba:.4f}"
        )

        return {
            "subscription_predicted": "Yes" if final_prediction == 1 else "No",
            "probability_of_yes": round(prediction_proba, 4),
        }

    except Exception as e:
        # Log stack trace internally without exposing details to client
        logger.exception(f"Unexpected error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")