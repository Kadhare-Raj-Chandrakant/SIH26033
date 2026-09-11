# Baseline ML Models & Artifact Evaluation

**Milestone 9: AI/ML Foundation, Dataset Engineering & Baseline Models (Corrected)**  
**Project:** SIH26033 — Direct Farmer/FPO to Buyer Agricultural Marketplace

---

## 1. Machine Learning Philosophy & Correction Principles

Following the Milestone 9 Correction Pass:
- **Zero Future Leakage**: No backward filling (`bfill()`) or bidirectional interpolation exists anywhere in the feature generation pipeline. Initial 30-day warm-up periods are dropped.
- **Strict Benchmarking**: Every forecasting model is explicitly benchmarked against a defensible naive persistence baseline ($\hat{y}_t = y_{t-1}$).
- **Granular Evaluation**: Performance is reported not merely in aggregate, but broken down by individual commodity and market.
- **Demand Terminology Disclosure**: Mandi arrival models are designated as **Market Demand Proxy / Market Absorption Proxy** and explicitly disclosed as wholesale market activity rather than platform consumer demand.
- **Verified Provenance**: Crop recommendation is documented as the Atharva Inamdar / Harvestify precision agriculture benchmark (MIT License). Synthetic fixtures in `services/ai/data/demo/` are explicitly identified.

---

## 2. Model Evaluations & Naive Baselines

### 2.1 Price Intelligence Baseline (`price_predictor_baseline`)

* **Objective**: Predict fair modal market clearing prices (INR / Quintal) to protect farmers from distress sales and provide buyers with market-indexed pricing transparency.
* **Target Variable**: Mandi daily modal price (`modal_price`, INR / Quintal).
* **Dataset**: APMC Mandi Prices Demo Fixture (`synthetic_mandi_prices.csv`, 11,548 raw rows, 11,188 post-warmup feature rows).
* **Split Strategy**: Chronological time-series split (70% Train / 15% Validation / 15% Test).
  - Train: 7,797 rows (2023-01-31 to 2025-02-09)
  - Validation: 1,708 rows (2025-02-10 to 2025-07-21)
  - Test: 1,683 rows (2025-07-22 to 2025-12-31)
* **Algorithm**: `RandomForestRegressor` (`n_estimators=150`, `max_depth=16`, `min_samples_split=4`, `min_samples_leaf=2`, `random_state=42`).

#### Overall Model vs. Naive Baseline Comparison

| Metric | Naive Persistence Baseline ($\hat{y}_t = y_{t-1}$) | ML RandomForest Model | Relative Improvement |
| :--- | :--- | :--- | :--- |
| **Test MAE** | ₹166.80 / Quintal | **₹137.53 / Quintal** | **17.5% reduction in error** |
| **Test RMSE** | ₹221.25 / Quintal | **₹185.18 / Quintal** | **16.3% reduction in error** |
| **Test R²** | 0.9330 | **0.9531** | **+0.0201 ($R^2$ increase)** |

#### Per-Commodity Test Performance

| Commodity | Sample Count | Naive MAE (₹/Q) | ML Model MAE (₹/Q) | ML Model RMSE (₹/Q) | ML Model R² | Error Reduction |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Onion** | 326 | ₹187.97 | **₹145.42** | ₹192.51 | 0.8143 | 22.6% |
| **Potato** | 326 | ₹148.60 | **₹119.29** | ₹156.40 | 0.8351 | 19.7% |
| **Rice** | 326 | ₹170.83 | **₹143.68** | ₹197.88 | 0.9398 | 15.9% |
| **Tomato** | 326 | ₹188.08 | **₹152.02** | ₹204.09 | 0.8654 | 19.2% |
| **Wheat** | 379 | ₹142.14 | **₹129.56** | ₹173.80 | 0.9234 | 8.9% |

#### Per-Market Test Performance

| Market | Sample Count | Naive MAE (₹/Q) | ML Model MAE (₹/Q) | ML Model RMSE (₹/Q) | ML Model R² | Error Reduction |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Agra** | 326 | ₹180.12 | **₹144.20** | ₹192.68 | 0.9419 | 19.9% |
| **Azadpur** | 326 | ₹174.45 | **₹143.46** | ₹192.05 | 0.9634 | 17.8% |
| **Ghazipur** | 163 | ₹189.56 | **₹153.84** | ₹207.24 | 0.8573 | 18.8% |
| **Khanna** | 216 | ₹138.83 | **₹128.05** | ₹170.67 | 0.9126 | 7.8% |
| **Kolar** | 326 | ₹168.04 | **₹137.91** | ₹188.84 | 0.9576 | 17.9% |
| **Ludhiana** | 326 | ₹148.97 | **₹121.72** | ₹165.73 | 0.9592 | 18.3% |

#### Top Contributing Predictive Factors
1. `price_rolling_mean_7` (96.5%): Short-term price momentum.
2. `price_lag_1` (0.37%): Most recent trading clearing price.
3. `price_rolling_mean_30` (0.34%): Monthly trend inertia.
4. `spread_lag_1` (0.28%): Market volatility indicator.
5. `commodity_cat` (0.22%): Base price regime distinction.

---

### 2.2 Market Demand Proxy Baseline (`demand_forecaster_baseline`)

