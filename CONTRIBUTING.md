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

### Architecture Decisions

Significant architecture decisions are recorded in
[`docs/adr/`](docs/adr/). New decisions follow
[`docs/adr/template.md`](docs/adr/template.md).

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

### Issue Tracker Workflow

Issues are the single source of truth for planned work. Before opening a PR,
find (or file) an issue and get it assigned.

#### Finding an issue

- The [`good first issue`](https://github.com/MizPahPulse/MizPahPulse/labels/good%20first%20issue)
  label marks small, well-scoped tasks with guidance in the body.
- The [`help wanted`](https://github.com/MizPahPulse/MizPahPulse/labels/help%20wanted)
  label marks issues that are ready for an external contributor.
- Area labels tell you which part of the codebase an issue touches:

  | Label | Covers |
  |-------|--------|
  | [`backend`](https://github.com/MizPahPulse/MizPahPulse/labels/backend) | API routes, WebSocket server, ingester worker |
  | [`frontend`](https://github.com/MizPahPulse/MizPahPulse/labels/frontend) | Next.js dashboard, UI components, hooks, styling |
  | [`database`](https://github.com/MizPahPulse/MizPahPulse/labels/database) | Prisma schema, migrations, queries, seeds |
  | [`smart contract`](https://github.com/MizPahPulse/MizPahPulse/labels/smart%20contract) | Soroban Rust contract |
  | [`infra`](https://github.com/MizPahPulse/MizPahPulse/labels/infra) | CI/CD, Docker, deployment, observability |
  | [`tests`](https://github.com/MizPahPulse/MizPahPulse/labels/tests) | Unit, integration, e2e, contract tests |
  | [`dx`](https://github.com/MizPahPulse/MizPahPulse/labels/dx) | Developer experience and tooling |
  | [`performance`](https://github.com/MizPahPulse/MizPahPulse/labels/performance) | Performance and optimization |
  | [`documentation`](https://github.com/MizPahPulse/MizPahPulse/labels/documentation) | Docs, README, guides |
  | [`accessibility`](https://github.com/MizPahPulse/MizPahPulse/labels/accessibility) | A11y improvements |

#### Claiming an issue

1. Comment on the issue with a short plan so maintainers know it is being
   worked on (or use GitHub's issue assignment if you are a maintainer).
2. Link the issue in your PR description with `Closes #<number>` so it closes
   automatically when the PR merges.
3. If you cannot finish, say so on the issue so someone else can pick it up —
   unassign yourself rather than leaving it stale.

#### Filing a new issue

Use the issue templates: pick `Bug report` for something broken, `Feature
request` for new functionality, and `Documentation` for docs gaps. Search for
an existing issue first — duplicates are closed.

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Ensure tests pass: `npm run test`
4. Ensure linting passes: `npm run lint`
5. Open a PR with a clear description

PRs use the [pull request template](.github/PULL_REQUEST_TEMPLATE.md) — fill
in the summary, reference the issues you close (`Closes #<number>`, one per
line), list your changes, and tick the verification checklist. A PR that does
not close an issue should say why the work is needed anyway.

### Makefile

A [`Makefile`](Makefile) centralizes the most common developer commands. On
any machine with `make`, you can run:

```bash
make setup        # install deps, start Docker services, push schema, seed
make dev          # start all apps in dev mode
make dev:ws       # WebSocket server only
make dev:ingester # ingester only
make test         # run all tests
make lint         # lint all packages
make typecheck    # typecheck all packages
make build        # build everything
make docker-up    # start Postgres + Redis
make db-reset     # reset the database and re-seed
```

The targets delegate to the existing `npm`/`turbo` scripts, so the two are
always equivalent.

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
