import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

BASE_REQUEST = {
    "age": 40, "job": "admin.", "marital": "divorced", "education": "primary",
    "default": "no", "balance": 1500.0, "housing": "no", "loan": "no",
    "contact": "cellular", "day": 15, "month": "may", "campaign": 1,
    "pdays": -1, "previous": 0, "poutcome": "unknown",
}

# api.py opens 'models/' and 'config/' relative to the working directory at
# import time, so tests must run from backend-api/ and be able to import it.
os.chdir(BACKEND_DIR)
sys.path.insert(0, str(BACKEND_DIR))
