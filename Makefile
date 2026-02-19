SHELL := /bin/bash

.PHONY: up down logs ps dev dev-frontend lint format test build db\:migrate db\:seed

up:
	docker compose -f infra/docker-compose.yml --env-file .env up --build -d

down:
	docker compose -f infra/docker-compose.yml --env-file .env down -v

logs:
	docker compose -f infra/docker-compose.yml --env-file .env logs -f --tail=200

ps:
	docker compose -f infra/docker-compose.yml --env-file .env ps

# Backend dev (hot reload)
dev:
	cd apps/backend && npm run dev

# Frontend dev (Vite)
dev-frontend:
	cd apps/frontend && npm run dev

lint:
	cd apps/backend && npm run lint

format:
	cd apps/backend && npm run format

test:
	cd apps/backend && npm run test

build:
	cd apps/backend && npm run build
	cd apps/frontend && npm run build

db\:migrate:
	cd apps/backend && npm run db:migrate

db\:seed:
	cd apps/backend && npm run db:seed
