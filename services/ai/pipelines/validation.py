"""
SIH26033 Data Quality Validation Module
---------------------------------------
Validates agricultural datasets against strict data quality rules:
- Schema checks
- Range/domain bounds (positive prices, positive arrivals, 0-14 pH, 0-100% humidity, non-negative rainfall)
- Null and duplicate checks
- Generates data health summaries and statistics
"""

from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd

def validate_mandi_prices(df: pd.DataFrame) -> Tuple[bool, Dict[str, Any]]:
    """
    Validates Mandi Price dataset.
    Returns (is_valid, validation_report).
    """
    issues: List[str] = []
    
    # 1. Null counts
    null_counts = df.isnull().sum().to_dict()
    if df["modal_price"].isnull().any():
        issues.append(f"Found {df['modal_price'].isnull().sum()} null values in modal_price")
    if df["arrivals"].isnull().any():
        issues.append(f"Found {df['arrivals'].isnull().sum()} null values in arrivals")

    # 2. Value range checks
    negative_prices = (df["modal_price"] <= 0).sum()
    if negative_prices > 0:
        issues.append(f"Found {negative_prices} negative or zero modal_price entries")

    invalid_spreads = (df["min_price"] > df["max_price"]).sum()
    if invalid_spreads > 0:
        issues.append(f"Found {invalid_spreads} rows where min_price > max_price")

    negative_arrivals = (df["arrivals"] < 0).sum()
    if negative_arrivals > 0:
        issues.append(f"Found {negative_arrivals} negative arrivals entries")

    # 3. Duplicate checks
    duplicates = df.duplicated(subset=["date", "commodity", "market"]).sum()
    if duplicates > 0:
        issues.append(f"Found {duplicates} duplicate entries on (date, commodity, market)")

    stats = {
        "record_count": len(df),
        "date_min": df["date"].min().strftime("%Y-%m-%d") if not df.empty else None,
        "date_max": df["date"].max().strftime("%Y-%m-%d") if not df.empty else None,
        "commodities": df["commodity"].unique().tolist(),
        "markets": df["market"].unique().tolist(),
        "districts": df["district"].unique().tolist(),
        "modal_price_min": float(df["modal_price"].min()),
        "modal_price_max": float(df["modal_price"].max()),
        "modal_price_mean": float(df["modal_price"].mean()),
        "arrivals_min": float(df["arrivals"].min()),
        "arrivals_max": float(df["arrivals"].max()),
        "arrivals_mean": float(df["arrivals"].mean()),
        "null_counts": null_counts,
        "duplicate_count": int(duplicates),
        "issues": issues,
        "status": "PASSED" if not issues else "WARNINGS_FOUND"
    }

    return len(issues) == 0, stats

def validate_weather_data(df: pd.DataFrame) -> Tuple[bool, Dict[str, Any]]:
    """
    Validates Agro-Weather dataset.
    """
    issues: List[str] = []

    # 1. Null counts
    null_counts = df.isnull().sum().to_dict()
    total_nulls = df.isnull().sum().sum()
    if total_nulls > 0:
        issues.append(f"Found {total_nulls} null values across weather columns")

    # 2. Value range checks
    invalid_temp = ((df["temp_mean"] < -15.0) | (df["temp_mean"] > 55.0)).sum()
    if invalid_temp > 0:
        issues.append(f"Found {invalid_temp} unrealistic temperature values outside [-15C, 55C]")

    invalid_spread = (df["temp_min"] > df["temp_max"]).sum()
    if invalid_spread > 0:
        issues.append(f"Found {invalid_spread} rows where temp_min > temp_max")

    invalid_rain = (df["rainfall"] < 0.0).sum()
    if invalid_rain > 0:
        issues.append(f"Found {invalid_rain} negative rainfall entries")

    invalid_hum = ((df["humidity"] < 0.0) | (df["humidity"] > 100.0)).sum()
    if invalid_hum > 0:
        issues.append(f"Found {invalid_hum} humidity values outside [0, 100]%")

    duplicates = df.duplicated(subset=["date", "district"]).sum()
    if duplicates > 0:
        issues.append(f"Found {duplicates} duplicate entries on (date, district)")

    stats = {
        "record_count": len(df),
        "date_min": df["date"].min().strftime("%Y-%m-%d") if not df.empty else None,
        "date_max": df["date"].max().strftime("%Y-%m-%d") if not df.empty else None,
        "districts": df["district"].unique().tolist(),
        "temp_mean_range": [float(df["temp_mean"].min()), float(df["temp_mean"].max())],
        "rainfall_total": float(df["rainfall"].sum()),
        "humidity_range": [float(df["humidity"].min()), float(df["humidity"].max())],
        "null_counts": null_counts,
        "duplicate_count": int(duplicates),
        "issues": issues,
        "status": "PASSED" if not issues else "WARNINGS_FOUND"
    }

    return len(issues) == 0, stats

def validate_crop_recommendation(df: pd.DataFrame) -> Tuple[bool, Dict[str, Any]]:
    """
    Validates Crop Recommendation dataset.
    """
    issues: List[str] = []

    # 1. Null counts
    null_counts = df.isnull().sum().to_dict()
    if df.isnull().sum().sum() > 0:
        issues.append("Found null values in crop recommendation dataset")

    # 2. Value range checks
    if (df["N"] < 0).any() or (df["P"] < 0).any() or (df["K"] < 0).any():
        issues.append("Found negative N, P, or K values")

    if ((df["ph"] < 0.0) | (df["ph"] > 14.0)).any():
        issues.append("Found pH values outside the valid range [0, 14]")

    if ((df["humidity"] < 0.0) | (df["humidity"] > 100.0)).any():
        issues.append("Found humidity values outside [0, 100]%")

    if (df["rainfall"] < 0.0).any():
        issues.append("Found negative rainfall values")

    crop_counts = df["crop"].value_counts().to_dict()

    stats = {
        "record_count": len(df),
        "crop_classes_count": len(crop_counts),
        "crops": list(crop_counts.keys()),
        "class_balance": crop_counts,
        "feature_ranges": {
            "N": [float(df["N"].min()), float(df["N"].max())],
            "P": [float(df["P"].min()), float(df["P"].max())],
            "K": [float(df["K"].min()), float(df["K"].max())],
            "temperature": [float(df["temperature"].min()), float(df["temperature"].max())],
            "humidity": [float(df["humidity"].min()), float(df["humidity"].max())],
            "ph": [float(df["ph"].min()), float(df["ph"].max())],
            "rainfall": [float(df["rainfall"].min()), float(df["rainfall"].max())]
        },
        "null_counts": null_counts,
        "issues": issues,
        "status": "PASSED" if not issues else "WARNINGS_FOUND"
    }

    return len(issues) == 0, stats
