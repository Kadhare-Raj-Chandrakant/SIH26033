# SIH26033 — Production Operations & Incident Runbook

> **Target Audience:** SREs, DevOps engineers, on-call engineers, and release architects.  
> **Architecture Pattern:** NestJS modular monolith with a dedicated FastAPI AI service boundary.  
> **Operational Status:** Production-Ready (Milestone 14).

---

## 1. System Architecture Overview

```
[ Client Browser / Mobile Web ]
               │
               ▼ (HTTPS)
   [ Vercel: Next.js Frontend ]
               │
               ▼ (HTTPS REST /api/v1 with x-request-id)
   [ Render: NestJS Backend API (Modular Monolith) ]
        ├── Auth, Sellers, Marketplace, Orders, Logistics, Admin
        │
        ├── PostgreSQL (Neon Serverless, TLS, connection pooled)
        ├── Redis (Upstash, TLS) Cache
        ├── Cloudinary (Secure Media Storage)
        │
        ▼ (Internal HTTP with X-Internal-API-Key)
   [ Render: FastAPI AI Foundation Service ]
        └── Scikit-Learn Ensemble Models & Decision Engine Proxies
```

### Component Topology & Hosting
| Tier | Component | Technology | Hosting Platform | Traffic Profile |
|---|---|---|---|---|
| **Frontend** | `apps/web` | Next.js 16 (React 19), TailwindCSS | Vercel | Public internet (HTTPS) |
| **Backend** | `apps/api` | NestJS 12, Node.js 20, Prisma ORM | Render (Web Service) | Public REST API (`/api/v1`) |
| **AI/ML** | `services/ai` | FastAPI, Python 3.12, Scikit-learn | Render (Web Service) | Private internal HTTP (`x-internal-api-key`) |
| **Database** | Primary DB | PostgreSQL 16+ | Neon Serverless | TLS pooled connection (`sslmode=require`) |
| **Cache** | Session/Cache | Redis 7 | Upstash Redis | TLS encrypted (`rediss://`) |
| **Media** | Product Assets | Cloudinary CDN | Cloudinary Cloud | Secure signed CDN delivery |
| **Monitoring** | Error Telemetry | Sentry SDK | Sentry SaaS | Out-of-band error telemetry |

---

## 2. Operational Health & Readiness Probes

All health probes are public (`@Public()`), lightweight, non-destructive, and return structured JSON.

### 2.1 Backend Health Probes (`apps/api`)
| Endpoint | Method | Purpose | Platform Probe Type | Target Status | Payload Response |
|---|---|---|---|---|---|
| `/api/v1/health/liveness` | `GET` | Process liveness | Render Liveness Probe | `200 OK` | `{"status":"ok","service":"api","timestamp":"..."}` |
| `/api/v1/health/readiness` | `GET` | Dependency readiness | Render Readiness Probe | `200 OK` | `{"status":"ok","info":{"database":{"status":"up"}}}` |
| `/api/v1/health` | `GET` | Terminus combined health | Load balancer probe | `200 OK` | Detailed dependency status |

*Note:* Readiness probes execute a fast database connection ping (`this.prismaHealth.pingCheck('database', ...)`). If the database pool is down or unreachable, it returns `503 Service Unavailable`, preventing the platform from routing traffic to an unhealthy pod.

### 2.2 AI Service Probes (`services/ai`)
| Endpoint | Method | Purpose | Platform Probe Type | Target Status | Description |
|---|---|---|---|---|---|
| `/health` | `GET` | Process liveness | Render Health Check | `200 OK` | `{"status":"ok","service":"ai-service",...}` |
| `/ready` | `GET` | Model readiness | Render Readiness Check | `200 OK` / `503` | `200` when all 3 baseline ML models are loaded in memory; `503` if models are loading or unavailable. |

### 2.3 Post-Deployment Smoke Verification
Run the automated non-destructive verification probe:
```bash
# Verify local running instances:
npm run smoke-test

# Verify live staging or production instances:
BACKEND_URL=https://sih26033-api.onrender.com \
FRONTEND_URL=https://sih26033.vercel.app \
AI_SERVICE_URL=https://sih26033-ai.onrender.com \
npm run smoke-test
```

---

## 3. Production Deployment Pathways & Safety

### 3.1 Branching Strategy & Quality Gates
- **`main` Branch**: Production-ready code. Direct pushes should be restricted via GitHub Branch Protection.
- **Pull Request Pathway**:
  1. Contributor opens PR against `main`.
  2. GitHub Actions CI workflow triggers automatically:
     - Backend: isolated PostgreSQL + Redis service containers, Prisma validate/migrate/client, typecheck, lint, unit tests, E2E tests, production build.
     - Frontend: clean install, typecheck, lint, production build.
     - AI: dependencies, model artifact pipeline validation, pytest suite.
     - Security: `npm audit`, secret hygiene check.
  3. All status checks must pass before merge is permitted.

### 3.2 Production Platform Automated Deployment
- **Frontend (Vercel)**:
  - Connected directly to repository `main` branch.
  - Automatically triggers Next.js production build upon merge.
  - Supports instant zero-downtime rollbacks via Vercel Dashboard.
