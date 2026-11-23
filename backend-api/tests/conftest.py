import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

BASE_REQUEST = {
    "age": 40, "job": "admin.", "marital": "divorced", "balance": 1500.0,
    "housing": "no", "campaign": 1, "pdays": -1, "previous": 0, "poutcome": "unknown",
}

sys.path.insert(0, str(BACKEND_DIR))
