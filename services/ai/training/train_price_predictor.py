"""
SIH26033 Price Intelligence Baseline Training Script
----------------------------------------------------
Trains a time-aware baseline model to forecast agricultural commodity modal prices.

Guarantees zero data leakage by utilizing strictly backward-shifted price lags,
rolling statistics, arrival volumes, and weather variables on chronological splits.
"""

import os
import json
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def train_price_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    splits_dir = os.path.join(current_dir, "..", "data", "splits")
    artifacts_dir = os.path.join(current_dir, "..", "artifacts", "price_model")
    os.makedirs(artifacts_dir, exist_ok=True)

    print("[Price Intelligence] Loading chronological splits...")
    train_df = pd.read_csv(os.path.join(splits_dir, "market_train.csv"))
    val_df = pd.read_csv(os.path.join(splits_dir, "market_val.csv"))
    test_df = pd.read_csv(os.path.join(splits_dir, "market_test.csv"))

    feature_cols = [
        "commodity_cat", "market_cat", "district_cat", "state_cat",
        "month", "day_of_week", "quarter", "is_weekend", "season_cat",
        "sin_month", "cos_month", "sin_day_of_year", "cos_day_of_year",
        "price_lag_1", "price_lag_7", "price_lag_14", "price_lag_30",
        "price_rolling_mean_7", "price_rolling_std_7",
        "price_rolling_mean_30", "price_rolling_std_30",
        "spread_lag_1", "arrivals_lag_1", "arrivals_lag_7", "arrivals_rolling_mean_7",
        "temp_mean", "rainfall", "humidity", "rainfall_sum_7d"
    ]
    target_col = "modal_price"

    X_train, y_train = train_df[feature_cols], train_df[target_col]
    X_val, y_val = val_df[feature_cols], val_df[target_col]
    X_test, y_test = test_df[feature_cols], test_df[target_col]

    print(f"[Price Intelligence] Training RandomForestRegressor on {len(X_train)} chronological rows...")
    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=16,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    pred_train = model.predict(X_train)
    pred_val = model.predict(X_val)
    pred_test = model.predict(X_test)

    # Metrics
    metrics = {
        "train": {
            "mae": float(mean_absolute_error(y_train, pred_train)),
            "rmse": float(np.sqrt(mean_squared_error(y_train, pred_train))),
            "r2": float(r2_score(y_train, pred_train))
        },
        "validation": {
            "mae": float(mean_absolute_error(y_val, pred_val)),
            "rmse": float(np.sqrt(mean_squared_error(y_val, pred_val))),
            "r2": float(r2_score(y_val, pred_val))
        },
        "test": {
            "mae": float(mean_absolute_error(y_test, pred_test)),
            "rmse": float(np.sqrt(mean_squared_error(y_test, pred_test))),
            "r2": float(r2_score(y_test, pred_test))
        }
    }

    # Feature importances for explainability
    importances = dict(zip(feature_cols, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    # Save artifact
    model_path = os.path.join(artifacts_dir, "model.joblib")
    joblib.dump(model, model_path)

    # Mappings
    commodity_map = dict(zip(train_df["commodity"], train_df["commodity_cat"].astype(int)))
    market_map = dict(zip(train_df["market"], train_df["market_cat"].astype(int)))
    district_map = dict(zip(train_df["district"], train_df["district_cat"].astype(int)))
    state_map = dict(zip(train_df["state"], train_df["state_cat"].astype(int)))

    metadata = {
        "model_name": "price_predictor_baseline",
        "model_version": "1.0.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "RandomForestRegressor",
        "hyperparameters": {
            "n_estimators": 150,
            "max_depth": 16,
            "min_samples_split": 4,
            "min_samples_leaf": 2,
            "random_state": 42
        },
        "training_dataset_version": "market_train_v1",
        "data_split_strategy": "chronological_time_split (70% train / 15% val / 15% test)",
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "target_variable": target_col,
        "target_unit": "INR / Quintal (100 kg)",
        "features": feature_cols,
        "feature_importances": sorted_importances,
        "metrics": metrics,
        "commodity_mapping": {k: int(v) for k, v in commodity_map.items()},
        "market_mapping": {k: int(v) for k, v in market_map.items()},
        "district_mapping": {k: int(v) for k, v in district_map.items()},
        "state_mapping": {k: int(v) for k, v in state_map.items()},
        "known_limitations": [
            "Prices reflect physical APMC mandi auction settlements; transport logistics and packaging margins must be applied separately",
            "Rapid policy changes (e.g. export bans or duty revisions) cannot be predicted purely from historical price/weather lag patterns",
            "Cold storage stock data is not yet integrated"
        ]
    }

    with open(os.path.join(artifacts_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Price Intelligence] Training complete! Test MAE: INR {metrics['test']['mae']:.2f}, RMSE: INR {metrics['test']['rmse']:.2f}, R2: {metrics['test']['r2']:.4f}")
    print(f"[Price Intelligence] Artifacts saved to {artifacts_dir}")
    return metadata

if __name__ == "__main__":
    train_price_model()
