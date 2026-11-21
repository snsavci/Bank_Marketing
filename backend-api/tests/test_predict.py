import pandas as pd
import pytest
from fastapi.testclient import TestClient

import api
from conftest import BACKEND_DIR, BASE_REQUEST

client = TestClient(api.app)


def predict_proba(**overrides):
    response = client.post("/predict", json={**BASE_REQUEST, **overrides})
    assert response.status_code == 200, response.text
    return response.json()["probability_of_yes"]


def test_api_matches_training_encoding():
    """API probabilities must equal the model's output on training-style encoding
    (full-frame pd.get_dummies(drop_first=True), as done in the notebook)."""
    full = pd.read_csv(BACKEND_DIR.parent / "data" / "train.csv", sep=";")

    # Encode the whole dataset first, exactly like the notebook, then sample rows.
    encoded = full.drop(columns=["y", "duration"]).copy()
    for col in ["default", "housing", "loan"]:
        encoded[col] = encoded[col].map({"yes": 1, "no": 0})
    encoded = pd.get_dummies(encoded, columns=api.CATEGORICAL_COLS, drop_first=True)

    # 8% of customers have a negative balance, so the sample includes some.
    df = full.sample(100, random_state=0)
    expected = api.model.predict_proba(encoded.loc[df.index, api.FEATURE_COLS])[:, 1]

    request_fields = list(BASE_REQUEST)
    for (_, row), expected_proba in zip(df.iterrows(), expected):
        payload = {k: (row[k].item() if hasattr(row[k], "item") else row[k]) for k in request_fields}
        payload["balance"] = float(payload["balance"])
        response = client.post("/predict", json=payload)
        assert response.status_code == 200, (payload, response.text)
        assert response.json()["probability_of_yes"] == pytest.approx(expected_proba, abs=1e-4)


def test_response_contains_only_prediction_and_probability():
    response = client.post("/predict", json=BASE_REQUEST)
    assert set(response.json()) == {"subscription_predicted", "probability_of_yes"}


@pytest.mark.parametrize("field, value", [
    ("poutcome", "success"),
    ("poutcome", "failure"),
    ("job", "retired"),
    ("job", "student"),
    ("marital", "single"),
    ("education", "tertiary"),
    ("contact", "telephone"),
    ("month", "mar"),
    ("month", "oct"),
])
def test_categorical_input_changes_prediction(field, value):
    """Every categorical field must reach the model, not be silently ignored."""
    assert predict_proba(**{field: value}) != predict_proba()
