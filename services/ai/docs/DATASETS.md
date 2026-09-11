# Agricultural Datasets & Provenance Documentation

**Milestone 9: AI/ML Foundation, Dataset Engineering & Baseline Models (Corrected)**  
**Project:** SIH26033 — Direct Farmer/FPO to Buyer Agricultural Marketplace

---

## 1. Overview & Provenance Philosophy

This document provides a strictly verified provenance and data-engineering audit for all datasets utilized in Milestone 9 of SIH26033. In adherence to scientific rigor and system requirements:
- **Strict Real vs. Synthetic Segregation**: All datasets are partitioned into real benchmark observations (`services/ai/data/raw/`) and explicitly labeled synthetic fixtures (`services/ai/data/demo/`).
- **No Fabricated Provenance Claims**: Data sources are documented with exact, verifiable origins. No dataset is claimed to originate from ICAR, IMD, or Agmarknet unless verified.
- **Zero Future Leakage**: All temporal operations operate strictly forward-in-time. Backward filling (`bfill()`) and bidirectional interpolation have been completely eliminated from the repository.

---

## 2. Dataset Ingestion Matrix & Exact Provenance

| Dataset Identifier | Domain | Provenance Status | Verified Source / Publisher | Upstream URL / Access Point | License | Observations | Date Range | Geographic Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Crop Recommendation Benchmark** | Agronomic Suitability | **REAL BENCHMARK** | Atharva Inamdar / Harvestify Precision Agriculture Project | `https://raw.githubusercontent.com/Gladiator07/Harvestify/master/Data-processed/crop_recommendation.csv` | MIT License | 2,200 rows | Multi-season agronomic trials | Pan-India agro-climatic conditions (22 crops, 100 samples/crop) |
| **APMC Mandi Prices & Arrivals (Demo Fixture)** | Market Intelligence / Wholesale Volume | **SYNTHETIC DEMO** | Internally generated via `pipelines/generate_demo_datasets.py` (Modeled after Indian mandi seasonality) | Local Generator (`pipelines/generate_demo_datasets.py`) | MIT / Project License | 11,548 daily rows | 2023-01-01 to 2025-12-31 | Delhi (Azadpur, Ghazipur), Punjab (Khanna, Ludhiana), Karnataka (Kolar), UP (Agra), Maharashtra (Nashik) |
| **Agro-Climatic Weather (Demo Fixture)** | Meteorological Observations | **SYNTHETIC DEMO** | Internally generated via `pipelines/generate_demo_datasets.py` (Modeled after North/Central/South Indian climate) | Local Generator (`pipelines/generate_demo_datasets.py`) | MIT / Project License | 6,576 daily rows | 2023-01-01 to 2025-12-31 | North Delhi, East Delhi, Ludhiana, Kolar, Agra, Nashik |
| **Platform Synthetic Transactions (Demo Fixture)** | Platform Feedback Loop Contract | **SYNTHETIC DEMO** | Internally generated fixture for feedback verification | Local Generator (`pipelines/generate_demo_datasets.py`) | MIT / Project License | 600 rows | Simulated platform activity | Farmer, FPO, and Bulk Buyer platform trades |
| **Official Agmarknet Mandi Adapter** | Production Market Ingestion | **REAL ADAPTER READY** | Directorate of Marketing & Inspection (DMI), Ministry of Agriculture, GoI | `https://agmarknet.gov.in` (Daily Market Report CSV/Excel Export) | Open Government Data (OGD) License - India | User Ingested (Optional) | User Selected | User Selected Mandis |

---

## 3. Detailed Provenance Audits

