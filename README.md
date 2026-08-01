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

### 1. Wallet Connected State
<!-- Add screenshot showing the wallets page with Freighter connected -->
<!-- The UI shows: connection status ("Connected" with green dot), public key, -->
<!-- "Testnet" network badge, Freighter "Installed" badge, and Send XLM / Disconnect buttons -->
![Wallet Connected](./screenshots/wallet-connected.png)

### 2. Balance Displayed
<!-- Add screenshot showing the XLM balance card on the wallets page -->
<!-- The UI shows: XLM Balance card with coin icon, formatted balance amount, -->
<!-- "XLM" label, and a refresh button. Balance is fetched from Horizon Testnet -->
![Balance Displayed](./screenshots/balance-displayed.png)

### 3. Successful Testnet Transaction
<!-- Add screenshot showing the Transaction Sent success state in the modal -->
<!-- The UI shows: green checkmark, "Transaction Sent!" heading, amount sent, -->
<!-- transaction hash (full hex string), ledger number, -->
<!-- and "View on Explorer" button linking to stellar.expert -->
![Successful Transaction](./screenshots/successful-transaction.png)

### 4. Transaction Result Shown to User
<!-- Add screenshot showing the transaction details panel after a successful send -->
<!-- Alternative: show the Stellar Expert explorer page for the transaction -->
<!-- The UI shows: full transaction hash, ledger #, explorer link -->
![Transaction Result](./screenshots/transaction-result.png)

> **Note:** Replace the placeholder images above with actual screenshots taken after:
> 1. Connecting Freighter wallet (screenshot 1)
> 2. Viewing the balance card (screenshot 2)
> 3. Completing a successful XLM send (screenshot 3)
> 4. Showing the transaction result with hash (screenshot 4)
>
> Place screenshots in `./screenshots/` directory at the project root.

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
