# MizPahPulse developer commands (issue #96)
#
# Every target delegates to the existing npm/turbo scripts, so `make <target>`
# and `npm run <script>` are always equivalent. See CONTRIBUTING.md for usage.

.PHONY: help setup dev dev:ws dev:ingester test lint typecheck build docker-up docker-down db-reset db-seed db-studio format format-check clean

help: ## List available targets
	@grep -E '^[a-zA-Z_:-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Fresh-clone setup: install, services, schema, seed
	npm install
	npm run docker:up
	npm run db:generate
	npm run db:push
	npm run db:seed

dev: ## Start web, ws, and ingester in dev mode
	npm run dev

dev:ws: ## WebSocket server only (tsx watch)
	npm run dev -w apps/ws

dev:ingester: ## Ingester only (tsx watch)
	npm run dev -w apps/ingester

test: ## Run all tests
	npm run test

lint: ## Lint all packages
	npm run lint

typecheck: ## TypeScript typecheck
	npm run typecheck

build: ## Build all apps and packages
	npm run build

format: ## Format code with Prettier
	npm run format

format-check: ## Verify formatting without writing
	npm run format:check

docker-up: ## Start Postgres + Redis
	npm run docker:up

docker-down: ## Stop Postgres + Redis
	npm run docker:down

db-reset: ## Push the schema and re-seed (dev reset)
	npm run db:push
	npm run db:seed

db-seed: ## Seed development data
	npm run db:seed

db-studio: ## Open Prisma Studio
	npm run db:studio

clean: ## Remove build artifacts and node_modules
	npm run clean