- **Backend API & AI Service (Render)**:
  - Configured via Infrastructure-as-Code blueprint `render.yaml`.
  - Auto-deploys upon approved merge to `main`.
  - Auto-executes zero-downtime rolling deploys with health check validation (`/api/v1/health/readiness` and `/health`).

---

## 4. Production Environment Variables Reference

> [!CAUTION]
> NEVER store production secrets in Git. Set these values exclusively within the respective platform dashboards (Vercel, Render, Neon, Upstash).

### 4.1 Backend Environment Variables (`apps/api`)
| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Auto | Render-injected HTTP port (`10000`) |
| `DATABASE_URL` | Yes | Neon PostgreSQL pooled URL with `sslmode=require` |
| `REDIS_URL` | Yes | Upstash Redis connection URL with `rediss://` TLS |
| `JWT_SECRET` | Yes | Cryptographic secret (minimum 32 characters) |
| `JWT_EXPIRATION` | No | Token expiration duration (default: `7d`) |
| `CORS_ORIGIN` | Yes | Frontend domain URL (e.g. `https://sih26033.vercel.app`). Wildcard `*` strictly prohibited in production. |
| `AI_SERVICE_URL` | Yes | Live internal URL to FastAPI service (e.g. `https://sih26033-ai.onrender.com`) |
| `AI_TIMEOUT_MS` | No | Timeout threshold in ms (default: `5000`) |
| `AI_INTERNAL_KEY` | Yes | Shared authentication secret between NestJS and FastAPI (min 16 characters) |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud account name |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API Secret |
| `LOGISTICS_PROVIDER` | No | `mock` (simulated adapter) |
| `SENTRY_DSN` | Optional | Sentry Project DSN for backend error capture |

