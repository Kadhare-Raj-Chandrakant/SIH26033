# Baseline ML Models & Artifact Management

**Milestone 9: AI/ML Foundation, Dataset Engineering & Baseline Models**  
**Project:** SIH26033 — Direct Farmer/FPO to Buyer Agricultural Marketplace

---

## 1. Machine Learning Philosophy for Milestone 9

In accordance with Milestone 9 requirements:
- Baseline models establish a reliable, reproducible, explainable foundation for Milestone 10.
- Models are trained using deterministic pipelines without look-ahead bias or data leakage.
- Clear distinction is maintained between real observations (APMC Mandi, IMD Weather, ICAR Soil-Crop data) and platform transaction fixtures.
- Every artifact is tracked with a companion `metadata.json` documenting algorithm, version, features, metrics, and known operational limitations.

---

## 2. Models Specification

### 2.1 Demand Forecasting Baseline (`demand_forecaster_baseline`)

* **Objective**: Forecast expected market absorption and arrival liquidity for agricultural commodities to assist farmers and FPOs in harvest and dispatch planning.
* **Target Variable**: Mandi daily arrivals (`arrivals`, Metric Tonnes).
  > **Methodological Disclosure**: As actual platform historical order demand is emerging and does not yet span multi-year seasonal cycles, APMC mandi arrival volume is utilized as an empirical proxy for physical wholesale absorption demand. This is documented explicitly and is not represented as direct platform buyer volume.
* **Algorithm**: `RandomForestRegressor` (`n_estimators=120`, `max_depth=14`, `min_samples_split=5`, `min_samples_leaf=3`, `random_state=42`).
* **Feature Set**:
  - Encoded categoricals: `commodity_cat`, `market_cat`
  - Calendar & cyclical: `month`, `day_of_week`, `quarter`, `is_weekend`, `sin_month`, `cos_month`, `sin_day_of_year`, `cos_day_of_year`
  - Historical arrival momentum (strictly backward shifted): `arrivals_lag_1`, `arrivals_lag_7`, `arrivals_lag_14`, `arrivals_rolling_mean_7`, `arrivals_rolling_mean_30`
  - Inter-market price signals: `price_lag_1`, `price_rolling_mean_7`
  - Meteorological: `rainfall_sum_7d`
* **Partitioning Strategy**: Chronological time-series split (70% Train / 15% Validation / 15% Test).
* **Test Performance**:
  - **MAE**: 471.00 Metric Tonnes
  - **RMSE**: 642.02 Metric Tonnes
  - **MAPE**: 15.92%
* **Known Limitations**:
  - Wholesale arrival volumes reflect physical liquidity and supply shocks; unmet consumer retail demand is not captured.
  - Accuracy improves when at least 14 days of prior arrivals are observed in a given mandi.

---

### 2.2 Price Intelligence Baseline (`price_predictor_baseline`)

* **Objective**: Predict fair modal market clearing prices (INR / Quintal) to protect farmers from distress sales and provide buyers with market-indexed pricing transparency.
* **Target Variable**: APMC daily modal price (`modal_price`, INR / Quintal).
* **Algorithm**: `RandomForestRegressor` (`n_estimators=150`, `max_depth=16`, `min_samples_split=4`, `min_samples_leaf=2`, `random_state=42`).
* **Feature Set (Zero Data Leakage)**:
  - Categoricals: `commodity_cat`, `market_cat`, `district_cat`, `state_cat`, `season_cat`
  - Calendar & cyclical: `month`, `day_of_week`, `quarter`, `is_weekend`, `sin_month`, `cos_month`, `sin_day_of_year`, `cos_day_of_year`
  - Backward shifted price lags: `price_lag_1`, `price_lag_7`, `price_lag_14`, `price_lag_30`
  - Backward rolling statistics: `price_rolling_mean_7`, `price_rolling_std_7`, `price_rolling_mean_30`, `price_rolling_std_30`
  - Lagged price spread: `spread_lag_1` (`max_price - min_price` shifted by 1 day)
  - Backward arrival liquidity: `arrivals_lag_1`, `arrivals_lag_7`, `arrivals_rolling_mean_7`
  - Weather context: `temp_mean`, `rainfall`, `humidity`, `rainfall_sum_7d`
* **Partitioning Strategy**: Chronological time-series split (70% Train / 15% Validation / 15% Test).
* **Test Performance**:
  - **MAE**: INR 138.32 / Quintal
  - **RMSE**: INR 185.47 / Quintal
  - **R² Score**: 0.9537
* **Explainability Factors**:
  - `price_rolling_mean_7`: 96.5% feature weight (strong short-term price momentum)
  - `price_lag_1`: 0.37% feature weight
  - `price_rolling_mean_30`: 0.34% feature weight
* **Known Limitations**:
  - Reflects APMC wholesale yard settlement; logistics, farm-gate packaging, and sorting grades are factored in downstream application logic.
  - Abrupt regulatory changes (export bans, essential commodity acts) cannot be anticipated purely by backward historical signals.

---

### 2.3 Crop Recommendation Baseline (`crop_recommender_baseline`)

* **Objective**: Recommend agronomic crop varieties best suited to a farmer's specific soil chemical composition and local climatic conditions.
* **Target Variable**: 22 multi-class crop labels (`crop`).
* **Algorithm**: `RandomForestClassifier` (`n_estimators=100`, `max_depth=12`, `min_samples_split=2`, `random_state=42`).
* **Feature Set**:
  - Soil macronutrients: `N` (Nitrogen), `P` (Phosphorus), `K` (Potassium) in kg/ha
  - Soil acidity/alkalinity: `ph` (0 - 14 scale)
  - Agro-climatic parameters: `temperature` (°C), `humidity` (%), `rainfall` (mm)
* **Partitioning Strategy**: Stratified sampling (70% Train / 15% Validation / 15% Test) preserving exact class proportions.
* **Test Performance**:
  - **Accuracy**: 97.58%
  - **Macro Precision**: 0.9781
  - **Macro Recall**: 0.9758
  - **Macro F1 Score**: 0.9757
* **Known Limitations**:
  - Assumes laboratory or Soil Health Card chemical readings.
  - Does not evaluate irrigation access, capital availability, or local market demand (addressed in M10 decision engine).

---

## 3. Artifact Directory Layout

Each trained model is stored in `services/ai/artifacts/<model_name>/` as:
1. `model.joblib`: Binary serialized estimator pipeline.
2. `metadata.json`: Machine-readable metadata conforming to the versioning specification:
   ```json
   {
     "model_name": "price_predictor_baseline",
     "model_version": "1.0.0",
     "created_at": "2026-09-11T10:27:25.123456+00:00",
     "algorithm": "RandomForestRegressor",
     "hyperparameters": { ... },
     "training_dataset_version": "market_train_v1",
     "data_split_strategy": "chronological_time_split (70% train / 15% val / 15% test)",
     "train_rows": 8048,
     "test_rows": 1734,
     "target_variable": "modal_price",
     "features": [ ... ],
     "feature_importances": { ... },
     "metrics": {
       "train": { ... },
       "validation": { ... },
       "test": { ... }
     },
     "known_limitations": [ ... ]
   }
   ```
