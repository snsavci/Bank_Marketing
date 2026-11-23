import pytest
from fastapi.testclient import TestClient

import api
from conftest import BASE_REQUEST

client = TestClient(api.app)

# The "contacted in an earlier campaign" block: all three fields change together.
PREVIOUSLY_CONTACTED = {"poutcome": "failure", "previous": 2, "pdays": 90}


def post(**overrides):
    return client.post("/predict", json={**BASE_REQUEST, **overrides})


@pytest.mark.parametrize("field, value, rest", [
    ("age", 17, {}), ("age", 121, {}),
    ("balance", 10_000_001, {}), ("balance", -10_000_001, {}),
    ("campaign", 0, {}), ("campaign", 51, {}),
    # The previous-campaign limits are tested on a customer who was contacted before. With the
    # default "never contacted" request the cross-field rule would reject these values anyway
    # and the test would pass even if the limits were deleted.
    ("pdays", -2, PREVIOUSLY_CONTACTED), ("pdays", 1000, PREVIOUSLY_CONTACTED),
    ("previous", -1, PREVIOUSLY_CONTACTED), ("previous", 51, PREVIOUSLY_CONTACTED),
    ("job", "astronaut", {}),
    ("marital", "widowed", {}),
    ("housing", "maybe", {}),
    ("poutcome", "great", {}),
    ("age", "forty", {}),
])
def test_invalid_value_is_rejected_by_its_own_field(field, value, rest):
    response = post(**{**rest, field: value})
    assert response.status_code == 422
    # Exactly one error, located at the field itself and not at the cross-field rule (loc ["body"]).
    assert [error["loc"] for error in response.json()["detail"]] == [["body", field]]


@pytest.mark.parametrize("field", list(BASE_REQUEST))
def test_missing_field_is_rejected(field):
    payload = {k: v for k, v in BASE_REQUEST.items() if k != field}
    assert client.post("/predict", json=payload).status_code == 422


@pytest.mark.parametrize("field, value", [
    ("age", 18), ("age", 120),
    ("campaign", 1), ("campaign", 50),
    ("balance", 0), ("balance", -500), ("balance", -10_000_000), ("balance", 10_000_000),
])
def test_boundary_value_is_accepted(field, value):
    assert post(**{field: value}).status_code == 200


@pytest.mark.parametrize("overrides", [
    PREVIOUSLY_CONTACTED,
    {"poutcome": "success", "previous": 1, "pdays": 0},
    {"poutcome": "other", "previous": 50, "pdays": 999},
    # Contacted before but no outcome recorded. 5 training rows look like this (2 subscribed),
    # so it is a real customer state, not an input error.
    {"poutcome": "unknown", "previous": 2, "pdays": 90},
])
def test_consistent_previous_campaign_is_accepted(overrides):
    assert post(**overrides).status_code == 200


@pytest.mark.parametrize("overrides", [
    {"poutcome": "success"},                                  # success but never contacted before
    {"poutcome": "failure", "previous": 0, "pdays": 90},      # outcome known, zero previous contacts
    {"poutcome": "failure", "previous": 2, "pdays": -1},      # outcome known, but pdays says never contacted
    {"poutcome": "unknown", "previous": 2, "pdays": -1},      # contacts counted, but pdays says never contacted
    {"poutcome": "unknown", "previous": 0, "pdays": 90},      # days since a contact that never happened
])
def test_inconsistent_previous_campaign_is_rejected(overrides):
    response = post(**overrides)
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body"]    # raised by the cross-field rule
