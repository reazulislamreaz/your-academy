# Confiro

Subscription-ready MCQ EdTech platform — browse questions by category, learn with explanations during a seven-day trial, save resources, and track study activity.

## Status

**Phase 1 in progress / scaffolding complete:** pnpm + Turborepo monorepo, app stubs, Docker Compose, CI.

See [`docs/16-development-roadmap.md`](docs/16-development-roadmap.md).

## Documentation

| Audience | Start here |
|----------|------------|
| AI agents | [`AGENTS.md`](AGENTS.md) |
| Humans (overview) | [`docs/00-project-overview.md`](docs/00-project-overview.md) |
| Architecture | [`docs/04-system-architecture.md`](docs/04-system-architecture.md) |
| Decisions | [`docs/19-decisions-and-assumptions.md`](docs/19-decisions-and-assumptions.md) |

## Monorepo layout

```text
apps/web       Next.js (App Router)
apps/api       NestJS REST API
apps/worker    Background worker stub (BullMQ in Phase 9)
packages/shared  Shared enums/types (browser-safe)
docker/        Compose, Dockerfiles, Nginx
docs/          Requirements & architecture
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose (for infra)

## Quick start (local)

```bash
cp .env.example .env
pnpm install
pnpm --filter @confiro/shared build
pnpm build
```

### Dev apps (without Docker for Node)

```bash
# Terminal A — API (http://localhost:3001/health)
pnpm dev:api

# Terminal B — Web (http://localhost:3000)
pnpm dev:web

# Terminal C — Worker stub
pnpm dev:worker
```

### Docker (Postgres, Redis, API, Worker, Web, Nginx)

```bash
cp .env.example .env
pnpm docker:dev
```

- Web: http://localhost:3000 (direct) or http://localhost:8080 via Nginx
- API health: http://localhost:3001/health or http://localhost:8080/health
- Postgres: localhost:5432
- Redis: localhost:6379

Stop:

```bash
pnpm docker:down
```

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm build` | Build all packages/apps |
| `pnpm lint` | Lint all |
| `pnpm typecheck` | Typecheck all |
| `pnpm docker:dev` | Compose up (dev ports) |

## Stack

Next.js · NestJS · Prisma (Phase 2) · PostgreSQL · Redis · BullMQ · Cloudinary · Docker

## License

Proprietary — all rights reserved unless otherwise stated.
