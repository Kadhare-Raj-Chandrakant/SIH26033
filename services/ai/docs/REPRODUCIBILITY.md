# ML Pipeline Reproducibility & Service Guide

**Milestone 9: AI/ML Foundation, Dataset Engineering & Baseline Models**  
**Project:** SIH26033 — Direct Farmer/FPO to Buyer Agricultural Marketplace

---

## 1. Quick-Start Pipeline Execution

To reproduce all datasets, feature matrices, splits, and trained models from scratch:

```bash
# Navigate to AI service workspace
cd services/ai

# Step 1: Ingest/generate raw datasets (APMC Mandi, Weather, Crop Recommendation, Synthetic Fixture)
python -m pipelines.generate_raw_datasets

# Step 2: Validate, clean, and merge raw observations
python -m pipelines.preprocessing

# Step 3: Engineer features and construct zero-leakage chronological/stratified splits
python -m pipelines.build_splits

# Step 4: Train all baseline ML models and generate versioned artifacts
python -m training.train_all
```

---

## 2. Automated Test Execution

### Python AI Service Tests
From `services/ai`:
```bash
python -m pytest -v
```
All 15 pipeline, leakage-prevention, artifact, and FastAPI endpoint tests will execute.

### NestJS Integration & E2E Tests
From `apps/api`:
```bash
npm run test:e2e -- test/ai.e2e-spec.ts
```
Tests the NestJS `AiModule`, timeout handling, database logging, input validation, and service resilience.

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

### Key Endpoints:
- `GET /health` : Liveness check
- `GET /ready` : Model artifact readiness status
- `POST /api/v1/predict/price` : Commodity price forecasting
- `POST /api/v1/predict/demand` : Market demand proxy forecasting
- `POST /api/v1/predict/crop` : Multi-class crop recommendation
- `POST /api/v1/feedback/record` : Platform transaction feedback logging

---

## 4. NestJS ↔ FastAPI Architecture Boundary

```
Frontend (Next.js)
    │
    ▼
NestJS Backend (Port 4000)
    │  [AiController /api/v1/ai]
    │  [AiService HTTP Client + Timeout + Error Handling]
    │  [Prisma AiPredictionLog - PostgreSQL]
    ▼
FastAPI AI Service (Port 8080)
    │  [ModelRegistry Singleton]
    │  [Pydantic Validation]
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
- If the AI service is unreachable or encounters a timeout, NestJS returns structured HTTP 503 / 504 errors without crashing the main application.
