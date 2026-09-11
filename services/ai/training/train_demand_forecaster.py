"""
SIH26033 Demand Forecasting Baseline Training Script
-----------------------------------------------------
Trains a time-aware baseline model to forecast agricultural market demand.

METHODOLOGICAL DISCLOSURE:
As actual platform historical order demand is emerging and does not yet span multi-year
seasonal cycles, APMC mandi arrival volume (Metric Tonnes) is utilized as an empirical
proxy for market absorption / physical trading demand. This is explicitly documented in
model metadata and must not be represented as actual platform transaction volume.
"""

import os
import json
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

def compute_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculates Mean Absolute Percentage Error safely."""
    denominator = np.maximum(np.abs(y_true), 1.0)
    return float(np.mean(np.abs((y_true - y_pred) / denominator)) * 100.0)

def train_demand_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    splits_dir = os.path.join(current_dir, "..", "data", "splits")
    artifacts_dir = os.path.join(current_dir, "..", "artifacts", "demand_model")
    os.makedirs(artifacts_dir, exist_ok=True)

    print("[Demand Forecaster] Loading chronological splits...")
    train_df = pd.read_csv(os.path.join(splits_dir, "market_train.csv"))
    val_df = pd.read_csv(os.path.join(splits_dir, "market_val.csv"))
    test_df = pd.read_csv(os.path.join(splits_dir, "market_test.csv"))

    feature_cols = [
        "commodity_cat", "market_cat", "month", "day_of_week", "quarter", "is_weekend",
        "sin_month", "cos_month", "sin_day_of_year", "cos_day_of_year",
        "arrivals_lag_1", "arrivals_lag_7", "arrivals_lag_14",
        "arrivals_rolling_mean_7", "arrivals_rolling_mean_30",
        "price_lag_1", "price_rolling_mean_7", "rainfall_sum_7d"
    ]
    target_col = "arrivals"

    X_train, y_train = train_df[feature_cols], train_df[target_col]
    X_val, y_val = val_df[feature_cols], val_df[target_col]
    X_test, y_test = test_df[feature_cols], test_df[target_col]

    print(f"[Demand Forecaster] Training RandomForestRegressor on {len(X_train)} chronological rows...")
    model = RandomForestRegressor(
        n_estimators=120,
        max_depth=14,
        min_samples_split=5,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Predictions
    pred_train = model.predict(X_train)
    pred_val = model.predict(X_val)
    pred_test = model.predict(X_test)

    # Metrics
    metrics = {
        "train": {
            "mae": float(mean_absolute_error(y_train, pred_train)),
            "rmse": float(np.sqrt(mean_squared_error(y_train, pred_train))),
            "mape_percent": compute_mape(y_train.values, pred_train)
        },
        "validation": {
            "mae": float(mean_absolute_error(y_val, pred_val)),
            "rmse": float(np.sqrt(mean_squared_error(y_val, pred_val))),
            "mape_percent": compute_mape(y_val.values, pred_val)
        },
        "test": {
            "mae": float(mean_absolute_error(y_test, pred_test)),
            "rmse": float(np.sqrt(mean_squared_error(y_test, pred_test))),
            "mape_percent": compute_mape(y_test.values, pred_test)
        }
    }

    # Feature importances
    importances = dict(zip(feature_cols, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    # Save artifact
    model_path = os.path.join(artifacts_dir, "model.joblib")
    joblib.dump(model, model_path)

    # Create commodity & market mapping dictionaries from train set
    commodity_map = dict(zip(train_df["commodity"], train_df["commodity_cat"].astype(int)))
    market_map = dict(zip(train_df["market"], train_df["market_cat"].astype(int)))

    metadata = {
        "model_name": "demand_forecaster_baseline",
        "model_version": "1.0.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "RandomForestRegressor",
        "hyperparameters": {
            "n_estimators": 120,
            "max_depth": 14,
            "min_samples_split": 5,
            "min_samples_leaf": 3,
            "random_state": 42
        },
        "training_dataset_version": "market_train_v1",
        "data_split_strategy": "chronological_time_split (70% train / 15% val / 15% test)",
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "target_variable": target_col,
        "target_description": "APMC mandi arrival quantity in Metric Tonnes (empirical proxy for market absorption / physical trading demand)",
        "features": feature_cols,
        "feature_importances": sorted_importances,
        "metrics": metrics,
        "commodity_mapping": {k: int(v) for k, v in commodity_map.items()},
        "market_mapping": {k: int(v) for k, v in market_map.items()},
        "known_limitations": [
            "Mandi arrivals proxy physical wholesale absorption and supply liquidity rather than unmet end-consumer demand",
            "Relies on at least 14 days of historical arrival lags for optimal accuracy",
            "Severe unseasonal meteorological anomalies may cause localized deviations"
        ]
    }

    with open(os.path.join(artifacts_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Demand Forecaster] Training complete! Test MAE: {metrics['test']['mae']:.2f}, RMSE: {metrics['test']['rmse']:.2f}, MAPE: {metrics['test']['mape_percent']:.2f}%")
    print(f"[Demand Forecaster] Artifacts saved to {artifacts_dir}")
    return metadata

if __name__ == "__main__":
    train_demand_model()
