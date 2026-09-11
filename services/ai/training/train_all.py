"""
SIH26033 Master Model Training Runner
-------------------------------------
Executes reproducible training for all baseline models:
1. Demand Forecasting
2. Price Intelligence
3. Crop Recommendation
"""

import time
from .train_demand_forecaster import train_demand_model
from .train_price_predictor import train_price_model
from .train_crop_recommender import train_crop_model

def train_all():
    start_time = time.time()
    print("=" * 60)
    print("STARTING SIH26033 REPRODUCIBLE ML BASELINE MODEL TRAINING")
    print("=" * 60)

    print("\n--- [1/3] Training Demand Forecasting Baseline ---")
    demand_meta = train_demand_model()

    print("\n--- [2/3] Training Price Intelligence Baseline ---")
    price_meta = train_price_model()

    print("\n--- [3/3] Training Crop Recommendation Baseline ---")
    crop_meta = train_crop_model()

    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print(f"ALL BASELINE MODELS TRAINED SUCCESSFULLY IN {elapsed:.2f}s")
    print("=" * 60)
    print(f"Demand Forecaster -> Test MAE: {demand_meta['metrics']['test']['mae']:.2f}, MAPE: {demand_meta['metrics']['test']['mape_percent']:.2f}%")
    print(f"Price Predictor   -> Test MAE: INR {price_meta['metrics']['test']['mae']:.2f}, R2: {price_meta['metrics']['test']['r2']:.4f}")
    print(f"Crop Recommender  -> Test Acc: {crop_meta['metrics']['test']['accuracy']*100:.2f}%, F1: {crop_meta['metrics']['test']['f1_macro']:.4f}")
    print("=" * 60)

if __name__ == "__main__":
    train_all()
