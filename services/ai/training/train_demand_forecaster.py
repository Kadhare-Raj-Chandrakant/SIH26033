"""
SIH26033 Demand Forecasting Baseline Training Script
-----------------------------------------------------
Trains a time-aware baseline model to forecast agricultural Market Demand / Market Absorption Proxy.

EXPLICIT TERMINOLOGY DISCLOSURE:
As actual platform historical order demand is emerging and does not yet span multi-year
seasonal cycles, APMC mandi arrival volume (Metric Tonnes) is utilized as an empirical
Wholesale Market Absorption Proxy.
This model DOES NOT represent actual platform buyer demand.
"""

import os
import json
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

def compute_metrics(y_true, y_pred):
    y_t = np.array(y_true, dtype=float)
    y_p = np.array(y_pred, dtype=float)
    mae = float(mean_absolute_error(y_t, y_p))
    rmse = float(np.sqrt(mean_squared_error(y_t, y_p)))
    
    # WAPE (Weighted Absolute Percentage Error) - mathematically robust to near-zero values
    sum_y = float(np.sum(y_t))
    wape = float(np.sum(np.abs(y_t - y_p)) / max(sum_y, 1.0)) * 100.0
    
    # Safe MAPE with floor at 1.0
    denominator = np.maximum(np.abs(y_t), 1.0)
    mape = float(np.mean(np.abs((y_t - y_p) / denominator)) * 100.0)

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "wape_percent": round(wape, 2),
        "mape_percent": round(mape, 2)
    }

def train_demand_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    splits_dir = os.path.join(current_dir, "..", "data", "splits")
    artifacts_dir = os.path.join(current_dir, "..", "artifacts", "demand_model")
    os.makedirs(artifacts_dir, exist_ok=True)

    print("[Demand Forecaster] Loading zero-leakage chronological splits...")
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

    # --- 1. NAIVE BASELINE (Predict Yesterday's Arrivals: arrivals_lag_1) ---
    naive_pred_train = train_df["arrivals_lag_1"].values
    naive_pred_val = val_df["arrivals_lag_1"].values
    naive_pred_test = test_df["arrivals_lag_1"].values

    naive_metrics = {
        "train": compute_metrics(y_train, naive_pred_train),
        "validation": compute_metrics(y_val, naive_pred_val),
        "test": compute_metrics(y_test, naive_pred_test)
    }

    # --- 2. TRAIN RANDOM FOREST REGRESSOR ---
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

    pred_train = model.predict(X_train)
    pred_val = model.predict(X_val)
    pred_test = model.predict(X_test)

    ml_metrics = {
        "train": compute_metrics(y_train, pred_train),
        "validation": compute_metrics(y_val, pred_val),
        "test": compute_metrics(y_test, pred_test)
    }

    # --- 3. PER-COMMODITY EVALUATION ON TEST SET ---
    per_commodity = {}
    for comm in test_df["commodity"].unique():
        comm_mask = (test_df["commodity"] == comm)
        y_comm_true = y_test[comm_mask]
        y_comm_ml = pred_test[comm_mask]
        y_comm_naive = naive_pred_test[comm_mask]
        per_commodity[comm] = {
            "test_samples": int(comm_mask.sum()),
            "naive_baseline": compute_metrics(y_comm_true, y_comm_naive),
            "ml_model": compute_metrics(y_comm_true, y_comm_ml)
        }

    # --- 4. PER-MARKET EVALUATION ON TEST SET ---
    per_market = {}
    for mkt in test_df["market"].unique():
        mkt_mask = (test_df["market"] == mkt)
        y_mkt_true = y_test[mkt_mask]
        y_mkt_ml = pred_test[mkt_mask]
        y_mkt_naive = naive_pred_test[mkt_mask]
        per_market[mkt] = {
            "test_samples": int(mkt_mask.sum()),
            "naive_baseline": compute_metrics(y_mkt_true, y_mkt_naive),
            "ml_model": compute_metrics(y_mkt_true, y_mkt_ml)
        }

    # Feature importances
    importances = dict(zip(feature_cols, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    # Save artifact
    model_path = os.path.join(artifacts_dir, "model.joblib")
    joblib.dump(model, model_path)

    commodity_map = dict(zip(train_df["commodity"], train_df["commodity_cat"].astype(int)))
    market_map = dict(zip(train_df["market"], train_df["market_cat"].astype(int)))

    metadata = {
        "model_name": "demand_forecaster_baseline",
        "model_version": "1.1.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "RandomForestRegressor",
        "dataset_source": "SYNTHETIC_DEMO (Modeled on APMC wholesale arrival clearing dynamics)",
        "dataset_provenance_status": "DEMO_FIXTURE_NO_FABRICATED_REAL_CLAIMS",
        "hyperparameters": {
            "n_estimators": 120,
            "max_depth": 14,
            "min_samples_split": 5,
            "min_samples_leaf": 3,
            "random_state": 42
        },
        "training_dataset_version": "market_train_v2_zero_leakage",
        "data_split_strategy": "chronological_time_split (70% train / 15% val / 15% test)",
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "target_variable": target_col,
        "target_concept": "Market Absorption Proxy / Wholesale Market Activity Forecast (Tonnes)",
        "proxy_disclosure": "This model forecasts physical wholesale arrival absorption volume. It does NOT represent actual platform buyer demand because platform historical data is emerging.",
        "features": feature_cols,
        "feature_importances": sorted_importances,
        "naive_baseline_strategy": "Lag-1 Arrival Persistence (predict yesterday's arrival)",
        "naive_metrics": naive_metrics,
        "metrics": ml_metrics,
        "per_commodity_evaluation": per_commodity,
        "per_market_evaluation": per_market,
        "commodity_mapping": {k: int(v) for k, v in commodity_map.items()},
        "market_mapping": {k: int(v) for k, v in market_map.items()},
        "known_limitations": [
            "Mandi arrivals proxy physical wholesale absorption and supply liquidity rather than unmet end-consumer platform demand",
            "Severe meteorological anomalies or roadblocks may cause unmodeled distribution bottlenecks",
            "Synthetic baseline fixture; requires live platform order history to transition to consumer demand modeling"
        ]
    }

    with open(os.path.join(artifacts_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Demand Forecaster] Training complete!")
    print(f"  Naive Baseline Test -> MAE: {naive_metrics['test']['mae']}, RMSE: {naive_metrics['test']['rmse']}, WAPE: {naive_metrics['test']['wape_percent']}%")
    print(f"  ML Baseline Test    -> MAE: {ml_metrics['test']['mae']}, RMSE: {ml_metrics['test']['rmse']}, WAPE: {ml_metrics['test']['wape_percent']}%")
    print(f"[Demand Forecaster] Artifacts saved to {artifacts_dir}")
    return metadata

if __name__ == "__main__":
    train_demand_model()
