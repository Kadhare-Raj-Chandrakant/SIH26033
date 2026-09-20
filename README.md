# SIH26033 — AI-Powered Agricultural B2B/B2C Marketplace & FPO Aggregation Platform

> **Smart India Hackathon 2026** · **Problem Statement 26033**  
> *"Multiple intermediaries reduce farmers' earnings and increase consumer prices."*

[![Build & CI Status](https://img.shields.io/badge/CI%20Gates-Passing-brightgreen?style=flat-square&logo=githubactions)](https://github.com/shreyparmardev/SIH26033/actions)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016%20%7C%20React%2019%20%7C%20TailwindCSS%204-0070F3?style=flat-square&logo=nextdotjs)](apps/web)
[![Backend](https://img.shields.io/badge/Backend-NestJS%2012%20%7C%20Node.js%2024%20%7C%20TypeScript-E0234E?style=flat-square&logo=nestjs)](apps/api)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016%20%7C%20Prisma%206-336791?style=flat-square&logo=postgresql)](apps/api/prisma)
[![Cache](https://img.shields.io/badge/Cache-Redis%207-DC382D?style=flat-square&logo=redis)](docker/docker-compose.dev.yml)
[![AI/ML Service](https://img.shields.io/badge/AI%2FML-FastAPI%20%7C%20Python%203.12%20%7C%20Scikit--Learn-009688?style=flat-square&logo=fastapi)](services/ai)
[![License](https://img.shields.io/badge/License-MIT%20%2F%20SIH%202026-blue?style=flat-square)](LICENSE)

An enterprise-grade, full-stack agricultural marketplace platform connecting **Smallholder Farmers**, **Farmer Producer Organisations (FPOs)**, and **Commercial / Retail Buyers** directly. By combining **direct multi-seller commerce**, **FPO bulk demand aggregation**, **AI-driven price intelligence**, and **transparent logistics tracking**, the platform disintermediates conventional supply chains—increasing farmer price realization from ~25–35% up to **80–85% of net end-value**.

---

## 📑 Table of Contents

1. [Problem Statement & Solution](#-problem-statement--solution)
2. [System Architecture](#-system-architecture)
3. [Implemented Core Capabilities](#-implemented-core-capabilities)
   - [Multi-Role Authentication & Access Control](#1-multi-role-authentication--access-control)
   - [Marketplace Discovery & Catalog](#2-marketplace-discovery--catalog)
   - [Cart & Atomic Multi-Seller Order Splitting](#3-cart--atomic-multi-seller-order-splitting)
   - [Logistics & Order Fulfillment Lifecycle](#4-logistics--order-fulfillment-lifecycle)
   - [FPO Aggregation & Bulk Procurement Subsystem](#5-fpo-aggregation--bulk-procurement-subsystem)
   - [AI Machine Learning Services & Decision Engine](#6-ai-machine-learning-services--decision-engine)
   - [Platform Governance & Administration](#7-platform-governance--administration)
4. [Monorepo Project Structure](#-monorepo-project-structure)
5. [Frontend Screens & Navigation Tour](#-frontend-screens--navigation-tour)
6. [Backend REST API Catalog](#-backend-rest-api-catalog)
7. [Getting Started & Local Development](#-getting-started--local-development)
8. [Automated Testing & CI Quality Gates](#-automated-testing--ci-quality-gates)
9. [Cloud Production Deployment](#-cloud-production-deployment)
10. [Default Demo Credentials](#-default-demo-credentials)

---

## 🎯 Problem Statement & Solution

### The Conventional Agricultural Challenge
In traditional agricultural supply chains, produce passes through 4 to 6 intermediary layers between the farm gate and consumers:
```
[Traditional Intermediated Chain]
Farmer ──> Village Aggregator ──> Mandi Commission Broker ──> Wholesaler ──> Secondary Wholesaler ──> Retailer ──> Consumer
(Farmer realizes ~25% to 35% of retail price; high post-harvest loss; zero price discovery transparency)
```
Intermediary markups, unregulated mandi commissions (6%+), unverified weighing deductions, and opaque auctions leave farmers vulnerable to distress selling while inflating prices for institutional and retail buyers.

### The SIH26033 Direct Architecture
```
[SIH26033 Digital Architecture]
Farmer / FPO ──────────────────────────────────────────> Verified Institutional & Retail Buyer
                  ▲                               ▲
                  │                               │
         AI Price Intelligence         Direct Multi-Seller Logistics
    (Farmer realizes up to 80-85% of net end-value; transparent fees)
```
- **Direct Trade**: Farmers sell directly to buyers with transparent transport and packaging fees.
- **FPO Bulk Aggregation**: Smallholder harvests are aggregated into commercial truckloads to satisfy institutional purchase requests (RFQs).
- **AI Decision Intelligence**: Machine learning forecasts APMC modal prices, predicts wholesale arrival liquidity, and advises farmers whether to *Sell Now* or *Store*.
- **Fair Settlement Waterfall**: Automatically deducts approved operational fees and disburses net proceeds proportionally to participating farmers.

---

## 🏗️ System Architecture

The platform is structured as an enterprise-grade TypeScript/Python monorepo:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CLIENT TIER: Next.js 16 (apps/web)                    │
│                  React 19 • Tailwind CSS 4 • TanStack Query 5               │
│                       Port: 3000 (http://localhost:3000)                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                              HTTP REST / JSON (JWT)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     API TIER: NestJS 12 REST API (apps/api)                 │
│              TypeScript • Prisma ORM • Argon2 • Swagger • Throttler         │
│                       Port: 4000 (http://localhost:4000)                    │
└───┬──────────────────────────┬──────────────────────────┬───────────────────┘
    │                          │                          │
    │ SQL Queries (ACID)       │ Cache / Sessions         │ Internal HTTP REST
    ▼                          ▼                          ▼
┌──────────────────────┐ ┌───────────────┐ ┌──────────────────────────────────┐
│ PostgreSQL 16 DB     │ │ Redis 7 Cache │ │ AI / ML Microservice (FastAPI)   │
│ (Port: 5432 / 5433)  │ │ (Port: 6380)  │ │ (Port: 8080)                     │
│ 13 Prisma Migrations │ │ Rate Limiting │ │ Scikit-learn Random Forests      │
│ Relational Schema    │ │ Session State │ │ Price / Demand / Crop Models     │
└──────────────────────┘ └───────────────┘ └──────────────────────────────────┘
```

---

## ⚡ Implemented Core Capabilities

### 1. Multi-Role Authentication & Access Control
- **Role-Based Access Control (RBAC)**: Enforces distinct authorization scopes across `FARMER`, `FPO`, `BUYER`, and `ADMIN`.
- **Security Engineering**: Password hashing via **Argon2**, stateless JSON Web Tokens (**JWT**) with role claims, Passport guards, and automated session validation.
- **1-Click Demo Sign-in**: Quick demo authentication buttons on `/login` allowing evaluators to immediately log in as Farmer, FPO Manager, or Buyer.

### 2. Marketplace Discovery & Catalog
- **Multi-Parametric Search & Filter**: Real-time filtering by category, search keywords, origin state/district, and dynamic price boundaries (`minPrice` / `maxPrice`).
- **Produce Showcase**: Rich listings featuring real agricultural photography, harvest dates, grade classifications, stock availability, and producer verification badges.
- **Mandi Price Benchmarking**: Side-by-side display of official APMC mandi benchmark prices against platform prices to establish value transparency.

### 3. Cart & Atomic Multi-Seller Order Splitting
- **Database-Backed Cart**: Persistent cart state tied to buyer profiles with real-time inventory validation.
- **Multi-Vendor Order Partitioning**: When a buyer checks out with produce from multiple farmers/FPOs, the checkout service **automatically partitions the cart into individual vendor-scoped orders**.
- **Immutable Snapshots**: Captures immutable snapshots of shipping addresses and negotiated unit prices at the moment of checkout, protecting against subsequent catalog edits.

### 4. Logistics & Order Fulfillment Lifecycle
- **Order State Machine**: Strict sequential transitions:  
  `PENDING` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `READY_FOR_SHIPMENT` ➔ `SHIPPED` ➔ `DELIVERED`.
- **Logistics Adapter (`MockLogisticsProvider`)**: Generates airway bills, assigned couriers, and unique tracking identifiers (`TRK-AGRI-...`).
- **Milestone Checkpoint Tracking**: Emits tracking events (`PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`) visualized on an interactive tracking stepper on `/orders/[id]`.

### 5. FPO Aggregation & Bulk Procurement Subsystem
A comprehensive institutional procurement engine designed specifically for Farmer Producer Organisations:
- **FPO Onboarding & Accreditation**: Regulatory onboarding form (`/fpo/register`) and administrative verification queue (`/admin/fpo`).
- **Farmer Membership Management**: Membership application tracking, share capital tracking, and member rosters (`/fpo/join`, `/fpo/dashboard/members`).
- **Crop Commitments**: Individual smallholder farmers commit harvest lots (grade, quantity, target price) to their FPO (`/fpo/commit`).
- **Commercial Lot Aggregation Workbench**: FPO managers pool member commitments into sealed aggregation batches (`/fpo/dashboard/aggregation`).
- **Institutional Buyer RFQs**: Commercial buyers post large-volume purchase requirements (`/fpo/buy-requests`).
- **Algorithmic Lot Matching**: Automatic matching of sealed aggregation batches against open buyer RFQs based on commodity, quantity, and price ceiling.
- **Bulk Order Fulfillment (`orderType: FPO_BULK`)**: Automated bulk order dispatch and delivery tracking.
- **Transparent Settlement Waterfall**: Computes deductions for transport, handling, and FPO commissions, then generates proportional disbursement payout records (`FpoFarmerPayment`) for every contributing farmer (`/fpo/dashboard/settlements`).

### 6. AI Machine Learning Services & Decision Engine
The platform combines machine learning models with a deterministic agronomic decision engine:
- **Dedicated Python FastAPI Microservice (`services/ai`)**:
  - **Price Predictor** (*Random Forest Regressor*): Forecasts APMC modal prices (₹/Quintal) using temporal seasonality, rainfall, and fuel indices without data leakage.
  - **Demand Forecaster** (*Random Forest Regressor*): Forecasts arrival absorption indices and categorizes market liquidity into `HIGH`, `MODERATE`, or `LOW`.
  - **Crop Recommender** (*Random Forest Classifier*): Evaluates soil Nitrogen (N), Phosphorus (P), Potassium (K), pH, temperature, and precipitation to recommend suitable commercial crops across 22 varieties.
- **NestJS Backend Decision Engine (`apps/api/src/ai/decision-engine`)**:
  - **Net Realization Waterfall**: Deducts freight (₹3.50/tonne-km benchmark with fuel adjustments), handling (hamali), weighing fees, packaging, and mandi commission (6%) to calculate net income per channel.
  - **Sell-Timing Advisory**: Compares commodity perishability rates and cold-storage fees against forward price projections to output `SELL NOW` vs `STORE`.
  - **Smart Channel Allocation**: Optimizes volume distribution across Local Mandi, Matched Direct Buyer, and Platform Listing.
  - **Spatial Two-Way Matching**: Computes spherical Haversine distances to match buyer RFQs with nearby farmer harvests.

### 7. Platform Governance & Administration
- **Operational KPI Dashboard**: Real-time platform metrics on active users, listed inventory, total orders, GMV, and pending verifications (`/admin`).
- **Seller & Listing Moderation**: Producer verification workflows, product listing moderation queues, and user report resolution.
- **Immutable Audit Trails**: Tamper-evident, append-only `AuditLog` records tracking actor user ID, IP address, action types, and state changes with foreign-key preservation (`onDelete: SetNull`).

---

## 📁 Monorepo Project Structure

```
SIH26033/
├── apps/
│   ├── web/                        # Next.js 16 frontend application (React 19, Tailwind CSS 4)
│   │   └── src/app/                # App Router pages (Marketplace, Cart, Orders, FPO, Admin)
│   └── api/                        # NestJS 12 backend REST API (TypeScript, Prisma, Swagger)
│       ├── prisma/                 # Prisma relational schema, 13 migrations, seeders
│       ├── src/
│       │   ├── auth/               # Argon2 hashing, JWT strategies, RBAC guards
│       │   ├── marketplace/        # Product catalog, categories, inventory management
│       │   ├── cart/               # Cart item management & stock validation
│       │   ├── orders/             # Multi-seller order splitting, fulfillment pipeline
│       │   ├── logistics/          # Carrier adapter interface & mock tracking provider
│       │   ├── fpo/                # FPO aggregation, RFQ matching, settlement waterfall
│       │   ├── ai/                 # Decision engine (Net realization, sell-timing, allocation)
│       │   └── admin/              # Operational metrics, moderation, immutable audit logs
│       └── test/                   # 13 E2E test suites (225 Vitest tests)
├── packages/
│   └── shared/                     # Cross-workspace shared types, enums, and constants
├── services/
│   └── ai/                         # Python 3.12 / FastAPI Machine Learning microservice
│       ├── app/                    # Inference endpoints, feature pipelines, model schemas
│       ├── artifacts/              # Trained Scikit-learn Random Forest joblib artifacts
│       └── tests/                  # Pytest validation suites (25 tests)
├── docker/
│   └── docker-compose.dev.yml      # Local PostgreSQL 16 + Redis 7 containers
├── docs/                           # Architecture guides, deployment documentation
├── scripts/                        # Automated smoke tests, FPO verification, seed scripts
├── render.yaml                     # Infrastructure-as-Code for Render cloud deployment
├── package.json                    # Monorepo workspaces configuration
└── tsconfig.base.json              # Shared TypeScript compiler configuration
```

---

## 🖥️ Frontend Screens & Navigation Tour

| Route | Authorized Roles | Screen Purpose & Key Capabilities |
|---|:---:|---|
| `/` | Public | Landing page featuring problem overview, value propositions, and marketplace entry points. |
| `/login` | Public | Authentication portal with 1-click test login buttons for Buyer, Farmer, and FPO. |
| `/register` | Public | Multi-role account onboarding (Farmer, FPO Organisation, or Commercial Buyer). |
| `/marketplace` | Public / Buyer | Produce catalog discovery with category filters, price bounds, sorting, and search. |
| `/marketplace/products/[id]` | Public / Buyer | Product detail view with photos, specifications, stock levels, and APMC benchmark prices. |
| `/marketplace/sourcing` | Buyer | Institutional sourcing portal for posting purchase demands (RFQs) and viewing matched farmers. |
| `/cart` | Buyer | Shopping cart review, quantity adjustments, stock warnings, and subtotal calculation. |
| `/checkout` | Buyer | Delivery address selection, order review grouped by seller, and simulated order placement. |
| `/orders` | Buyer | Purchase order history with status badges and links to live tracking. |
| `/orders/[id]` | Buyer | Interactive shipment tracker with visual progress stepper, tracking ID, and milestone timeline. |
| `/seller/orders` | Farmer / FPO | Seller fulfillment workbench: order confirmation, packing, dispatching, and tracking sync. |
| `/seller/intelligence` | Farmer / FPO | AI advisory dashboard: Net Realization Waterfall, Sell Timing, Mandi Comparison, Matched Buyers. |
| `/fpo/register` | Public / FPO | FPO organisation registration with legal details, registration numbers, and operational zones. |
| `/fpo/join` | Farmer | Smallholder portal to apply for FPO membership and record share capital contributions. |
| `/fpo/commit` | Farmer | Portal for member farmers to commit upcoming crop harvests into FPO pools. |
| `/fpo/buy-requests` | FPO / Buyer | Institutional procurement portal for posting and reviewing large-scale commodity RFQs. |
| `/fpo/dashboard/members` | FPO Admin | Membership approval queue, farmer roster, and share capital ledger. |
| `/fpo/dashboard/aggregation`| FPO Admin | Lot aggregation workbench: pooling commitments into batches, sealing lots, matching RFQs. |
| `/fpo/dashboard/listings` | FPO Admin | Aggregated batch listing overview and bulk order status tracking. |
| `/fpo/dashboard/settlements`| FPO Admin | Financial settlement workbench: deduction waterfalls and farmer disbursement payouts. |
| `/admin` | Admin | High-level platform KPIs: users, products, orders, GMV, verifications, open abuse reports. |
| `/admin/fpo` | Admin | Accreditation review queue for pending FPO organisation registrations. |
| `/admin/audit-logs` | Admin | Searchable audit trail recording all administrative actions with actor metadata and timestamps. |

---

## 🔌 Backend REST API Catalog

All endpoints are prefixed with `/api/v1` and fully documented via interactive **Swagger UI** at `http://localhost:4000/api/docs`.

### Authentication & Profiles (`/auth`)
- `POST /api/v1/auth/register` — Create user account with role-specific profile (`FARMER`, `FPO`, `BUYER`).
- `POST /api/v1/auth/login` — Authenticate credentials and receive signed JWT.
- `GET /api/v1/auth/me` — Retrieve profile details of authenticated user.

### Marketplace & Catalog (`/marketplace`)
- `GET /api/v1/marketplace/products` — Search and filter active produce listings.
- `GET /api/v1/marketplace/products/:id` — Retrieve detailed produce record with seller info.
- `GET /api/v1/marketplace/categories` — List active agricultural commodity categories.

### Cart & Orders (`/cart`, `/orders`)
- `GET /api/v1/cart` & `POST /api/v1/cart/items` — Inspect and modify persistent cart items.
- `POST /api/v1/orders` — Check out and execute multi-seller atomic order splitting.
- `GET /api/v1/orders` & `GET /api/v1/orders/:id` — Query buyer purchase history and order detail.
- `PATCH /api/v1/orders/:id/status` — Advance fulfillment state (`CONFIRMED`, `PROCESSING`, `SHIPPED`, etc.).

### Logistics & Tracking (`/logistics`)
- `POST /api/v1/logistics/shipments` — Dispatch order and generate tracking number via carrier adapter.
- `GET /api/v1/logistics/shipments/:id/track` — Retrieve carrier tracking timeline and milestone events.

### FPO Aggregation & Bulk Procurement (`/fpo`)
- `POST /api/v1/fpo/register` & `PATCH /api/v1/fpo/:id/verify` — FPO registration & accreditation.
- `POST /api/v1/fpo/:id/join` & `PATCH /api/v1/fpo/memberships/:id/approve` — Member onboarding.
- `POST /api/v1/fpo/:id/listings` — Farmer harvest supply commitments.
- `POST /api/v1/fpo/:id/batches` & `PATCH /api/v1/fpo/batches/:id/seal` — Lot aggregation workbench.
- `POST /api/v1/fpo/buy-requests` & `GET /api/v1/fpo/buy-requests/all` — Institutional RFQ management.
- `POST /api/v1/fpo/batches/:id/match` — Algorithmic lot matching & bulk order generation.
- `POST /api/v1/fpo/batches/:id/settlement` & `POST /api/v1/fpo/settlements/:id/distribute` — Waterfall payout disbursement.

### AI Intelligence & Decision Engine (`/ai`)
- `GET /api/v1/ai/market-intelligence` — Real-time APMC price benchmarks and trend indicators.
- `GET /api/v1/ai/decision/net-realization` — Gross-to-net realization deduction waterfall.
- `GET /api/v1/ai/decision/sell-timing` — Forward price vs storage cost sell-timing advisory.
- `GET /api/v1/ai/decision/smart-allocation` — Optimal volume distribution across marketing channels.
- `GET /api/v1/ai/decision/matching` — Haversine spatial matching between sellers and buyer demands.

### Admin Operations & Governance (`/admin`)
- `GET /api/v1/admin/dashboard` — Platform operational statistics and summary metrics.
- `PATCH /api/v1/admin/users/:id/status` — Suspend or reactivate user accounts.
- `PATCH /api/v1/admin/sellers/:id/verify` — Verify producer identity and KYC documentation.
- `GET /api/v1/admin/audit-logs` — Query tamper-evident administrative audit logs.

---

## 🚀 Getting Started & Local Development

### Prerequisites
- **Node.js** ≥ 20.0.0 (`node -v`)
- **npm** ≥ 10.0.0 (`npm -v`)
- **Docker** & **Docker Compose** (for PostgreSQL and Redis)
- **Python** ≥ 3.10 (for AI/ML microservice)

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/shreyparmardev/SIH26033.git
cd SIH26033

# Create root environment file from example
cp .env.example .env
```

### Step 2: Start PostgreSQL & Redis Containers
```bash
npm run docker:up
```
*Starts PostgreSQL on port `5433` (or `5432`) and Redis on port `6380`.*

### Step 3: Install Node Dependencies
```bash
npm install
```

### Step 4: Apply Database Migrations & Generate Prisma Client
```bash
npm run db:generate
npm run db:migrate:deploy
```

### Step 5: Seed Baseline Categories & Realistic Marketplace Data
```bash
# Seed standard commodity categories
npm run db:seed

# Seed authentic agricultural listings from dataset
npm run db:seed:marketplace
```

### Step 6: Start Development Servers

In terminal 1 (Backend API):
```bash
npm run dev:api
# Running on http://localhost:4000
# Swagger docs at http://localhost:4000/api/docs
```

In terminal 2 (Frontend Web Client):
```bash
npm run dev:web
# Running on http://localhost:3000
```

In terminal 3 (Python AI Service - Optional for ML endpoints):
```bash
cd services/ai
python -m uvicorn app.main:app --port 8080
# Running on http://localhost:8080
# AI Swagger docs at http://localhost:8080/docs
```

---

## 🧪 Automated Testing & CI Quality Gates

The repository maintains strict verification standards with comprehensive automated test coverage across all layers:

| Test Scope | Command | Verified Result | Notes |
|---|---|:---:|---|
| **Backend Unit Tests** | `npm run test -w apps/api` | **60 / 60 Passed** (100%) | Orders, logistics, auth, decision engine, admin services. |
| **Backend E2E Tests** | `npm run test:e2e -w apps/api` | **225 / 225 Passed** (100%) | 13 test suites covering auth, marketplace, cart, orders, FPO, admin. |
| **AI Microservice Tests**| `pytest` (in `services/ai`) | **25 / 25 Passed** (100%) | Model inference, data pipelines, zero temporal leakage, API schemas. |
| **TypeScript Type Checks**| `npm run type-check` | **0 Errors** (100%) | Clean compilation across `apps/api`, `apps/web`, `packages/shared`. |
| **Frontend Production Build**| `npm run build:web` | **All 37 Routes Built** | Clean Next.js 16 (Turbopack) production bundle. |
| **Full FPO E2E Verification**| `node scripts/verify-fpo-e2e.mjs` | **14 / 14 Steps Passed** | Complete lifecycle: Registration ➔ Aggregation ➔ RFQ Match ➔ Payout. |
| **Operational Smoke Test**| `npm run smoke-test` | **Passing** | Non-destructive HTTP health, readiness, and liveness probes. |

---

## ☁️ Cloud Production Deployment

The platform is designed for cloud deployment across managed providers:

```
┌────────────────────────────────────────────────────────┐
│               Vercel Edge Network                      │
│            Frontend: Next.js (apps/web)                │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             Render Managed Web Services                │
│     • apps/api (NestJS Node.js Runtime)                │
│     • services/ai (FastAPI Python Runtime)             │
└──────────┬─────────────────────────────┬───────────────┘
           │                             │
           ▼                             ▼
┌──────────────────────┐      ┌──────────────────────────┐
│ Neon Serverless PG   │      │ Upstash Redis (TLS)      │
│ Managed PostgreSQL   │      │ Distributed Cache        │
└──────────────────────┘      └──────────────────────────┘
```

- **Frontend**: Hosted on **Vercel** (`apps/web`), leveraging Next.js App Router and edge caching.
- **API & AI Services**: Deployed as Web Services on **Render** via infrastructure manifest (`render.yaml`).
- **Relational Storage**: **Neon Serverless PostgreSQL** with connection pooling.
- **Cache**: **Upstash Redis** with TLS encryption.
- **Media Storage**: **Cloudinary** for image uploads and CDN optimization.

*For step-by-step production deployment instructions, environment variable guides, and rollback policies, refer to the [Production Deployment Guide](docs/DEPLOYMENT.md).*

---

## 🔑 Default Demo Credentials

For quick evaluation, the following pre-configured accounts are available in seeded environments:

| Role | Email Address | Password | Intended Workflow |
|---|---|---|---|
| **Farmer (Producer)** | `farmer@example.com` | `FarmerPass123!` | List produce, view AI pricing advice, commit harvest to FPO. |
| **FPO Manager** | `fpo@example.com` | `FpoPass123!` | Aggregate lots, match buyer RFQs, distribute settlements. |
| **Commercial Buyer** | `buyer@example.com` | `BuyerPass123!` | Browse produce, add to cart, check out, post bulk RFQs. |
| **Platform Admin** | `admin@example.com` | `AdminPass123!` | Accredit FPOs, moderate listings, review immutable audit logs. |

*(All test accounts can also be authenticated using the 1-click demo buttons on `/login`)*.

---

## 📜 License

This project is licensed under the MIT License — developed for the **Smart India Hackathon 2026** (Problem Statement 26033).