* **Objective**: Forecast physical wholesale mandi absorption and arrival liquidity (Metric Tonnes) to inform logistics dispatch and harvest staging.
* **Target Variable**: Mandi daily arrivals (`arrivals`, Metric Tonnes).
* **Disclosure**: Represents wholesale physical market volume; does NOT represent platform consumer demand.
* **Dataset**: APMC Mandi Prices Demo Fixture (`synthetic_mandi_prices.csv`).
* **Split Strategy**: Chronological time-series split (70% Train / 15% Validation / 15% Test).
  - Train: 7,797 rows | Val: 1,708 rows | Test: 1,683 rows
* **Algorithm**: `RandomForestRegressor` (`n_estimators=120`, `max_depth=14`, `min_samples_split=5`, `min_samples_leaf=3`, `random_state=42`).

#### Overall Model vs. Naive Baseline Comparison

| Metric | Naive Persistence Baseline ($\hat{y}_t = y_{t-1}$) | ML RandomForest Model | Relative Improvement |
| :--- | :--- | :--- | :--- |
| **Test MAE** | 628.69 Metric Tonnes | **469.17 Metric Tonnes** | **25.4% reduction in error** |
| **Test RMSE** | 856.10 Metric Tonnes | **641.17 Metric Tonnes** | **25.1% reduction in error** |
| **Test WAPE** | 19.80% | **14.77%** | **5.03 percentage point reduction** |

*Note on WAPE vs MAPE*: Due to occasional zero arrival days during mandi off-cycles, standard MAPE encounters zero-division singularities. Weighted Absolute Percentage Error (WAPE = $\sum |y - \hat{y}| / \sum y$) is reported as the statistically sound metric.

#### Per-Commodity Test Performance

| Commodity | Sample Count | Naive MAE (MT) | ML Model MAE (MT) | ML Model RMSE (MT) | Error Reduction |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Onion** | 326 | 599.30 MT | **439.14 MT** | 596.22 MT | 26.7% |
| **Potato** | 326 | 632.72 MT | **470.52 MT** | 647.78 MT | 25.6% |
| **Rice** | 326 | 659.83 MT | **489.19 MT** | 664.21 MT | 25.9% |
| **Tomato** | 326 | 592.51 MT | **439.38 MT** | 606.74 MT | 25.8% |
| **Wheat** | 379 | 651.10 MT | **499.79 MT** | 681.76 MT | 23.2% |

#### Top Contributing Predictive Factors
1. `arrivals_rolling_mean_7` (73.7%): 7-day average arrival momentum.
2. `arrivals_rolling_mean_30` (17.5%): 30-day baseline capacity of the mandi yard.
3. `arrivals_lag_7` (3.7%): Weekly market day cycle correspondence.
4. `arrivals_lag_1` (1.8%): Prior trading day volume.
5. `day_of_week` (1.2%): Intra-week APMC trading cycles.

---

### 2.3 Crop Recommendation Baseline (`crop_recommender_baseline`)

* **Objective**: Multi-class agronomic crop suitability classification based on Soil Health Card macronutrients and climatic conditions.
* **Target Variable**: 22 crop classes (`crop`).
* **Dataset**: Harvestify Precision Agriculture Benchmark (Atharva Inamdar, MIT License, 2,200 rows).
* **Split Strategy**: Stratified random split (70% Train / 15% Validation / 15% Test).
  - Train: 1,540 samples (70 samples/crop)
  - Val: 330 samples (15 samples/crop)
  - Test: 330 samples (15 samples/crop)
* **Algorithm**: `RandomForestClassifier` (`n_estimators=100`, `max_depth=12`, `min_samples_split=2`, `random_state=42`).

#### Test Set Performance
* **Test Accuracy**: 99.39%
* **Macro Precision**: 0.9944
* **Macro Recall**: 0.9939
* **Macro F1 Score**: 0.9939
* **Confusion Matrix Summary**: 328 of 330 test samples classified correctly across 22 classes. Only 2 minor boundary misclassifications occurred between climatically adjacent pulse crops (`rice`, `maize`, `chickpea`, `kidneybeans`, etc. achieved 100% precision/recall).

#### Top Contributing Predictive Factors
1. `rainfall` (22.5%): Primary hydrological determinant.
2. `humidity` (21.4%): Transpiration and micro-climate index.
3. `K` (Potassium) (18.6%): Root crop and fruit tree differentiator.
4. `P` (Phosphorus) (14.7%): Legume vs. cereal nutrient threshold.
5. `N` (Nitrogen) (13.1%): Vegetative growth demand.
6. `temperature` (5.2%): Thermal tolerance band.
7. `ph` (4.5%): Soil acidity/alkalinity tolerance.

---

## 3. Artifact Metadata Conformity

All model artifacts are persisted in `services/ai/artifacts/<model_name>/` with an accompanying `metadata.json` documenting:
- `model_name`, `model_version`, `created_at`
- `algorithm`, `hyperparameters`
- `dataset_name`, `dataset_source`, `dataset_provenance`
- `split_strategy`, `split_sizes`, `date_ranges`
- `naive_baseline_comparison`
- `metrics` (Train, Validation, Test)
- `per_commodity_metrics`, `per_market_metrics`
- `top_features` with weights and human interpretations
- `known_limitations`
