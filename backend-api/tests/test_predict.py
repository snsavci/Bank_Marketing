from typing import Literal, get_args, get_origin

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


def test_api_matches_model_on_training_rows():
    """The API must hand the pipeline the same values as the training frame,
    so its probabilities equal the model's own output on real rows."""
    full = pd.read_csv(BACKEND_DIR.parent / "data" / "train.csv", sep=";")

    # 8% of customers have a negative balance, so the sample includes some.
    df = full.sample(100, random_state=0)
    request_fields = list(BASE_REQUEST)
    expected = api.model.predict_proba(df[request_fields])[:, 1]

    for (_, row), expected_proba in zip(df.iterrows(), expected):
        payload = {k: (row[k].item() if hasattr(row[k], "item") else row[k]) for k in request_fields}
        payload["balance"] = float(payload["balance"])
        response = client.post("/predict", json=payload)
        assert response.status_code == 200, (payload, response.text)
        assert response.json()["probability_of_yes"] == pytest.approx(expected_proba, abs=1e-4)


def test_response_contains_only_prediction_and_probability():
    response = client.post("/predict", json=BASE_REQUEST)
    assert set(response.json()) == {"subscription_predicted", "probability_of_yes"}


# Every choice the form can send, taken from the request model so a new choice is covered automatically.
CHOICES = [(name, value)
           for name, field in api.CustomerInput.model_fields.items() if get_origin(field.annotation) is Literal
           for value in get_args(field.annotation)]


@pytest.mark.parametrize("field, value", CHOICES)
def test_every_choice_gets_a_prediction(field, value):
    overrides = {field: value}
    if field == "poutcome" and value != "unknown":
        overrides.update(previous=1, pdays=90)  # a known outcome needs an earlier contact
    predict_proba(**overrides)


def test_fields_from_the_old_15_field_form_are_ignored():
    """A client built for the old 15-field model still sends day, month, contact, education,
    default and loan. They must not be rejected, and they must not change the score."""
    old_fields = {"day": 15, "month": "may", "contact": "cellular",
                  "education": "tertiary", "default": "no", "loan": "no"}
    with_old_fields = client.post("/predict", json={**BASE_REQUEST, **old_fields})
    assert with_old_fields.status_code == 200
    assert with_old_fields.json() == client.post("/predict", json=BASE_REQUEST).json()


@pytest.mark.parametrize("overrides", [
    {"poutcome": "success", "previous": 1, "pdays": 90},
    {"poutcome": "failure", "previous": 1, "pdays": 90},
    {"job": "retired"},
    {"job": "student"},
    {"marital": "single"},
    {"housing": "yes"},
    {"campaign": 12},
    {"age": 65},
    {"balance": 20000.0},
])
def test_input_changes_prediction(overrides):
    """Every field must reach the model, not be silently ignored."""
    assert predict_proba(**overrides) != predict_proba()


@pytest.mark.parametrize("overrides", [{"pdays": 400}, {"previous": 10}])
def test_pdays_and_previous_each_change_prediction(overrides):
    """The validator ties both fields to the base request, so neither can change alone from it.
    Compare against a customer who already has an earlier contact instead."""
    earlier_contact = {"previous": 2, "pdays": 90}
    assert predict_proba(**{**earlier_contact, **overrides}) != predict_proba(**earlier_contact)


def test_a_successful_earlier_campaign_scores_above_an_unknown_outcome():
    """Direction check: in the training data 'success' converts at about 65%, far above the 12% base rate."""
    earlier_contact = {"previous": 1, "pdays": 90}
    assert predict_proba(poutcome="success", **earlier_contact) > predict_proba(poutcome="unknown", **earlier_contact)
