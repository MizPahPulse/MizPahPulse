# MizpahPulse — Stellar Blockchain Intelligence Platform

> The heartbeat of on-chain activity on Stellar. Real-time blockchain monitoring, analytics, and intelligence for the Stellar ecosystem.

[![CI/CD](https://github.com/MizPahPulse/MizPahPulse/actions/workflows/ci.yml/badge.svg)](https://github.com/MizPahPulse/MizPahPulse/actions/workflows/ci.yml)

## Project Description

MizpahPulse is a real-time blockchain intelligence platform built exclusively for the Stellar ecosystem. It continuously monitors on-chain activity — payments, Soroban smart contract events, DEX trades, NFT activity, token transfers, and account operations — and delivers them through live dashboards, searchable feeds, analytics, REST APIs, and WebSocket streams.

Built with Next.js 15 (App Router), TypeScript, PostgreSQL + Prisma, Socket.io, and the Stellar SDK. Supports Freighter wallet integration on Stellar Testnet for balance viewing and XLM transactions.

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
- **Blockchain:** Stellar SDK v13, Horizon, Soroban RPC, `@stellar/freighter-api` v3
- **Infrastructure:** Turborepo, Docker Compose, GitHub Actions

## Quick Start

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose (for PostgreSQL + Redis)
- npm >= 11
- [Freighter browser extension](https://freighter.app) (for wallet features)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/MizPahPulse/MizPahPulse.git
cd MizPahPulse

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

The app will be available at:
- **Dashboard:** http://localhost:3000
- **WebSocket:** ws://localhost:3001
- **API:** http://localhost:3000/api/v1

### Docker Compose (Full Stack)

```bash
docker compose up -d
```

## Smart Contract

MizpahPulse includes a Soroban smart contract (Rust) with inter-contract communication:

| Feature | Implementation |
|---|---|
| **Pulse Counter** | `pulse(caller)` — increments counter + emits event |
| **Cross-Contract Call** | `broadcast_pulse(target, caller)` — calls another contract's `on_pulse_received` |
| **Receive Pulse** | `on_pulse_received(count, caller)` — receiver endpoint for cross-contract calls |
| **Read State** | `get_pulse_count()` / `get_pulse_data()` / `get_last_received()` |

### Contract Files

| File | Purpose |
|---|---|
| `contracts/pulse/src/lib.rs` | PulseContract with inter-contract communication |
| `contracts/pulse/src/test.rs` | 6 unit tests (3 passing on counter + events, 3 on cross-contract) |
| `scripts/deploy-contract.ts` | WASM upload + instantiation to Testnet |

### Contract Deployment Address

**Deployed Contract ID:** `CC4HXCVIOPUOS2UJFLTM6WP2ESNSWM4BGJ26XR4SRRVB74TOZMC7EE2C`

Deploy a new instance:
```bash
cd contracts && cargo build --target wasm32-unknown-unknown --release
DEPLOYER_SECRET=S... npx tsx scripts/deploy-contract.ts
```

### Contract Interaction Transaction Hash

**Create Contract Tx:** [`ee73ae2e3126d52878ff010346f8d4645383e606217a7bf3a1c16d2df40ecf06`](https://stellar.expert/explorer/testnet/tx/ee73ae2e3126d52878ff010346f8d4645383e606217a7bf3a1c16d2df40ecf06)

[View on Stellar Expert →](https://stellar.expert/explorer/testnet/tx/ee73ae2e3126d52878ff010346f8d4645383e606217a7bf3a1c16d2df40ecf06)

## Environment Variables

Copy `.env.example` to `.env` and configure the following:

| Variable | Required | Description | Default |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://mizpah:mizpah_dev@localhost:5432/mizpah_pulse` |
| `REDIS_URL` | Yes | Redis connection URL | `redis://localhost:6379` |
| `STELLAR_NETWORK` | Yes | Stellar network (TESTNET, PUBLIC, FUTURENET, SANDBOX) | `TESTNET` |
| `STELLAR_HORIZON_URL` | No | Custom Horizon API URL | Auto-derived from network |
| `STELLAR_SOROBAN_RPC_URL` | No | Custom Soroban RPC URL | Auto-derived from network |
| `NEXT_PUBLIC_PULSE_CONTRACT_ID` | Yes | Deployed PulseContract ID | After deployment |
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket server URL | `http://localhost:3001` |
| `CORS_ORIGIN` | Yes | CORS origin for WS server | `http://localhost:3000` |
| `WS_PORT` | No | WebSocket server port | `3001` |
| `DEPLOYER_SECRET` | Yes* | Funded Testnet secret key for contract deployment | — |
| `WEBHOOK_SECRET` | Yes | Secret for signing webhook payloads | — |
| `JWT_SECRET` | Yes | Secret for JWT signing | — |
| `API_KEY_SECRET` | Yes | Secret for API key generation | — |
| `NODE_ENV` | No | Node environment | `development` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No | Public Stellar network for frontend | `TESTNET` |

\* `DEPLOYER_SECRET` only required for contract deployment.

## Live Demo

**Live Demo:** [https://mizpah-pulse.vercel.app](https://mizpah-pulse.vercel.app)

Deploy to Vercel with:
```bash
npx vercel --prod
```

The `vercel.json` config is pre-configured for the Turborepo monorepo.

## Demo Video

> **Demo Video:** `PASTE_YOUR_VIDEO_LINK_HERE`
>
> 2-minute walkthrough covering:
> 1. Wallet connect via Freighter
> 2. XLM balance display
> 3. Send XLM transaction
> 4. Contract invocation (pulse)
> 5. Inter-contract communication (broadcast)

## Contract Interaction Examples

### Read pulse count (simulate only, no transaction)

```tsx
import { useContractInvoke } from '@/hooks/useContractInvoke';

const { readOnly } = useContractInvoke(contractId);
const count = await readOnly('get_pulse_count');
// Returns: number (e.g. 5)
```

### Call pulse() from the frontend

```tsx
const { invoke } = useContractInvoke(contractId);
const result = await invoke('pulse', ['alice']);
// result: { hash: '...', explorerUrl: 'https://...', returnValue: 6 }
```

### Inter-contract broadcast_pulse()

```tsx
const { invoke } = useContractInvoke(contractId);
const result = await invoke('broadcast_pulse', [targetContractId, 'alice']);
// Calls pulse() locally, then invokes on_pulse_received() on the target
```

### Get full pulse data

```tsx
const data = await readOnly('get_pulse_data');
// Returns: { count: 5, last_caller: 'alice' }
```

## Test Output

Run the test suites:

```bash
# Rust contract tests (3+ passing)
cd contracts && cargo test

# Frontend tests (9 passing)
cd apps/web && npx vitest run
```

> **Test Results:**
> ```
> ✓ PulseContract tests: 6 passed
> ✓ useFreighter tests: 6 passed
> ✓ useSendTransaction tests: 3 passed
> ✓ useContractInvoke tests: 3 passed
> ```

## Wallet Features

MizpahPulse includes full Freighter wallet integration on Stellar Testnet:

| Feature | Implementation |
|---|---|
| **Wallet Connect** | `useFreighter` hook using `@stellar/freighter-api` v3 |
| **Wallet Disconnect** | Clear wallet state, return to disconnected view |
| **XLM Balance** | `BalanceDisplay` component fetch from Horizon with 30s auto-refresh |
| **Send XLM** | `useSendTransaction` hook: build → Freighter sign → submit to Testnet |
| **Transaction Feedback** | Success: tx hash + Stellar Expert explorer link. Error: message + retry |

### Freighter Setup

1. Install the [Freighter browser extension](https://freighter.app)
2. Switch Freighter to **Testnet** network
3. Fund your wallet with testnet XLM via [Stellar Friendbot](https://laboratory.stellar.org/#account-creator?network=test)
4. Navigate to **/dashboard/wallets** and click "Connect Freighter"

## Screenshots

### 1. Landing Page
![Landing Page](./screenshots/01-landing.png)

### 2. Dashboard
![Dashboard](./screenshots/02-dashboard.png)

### 3. Wallet Options / Freighter Not Installed
![Wallet Options](./screenshots/03-wallet-options.png)

### 4. Smart Contracts Page
![Contracts](./screenshots/04-contracts.png)

### 5. Live Activity Feed
![Live Feed](./screenshots/05-live-feed.png)

### 6. Analytics Dashboard
![Analytics](./screenshots/06-analytics.png)

### 7. Mobile Responsive — Dashboard
![Mobile Dashboard](./screenshots/07-mobile-dashboard.png)

### 8. Mobile Responsive — Wallets
![Mobile Wallets](./screenshots/08-mobile-wallets.png)

### CI/CD Pipeline
![CI/CD](https://github.com/MizPahPulse/MizPahPulse/actions/workflows/ci.yml/badge.svg)

### Test Output
```
✓ PulseContract tests: 6 passed
✓ useFreighter tests: 6 passed
✓ useSendTransaction tests: 3 passed
✓ useContractInvoke tests: 3 passed
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

## Credits

Built with the following open-source technologies:

- [Next.js](https://nextjs.org/) — React framework
- [Stellar SDK](https://developers.stellar.org/) — Horizon & Soroban RPC integration
- [Freighter](https://freighter.app/) — Stellar browser wallet
- [Prisma](https://www.prisma.io/) — TypeScript ORM
- [Socket.io](https://socket.io/) — Real-time WebSocket communication
- [BullMQ](https://bullmq.io/) — Redis-backed job queue
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Lucide](https://lucide.dev/) — Beautiful icons
- [Turborepo](https://turbo.build/) — Monorepo build system
- [Docker](https://www.docker.com/) — Containerization
- [GitHub Actions](https://github.com/features/actions) — CI/CD automation

## License

MIT
