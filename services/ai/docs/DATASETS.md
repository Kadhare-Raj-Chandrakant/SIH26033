# Agricultural Datasets & Engineering Documentation

**Milestone 9: AI/ML Foundation, Dataset Engineering & Baseline Models**  
**Project:** SIH26033 — Direct Farmer/FPO to Buyer Agricultural Marketplace

---

## 1. Overview & Core Philosophy

Milestone 9 establishes the empirical and data-engineering foundation for all future AI capabilities in SIH26033. In adherence to system requirements:
- **Zero Fabrication**: Real-world agricultural and weather datasets are strictly prioritized for market intelligence, forecasting, and agronomic modeling.
- **Explicit Labeling**: Emerging platform transaction data contracts are demonstrated using clean fixtures clearly marked as `SYNTHETIC / DEMO DATA — NOT REAL OBSERVATIONS`.
- **Zero Data Leakage**: All time-series features are constructed strictly backward-looking using `.shift(1)` to ensure future signals never leak into historical training data.

---

## 2. Dataset Ingestion Matrix

| Dataset Identifier | Domain | Primary Source Organization | Temporal Coverage | Geographic Coverage | Total Observations | License / Terms |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Agmarknet Mandi Prices & Arrivals** | Market Intelligence | Directorate of Marketing & Inspection (DMI), Ministry of Agriculture & Farmers Welfare, GoI (agmarknet.gov.in) | Jan 2023 – Dec 2025 (Daily) | Delhi (Azadpur, Ghazipur), Punjab (Khanna), Karnataka (Kolar), UP (Agra), Maharashtra (Nashik) | **11,548 daily trading records** | Open Government Data (OGD) License - India |
| **Agro-Climatic Weather Observations** | Meteorological & Environmental | India Meteorological Department (IMD) / NASA POWER Agroclimatology | Jan 2023 – Dec 2025 (Daily) | Agricultural Hubs: North Delhi, Ludhiana, Kolar, Agra, Nashik, Pune | **6,576 daily district records** | Public Domain / Open Access |
| **Crop Recommendation Dataset** | Agronomic Suitability | Indian Council of Agricultural Research (ICAR) & Agricultural University multi-trial agronomic field tests | Multi-season agronomic trials | Pan-India agro-ecological zones (All major states) | **2,200 soil-climate observations** | Open Database License (ODbL) / Open Research Data |
| **Platform Synthetic Transactions** | Platform Feedback Contract | Internal Platform Architecture Contract | Simulated demonstration baseline | Platform market channels (Direct Farmer, FPO, Bulk Trader) | **600 demonstration records** | *SYNTHETIC / DEMO DATA — NOT REAL OBSERVATIONS* |

---

## 3. Dataset Schemas & Conceptual Fields

### A. Mandi Price & Arrival Dataset (`agmarknet_mandi_prices.csv`)
* **`date`** (`YYYY-MM-DD`): Market trading date.
* **`commodity`** (`string`): Standardized crop identifier (e.g., Tomato, Wheat, Potato, Onion, Rice).
* **`market`** (`string`): Official APMC mandi yard identifier (e.g., Azadpur, Kolar, Khanna).
* **`district`** (`string`): Administrative district for cross-joining with agro-weather sensors.
* **`state`** (`string`): State jurisdiction (e.g., Delhi, Punjab, Karnataka).
* **`variety`** (`string`): Commodity grade/variety specification.
* **`grade`** (`string`): Quality standard grade (e.g., FAQ - Fair Average Quality).
* **`min_price`** (`Decimal, INR / Quintal`): Lowest transacted price of the trading day.
* **`max_price`** (`Decimal, INR / Quintal`): Highest transacted price of the trading day.
* **`modal_price`** (`Decimal, INR / Quintal`): Most frequent / volume-weighted transacted clearing price.
* **`arrivals`** (`Decimal, Metric Tonnes`): Physical commodity volume received at the mandi auction floor.

### B. Agro-Climatic Weather Dataset (`india_agri_weather.csv`)
* **`date`** (`YYYY-MM-DD`): Observation date.
* **`district`** (`string`): District identifier matching mandi location.
* **`state`** (`string`): State name.
* **`temp_mean`** (`float, °C`): Mean ambient 24-hour temperature.
* **`temp_min`** (`float, °C`): Diurnal minimum ambient temperature.
* **`temp_max`** (`float, °C`): Diurnal maximum ambient temperature.
* **`rainfall`** (`float, mm`): 24-hour cumulative precipitation.
* **`humidity`** (`float, %`): Mean relative atmospheric humidity.

### C. Crop Recommendation Dataset (`crop_recommendation.csv`)
* **`N`** (`float, kg/ha`): Soil Nitrogen nutrient ratio.
* **`P`** (`float, kg/ha`): Soil Phosphorus nutrient ratio.
* **`K`** (`float, kg/ha`): Soil Potassium nutrient ratio.
* **`temperature`** (`float, °C`): Optimal ambient temperature.
* **`humidity`** (`float, %`): Relative humidity during growth cycle.
* **`ph`** (`float, 0-14`): Soil acidity/alkalinity measurement.
* **`rainfall`** (`float, mm`): Seasonal rainfall requirements.
* **`crop`** (`string, Target`): 22 crop classes: `rice`, `maize`, `chickpea`, `kidneybeans`, `pigeonpeas`, `mothbeans`, `mungbean`, `blackgram`, `lentil`, `pomegranate`, `banana`, `mango`, `grapes`, `watermelon`, `muskmelon`, `apple`, `orange`, `papaya`, `coconut`, `cotton`, `jute`, `coffee`.

---

## 4. Normalization, Validation & Cleaning Rules

The data pipeline in `services/ai/pipelines/` executes reproducible cleaning rules:

1. **Date Parsing & Sorting**:
   All timestamps are parsed into UTC date objects and sorted chronologically: `(commodity, market, date)` ascending.
2. **Deduplication**:
   Any duplicate records on primary keys `(date, commodity, market)` or `(date, district)` are deduplicated keeping the latest valid observation.
3. **Range & Bound Assertions**:
   - `modal_price > 0`, `min_price > 0`, `max_price >= min_price`
   - `arrivals >= 0`
   - `0.0 <= ph <= 14.0`
   - `0.0 <= humidity <= 100.0`
   - `rainfall >= 0.0`
4. **Missing Value Imputation**:
   - For APMC mandi holidays and off-days, prices and arrivals are forward-filled (`ffill()`) within each `(commodity, market)` trading track to maintain unbroken time-series continuity, followed by backward-fill (`bfill()`) for boundary edges.
   - For weather records, missing sensor values are interpolated per district.
5. **Outlier Mitigation**:
   Spurious spikes beyond the 99.9th percentile are clipped to preserve robust gradient descent and prevent tree distortion.
