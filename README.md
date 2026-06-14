# sample-data-room-app

A simple data-room file-sharing app. One repo, two folders:

- `frontend/` — Vite + React + TypeScript
- `backend/` — Express + TypeScript + Prisma

See the [PRD](.scratch/data-room/PRD.md), the domain [glossary](CONTEXT.md), and the [ADRs](docs/adr/).

## Prerequisites

- Node 20+ and pnpm
- Docker (for Postgres + MinIO)

## Getting started

1. Start infra (Postgres + MinIO + bucket):

   ```sh
   docker compose up -d
   ```

2. Backend:

   ```sh
   cd backend
   cp .env.example .env
   pnpm install
   pnpm prisma:generate
   pnpm db:push
   pnpm dev            # http://localhost:3000
   ```

3. Frontend:

   ```sh
   cd frontend
   cp .env.example .env
   pnpm install
   pnpm dev            # http://localhost:5173
   ```

Open the frontend — it should show **"API: ok"**.

## Tests

- Backend (needs Postgres up via docker compose): `cd backend && pnpm test`
- Frontend: `cd frontend && pnpm test`

## Local services

| Service       | URL                       | Credentials             |
| ------------- | ------------------------- | ----------------------- |
| API           | http://localhost:3000     | —                       |
| MinIO console | http://localhost:9001     | minioadmin / minioadmin |
| Postgres      | localhost:5432            | dataroom / dataroom     |

Health endpoints: `GET /health` (liveness), `GET /health/ready` (database reachable).
