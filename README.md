# SIH26033 — Agricultural B2B/B2C Marketplace

> Smart India Hackathon 2026 · Problem Statement 26033  
> *Multiple intermediaries reduce farmers' earnings and increase consumer prices.*

An AI-powered agricultural marketplace platform connecting **Farmers**, **FPOs**, **Buyers**, **Logistics Providers**, and **Warehouses** — reducing unnecessary intermediary layers and improving price transparency.

---

## 🏗️ Architecture

```
Frontend (Next.js)
    ↓
API Layer (NestJS REST)
    ↓
Business Services
    ↓
Database (PostgreSQL/Prisma) · Cache (Redis) · AI Service (FastAPI)
```

## 📁 Project Structure

```
SIH26033/
├── apps/
│   ├── web/              # Next.js frontend (React, TypeScript, TailwindCSS)
│   └── api/              # NestJS backend (TypeScript, Prisma, REST API)
├── packages/
│   └── shared/           # Shared types, constants, utilities
├── services/
│   └── ai/               # Python/FastAPI AI/ML service (Milestone 11+)
├── docker/
│   └── docker-compose.dev.yml  # PostgreSQL + Redis for local dev
├── .env.example          # Environment variable template
├── tsconfig.base.json    # Base TypeScript config
└── package.json          # Root workspace config
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Docker** & **Docker Compose**
- **Git**

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/shreyparmardev/SIH26033.git
cd SIH26033

# 2. Copy environment variables
cp .env.example .env

# 3. Start development databases
npm run docker:up

# 4. Install dependencies
npm install

# 5. Generate Prisma client
npm run db:generate

# 6. Run database migrations
npm run db:migrate

# 7. Start development servers
npm run dev:web   # Frontend at http://localhost:3000
npm run dev:api   # Backend at http://localhost:4000
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev:web` | Start Next.js frontend dev server |
| `npm run dev:api` | Start NestJS backend dev server |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run format` | Format code with Prettier |
| `npm run docker:up` | Start PostgreSQL + Redis containers |
| `npm run docker:down` | Stop dev containers |
| `npm run docker:reset` | Reset dev containers (wipes data) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js, React, TypeScript, TailwindCSS, shadcn/ui, Zustand, TanStack Query |
| **Backend** | NestJS, Node.js, TypeScript, REST API |
| **Database** | PostgreSQL, Prisma ORM, Redis |
| **AI/ML** | Python, FastAPI, Scikit-learn, PyTorch |
| **Security** | JWT, Argon2 |
| **Storage** | Cloudinary |
| **Infrastructure** | Docker, GitHub Actions, Vercel, Render, Neon, Upstash |
| **Monitoring** | Sentry |

## 📜 License

This project is developed for SIH 2026.
