# Contributing to MizPahPulse

Thanks for your interest in contributing! MizPahPulse is a real-time blockchain intelligence platform for the Stellar ecosystem.

## Development Setup

### Prerequisites

- **Node.js** >= 20.0.0 (use `nvm use`)
- **npm** >= 10
- **Rust** >= 1.88.0 (for smart contracts)
- **Docker** (for PostgreSQL + Redis)
- **Freighter Wallet** browser extension (for Stellar testing)

### Quick Start

```bash
# Clone and install
git clone https://github.com/MizPahPulse/MizPahPulse.git
cd MizPahPulse
npm install

# Copy environment variables
cp .env.example .env

# Start development services
npm run docker:up

# Generate Prisma client and migrate
npm run db:generate
npm run db:push

# Seed development data
npm run db:seed

# Start all apps in development mode
npm run dev
```

### Project Structure

```
apps/
  web/          # Next.js frontend + API routes
  ws/           # WebSocket server for real-time events
  ingester/     # Blockchain event ingestion worker
packages/
  types/        # Shared TypeScript types and Zod schemas
  stellar/      # Stellar SDK wrappers and utilities
  ui/           # Reusable React UI components
  database/     # Prisma schema and database client
contracts/
  pulse/        # Soroban smart contract (Rust)
```

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in dev mode |
| `npm run build` | Build all apps and packages |
| `npm run lint` | Lint all packages |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run all tests |
| `npm run format` | Format code with Prettier |
| `npm run db:seed` | Seed database with test data |
| `npm run db:studio` | Open Prisma Studio |

### Testing Contracts

```bash
cd contracts
cargo test          # Run all tests
cargo build --target wasm32-unknown-unknown --release  # Build WASM
```

### Commit Convention

- `feat(scope):` New features
- `fix(scope):` Bug fixes
- `chore:` Maintenance
- `docs:` Documentation
- `refactor:` Code restructuring

Scopes: `web`, `api`, `ws`, `ingester`, `ui`, `stellar`, `types`, `db`, `contract`

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Ensure tests pass: `npm run test`
4. Ensure linting passes: `npm run lint`
5. Open a PR with a clear description

### Environment Variables

See `.env.example` for all required environment variables. Never commit `.env` files.
