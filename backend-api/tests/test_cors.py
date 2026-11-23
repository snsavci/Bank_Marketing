import pytest
from fastapi.testclient import TestClient

import api

client = TestClient(api.app)


def preflight(origin):
    return client.options("/predict", headers={
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })


@pytest.mark.parametrize("origin", ["http://localhost:5173", "http://127.0.0.1:5173"])
def test_vite_dev_origin_is_allowed(origin):
    response = preflight(origin)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


@pytest.mark.parametrize("origin", ["http://localhost:8081", "http://127.0.0.1:8081"])
def test_old_expo_origin_is_no_longer_allowed(origin):
    response = preflight(origin)
    assert "access-control-allow-origin" not in response.headers


def test_unknown_origin_is_rejected():
    response = preflight("http://evil.example")
    assert "access-control-allow-origin" not in response.headers


def test_credentials_are_not_allowed():
    response = preflight("http://localhost:5173")
    assert "access-control-allow-credentials" not in response.headers
