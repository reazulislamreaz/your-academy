# Your Academy

MCQ-based EdTech platform with a 7-day free trial, category browsing, bookmarks, news, analytics, and an admin dashboard.

Modular monolith: **Next.js frontend** + **NestJS backend** + **BullMQ worker** + **PostgreSQL/Redis**.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js App Router, TypeScript, Tailwind, TanStack Query |
| Backend | NestJS, Prisma, PostgreSQL, JWT cookies + CSRF, Argon2id, RBAC |
| Jobs | Redis + BullMQ |
| Ops | Docker Compose, Nginx, GitHub Actions |

## Layout

```text
frontend/   Next.js UI
backend/    NestJS API + Prisma
worker/     BullMQ workers
shared/     Shared types/enums
docker/     Compose + Nginx
docs/       Architecture & requirements
```

## Features

- Auth (register/login/refresh/logout, CSRF cookies, password reset tokens)
- 7-day trial with **API-enforced** answer/explanation privacy after expiry
- Categories + MCQ create/publish (admin)
- Bookmarks, profile stats, browsing heartbeats
- News publish/browse
- Admin KPI dashboard
- Storage signed-upload stub (Cloudinary-ready)

## Quick start

```bash
cp .env.example .env   # database: your_academy / your_academy_dev_password
pnpm setup             # install, start Postgres+Redis, migrate, seed

# Run (loads root .env via dotenv-cli)
pnpm dev:backend    # :3001
pnpm dev:frontend   # :3000 (proxies /api/v1 → backend)
pnpm dev:worker     # BullMQ
```

Do not leave `POSTGRES_USER` empty — it overrides Compose defaults and breaks Postgres.

Seeded admin: WhatsApp from `BOOTSTRAP_ADMIN_WHATSAPP` / password `BOOTSTRAP_ADMIN_PASSWORD`.

| URL | What |
|-----|------|
| http://localhost:3000 | App UI |
| http://localhost:3001/health | API health |
| http://localhost:3001/ready | API + DB readiness |

## Docs

Start with [`AGENTS.md`](AGENTS.md) and [`docs/00-project-overview.md`](docs/00-project-overview.md).

## License

Proprietary — all rights reserved unless otherwise stated.
