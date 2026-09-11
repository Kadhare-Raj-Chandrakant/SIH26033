"""
SIH26033 Crop Recommendation Baseline Training Script
------------------------------------------------------
Trains a multi-class classification baseline model to recommend optimal crops
based on soil nutrients (N, P, K), soil pH, and agro-climatic conditions
(temperature, humidity, rainfall).
"""

import os
import json
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report

def train_crop_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    splits_dir = os.path.join(current_dir, "..", "data", "splits")
    artifacts_dir = os.path.join(current_dir, "..", "artifacts", "crop_model")
    os.makedirs(artifacts_dir, exist_ok=True)

    print("[Crop Recommender] Loading stratified splits...")
    train_df = pd.read_csv(os.path.join(splits_dir, "crop_train.csv"))
    val_df = pd.read_csv(os.path.join(splits_dir, "crop_val.csv"))
    test_df = pd.read_csv(os.path.join(splits_dir, "crop_test.csv"))

    feature_cols = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    target_col = "crop"

    X_train, y_train = train_df[feature_cols], train_df[target_col]
    X_val, y_val = val_df[feature_cols], val_df[target_col]
    X_test, y_test = test_df[feature_cols], test_df[target_col]

    print(f"[Crop Recommender] Training RandomForestClassifier on {len(X_train)} samples across {y_train.nunique()} crops...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    pred_train = model.predict(X_train)
    pred_val = model.predict(X_val)
    pred_test = model.predict(X_test)

    # Calculate metrics
    metrics = {
        "train": {
            "accuracy": float(accuracy_score(y_train, pred_train)),
            "precision_macro": float(precision_score(y_train, pred_train, average="macro", zero_division=0)),
            "recall_macro": float(recall_score(y_train, pred_train, average="macro", zero_division=0)),
            "f1_macro": float(f1_score(y_train, pred_train, average="macro", zero_division=0))
        },
        "validation": {
            "accuracy": float(accuracy_score(y_val, pred_val)),
            "precision_macro": float(precision_score(y_val, pred_val, average="macro", zero_division=0)),
            "recall_macro": float(recall_score(y_val, pred_val, average="macro", zero_division=0)),
            "f1_macro": float(f1_score(y_val, pred_val, average="macro", zero_division=0))
        },
        "test": {
            "accuracy": float(accuracy_score(y_test, pred_test)),
            "precision_macro": float(precision_score(y_test, pred_test, average="macro", zero_division=0)),
            "recall_macro": float(recall_score(y_test, pred_test, average="macro", zero_division=0)),
            "f1_macro": float(f1_score(y_test, pred_test, average="macro", zero_division=0))
        }
    }

    # Detailed test classification report
    report_dict = classification_report(y_test, pred_test, output_dict=True, zero_division=0)

    # Feature importances
    importances = dict(zip(feature_cols, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    # Save artifact
    model_path = os.path.join(artifacts_dir, "model.joblib")
    joblib.dump(model, model_path)

    metadata = {
        "model_name": "crop_recommender_baseline",
        "model_version": "1.0.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "RandomForestClassifier",
        "hyperparameters": {
            "n_estimators": 100,
            "max_depth": 12,
            "min_samples_split": 2,
            "random_state": 42
        },
        "training_dataset_version": "crop_recommendation_v1",
        "data_split_strategy": "stratified_classification_split (70% train / 15% val / 15% test)",
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "num_classes": len(model.classes_),
        "classes": [str(c) for c in model.classes_],
        "features": feature_cols,
        "feature_importances": sorted_importances,
        "metrics": metrics,
        "classification_report_summary": {
            "macro_avg": report_dict.get("macro avg", {}),
            "weighted_avg": report_dict.get("weighted avg", {})
        },
        "known_limitations": [
            "Assumes laboratory-tested soil N-P-K readings and standard agro-climatic averages",
            "Does not account for micro-irrigation availability, farmer capital constraints, or local market demand",
            "Recommendations should be paired with extension officer advice or local soil health card"
        ]
    }

    with open(os.path.join(artifacts_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Crop Recommender] Training complete! Test Accuracy: {metrics['test']['accuracy']*100:.2f}%, Test F1: {metrics['test']['f1_macro']:.4f}")
    print(f"[Crop Recommender] Artifacts saved to {artifacts_dir}")
    return metadata

if __name__ == "__main__":
    train_crop_model()
