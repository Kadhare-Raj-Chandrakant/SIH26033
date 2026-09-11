"""
Unit and Integration Tests for Data Pipelines, Validation, and Feature Engineering
"""

import os
import pytest
import pandas as pd
import numpy as np

from pipelines.ingestion import load_mandi_prices, load_weather_data, load_crop_recommendation_data
from pipelines.validation import validate_mandi_prices, validate_weather_data, validate_crop_recommendation
from pipelines.preprocessing import clean_mandi_prices, clean_weather_data, clean_crop_recommendation
from pipelines.feature_engineering import build_full_market_feature_matrix
from pipelines.splitters import chronological_time_split, stratified_classification_split

def test_raw_data_ingestion():
    mandi = load_mandi_prices()
    assert not mandi.empty
    assert "modal_price" in mandi.columns
    assert "arrivals" in mandi.columns
    assert len(mandi) > 5000

    weather = load_weather_data()
    assert not weather.empty
    assert "temp_mean" in weather.columns
    assert "rainfall" in weather.columns

    crop = load_crop_recommendation_data()
    assert not crop.empty
    assert "N" in crop.columns
    assert "crop" in crop.columns

def test_validation_rules():
    # Valid dataframe passes
    crop = load_crop_recommendation_data()
    valid, report = validate_crop_recommendation(crop)
    assert valid is True
    assert report["status"] == "PASSED"

    # Invalid price check
    bad_crop = crop.copy()
    bad_crop.loc[0, "ph"] = 25.0  # Impossible pH
    bad_valid, bad_report = validate_crop_recommendation(bad_crop)
    assert bad_valid is False
    assert any("pH" in issue for issue in bad_report["issues"])

def test_preprocessing_and_cleaning():
    mandi = load_mandi_prices()
    cleaned = clean_mandi_prices(mandi)
    assert cleaned["modal_price"].isnull().sum() == 0
    assert (cleaned["modal_price"] > 0).all()

from pipelines.preprocessing import clean_mandi_prices, clean_weather_data, clean_crop_recommendation, merge_mandi_and_weather

def test_feature_engineering_zero_leakage():
    mandi = load_mandi_prices().head(100).copy()
    weather = load_weather_data().copy()
    merged = merge_mandi_and_weather(mandi, weather)
    
    features = build_full_market_feature_matrix(merged)
    # Lags must exist and be strictly computed
    assert "price_lag_1" in features.columns
    assert "arrivals_lag_1" in features.columns
    assert "price_rolling_mean_7" in features.columns

def test_chronological_split_zero_leakage():
    mandi = load_mandi_prices().copy()
    train_df, val_df, test_df, meta = chronological_time_split(mandi, date_col="date")
    
    train_max = pd.to_datetime(train_df["date"]).max()
    val_min = pd.to_datetime(val_df["date"]).min()
    val_max = pd.to_datetime(val_df["date"]).max()
    test_min = pd.to_datetime(test_df["date"]).min()

    assert train_max < val_min, "Train partition overlaps with Validation partition!"
    assert val_max < test_min, "Validation partition overlaps with Test partition!"
    assert meta["leakage_assertion"] is True
