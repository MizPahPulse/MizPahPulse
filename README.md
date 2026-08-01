# MizpahPulse — Stellar Blockchain Intelligence Platform

> The heartbeat of on-chain activity on Stellar. Real-time blockchain monitoring, analytics, and intelligence for the Stellar ecosystem.

[![CI/CD](https://github.com/your-org/mizpah-pulse/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/mizpah-pulse/actions/workflows/ci.yml)

## Architecture

```
apps/
├── web/          # Next.js 15 dashboard + REST API (port 3000)
├── ws/           # Socket.io real-time event server (port 3001)
└── ingester/     # Stellar event ingestion worker

packages/
├── database/     # Prisma ORM + PostgreSQL schema
├── stellar/      # Stellar SDK integration (Horizon + Soroban)
├── types/        # Shared TypeScript types + Zod schemas
└── ui/           # Shared React UI components
```

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS, Recharts
- **Backend:** Next.js API Routes, Socket.io, BullMQ
- **Database:** PostgreSQL 16 + Prisma ORM
- **Queue/Cache:** Redis (BullMQ + Pub/Sub)
- **Blockchain:** Stellar SDK v13, Horizon, Soroban RPC
- **Infrastructure:** Turborepo, Docker Compose, GitHub Actions

## Quick Start

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose
- npm >= 11

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/mizpah-pulse.git
cd mizpah-pulse

# Install dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
npm run docker:up

# Copy environment variables
cp .env.example .env

# Generate Prisma client and run migrations
npx prisma generate --schema=packages/database/prisma/schema.prisma
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma

# Start all services in dev mode
npm run dev
```

### Docker Compose (Full Stack)

```bash
docker compose up -d
```

## API Overview

### REST API (v1)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/events` | Query blockchain events |
| `GET /api/v1/events/live` | SSE stream of live events |
| `GET /api/v1/accounts/:id` | Get account details |
| `GET /api/v1/accounts/:id/activity` | Get account activity |
| `GET /api/v1/contracts/:id` | Get contract details |
| `GET /api/v1/contracts/:id/events` | Get contract events |
| `GET /api/v1/stats` | Network statistics |
| `POST /api/v1/webhooks` | Register webhook |
| `GET /api/v1/search` | Search blockchain data |

### WebSocket Events

Connect to `ws://localhost:3001`

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe:eventTypes` | Client → Server | Subscribe to event types |
| `subscribe:categories` | Client → Server | Subscribe to categories |
| `subscribe:accounts` | Client → Server | Subscribe to accounts |
| `event` | Server → Client | Real-time event data |
| `stats` | Bidirectional | Connection statistics |

## Event Types

MizpahPulse monitors 35+ event types across the Stellar network:

- **Payments:** XLM transfers, asset transfers, cross-border payments
- **DEX:** Trades, order creation/cancellation, liquidity movements
- **Smart Contracts:** Soroban deployments, invocations, events
- **NFTs:** Minting, transfers, burns
- **Tokens:** Transfers, trustline changes, asset issuance
- **Accounts:** Creation, merges, option changes

## License

MIT
