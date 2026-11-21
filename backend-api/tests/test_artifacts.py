import api


def test_artifacts_load_from_any_working_directory(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    _, feature_cols, threshold = api.load_artifacts()
    assert feature_cols == api.FEATURE_COLS
    assert threshold == api.PREDICTION_THRESHOLD
