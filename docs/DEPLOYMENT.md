# SIH26033 — Production Deployment Guide & Operations Manual

> **Architecture Style:** NestJS modular monolith with a dedicated FastAPI AI service boundary.  
> **Production Platforms:** Vercel (Frontend), Render (NestJS API & FastAPI AI), Neon (PostgreSQL), Upstash (Redis), Cloudinary (Media).  
> **Status:** Deployment-Ready (Milestone 13 Finalized).

---

## 1. System Architecture Overview

```
[ Client Browser / Mobile Web ]
               │
               ▼ (HTTPS)
   [ Vercel: Next.js Frontend ]
               │
               ▼ (HTTPS REST /api/v1)
   [ Render: NestJS Backend API (Modular Monolith) ]
        ├── Auth, Sellers, Marketplace, Orders, Logistics, Admin
        │
        ├── PostgreSQL (Neon Serverless, TLS) via Prisma ORM
        ├── Redis (Upstash, TLS) Cache
        ├── Cloudinary (Secure Media Storage)
        │
        ▼ (Internal Authenticated HTTP with X-Internal-API-Key)
   [ Render: FastAPI AI Foundation Service ]
        └── Scikit-Learn Ensemble Models & Decision Engine Proxies
```

- **Frontend:** Next.js with React 19, TypeScript, TailwindCSS, Zustand, and TanStack Query. Hosted on Vercel.
- **Backend API:** NestJS modular monolith running on Node.js 20 on Render. Single authoritative entry point for client applications.
- **AI Service Boundary:** Dedicated FastAPI Python 3.12 micro-service hosted on Render. Internal-only endpoint, never called directly by browser clients. Protected with pre-shared key (`X-Internal-API-Key`).
- **Data Persistence:** Neon Serverless PostgreSQL with connection pooling.
- **Caching:** Upstash Redis over TLS (`rediss://`).
- **Object Storage:** Cloudinary authenticated direct media asset storage.

---

## 2. Environment Strategy & Variable Reference

Environment configurations are segregated across **Development**, **Test**, and **Production**.

> [!CAUTION]
> NEVER commit real production secrets, API tokens, or credentials into Git. Use the dashboard secrets managers in Vercel, Render, Neon, and Upstash.

### 2.1 Backend Environment Variables (`apps/api`)

| Variable | Requirement in Production | Description | Example / Format |
|---|---|---|---|
| `NODE_ENV` | **REQUIRED** | Execution environment | `production` |
| `PORT` / `API_PORT` | Injected by Render | HTTP listen port | `10000` |
| `DATABASE_URL` | **REQUIRED** | Neon PostgreSQL connection string with SSL | `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/sih26033?sslmode=require&schema=public` |
| `REDIS_URL` | **REQUIRED** | Upstash Redis connection string with TLS | `rediss://default:token@xyz.upstash.io:6379` |
| `JWT_SECRET` | **REQUIRED (min 32 chars)** | HMAC key for signing user session tokens | Cryptographic string (`openssl rand -base64 32`) |
| `JWT_EXPIRATION` | Optional (default: `7d`) | Token expiry | `7d` or `15m` |
| `CORS_ORIGIN` | **REQUIRED** | Allowed frontend domain(s). Comma-separated. **No wildcard `*` allowed in production.** | `https://sih26033.vercel.app` |
| `AI_SERVICE_URL` | **REQUIRED** | URL to internal FastAPI AI service | `https://sih26033-ai.onrender.com` or private service URL |
| `AI_TIMEOUT_MS` | Optional (default: `5000`) | Timeout for AI service requests | `5000` |
| `AI_INTERNAL_KEY` | **REQUIRED (min 16 chars)** | Defense-in-depth secret for NestJS ↔ FastAPI communication | Cryptographic string |
| `CLOUDINARY_CLOUD_NAME`| Optional | Cloudinary cloud account identifier | `sih26033-media` |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API Key | `123456789012345` |
| `CLOUDINARY_API_SECRET`| Optional | Cloudinary API Secret | Secret string |
| `LOGISTICS_PROVIDER` | Optional (default: `mock`) | Active logistics integration adapter | `mock` |
| `SENTRY_DSN` | Optional | Sentry project DSN for backend error capture | `https://example@sentry.io/12345` |

