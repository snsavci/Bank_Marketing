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


@pytest.mark.parametrize("origin", ["http://localhost:8081", "http://127.0.0.1:8081"])
def test_expo_web_origin_is_allowed(origin):
    response = preflight(origin)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_unknown_origin_is_rejected():
    response = preflight("http://evil.example")
    assert "access-control-allow-origin" not in response.headers


def test_credentials_are_not_allowed():
    response = preflight("http://localhost:8081")
    assert "access-control-allow-credentials" not in response.headers
