# SIH26033 — Beginner-Friendly Project Guide

> **Project Name:** SIH26033 Agricultural Marketplace  
> **Target:** Smart India Hackathon (Problem Statement 26033)  
> **Core Mission:** Connect Farmers and Farmer Producer Organisations (FPOs) directly with Buyers to eliminate middlemen markups, provide fair prices to farmers, and give buyers transparent, fresh produce.

---

## Table of Contents
1. [What This Project Does & Who Uses It](#1-what-this-project-does--who-uses-it)
2. [System Architecture](#2-system-architecture)
3. [How the Main Features Work (Step by Step)](#3-how-the-main-features-work-step-by-step)
4. [Tour of Every Screen, Button & Field](#4-tour-of-every-screen-button--field)
5. [How Data Moves Through the System (Simple Examples)](#5-how-data-moves-through-the-system-simple-examples)
6. [Technologies Used & What Each One Does](#6-technologies-used--what-each-one-does)
7. [How to Run the Project Locally](#7-how-to-run-the-project-locally)
8. [Feature Status: What is Built vs In-Progress vs Simulated](#8-feature-status-what-is-built-vs-in-progress-vs-simulated)

---

## 1. What This Project Does & Who Uses It

### The Problem
In traditional agriculture, a tomato or bag of wheat passes through 4 to 6 intermediaries (local village agents, commission brokers, wholesale mandis, transport middlemen, and retail distributors) before reaching the consumer or commercial buyer. Each layer takes a cut, leading to:
- **Farmers getting low returns** (often below fair cost of production).
- **Buyers paying high prices**.
- **Zero price transparency** and high post-harvest wastage.

### The Solution
SIH26033 is an **online agricultural marketplace platform** with built-in **AI advisory tools**. It enables farmers and FPOs to list their harvest directly, enables buyers to purchase or post bulk sourcing requirements, and gives both sides AI-driven fair pricing and logistics tracking.

```
[Traditional Supply Chain]
Farmer ──> Village Trader ──> Mandi Broker ──> Wholesaler ──> Retailer ──> Buyer
(Farmer gets ~30% of consumer price)

[SIH26033 Direct Platform]
Farmer / FPO ───────────────────────────────> Verified Buyer
               ▲                    ▲
               │                    │
        AI Price Intelligence   Direct Logistics Tracking
(Farmer keeps up to 80-85% of net realization)
```

### Who Uses the Platform?

| User Role | Who They Are | What They Do On the Platform |
| :--- | :--- | :--- |
| **FARMER** | Individual crop growers | Lists produce, checks AI fair-price advice, manages orders, decides whether to sell now or store. |
| **FPO** | Farmer Producer Organisations | Aggregates harvests from hundreds of member farmers, lists bulk quantities, manages B2B deliveries. |
| **BUYER** | Retail consumers, restaurants, retailers, processors | Searches and filters fresh produce, adds items to cart, checks out, posts bulk sourcing demands. |
| **ADMIN** | Platform operations team | Verifies seller documents, approves or rejects flagged listings, resolves user reports, reviews audit logs. |

---

## 2. System Architecture

The project is organised as a clean **modular monorepo** with three primary applications communicating via standard HTTP REST APIs:

```
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND: Next.js 16 (apps/web)             │
│            React 19 • Tailwind CSS • TanStack Query         │
│               Port: 3000 (http://localhost:3000)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                      HTTP REST / JSON
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND API: NestJS (apps/api)              │
│          TypeScript • Prisma ORM • JWT Auth • Swagger       │
│               Port: 4000 (http://localhost:4000)            │
└───┬──────────────────────────┬──────────────────────────┬───┘
    │                          │                          │
    │ SQL Queries              │ Cache / Sessions         │ Internal HTTP
    ▼                          ▼                          ▼
┌──────────────────────┐ ┌───────────────┐ ┌──────────────────────┐
│ PostgreSQL Database  │ │  Redis Cache  │ │ AI Service (FastAPI) │
│ (Port: 5432 / 5433)  │ │  (Port: 6380) │ │ (Port: 8080)         │
│ Prisma Schema        │ │  Rate Limiting│ │ Scikit-learn Models  │
│ 11 Migrations        │ │  & Caching    │ │ Price/Demand/Crop    │
└──────────────────────┘ └───────────────┘ └──────────────────────┘
```

### How the Components Connect:
1. **Frontend (`apps/web`)**: A modern web client that users open in their browser. It fetches data and submits forms to the Backend API via HTTP requests (`fetch`).
2. **Backend API (`apps/api`)**: The brain of the platform. It handles business rules, user authentication (passwords hashed with Argon2, JWT tokens), order processing, and administrative security.
3. **PostgreSQL Database**: Stores all persistent platform records: users, profiles, products, categories, addresses, carts, orders, shipments, and audit logs.
4. **Redis Cache**: Used for fast temporary data access, throttling sensitive operations, and session support.
5. **AI / ML Service (`services/ai`)**: A dedicated Python FastAPI service running trained machine learning models for fair modal price forecasting, wholesale arrival demand forecasting, and crop suitability recommendations.
6. **Decision Engine (`apps/api/src/ai/decision-engine`)**: Resides inside the backend to calculate transparent net realization waterfalls, compare mandi prices against platform prices, and evaluate whether a farmer should sell immediately or store their harvest.

---

## 3. How the Main Features Work (Step by Step)

### Flow 1: Registration & Authentication
1. A new user visits `/register`.
2. They select their role: **Farmer**, **FPO**, or **Buyer**.
3. They enter their name, email, mobile number, and a secure password (minimum 8 characters).
4. The backend verifies the email isn't already taken, hashes the password using **Argon2**, creates the `User` record along with a corresponding `SellerProfile` (if Farmer/FPO) or `BuyerProfile` (if Buyer).
5. The backend issues a signed **JSON Web Token (JWT)**, which the frontend stores to keep the user safely logged in.

### Flow 2: Marketplace Discovery & Sourcing
1. A buyer visits `/marketplace`.
2. The frontend queries `GET /api/v1/marketplace/products` with any active filters (e.g. category, search term, price range, city).
3. The backend checks the database for products with status `ACTIVE` and available inventory.
4. The buyer can click on any card to view detailed specifications, producer identity, stock availability, and APMC market price comparisons.

### Flow 3: Cart & Multi-Seller Checkout
1. When a buyer clicks **Add to Cart**, a `CartItem` record is created in the database tied to their `BuyerProfile`.
2. On `/cart`, the buyer can increase, decrease, or remove items.
3. On `/checkout`, the buyer selects an existing delivery address or creates a new one.
4. When the buyer clicks **Confirm & Place Order**:
   - The backend checks stock availability.
   - If the cart contains items from **multiple sellers**, the backend automatically **splits** the order into separate orders—one per seller.
   - Each order gets an immutable snapshot of the shipping address.
   - Cart items are safely removed.
   - The buyer is redirected to the order tracking page (`/orders/[id]`).

### Flow 4: Seller Order Fulfillment & Logistics
1. The seller visits `/seller/orders` and sees the incoming order in `PENDING` status.
2. The seller reviews the order and clicks **Confirm Order** (status becomes `CONFIRMED`).
3. When packed, the seller clicks **Start Processing** (status becomes `PROCESSING`), then **Mark Ready for Shipment**.
4. The seller clicks **Dispatch & Ship Order**:
   - The backend calls the logistics service adapter (`MockLogisticsProvider`).
   - A unique tracking number (`TRK-...`) and shipment record are generated.
   - The order status transitions to `SHIPPED`.
5. As the carrier moves, tracking events (`PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`) are recorded with timestamps and locations.
6. The buyer can track these milestones in real time on `/orders/[id]`.

### Flow 5: AI Price Intelligence & Decision Engine
1. A seller opens `/seller/intelligence`.
2. They choose a commodity (e.g. *Tomato*), quantity (e.g. *50 Quintals*), and their city (e.g. *Pune*).
3. The platform computes four intelligent advisories:
   - **Smart Allocation**: Recommends how much produce to send to the local Mandi vs sell to a matched Buyer vs list on the platform, factoring in commissions, transport, and wastage.
   - **Sell Timing**: Compares current market price with cold-storage fees and 7-day price forecasts to advise whether to *Sell Now* or *Store Produce*.
   - **Mandi Comparisons**: Shows live prices and arrival volumes across nearby APMC markets with weather alerts.
   - **Buyer Matching**: Matches open buyer purchase requirements within a distance radius.

### Flow 6: Admin Moderation & Audit Trails
1. An administrator visits `/admin`.
2. The dashboard aggregates live database counts (users, sellers, active listings, order volumes, revenue).
3. The admin can verify or reject pending sellers, suspend abusive accounts, reject substandard product listings, and review moderation reports.
4. Every administrative action creates an unalterable `AuditLog` entry recording the admin's user ID, IP address, action name, and before/after states.

---

## 4. Tour of Every Screen, Button & Field

### 1. Home Page (`/`)
- **Top Navigation Bar:**
  - `SIH26033` logo: Returns to homepage.
  - `Sign In` button: Opens `/login`.
  - `Register` button: Opens `/register`.
  - `Marketplace` button: Directly enters produce shopping at `/marketplace`.
- **Hero Banner:**
  - Title: *"Direct Farmer & FPO to Buyer Agricultural Marketplace"*.
  - `Explore Marketplace` button: Prominent call to action leading to marketplace.
  - `Browse All Categories` button: Jumps to category filtering.
- **Key Value Cards:** Three informational cards explaining *Verified Producers*, *Transparent Pricing*, and *Multi-Param Discovery*.

---

### 2. Sign In Page (`/login`)
- **Header:** Platform brand logo with a quick link to Browse Marketplace.
- **Active Session Alert:** If already logged in, shows your active email and role with a `Sign Out` button.
- **Input Fields:**
  - `Email Address`: Your registered email (e.g., `buyer@example.com`).
  - `Password`: Secure password input with a toggle eye icon to show/hide text.
- **Action Button:**
  - `Sign In`: Validates credentials, saves JWT token, and redirects to your role dashboard.
- **1-Click Quick Demo Sign-In Buttons:**
  - `Buyer` button: Instant test login as a registered Buyer (`buyer@example.com`).
  - `Farmer` button: Instant test login as a registered Farmer seller (`farmer@example.com`).
  - `FPO` button: Instant test login as a registered FPO manager (`fpo@example.com`).
- **Footer Link:** *"Don't have an account? Create an account"* leading to `/register`.

---

### 3. Register Page (`/register`)
- **Account Type Selector:** Three toggleable cards:
  - `Farmer` (Individual agricultural producer).
  - `FPO` (Farmer Producer Organisation).
  - `Buyer` (Commercial buyer or consumer).
- **Form Fields:**
  - `Full Name or Organisation Name`: Name of the individual or farm business.
  - `Email Address`: Primary login email.
  - `Mobile Number (Optional)`: 10-digit Indian phone number.
  - `Password`: Minimum 8 characters.
  - `Confirm Password`: Must match password.
- **Action Button:**
  - `Create Account`: Submits form, generates account, logs user in, and navigates to the appropriate section.

---

### 4. Marketplace Catalog (`/marketplace`)
- **Navigation Bar (`MarketplaceNavbar`):**
  - Search input: Type keywords (e.g. *Tomato*, *Wheat*, *Organic*).
  - Category quick-links: Filters items by category.
  - Cart icon with dynamic counter badge: Displays items in your cart and links to `/cart`.
  - User menu: Displays current user email, role, and logout option.
- **Sidebar Filters (`FilterSidebar`):**
  - `Category` dropdown: Selects specific crop classification.
  - `Location / State` input: Filters produce by harvesting region.
  - `Min Price` and `Max Price` number fields: Restricts price per unit.
  - `Sort By` selector: Options for *Newest First*, *Price: Low to High*, *Price: High to Low*.
  - `Reset Filters` button: Clears all active filters back to defaults.
- **Product Grid (`ProductCard`):**
  - Displays product primary image, category badge, product name, producer business name, location pin, price per unit (e.g. *₹2,400 / QUINTAL*), and stock status badge.
  - Clicking any product card opens its dedicated detail page.
- **Pagination Controls (`PaginationControls`):**
  - `Previous` and `Next` buttons with page numbers when listings exceed 12 items.

---

### 5. Product Detail Page (`/marketplace/products/[id]`)
- **Breadcrumb Navigation:** Shows `Marketplace / Category / Product Name` with a 1-click back button.
- **Image Gallery (`ProductGallery`):** Main large photo with thumbnail strip below for alternate views.
- **Product Overview:**
  - Title, category badge, and seller verification status badge (`Verified Producer`).
  - Unit Price and current stock availability indicator (`In Stock` with quantity).
  - Origin location (e.g. *Nashik, Maharashtra*).
  - Full agricultural description (grade, harvest date, packing details).
- **Add-to-Cart Panel (`AddToCartSection`):**
  - Quantity counter with `+` and `-` buttons.
  - Total calculated price preview based on selected quantity.
  - `Add to Cart` button: Stores item in user cart.
- **Market Price Intelligence Box:** Shows baseline APMC mandi price comparisons so the buyer knows the fair benchmark price.

---

### 6. Buyer Sourcing & Bulk Requirements (`/marketplace/sourcing`)
- **Purpose:** Used by institutional buyers, millers, and bulk traders looking to contract large volumes directly from farmers.
- **Post Requirement Form:**
  - `Commodity` selector (e.g. *Tomato, Onion, Wheat, Cotton*).
  - `Required Quantity` field (in Quintals).
  - `Target Price (₹/Quintal)` field: Maximum budget per unit.
  - `Delivery City` field: Destination hub (e.g. *Pune, Mumbai*).
  - `Max Distance Radius` slider (e.g. *within 150 km*).
  - `Notes` textarea: Packaging and grading specifications.
  - `Post Requirement` button: Saves the demand to the database.
- **Live Matched Sellers Table:** Automatically displays farmers in the area whose current listings or harvest capacities match the requested commodity, quantity, and price.

---

### 7. Shopping Cart (`/cart`)
- **Items List:** Each row displays produce picture, title, producer name, unit price, quantity stepper (`-`, number, `+`), row subtotal, and a `Remove (Trash)` icon.
- **Stock Warnings:** If a product in the cart has gone out of stock, a warning badge alerts the buyer.
- **Order Summary Sidebar:**
  - Produce subtotal.
  - Estimated direct transport note.
  - `Clear Cart` button: Empties the cart.
  - `Proceed to Checkout` button: Advances to address selection.

---

### 8. Checkout Page (`/checkout`)
- **Step 1: Delivery Address:**
  - Radio cards of previously saved shipping addresses.
  - `+ Add New Address` toggle button opening a form:
    - *Full Name*, *Phone Number*, *Address Line*, *City*, *State*, *Pincode*.
    - *Save Address* button.
- **Step 2: Order Review Grouped by Seller:**
  - Clearly displays how items will be split per farmer/FPO to prevent fulfillment confusion.
- **Step 3: Payment & Confirmation:**
  - Payment method summary (simulated escrow settlement).
  - `Confirm & Place Order` button: Submits order, creates tracking ID, and opens the order tracker.

---

### 9. Buyer Orders History (`/orders`)
- **Orders List:** Cards representing previous purchases, displaying:
  - Order Number (e.g. `ORD-1715000000000-ABCD`).
  - Order Date.
  - Total Amount (₹).
  - Seller Name.
  - Status Badge (`Pending`, `Confirmed`, `Shipped`, `Delivered`, or `Cancelled`).
  - `View Order Details` button: Navigates to `/orders/[id]`.

---

### 10. Order Tracking Detail (`/orders/[id]`)
- **Status Stepper:** Visual step-by-step progress bar:
  `Order Placed` ──> `Confirmed` ──> `Processing` ──> `Ready for Pickup` ──> `Shipped` ──> `Delivered`
- **Live Shipment Card (when Shipped):**
  - Carrier name (e.g. *Mock Logistics Express*).
  - Tracking Number with a 1-click **Copy to Clipboard** button.
  - Estimated delivery date and time.
  - `Sync Tracking Status` button: Queries carrier for real-time location updates.
- **Tracking Events Timeline:** Vertical event log showing checkpoints (e.g. *"Package received at Central Pune Hub"*, *"Dispatched on vehicle MH-12-AB-1234"*).
- **Buyer Actions:**
  - `Cancel Order` button: Allows cancellation only while the order is still in `PENDING` state.

---

### 11. Seller Orders Dashboard (`/seller/orders`)
- **Role Requirement:** Accessible by users with `FARMER` or `FPO` roles.
- **Filter Tabs:** Filter orders by status (`All`, `Pending`, `Confirmed`, `Processing`, `Ready for Shipment`, `Shipped`, `Delivered`).
- **Order Card Details:** Displays buyer name, shipping address, ordered crops, quantities, and payment status.
- **Sequential Action Buttons:**
  - `Confirm Order`: Moves from `PENDING` to `CONFIRMED`.
  - `Start Processing`: Moves to `PROCESSING` while farmer packages the produce.
  - `Mark Ready for Shipment`: Signals logistics carrier that package is ready.
  - `Dispatch & Ship Order`: Calls logistics adapter to generate a live waybill and tracking number.
  - `Sync Shipment Status`: Advances simulated carrier checkpoints.

---

### 12. Seller AI Intelligence Dashboard (`/seller/intelligence`)
- **Top Inputs Bar:**
  - `Commodity` dropdown (e.g. *Tomato, Onion, Potato, Wheat, Rice*).
  - `Quantity` number input (in Quintals).
  - `Your City` selector (e.g. *Pune, Nashik, Mumbai*).
  - `Minimum Acceptable Price` input.
- **Four Advisory Tabs:**
  1. **Smart Channel Allocation:**
     - Recommends an optimal split: e.g. *40% Local Mandi, 40% Matched Buyer, 20% Platform Listing*.
     - Detailed Net Realization Waterfall showing Mandi Gross Price minus Commission, Transport, Loading/Unloading, Weighing Fees, and Transit Spoilage.
  2. **Best Time to Sell:**
     - Shows current price vs 7-day predicted price.
     - Compares holding cold-storage costs vs anticipated price increase.
     - Displays recommendation banner: `SELL NOW` or `STORE & SELL LATER`.
  3. **Mandi Comparisons & Weather:**
     - Table comparing nearby APMC markets with daily modal prices and arrival quantities.
     - Real-time meteorological alerts (e.g. *Heatwave warning: Harvest early to avoid moisture loss*).
  4. **Matched Direct Buyers:**
     - Displays specific registered buyers seeking this commodity within delivery range, with distance in km and target purchase budget.

---

### 13. Admin Management Suite (`/admin`)
- **Admin Navigation Sidebar:**
  - `Dashboard`: High-level metrics.
  - `Users`: Manage accounts.
  - `Sellers`: Verify producer credentials.
  - `Products`: Moderate listings.
  - `Orders`: Platform order oversight.
  - `Payments`: Settlement audit.
  - `Shipments`: Logistics oversight.
  - `Reports`: User moderation reports.
  - `Audit Logs`: Immutable event history.
- **Operational Dashboard (`/admin/page.tsx`):**
  - KPI Stat Cards: Total Users, Total Active Products, Total Orders Placed, Total GMV (Gross Merchandise Value), Pending Seller Verifications, Open Abuse Reports.
- **Audit Logs Screen (`/admin/audit-logs`):**
  - Searchable table recording every administrative action with actor user ID, action name, target entity, timestamp, and IP address.

---

## 5. How Data Moves Through the System (Simple Examples)

### Example 1: A Farmer checks AI Advice and Lists 50 Quintals of Tomatoes
```
[Farmer] 
   │ Enters: Tomato, 50 Q, Pune, Min Price ₹1,800
   ▼
[Next.js Frontend: /seller/intelligence]
   │ GET /api/v1/ai/decision/smart-allocation
   ▼
[NestJS Backend API]
   │ 1. Queries local DB for matched buyers
   │ 2. Calls FastAPI AI Service: GET /api/v1/market/intelligence/Tomato
   ▼
[FastAPI AI Service]
   │ Reads APMC historical data & features
   │ Returns: Mandi Modal Price: ₹2,100, Predicted 7-day: ₹2,280
   ▼
[NestJS NetRealizationService]
   │ Deducts: 6% APMC commission, ₹80 transport, ₹20 weighing, 4% wastage
   │ Mandi Net: ₹1,870 | Direct Platform Net: ₹2,050 (+₹180/Q gain!)
   ▼
[Farmer Screen]
   │ Displays: "Direct platform sale yields 9.6% higher net income."
```

### Example 2: A Buyer Searches, Adds to Cart, and Places an Order
```
[Buyer]
   │ 1. Browses /marketplace -> adds 5 Quintals of Tomatoes (₹2,100/Q)
   │ 2. Adds 10 Quintals of Wheat from a different Farmer
   ▼
[PostgreSQL DB: CartItem Table]
   │ Stores 2 rows linked to BuyerProfile ID
   ▼
[Buyer on /checkout]
   │ Selects delivery address in Pune -> Clicks "Confirm & Place Order"
   ▼
[NestJS OrdersService]
   │ 1. Validates stock in Inventory table
   │ 2. Splits items into 2 Orders (Order #1 for Tomato Farmer, Order #2 for Wheat Farmer)
   │ 3. Stores ShippingAddressSnapshot (JSON)
   │ 4. Decrements available stock & reserves inventory
   │ 5. Clears Buyer's cart
   ▼
[Redirects to /orders/ORD-...-01]
   │ Displays live order status: PENDING
```

### Example 3: Seller Dispatches Order & Real-Time Tracking Updates
```
[Seller on /seller/orders]
   │ Clicks "Dispatch & Ship Order"
   ▼
[NestJS LogisticsService]
   │ Calls MockLogisticsProvider.createShipment()
   │ Returns: Tracking Number: TRK-9821-4321, Carrier: Mock Logistics Express
   ▼
[PostgreSQL DB]
   │ 1. Updates Order.status = SHIPPED
   │ 2. Creates Shipment record
   │ 3. Appends ShipmentTrackingEvent: "Package picked up from farm in Nashik"
   ▼
[Buyer opens /orders/ORD-...-01]
   │ Sees progress bar move to SHIPPED
   │ Clicks "Copy Tracking Number" or "Sync Tracking Status"
```

---

## 6. Technologies Used & What Each One Does

| Technology | Category | Role in This Project |
| :--- | :--- | :--- |
| **Next.js 16** | Frontend Framework | Server-rendered and client-rendered React application using Turbopack and modern App Router. |
| **React 19** | UI Library | Handles reusable components, state hooks, and fast user interfaces. |
| **Tailwind CSS 4** | Styling | Utility-first CSS providing the emerald-themed, responsive design and clean dark/light mode styles. |
| **TanStack Query (React Query)** | Data Fetching | Handles asynchronous state, caching, refetching, and query invalidation on the frontend. |
| **Lucide React** | Icons | Crisp, modern icons across all navigation, buttons, and status indicators. |
| **NestJS 12** | Backend Framework | Enterprise-grade TypeScript server framework with dependency injection, modular controllers, and services. |
| **Prisma ORM 6** | Database Layer | Type-safe database queries, schema definitions, and migration generator for PostgreSQL. |
| **PostgreSQL 16** | Relational Database | Production database storing users, orders, shipments, products, and audit logs. |
| **Redis 7** | In-Memory Cache | Fast cache store for rate-limiting, temporary session storage, and performance optimization. |
| **Python 3.12 & FastAPI** | AI/ML Microservice | Lightweight, fast Python API serving machine learning predictions for prices, demand, and crops. |
| **Scikit-learn** | Machine Learning | Random Forest regressors and classifiers trained on authentic APMC datasets and agronomic benchmarks. |
| **Argon2** | Security | Cryptographic password hashing to protect user passwords against brute-force attacks. |
| **JSON Web Tokens (JWT)** | Security | Stateless authorization tokens passed in HTTP headers (`Bearer <token>`). |
| **Swagger / OpenAPI** | Documentation | Interactive API explorer running at `http://localhost:4000/api/docs`. |
| **Docker & Docker Compose** | Infrastructure | Runs local PostgreSQL and Redis containers with a single command. |

---

## 7. How to Run the Project Locally

### Prerequisites
1. **Node.js** ≥ 20.0.0 (`node -v`)
2. **npm** ≥ 10.0.0 (`npm -v`)
3. **Python** ≥ 3.10 (`python --version`) with `fastapi` and `uvicorn` installed
4. **PostgreSQL** running on port `5432` or `5433`
5. **Redis** running on port `6380` (or started via Docker)

---

### Step-by-Step Launch Instructions

#### Step 1: Start Databases (PostgreSQL + Redis)
If using Docker:
```bash
npm run docker:up
```
*(This starts container `sih26033-postgres` on port `5433` and `sih26033-redis` on port `6380`)*.

#### Step 2: Generate Prisma Database Client
From the repository root:
```bash
npm run db:generate
```

#### Step 3: Start the Backend API (NestJS)
From the repository root:
```bash
npm run dev:api
```
The API starts on: **`http://localhost:4000/api/v1`**  
Interactive Swagger documentation: **`http://localhost:4000/api/docs`**

#### Step 4: Start the Frontend Application (Next.js)
In a new terminal window:
```bash
npm run dev:web
```
The web app opens on: **`http://localhost:3000`**

#### Step 5: (Optional) Start the AI Microservice (FastAPI)
In a new terminal window:
```bash
cd services/ai
python -m uvicorn app.main:app --port 8080
```
The AI service runs on: **`http://localhost:8080`**  
AI Swagger documentation: **`http://localhost:8080/docs`**

#### Step 6: Verify Everything with the Built-in Smoke Test
Run the automated non-destructive health probe:
```bash
npm run smoke-test
```
You should see:
```text
• Checking Backend Process Liveness        : ✓ [200]
• Checking Backend Database Readiness      : ✓ [200]
• Checking Backend Overall Health          : ✓ [200]
• Checking AI Service Liveness             : ✓ [200]
• Checking AI Service Model Readiness      : ✓ [200]
• Checking Frontend Root Status            : ✓ [200]

🎉 ALL OPERATIONAL PROBES PASSED. Platform is healthy and ready for traffic.
```

---

## 8. Feature Status: What is Built vs In-Progress vs Simulated

To ensure total transparency, the table below breaks down the exact state of every capability in the repository:

| Feature / Domain | Implementation Status | Technical Details |
| :--- | :--- | :--- |
| **User Authentication & Roles** | **COMPLETE** | Argon2 password hashing, JWT authorization, Role Guard (`FARMER`, `FPO`, `BUYER`, `ADMIN`). |
| **Demo 1-Click Sign-In** | **COMPLETE** | Quick-login buttons on `/login` to explore as Buyer, Farmer, or FPO without registration. |
| **Marketplace Catalog & Search** | **COMPLETE** | Live filtering by category, search text, location, price min/max, and sorting. |
| **Product Detail Views** | **COMPLETE** | Full produce descriptions, image galleries, stock levels, producer location badges. |
| **Direct Sourcing Cart** | **COMPLETE** | Add to cart, quantity increments, stock validation, clear cart, persistent database storage. |
| **Multi-Seller Checkout** | **COMPLETE** | Shipping address creation, multi-seller automatic order splitting, stock reservation. |
| **Buyer Order Tracking** | **COMPLETE** | Order history, status stepper, cancel order button (for pending orders). |
| **Seller Order Fulfillment** | **COMPLETE** | Order state pipeline: `PENDING` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `READY_FOR_SHIPMENT` ➔ `SHIPPED`. |
| **Logistics & Waybill Tracking** | **SIMULATED ADAPTER** | Built using `MockLogisticsProvider`. Generates authentic tracking numbers (`TRK-...`) and milestone events (`PICKED_UP`, `IN_TRANSIT`, `DELIVERED`). External courier APIs (e.g. Shiprocket/Delhivery) are planned plug-in adapters. |
| **Payment Transactions** | **SIMULATED FLOW** | Modeled in database schema (`Payment` table). Checkout creates pending orders with simulated escrow confirmation. Live gateway webhooks (e.g. Razorpay/Stripe) are designed but not connected to a live bank account. |
| **AI Price Intelligence** | **COMPLETE** | Trained Random Forest models forecasting APMC modal prices with feature explainability weights. |
| **Decision Engine Waterfall** | **COMPLETE** | Code calculates transparent net realization (Mandi vs Platform net income after logistics and fees). |
| **Best Time to Sell Advisory** | **COMPLETE** | Compares cold-storage costs per day against projected 7-day price trajectory to output `SELL NOW` vs `STORE`. |
| **Two-Way Buyer-Seller Matching** | **COMPLETE** | Haversine distance calculation matching nearby open buyer requirements with farmer listings. |
| **Admin Moderation & Audit Logs** | **COMPLETE** | Admin dashboard KPIs, seller verification, user suspension, product moderation, immutable audit logging. |
| **SMS / WhatsApp Alerts** | **PLANNED** | In-app `Notification` table is complete in DB; third-party SMS/WhatsApp gateway (e.g. Twilio/Gupshup) is planned for future milestones. |
| **Cloud Media Storage** | **CONFIGURED** | Built with Cloudinary adapter (`MediaModule`); falls back to local placeholder images if API credentials are not supplied. |

---

*Document created for SIH 2026 Problem Statement 26033.*
