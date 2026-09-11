"""
SIH26033 Dataset Splits Builder
-------------------------------
Transforms cleaned datasets into feature-engineered matrices and produces
versioned, leakage-free train / validation / test splits for:
1. Demand Forecasting (historical arrivals proxy)
2. Price Intelligence (mandi modal price)
3. Crop Recommendation (soil and climate classification)
"""

import os
import json
import pandas as pd
from .ingestion import get_data_dir
from .feature_engineering import build_full_market_feature_matrix
from .splitters import chronological_time_split, stratified_classification_split

def build_all_splits():
    data_dir = get_data_dir()
    processed_dir = os.path.join(data_dir, "processed")
    splits_dir = os.path.join(data_dir, "splits")
    os.makedirs(splits_dir, exist_ok=True)

    # 1. Market & Weather features
    merged_path = os.path.join(processed_dir, "mandi_weather_merged.csv")
    if not os.path.exists(merged_path):
        raise FileNotFoundError(f"Cleaned merged dataset not found at {merged_path}")
    
    print("[Splits] Engineering market and temporal features...")
    merged_df = pd.read_csv(merged_path)
    feature_matrix = build_full_market_feature_matrix(merged_df)

    # Save feature matrix
    feature_matrix_path = os.path.join(processed_dir, "market_feature_matrix.csv")
    feature_matrix.to_csv(feature_matrix_path, index=False)
    print(f"[Splits] Saved market feature matrix: {feature_matrix_path} ({len(feature_matrix)} rows)")

    # Chronological split for Time-Series (Price & Demand)
    print("[Splits] Performing chronological time-series splitting (70% train / 15% val / 15% test)...")
    train_mkt, val_mkt, test_mkt, mkt_split_meta = chronological_time_split(
        feature_matrix,
        date_col="date",
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15
    )

    train_mkt.to_csv(os.path.join(splits_dir, "market_train.csv"), index=False)
    val_mkt.to_csv(os.path.join(splits_dir, "market_val.csv"), index=False)
    test_mkt.to_csv(os.path.join(splits_dir, "market_test.csv"), index=False)
    with open(os.path.join(splits_dir, "market_split_metadata.json"), "w") as f:
        json.dump(mkt_split_meta, f, indent=2)

    print(f"[Splits] Market splits saved: Train={len(train_mkt)}, Val={len(val_mkt)}, Test={len(test_mkt)}")
    print(f"[Splits] Train dates: {mkt_split_meta['train_date_range']}, Val dates: {mkt_split_meta['val_date_range']}, Test dates: {mkt_split_meta['test_date_range']}")
    print(f"[Splits] Zero Leakage Assertion: {mkt_split_meta['leakage_assertion']}")

    # 2. Crop Recommendation Split
    crop_path = os.path.join(processed_dir, "crop_recommendation_cleaned.csv")
    crop_df = pd.read_csv(crop_path)

    print("[Splits] Performing stratified classification splitting on crop recommendation (70/15/15)...")
    train_crop, val_crop, test_crop, crop_split_meta = stratified_classification_split(
        crop_df,
        target_col="crop",
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15,
        random_state=42
    )

    train_crop.to_csv(os.path.join(splits_dir, "crop_train.csv"), index=False)
    val_crop.to_csv(os.path.join(splits_dir, "crop_val.csv"), index=False)
    test_crop.to_csv(os.path.join(splits_dir, "crop_test.csv"), index=False)
    with open(os.path.join(splits_dir, "crop_split_metadata.json"), "w") as f:
        json.dump(crop_split_meta, f, indent=2)

    print(f"[Splits] Crop splits saved: Train={len(train_crop)}, Val={len(val_crop)}, Test={len(test_crop)}")

if __name__ == "__main__":
    build_all_splits()
