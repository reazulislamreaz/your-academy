# Your Academy

MCQ-based EdTech platform with a 7-day free trial, category browsing, bookmarks, news/PDFs, and an admin dashboard.

Built as a **production-style modular monolith** — clear frontend/backend split, shared types, Dockerized infra.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js (App Router), TypeScript, Tailwind |
| Backend | NestJS, REST `/api/v1`, TypeScript |
| Data | PostgreSQL, Prisma *(Phase 2)*, Redis, BullMQ |
| Auth | JWT in HTTP-only cookies + CSRF, Argon2id, RBAC |
| Storage | Cloudinary (abstracted) |
| Ops | Docker Compose, Nginx, GitHub Actions |

## Repository layout

```text
frontend/     Next.js UI
backend/      NestJS API
worker/       Background jobs (BullMQ)
shared/       Shared TypeScript types & enums
docker/       Compose + Nginx
docs/         Architecture & requirements (source of truth)
```

## Features (planned / in progress)

- Auth, 7-day trial, post-trial answer gating (API-enforced)
- Categories & MCQ management (admin)
- Bookmarks, news, PDF resources
- Browsing-time analytics
- Admin KPIs dashboard

**Current milestone:** Phase 1 — monorepo + Docker scaffolding. See `docs/16-development-roadmap.md`.

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm build

# Local apps
pnpm dev:backend    # http://localhost:3001/health
pnpm dev:frontend   # http://localhost:3000

# Full stack (Postgres, Redis, API, worker, web, Nginx)
pnpm docker:dev
```

| URL | What |
|-----|------|
| http://localhost:3000 | Frontend |
| http://localhost:3001/health | Backend health |
| http://localhost:8080 | Nginx gateway |

## Docs for reviewers

| Doc | Why read it |
|-----|-------------|
| [`AGENTS.md`](AGENTS.md) | Project rules & stack |
| [`docs/00-project-overview.md`](docs/00-project-overview.md) | Product summary |
| [`docs/04-system-architecture.md`](docs/04-system-architecture.md) | System design |
| [`docs/08-subscription-and-access-control.md`](docs/08-subscription-and-access-control.md) | Trial / access rules |

## License

Proprietary — all rights reserved unless otherwise stated.
