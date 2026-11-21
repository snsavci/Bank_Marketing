import pytest
from fastapi.testclient import TestClient

import api
from conftest import BASE_REQUEST

client = TestClient(api.app)


def post(**overrides):
    return client.post("/predict", json={**BASE_REQUEST, **overrides})


@pytest.mark.parametrize("field, value", [
    ("age", 17), ("age", 121),
    ("balance", 10_000_001),
    ("day", 0), ("day", 32),
    ("campaign", 0), ("campaign", 51),
    ("pdays", -2), ("pdays", 1000),
    ("previous", -1), ("previous", 51),
    ("job", "astronaut"),
    ("marital", "widowed"),
    ("education", "phd"),
    ("default", "maybe"), ("housing", "maybe"), ("loan", "maybe"),
    ("contact", "email"),
    ("month", "january"),
    ("poutcome", "great"),
    ("age", "forty"),
])
def test_invalid_value_is_rejected(field, value):
    assert post(**{field: value}).status_code == 422


@pytest.mark.parametrize("field", list(BASE_REQUEST))
def test_missing_field_is_rejected(field):
    payload = {k: v for k, v in BASE_REQUEST.items() if k != field}
    assert client.post("/predict", json=payload).status_code == 422


@pytest.mark.parametrize("field, value", [
    ("age", 18), ("age", 120),
    ("day", 1), ("day", 31),
    ("campaign", 1), ("campaign", 50),
    ("pdays", -1), ("pdays", 999),
    ("previous", 0), ("previous", 50),
    ("balance", 0),
])
def test_boundary_value_is_accepted(field, value):
    assert post(**{field: value}).status_code == 200
