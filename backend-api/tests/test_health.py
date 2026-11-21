from fastapi.testclient import TestClient

import api

client = TestClient(api.app)


def test_health_reports_loaded_artifacts():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["feature_count"] == len(api.FEATURE_COLS)
    assert body["threshold"] == api.PREDICTION_THRESHOLD
