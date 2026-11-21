import numpy as np
import pytest
from fastapi.testclient import TestClient

import api
from conftest import BASE_REQUEST

client = TestClient(api.app)


class FixedProbaModel:
    """Replaces the real model so the threshold logic is tested on its own."""

    def __init__(self, proba):
        self.proba = proba

    def predict_proba(self, X):
        return np.array([[1 - self.proba, self.proba]])


def predict_with_proba(monkeypatch, proba):
    monkeypatch.setattr(api, "model", FixedProbaModel(proba))
    response = client.post("/predict", json=BASE_REQUEST)
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.parametrize("offset, expected", [
    (-0.05, "No"),
    (0.0, "Yes"),
    (0.05, "Yes"),
])
def test_prediction_follows_threshold(monkeypatch, offset, expected):
    """A probability equal to the threshold counts as Yes (>=)."""
    result = predict_with_proba(monkeypatch, api.PREDICTION_THRESHOLD + offset)
    assert result["subscription_predicted"] == expected


@pytest.mark.parametrize("proba, expected", [(0.0, "No"), (1.0, "Yes")])
def test_extreme_probabilities(monkeypatch, proba, expected):
    assert predict_with_proba(monkeypatch, proba)["subscription_predicted"] == expected


def test_probability_is_returned_rounded(monkeypatch):
    result = predict_with_proba(monkeypatch, 0.123456)
    assert result["probability_of_yes"] == 0.1235