### A. Crop Recommendation Dataset (`crop_recommendation.csv`)
* **Exact Name**: Harvestify Crop Recommendation Dataset
* **Publisher/Author**: Atharva Inamdar (Harvestify Open Source Project)
* **Source URL**: `https://raw.githubusercontent.com/Gladiator07/Harvestify/master/Data-processed/crop_recommendation.csv`
* **License**: MIT License
* **Attribution Correction**: Previous documentation claimed this dataset originated directly from ICAR (Indian Council of Agricultural Research). Source investigation revealed it is a widely referenced open-source precision agriculture benchmark compiled by Atharva Inamdar. The ICAR attribution has been formally retracted and corrected.
* **Geographical & Agronomic Coverage**: 22 crops (rice, maize, chickpea, kidneybeans, pigeonpeas, mothbeans, mungbean, blackgram, lentil, pomegranate, banana, mango, grapes, watermelon, muskmelon, apple, orange, papaya, coconut, cotton, jute, coffee), with exactly 100 observations per class.
* **Columns**: `N`, `P`, `K` (soil nutrients in kg/ha), `temperature` (°C), `humidity` (%), `ph` (soil pH 0–14), `rainfall` (mm), `crop` (target class).
* **Record Count**: 2,200 rows, 0 nulls, 0 duplicates.
* **Limitations**: Highly separable synthetic/benchmarked feature distributions; results in near-perfect benchmark test accuracy (~99.4%), which represents agronomic rule boundaries rather than noisy real-farm field variance.

### B. APMC Mandi Prices & Arrivals (`synthetic_mandi_prices.csv`)
* **Exact Location**: `services/ai/data/demo/synthetic_mandi_prices.csv`
* **Status**: **SYNTHETIC / DEMO DATA — NOT REAL OBSERVATIONS**
* **Purpose**: Serves as a deterministic, reproducible fixture for the price prediction and wholesale arrival forecasting pipelines until production Agmarknet ingestion pipelines or platform transactions accumulate sufficient history.
* **Generation Script**: `services/ai/pipelines/generate_demo_datasets.py`
* **File Header**: Includes explicit `# SYNTHETIC / DEMO DATA — NOT REAL OBSERVATIONS` disclaimer.
* **Columns**: `date`, `commodity`, `market`, `district`, `state`, `variety`, `grade`, `min_price`, `max_price`, `modal_price`, `arrivals`.
* **Record Count**: 11,548 daily rows covering 5 key commodities (Tomato, Potato, Onion, Wheat, Rice) across 6 representative mandis over a 3-year period (2023–2025).

### C. Official Agmarknet Mandi Adapter (`ingest_real_mandi.py`)
* For production deployments requiring real-world Agmarknet records:
  1. Access `https://agmarknet.gov.in` and export the daily market price report as CSV/Excel.
  2. Save the export to `services/ai/data/raw/agmarknet_mandi_prices_real.csv`.
  3. Execute `python -m pipelines.ingest_real_mandi --input data/raw/agmarknet_mandi_prices_real.csv`.
  4. The ingestion pipeline automatically verifies schema conformity, converts Indian number formatting, standardizes commodity naming, and outputs the validated dataset.

---

## 4. Normalization, Cleaning & Zero-Leakage Rules

The data pipeline in `services/ai/pipelines/` enforces strict temporal data-science principles:

1. **Chronological Ordering**:
   All time-series series are strictly ordered: `(commodity, market, date)` ascending before any feature computation.
2. **Elimination of Backward-Fill (`bfill()`)**:
   - In APMC mandi price tracks, market off-days (e.g., Sundays, holidays) are forward-filled (`ffill()`) using the last known trading day's prices.
   - **No backward filling (`bfill()`) is ever performed**. Leading unobserved dates prior to the initial trade date of a commodity-market pair are explicitly dropped, preventing future price signals from leaking into historical dates.
3. **Elimination of Bidirectional Weather Interpolation**:
   - Weather missing sensor readings are forward-filled (`ffill()`) per district. Any remaining initial missing observations are imputed strictly using training partition medians.
4. **Target & Horizon Isolation**:
   - Target variable $y_t$ (`modal_price` or `arrivals`) is strictly excluded from contemporaneous feature matrices.
   - All rolling windows (`rolling_mean_7`, `rolling_mean_14`, `rolling_mean_30`, `rolling_std_7`) and lag indicators (`price_lag_1`, `price_lag_7`, `arrivals_lag_1`) are computed on shifted series (`.shift(1)`), ensuring feature vectors at day $T$ depend exclusively on information available at or before $T-1$.
5. **Warm-up Truncation**:
   - The initial 30 days of observations per series (where 30-day rolling statistics are undefined) are dropped rather than backfilled with future values.
6. **Training Partition Imputation**:
   - Categorical and numerical missing values are imputed strictly using statistics (medians) computed on the training partition (`train_df`), never from validation or test partitions.
