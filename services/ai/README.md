# SIH26033 AI/ML Foundation Service

**Status:** Milestone 9 COMPLETE — Production AI/ML Foundation, Dataset Engineering & Baseline Models.

## 1. Overview
The AI/ML service provides high-performance, explainable baseline machine learning capabilities for the SIH26033 Agricultural Marketplace:
- **Price Intelligence**: Forecasts fair modal prices (INR/quintal) using APMC mandi histories, arrivals, rolling statistics, and weather data.
- **Demand Forecasting**: Predicts expected market absorption and arrival liquidity (Metric Tonnes proxy).
- **Crop Recommendation**: Multi-class agronomic classifier recommending optimal crops based on soil N-P-K, pH, and climate variables.
- **Platform Feedback Loop**: Captures prediction inputs, model versions, and observed transaction outcomes to power future continuous evaluation.

## 2. Directory Structure
```
services/ai/
├── app/                        # FastAPI Application
│   ├── api/v1/                 # Endpoints (/health, /predict/*, /feedback/*)
│   ├── core/                   # Config, logging, custom error envelopes
│   ├── schemas/                # Pydantic request/response models
│   ├── services/               # Model registry singleton & inference engine
│   └── main.py                 # FastAPI application root & lifespan
├── artifacts/                  # Serialized Model Artifacts & Metadata
│   ├── crop_model/             # model.joblib + metadata.json
│   ├── demand_model/           # model.joblib + metadata.json
│   └── price_model/            # model.joblib + metadata.json
├── data/                       # Agricultural Data Pipeline
│   ├── raw/                    # Raw APMC, Weather, Soil-Crop & Demo fixtures
│   ├── processed/              # Cleaned, normalized, and merged CSVs
│   └── splits/                 # Chronological time-series & stratified splits
├── docs/                       # Comprehensive AI Documentation
│   ├── DATASETS.md             # Sources, schemas, validation & licenses
│   ├── MODELS.md               # Model architectures, features, metrics
│   └── REPRODUCIBILITY.md      # Reproduction & test execution guide
├── pipelines/                  # Data Engineering Pipeline
│   ├── ingestion.py            # Data loading & schema mapping
│   ├── validation.py           # Domain bound, null, and duplicate checks
│   ├── preprocessing.py        # Imputation, outlier clipping, dataset merge
│   ├── feature_engineering.py  # Strict zero-leakage backward shift features
│   ├── splitters.py            # Time-aware chronological & stratified splitters
│   └── build_splits.py         # Splits orchestrator
├── tests/                      # Automated Test Suite (pytest)
│   ├── test_data_pipeline.py   # Ingestion, validation, leakage assertions
│   ├── test_models.py          # Artifact checks & metric validations
│   └── test_api.py             # FastAPI endpoints, validation & errors
├── training/                   # Model Training Scripts
│   ├── train_demand_forecaster.py
│   ├── train_price_predictor.py
│   ├── train_crop_recommender.py
│   └── train_all.py            # Master reproducible training runner
└── README.md
```

## 3. Technology Stack
- Python 3.12+
- FastAPI & Uvicorn
- Scikit-learn (Random Forest ensembles)
- Pandas & NumPy
- Pydantic v2
- Pytest

## 4. Key Performance Baselines
- **Price Predictor**: Out-of-time Test MAE: INR 138.32 / Quintal, R²: 0.9537
- **Demand Forecaster**: Out-of-time Test MAE: 471.00 Metric Tonnes, MAPE: 15.92%
- **Crop Recommender**: Stratified Test Accuracy: 97.58%, Macro F1: 0.9757

Detailed documentation is available in [`docs/`](./docs/).
