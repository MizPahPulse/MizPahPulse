.PHONY: setup dev dev\:ws dev\:ingester test lint typecheck build docker-up db-reset

setup:
	npm install
	cp -n .env.example .env || true
	npm run docker:up
	npm run db:generate
	npm run db:push
	npm run db:seed

dev:
	npm run dev

dev\:ws:
	npm run dev --workspace=@mizpah-pulse/ws

dev\:ingester:
	npm run dev --workspace=@mizpah-pulse/ingester

test:
	npm run test

lint:
	npm run lint

typecheck:
	npm run typecheck

build:
	npm run build

docker-up:
	npm run docker:up

db-reset:
	npm run db:push
	npm run db:seed
