# SIH26033 AI/ML Foundation Service

**Status:** Milestone 9 COMPLETE (Corrected & Validated Pass) — Production AI/ML Foundation, Dataset Engineering & Baseline Models.

## 1. Overview
The AI/ML service provides high-performance, explainable baseline machine learning capabilities for the SIH26033 Agricultural Marketplace:
- **Price Intelligence**: Forecasts fair modal prices (INR/quintal) using APMC mandi histories, backward-shifted arrival volumes, rolling momentum statistics, and meteorological context. Evaluated against naive persistence baselines with per-commodity and per-market breakdowns.
- **Market Demand Proxy**: Forecasts physical wholesale mandi absorption and arrival liquidity (Metric Tonnes proxy) to inform harvest logistics. Disclosed explicitly as wholesale arrival activity, not platform consumer demand.
- **Crop Recommendation**: Multi-class agronomic classifier recommending optimal crops based on Soil Health Card N-P-K, pH, and climate variables, trained on the Harvestify precision agriculture benchmark.
- **Platform Feedback Loop**: Captures prediction inputs, model versions, and observed transaction outcomes to close the loop for continuous model evaluation, protected with JWT ownership verification.

## 2. Directory Structure
```
services/ai/
├── app/                        # FastAPI Application
│   ├── api/v1/                 # Endpoints (/health, /ready, /predict/*, /feedback/*)
│   ├── core/                   # Config, logging, security (internal API key verification)
│   ├── schemas/                # Pydantic request/response models
│   ├── services/               # Model registry singleton & inference engine
│   └── main.py                 # FastAPI application root & lifespan
├── artifacts/                  # Serialized Model Artifacts & Metadata
│   ├── crop_model/             # model.joblib + metadata.json
│   ├── demand_model/           # model.joblib + metadata.json
│   └── price_model/            # model.joblib + metadata.json
├── data/                       # Agricultural Data Pipeline
│   ├── raw/                    # Verified real benchmark data (crop_recommendation.csv)
│   ├── demo/                   # Explicit synthetic fixtures (synthetic_mandi_prices.csv, etc.)
│   ├── processed/              # Cleaned, normalized, and merged CSVs (zero backward-fill)
│   └── splits/                 # Chronological time-series & stratified splits
├── docs/                       # Comprehensive AI Documentation
│   ├── DATASETS.md             # Sources, schemas, validation, licenses & provenance audit
│   ├── MODELS.md               # Model architectures, features, naive baselines, metrics
│   └── REPRODUCIBILITY.md      # Reproduction & test execution guide
├── pipelines/                  # Data Engineering Pipeline
│   ├── fetch_crop_benchmark.py # Downloads authentic Harvestify benchmark dataset
│   ├── generate_demo_datasets.py # Deterministic synthetic demo data generator
│   ├── ingest_real_mandi.py    # Production Agmarknet daily CSV adapter
│   ├── ingestion.py            # Data loading & schema mapping with provenance tagging
│   ├── validation.py           # Domain bound, null, and duplicate checks
│   ├── preprocessing.py        # Strict forward-fill cleaning (zero bfill, zero interpolation)
│   ├── feature_engineering.py  # Strict zero-leakage backward shift features & warmup drop
│   ├── splitters.py            # Time-aware chronological & stratified splitters
│   └── build_splits.py         # Splits orchestrator & training-only median derivation
├── tests/                      # Automated Test Suite (pytest - 20 tests)
│   ├── test_leakage.py         # Temporal leakage, perturbation invariance, lag tests
│   ├── test_data_pipeline.py   # Ingestion, validation, zero-leakage pipeline checks
│   ├── test_models.py          # Artifact checks & metric validations
│   └── test_api.py             # FastAPI endpoints, security headers, validation & errors
├── training/                   # Model Training Scripts
│   ├── train_demand_forecaster.py # Demand proxy trainer with naive persistence baseline
│   ├── train_price_predictor.py   # Price predictor trainer with naive persistence baseline
│   ├── train_crop_recommender.py  # Crop recommendation trainer
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

## 4. Key Performance Baselines & Naive Comparisons

| Model | Target | Naive Baseline | ML Model | Test Metric | Relative Improvement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Price Predictor** | APMC Modal Price (₹/Q) | MAE ₹166.80 | **MAE ₹137.53** | $R^2$: **0.9531** (vs 0.9330) | **17.5% MAE reduction** |
| **Market Demand Proxy** | Wholesale Arrivals (MT) | MAE 628.69 MT | **MAE 469.17 MT** | WAPE: **14.77%** (vs 19.80%) | **25.4% MAE reduction** |
| **Crop Recommender** | 22 Crop Classes | Random (4.55%) | **Accuracy 99.39%** | Macro F1: **0.9939** | Real benchmark suitability |

Detailed documentation is available in [`docs/`](./docs/).
