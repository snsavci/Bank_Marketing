import json
import pickle
import shutil
from typing import Literal, get_args, get_origin

import pytest
import sklearn.base

import api


def test_artifacts_load_from_any_working_directory(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    model, threshold = api.load_artifacts()
    assert list(model.feature_names_in_) == list(api.model.feature_names_in_)
    assert threshold == api.PREDICTION_THRESHOLD


def test_request_fields_match_the_model_input_columns():
    """The form fields and the columns the pipeline was trained on must stay in sync."""
    assert set(api.CustomerInput.model_fields) == set(api.model.feature_names_in_)


def test_request_choices_match_the_categories_the_encoder_learned():
    """handle_unknown='ignore' turns a value the encoder never saw into all zeros instead of an
    error, so a request choice missing from the encoder would return 200 with a meaningless score.
    Comparing the two sets is the only thing that catches that drift."""
    encoder = api.model.named_steps["prep"].named_transformers_["categorical"]
    choice_fields = {name for name, field in api.CustomerInput.model_fields.items()
                     if get_origin(field.annotation) is Literal}
    assert choice_fields == set(encoder.feature_names_in_)
    for column, categories in zip(encoder.feature_names_in_, encoder.categories_):
        assert set(get_args(api.CustomerInput.model_fields[column].annotation)) == set(categories), column


def test_forest_predicts_single_rows_without_a_thread_pool():
    """n_jobs=-1 makes a one-row prediction about 2.5x slower; the notebook saves it with n_jobs=1."""
    assert api.model.named_steps["forest"].n_jobs == 1


def test_threshold_is_a_probability():
    assert 0 < api.PREDICTION_THRESHOLD < 1


# --- Startup must fail loudly on a bad artifact, not at the first request ---

@pytest.fixture
def artifact_dir(tmp_path, monkeypatch):
    """A scratch copy of models/ and config/ that load_artifacts() reads instead of the real ones."""
    shutil.copytree(api.BASE_DIR / "models", tmp_path / "models")
    shutil.copytree(api.BASE_DIR / "config", tmp_path / "config")
    monkeypatch.setattr(api, "BASE_DIR", tmp_path)
    return tmp_path


def write_threshold(directory, content):
    (directory / "config" / "optimal_threshold.json").write_text(json.dumps(content))


def test_missing_model_file_fails_at_load(artifact_dir):
    (artifact_dir / "models" / "bank_marketing_rf_model.pkl").unlink()
    with pytest.raises(RuntimeError, match="Error loading model artifacts"):
        api.load_artifacts()


def test_corrupt_model_file_fails_at_load(artifact_dir):
    (artifact_dir / "models" / "bank_marketing_rf_model.pkl").write_bytes(b"not a pickle")
    with pytest.raises(RuntimeError, match="Error loading model artifacts"):
        api.load_artifacts()


def test_missing_threshold_file_fails_at_load(artifact_dir):
    (artifact_dir / "config" / "optimal_threshold.json").unlink()
    with pytest.raises(RuntimeError, match="Error loading model artifacts"):
        api.load_artifacts()


@pytest.mark.parametrize("content", [
    {},                                  # key missing
    {"optimal_threshold": 0.0},
    {"optimal_threshold": 1.0},
    {"optimal_threshold": -0.2},
    {"optimal_threshold": 1.5},
    {"optimal_threshold": "0.18"},       # text, not a number
    {"optimal_threshold": None},
    {"optimal_threshold": True},
])
def test_unusable_threshold_fails_at_load(artifact_dir, content):
    write_threshold(artifact_dir, content)
    with pytest.raises(RuntimeError, match="Error loading model artifacts"):
        api.load_artifacts()


def test_model_pickled_with_another_scikit_learn_version_fails_at_load(artifact_dir, monkeypatch):
    """Unpickling across scikit-learn versions only emits a warning and then predicts from a
    layout that may have changed. The API must refuse to start instead."""
    with monkeypatch.context() as patch:
        patch.setattr(sklearn.base, "__version__", "1.2.2")  # stamped into every estimator on dump
        stale = pickle.dumps(api.model)
    (artifact_dir / "models" / "bank_marketing_rf_model.pkl").write_bytes(stale)
    with pytest.raises(RuntimeError, match="version 1.2.2"):
        api.load_artifacts()