### 2.2 Frontend Environment Variables (`apps/web`)

| Variable | Requirement in Production | Description | Example / Format |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **REQUIRED** | Publicly accessible URL to the NestJS API | `https://sih26033-api.onrender.com/api/v1` |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Browser Sentry DSN for frontend telemetry | `https://example@sentry.io/12345` |

### 2.3 AI Service Environment Variables (`services/ai`)

| Variable | Requirement in Production | Description | Example / Format |
|---|---|---|---|
| `AI_ENVIRONMENT` | **REQUIRED** | Runtime environment | `production` |
| `PORT` | Injected by Render | HTTP listen port | `8080` |
| `AI_INTERNAL_KEY` | **REQUIRED (min 16 chars)** | Pre-shared key for NestJS authentication | Matches `AI_INTERNAL_KEY` in `apps/api` |
| `AI_CORS_ORIGIN` | Optional | Internal CORS origins | `https://sih26033-api.onrender.com` |
| `SENTRY_DSN` | Optional | Sentry DSN for AI service error reporting | `https://example@sentry.io/12345` |

---

## 3. Database Deployment (Neon PostgreSQL)

### 3.1 Setup (REQUIRED MANUAL ACTION)
1. Log in to [Neon Console](https://console.neon.tech).
2. Create a new project `sih26033-prod` with PostgreSQL 16+.
3. Copy the pooled connection string:
   ```
   postgresql://[user]:[password]@[endpoint].neon.tech/sih26033?sslmode=require&schema=public
   ```
4. Configure connection pooling in Neon (recommended pool size: 20 connections).

### 3.2 Running Production Migrations (AUTOMATED / MANUAL)
Run production migrations using the Prisma CLI deploy command (NEVER use `migrate dev` or `migrate reset` in production):
```bash
# Automated via CI or manual deployment step:
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```
This safely applies all 11 existing migrations without dropping tables or resetting data.

---

## 4. Cache Deployment (Upstash Redis)

### 4.1 Setup (REQUIRED MANUAL ACTION)
1. Log in to [Upstash Console](https://console.upstash.io).
2. Create a new Redis Database `sih26033-redis`.
3. Choose the region closest to your Render backend (e.g. Oregon / US-West or Frankfurt / EU-Central).
4. Enable TLS encryption.
5. Copy the `rediss://` connection URL:
   ```
   rediss://default:[password]@[endpoint].upstash.io:6379
   ```
6. Set `REDIS_URL` in the Render API web service environment.

---

## 5. Backend Deployment (Render — NestJS REST API)

### 5.1 Infrastructure as Code Blueprint
The repository includes a ready-to-deploy `render.yaml` specification. You can deploy both services using Render Blueprints:
1. Connect your GitHub repository to [Render Dashboard](https://dashboard.render.com).
2. Select **New** → **Blueprint** and point to `render.yaml`.
3. Render creates both `sih26033-api` and `sih26033-ai`.

### 5.2 Manual Service Configuration (REQUIRED MANUAL ACTION)
If setting up as a standalone Web Service:
- **Environment:** Node.js (Node ≥ 20)
- **Root Directory:** `.`
- **Build Command:**
  ```bash
  npm install && npm run build:api && npm run db:generate
  ```
- **Start Command:**
  ```bash
  node apps/api/dist/main.js
  ```
- **Health Check Path:** `/api/v1/health/readiness`
- **Environment Variables:** Configure as documented in Section 2.1.

---

## 6. AI Service Deployment (Render — FastAPI)

### 6.1 Configuration (REQUIRED MANUAL ACTION)
- **Environment:** Python 3.12
- **Root Directory:** `services/ai`
- **Build Command:**
  ```bash
  pip install -r requirements.txt && python -m training.train_all
  ```
- **Start Command:**
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
- **Health Check Path:** `/health`
- **Environment Variables:** Configure `AI_ENVIRONMENT=production` and `AI_INTERNAL_KEY`.

---

## 7. Frontend Deployment (Vercel — Next.js)

### 7.1 Configuration (REQUIRED MANUAL ACTION)
1. Go to [Vercel Dashboard](https://vercel.com) → **Add New Project**.
2. Import the `SIH26033` repository.
3. Configure the Project Settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
4. Set Environment Variable:
   - `NEXT_PUBLIC_API_URL`: Set to the live Render backend URL (`https://sih26033-api.onrender.com/api/v1`).
5. Deploy.

---

## 8. Operational Health & Readiness Verification

### 8.1 Backend Endpoints
- **Liveness:** `GET /api/v1/health/liveness`
  - Returns `200 OK` with `{ status: "ok", service: "api" }`.
- **Readiness:** `GET /api/v1/health/readiness`
  - Verifies database connection pool liveness. Returns `200 OK` with database ping status.
- **Combined Health:** `GET /api/v1/health`
  - Standard terminus health-check response.

### 8.2 AI Service Endpoints
- **Liveness:** `GET /health`
  - Returns `200 OK` with service name and environment.
- **Readiness:** `GET /ready`
  - Returns `200 OK` if all 3 ML baseline models (Price, Demand, Crop) are loaded in memory. Returns `503 Service Unavailable` if models are not loaded.

---

## 9. Third-Party Integration Disclaimers

### 9.1 Payment Provider (MOCK / SANDBOX)
> [!IMPORTANT]
> The platform currently uses a **SANDBOX / MOCK payment simulation adapter**.
> - Simulated escrow and payment confirmation are isolated behind `PaymentService` and the mock gateway.
> - NO live credit card, UPI, or banking gateways are currently active.
> - Real banking gateway integration is slated for future production hardening.

### 9.2 Logistics Provider (MOCK / SANDBOX)
> [!IMPORTANT]
> The platform currently uses `MockLogisticsProvider`.
> - Deterministic tracking number generation (`TRK-AGRI-...`) and milestone timeline simulation.
> - Complete failure simulation and two-phase database reconciliation mechanisms are verified and active.
> - NO live carrier API (Delhivery, Shiprocket, BlueDart) is actively connected.

---

## 10. Rollback Considerations

1. **Database Migrations:**
   - All 11 Prisma migrations are additive and backward-compatible.
   - Do NOT run destructive down migrations on production Neon instances.
2. **Frontend Rollbacks:**
   - In Vercel, navigate to Deployments and click **Instant Rollback** to the previous stable release.
3. **Backend Rollbacks:**
   - In Render, select the service, go to **Deploys**, and roll back to the previously approved commit hash.

---

## 11. Known Operational Considerations

1. **Rate Limiting:**
   - Rate limiting is currently implemented using NestJS in-memory `@nestjs/throttler`.
   - Multi-instance distributed rate limiting across horizontal pods via Upstash Redis is a planned future consideration.
2. **FastAPI Idle Sleep:**
   - If hosted on a free Render tier, the AI service will spin down after inactivity. A paid starter tier is recommended for continuous uptime.

---

## 12. Operations Manual & Production Readiness Checklist

- **Incident Runbook & Triage**: See [OPERATIONS.md](file:///c:/Users/Shrey/OneDrive/Desktop/SIH26033/docs/OPERATIONS.md) for detailed incident mitigation, component failure runbooks, correlation ID logging, and on-call checklists.
- **Production Readiness Audit**: See [PRODUCTION_READINESS.md](file:///c:/Users/Shrey/OneDrive/Desktop/SIH26033/docs/PRODUCTION_READINESS.md) for verification matrix, testing coverage, and operational constraints.
- **Post-Deployment Smoke Test**: Execute `npm run smoke-test` to verify end-to-end operational availability across all tiers.