### 4.2 Frontend Environment Variables (`apps/web`)
| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Public URL to NestJS REST API (e.g. `https://sih26033-api.onrender.com/api/v1`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Public browser Sentry DSN for client runtime telemetry |

### 4.3 AI Service Environment Variables (`services/ai`)
| Variable | Required | Description |
|---|---|---|
| `AI_ENVIRONMENT` | Yes | `production` |
| `PORT` | Auto | Render-injected HTTP port (`8080`) |
| `AI_INTERNAL_KEY` | Yes | Must match `AI_INTERNAL_KEY` configured in backend |
| `SENTRY_DSN` | Optional | Sentry DSN for AI service error reporting |

---

## 5. Logging, Correlation & Sentry Telemetry

### 5.1 Correlation / Request ID Lifecycle
1. Every incoming HTTP request passes through `requestIdMiddleware`.
2. If the client supplies an `x-request-id` header (alphanumeric/hyphen string ≤64 chars), it is validated and propagated.
3. If absent or malformed, a cryptographically random UUID is generated.
4. The ID is attached to:
   - Request headers: `req.headers['x-request-id']`
   - Express request object: `(req as any).id`
   - Response headers: `res.setHeader('x-request-id', correlationId)`
   - Structured JSON error payloads: `res.body.error.requestId`
   - Log entries: `[correlationId] METHOD URL STATUS +DURATIONms`
   - Sentry error tags: `scope.setTag('requestId', ...)`

### 5.2 Structured Operational Logging
The application uses NestJS structured logging:
- Standard HTTP requests:
  `LOG [HTTP] [trace-12345] GET /api/v1/marketplace/products 200 +14ms`
- Operational errors:
  `ERROR [HTTP] [trace-12345] POST /api/v1/orders 400 +22ms - Bad Request Exception`
- AI Observability:
  `LOG [AiService] [AI-Observability] POST /api/v1/predict/price SUCCESS status=200 duration=42ms model_version=1.0.0`
  `WARN [AiService] [AI-Observability] GET /api/v1/market/intelligence/Wheat FALLBACK: FastAPI unavailable`

### 5.3 Redaction & Sensitive Data Exclusion
The following data is **STRICTLY EXCLUDED** from logs and Sentry:
- `password` and `passwordHash`
- `authorization` headers and Bearer JWT tokens
- `cookie` and session headers
- `DATABASE_URL` and database credentials
- `REDIS_URL` and Redis passwords
- `AI_INTERNAL_KEY` internal pre-shared key
- `CLOUDINARY_API_SECRET`
- Credit card / financial details

The Sentry utility (`apps/api/src/common/monitoring/sentry.util.ts`) enforces automated recursive object sanitization in `beforeSend` to guarantee zero credential or PII leakage.

---

## 6. Incident Triage & Component Failure Runbooks

### 6.1 Database Failure (Neon PostgreSQL)
- **Symptom:**
  - Health probe `/api/v1/health/readiness` returns `503 Service Unavailable`.
  - Logs show: `PrismaClientInitializationError` or connection timeout.
- **Triage Steps:**
  1. Check [Neon Console](https://console.neon.tech) status and compute availability.
  2. Verify connection pool usage: Neon free/starter tiers have connection limits. If pool exhausted, ensure connection pooling (`-pooler` endpoint) is used in `DATABASE_URL`.
  3. Verify SSL mode (`sslmode=require`) is active.
- **Mitigation:**
  - If compute suspended: send a query or trigger a restart in Neon console to wake up compute.
  - If schema migration issue: run `npx prisma migrate status` to check migration integrity.

### 6.2 AI Service Outage / Degradation (FastAPI)
- **Symptom:**
  - Backend logs show: `[AI-Observability] ... UNAVAILABLE` or `TIMEOUT`.
- **System Behavior (Fault Tolerance):**
  - **The marketplace remains operational.** The platform is architected so core browsing, cart, ordering, and administrative functions do NOT crash when AI is degraded.
  - **Price Intelligence:** If price prediction times out or is offline, the endpoint automatically falls back to platform market average prices and flags `modelAvailable = false`.
  - **Market Intelligence:** If FastAPI APMC data is unavailable, the service logs `FALLBACK: FastAPI unavailable` and serves live platform internal market data.
- **Triage Steps:**
  1. Check Render dashboard for `sih26033-ai`.
  2. Check probe: `GET https://sih26033-ai.onrender.com/health` and `/ready`.
  3. If on free tier: Render sleeps web services after 15 min inactivity. The first request takes 30-50s to spin up. (Starter plan prevents cold starts).

### 6.3 Redis Cache Outage (Upstash)
- **Symptom:**
  - Backend logs warn on Redis connectivity or cache missed.
- **System Behavior:**
  - Rate limiting currently operates in-memory (`@nestjs/throttler`), meaning rate limiting continues functioning per container even during Redis downtime.
  - Core database transactions continue without blocking.
- **Triage Steps:**
  1. Verify [Upstash Console](https://console.upstash.io) database status.
  2. Confirm `REDIS_URL` uses the encrypted `rediss://` scheme.

### 6.4 Media Upload Failure (Cloudinary)
- **Symptom:**
  - Product creation with image upload fails with `500 Media upload service is not configured`.
- **System Behavior:**
  - If Cloudinary credentials are missing in development, dummy mock URLs are returned.
  - In production, missing credentials or API failure throws an explicit error without corrupting the database.
- **Triage Steps:**
  1. Check Cloudinary quota and credit usage in Cloudinary Console.
  2. Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Render.

### 6.5 Logistics Carrier Failure & Two-Phase Reconciliation
- **Symptom:**
  - Order shipment dispatch fails with `External logistics carrier dispatch failed`.
- **System Behavior:**
  - The platform includes a **two-phase reconciliation protocol** (`OrdersService`).
  - If carrier consignment is generated but local persistence fails, the order is marked for reconciliation, preventing duplicate carrier charges or orphaned shipments.
  - Currently active provider is `MockLogisticsProvider` (`LOGISTICS_PROVIDER="mock"`). Live carrier integrations (Delhivery, Shiprocket) will be introduced in future hardening milestones.

### 6.6 Payment Sandbox Status
- **Current State:**
  - The payment module operates in **SANDBOX / MOCK MODE**.
  - No real money, credit cards, or UPI accounts are charged.
  - Payment simulations are isolated in `PaymentService`. Live gateway integration (Razorpay, Stripe) will be activated in future milestones.

---

## 7. Rollback Procedures & Disaster Recovery

### 7.1 Database Migration Safety & Rollback Strategy
> [!WARNING]
> Prisma migrations are forward-only (`prisma migrate deploy`). NEVER execute `prisma migrate reset` or `prisma db push` in production.

If a recent migration introduced an issue:
1. **Do NOT run down-migrations** that drop columns or tables with production data.
2. Formulate an additive, forward-moving hotfix migration (e.g. make column nullable, relax constraint, or rename safely).
3. Test migration locally against a test database copy.
4. Deploy the forward hotfix via CI or `npx prisma migrate deploy`.

### 7.2 Frontend Rollback (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com) → Project `sih26033` → **Deployments**.
2. Locate the previously verified deployment commit hash.
3. Click the three dots `...` → **Instant Rollback**.
4. Traffic is immediately redirected to the previous build within seconds.

### 7.3 Backend API & AI Rollback (Render)
1. Go to [Render Dashboard](https://dashboard.render.com) → Select service (`sih26033-api` or `sih26033-ai`).
2. Go to **Deploys**.
3. Locate the previous successful deploy.
4. Click **Rollback to this deploy**.
5. Render deploys the previous container build while monitoring health probes.

---

## 8. Incident Escalation & On-Call Checklist

When an incident occurs:
- [ ] **1. Acknowledge & Correlate:** Check Sentry for error volume, error types, and grab sample `requestId`s.
- [ ] **2. Probe Health Endpoints:** Run `npm run smoke-test` against live URLs to identify which tier is failing.
- [ ] **3. Inspect Logs:** Filter Render logs by `[requestId]` or `[AI-Observability]`.
- [ ] **4. Mitigate Immediately:**
  - If bad application code: Initiate Instant Rollback in Vercel or Render.
  - If database compute exhausted: Restart/scale Neon compute.
  - If AI service slow: Verify model loading status at `/ready`.
- [ ] **5. Post-Incident Review:** Record timeline, root cause, recovery actions, and document preventive tasks.
