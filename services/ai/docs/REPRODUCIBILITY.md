# ML Pipeline Reproducibility & Service Guide

**Milestone 9: AI/ML Foundation, Dataset Engineering & Baseline Models (Corrected)**  
**Project:** SIH26033 — Direct Farmer/FPO to Buyer Agricultural Marketplace

---

## 1. Quick-Start Pipeline Execution

To reproduce all datasets, feature matrices, splits, and trained models from scratch in a clean environment:

```bash
# Navigate to AI service workspace
cd services/ai

# Step 1A: Fetch authentic Harvestify Crop Recommendation benchmark dataset
python -m pipelines.fetch_crop_benchmark

# Step 1B: Generate deterministic synthetic demo fixtures (Mandi prices, Weather, Platform transactions)
python -m pipelines.generate_demo_datasets

# Step 1C (Optional Production Path): Ingest real Agmarknet CSV export
# python -m pipelines.ingest_real_mandi --input data/raw/agmarknet_mandi_prices_real.csv

# Step 2: Validate, clean, and merge observations strictly forward-in-time (zero backward-fill)
python -m pipelines.preprocessing

# Step 3: Engineer features and construct zero-leakage chronological/stratified splits
python -m pipelines.build_splits

# Step 4: Train all baseline ML models, evaluate against naive baselines, and save versioned artifacts
python -m training.train_all
```

---

## 2. Automated Test Execution

### Python AI Service Tests (Data Validation, Leakage Tests, Artifact Verification, FastAPI Endpoints)
From `services/ai`:
```bash
python -m pytest -v
```
All 20 tests (including 4 dedicated zero-temporal-leakage tests in `tests/test_leakage.py` and API security tests in `tests/test_api.py`) will execute.

### NestJS Integration & E2E Tests
From `apps/api`:
```bash
npm run test:e2e -- test/ai.e2e-spec.ts
```
Verifies NestJS `AiModule`, JWT authentication guards on feedback, ownership verification, timeout handling, database persistence in `AiPredictionLog`, and internal API key transmission.

---

## 3. Running the FastAPI Service Locally

To run the FastAPI AI service independently on port 8080:

```bash
cd services/ai
python -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
```

Interactive OpenAPI Swagger UI is available at:
- `http://localhost:8080/docs`
- `http://localhost:8080/redoc`

### Security Configuration
FastAPI endpoints under `/api/v1/` require the internal service header:
```
x-internal-api-key: <AI_INTERNAL_KEY>
```
If the header is absent or invalid, FastAPI returns `401 Unauthorized`. The key is configured via `AI_INTERNAL_KEY` in environment variables and automatically supplied by NestJS `AiService`.

### Public / Health Endpoints:
- `GET /health` : Liveness check (public)
- `GET /ready` : Model artifact readiness status (public)

### Protected Internal Endpoints:
- `POST /api/v1/predict/price` : Commodity price forecasting
- `POST /api/v1/predict/demand` : Market demand proxy forecasting
- `POST /api/v1/predict/crop` : Multi-class crop recommendation
- `POST /api/v1/feedback/record` : Platform transaction feedback logging

---

## 4. NestJS ↔ FastAPI Architecture Boundary & Security

```
Frontend (Next.js)
    │  (JWT Authenticated)
    ▼
NestJS Backend (Port 4000)
    │  [AiController /api/v1/ai - JWT Protected for sensitive operations]
    │  [AiService HTTP Client + Timeout + x-internal-api-key header]
    │  [Prisma AiPredictionLog - PostgreSQL]
    ▼
FastAPI AI Service (Port 8080)
    │  [Security Dependency: verify_internal_api_key]
    │  [ModelRegistry Singleton]
    │  [Pydantic V2 Input Validation]
    ▼
Scikit-Learn Baseline Models
    │  [price_predictor_baseline]
    │  [demand_forecaster_baseline]
    │  [crop_recommender_baseline]
    ▼
Artifacts & Datasets (services/ai/artifacts & services/ai/data)
```

**Security & Boundary Enforcement**:
- The Next.js frontend **NEVER** communicates directly with FastAPI or accesses Python services.
- NestJS encapsulates authentication, authorization, business rules, and error masking.
- `POST /api/v1/ai/feedback` enforces user authentication via `JwtAuthGuard` and prevents users from updating predictions requested by another user.
- If the AI service is unreachable or encounters a timeout, NestJS returns structured HTTP 503 / 504 errors without crashing the main application.
