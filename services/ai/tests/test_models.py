"""
Tests for Baseline Model Artifacts, Metadata, and Reproducibility
"""

import os
import json
import pytest
import joblib
import pandas as pd
from pathlib import Path

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"

def test_demand_model_artifact():
    model_path = ARTIFACTS_DIR / "demand_model" / "model.joblib"
    meta_path = ARTIFACTS_DIR / "demand_model" / "metadata.json"

    assert model_path.exists()
    assert meta_path.exists()

    model = joblib.load(model_path)
    assert hasattr(model, "predict")

    with open(meta_path) as f:
        meta = json.load(f)
    assert meta["model_name"] == "demand_forecaster_baseline"
    assert "metrics" in meta
    assert meta["metrics"]["test"]["mae"] > 0
    assert meta["metrics"]["test"]["mape_percent"] < 50.0

def test_price_model_artifact():
    model_path = ARTIFACTS_DIR / "price_model" / "model.joblib"
    meta_path = ARTIFACTS_DIR / "price_model" / "metadata.json"

    assert model_path.exists()
    assert meta_path.exists()

    model = joblib.load(model_path)
    assert hasattr(model, "predict")

    with open(meta_path) as f:
        meta = json.load(f)
    assert meta["model_name"] == "price_predictor_baseline"
    assert meta["metrics"]["test"]["r2"] > 0.80

def test_crop_model_artifact():
    model_path = ARTIFACTS_DIR / "crop_model" / "model.joblib"
    meta_path = ARTIFACTS_DIR / "crop_model" / "metadata.json"

    assert model_path.exists()
    assert meta_path.exists()

    model = joblib.load(model_path)
    assert hasattr(model, "predict")
    assert hasattr(model, "predict_proba")

    with open(meta_path) as f:
        meta = json.load(f)
    assert meta["model_name"] == "crop_recommender_baseline"
    assert meta["metrics"]["test"]["accuracy"] > 0.90
