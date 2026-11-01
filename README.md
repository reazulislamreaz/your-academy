# Confiro

Subscription-ready MCQ EdTech platform — browse questions by category, learn with explanations during a seven-day trial, save resources, and track study activity.

## Status

**Phase 0 complete:** Requirements analysis and documentation foundation.  
Application code is not implemented yet. See [`docs/16-development-roadmap.md`](docs/16-development-roadmap.md).

## Documentation

| Audience | Start here |
|----------|------------|
| AI agents | [`AGENTS.md`](AGENTS.md) |
| Humans (overview) | [`docs/00-project-overview.md`](docs/00-project-overview.md) |
| Business rules | [`docs/01-business-requirements.md`](docs/01-business-requirements.md) |
| Architecture | [`docs/04-system-architecture.md`](docs/04-system-architecture.md) |
| API | [`docs/06-api-specification.md`](docs/06-api-specification.md) |
| Decisions | [`docs/19-decisions-and-assumptions.md`](docs/19-decisions-and-assumptions.md) |

Full index: see Documentation Map in [`AGENTS.md`](AGENTS.md).

## Planned Stack

- **Web:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- **API:** NestJS, Prisma, PostgreSQL, Redis, BullMQ
- **Storage:** Cloudinary (abstracted)
- **Deploy:** Docker Compose, Nginx, GitHub Actions, Ubuntu VPS

## Planned Monorepo Layout

```text
apps/web      # Next.js frontend
apps/api      # NestJS API
apps/worker   # BullMQ workers
packages/shared
docs/
docker/
```

## Quick Links for Implementers

1. Read `AGENTS.md`
2. Confirm open items in `docs/19-decisions-and-assumptions.md`
3. Follow Phase 1 in `docs/16-development-roadmap.md`
4. Environment catalog: `docs/17-environment-variables.md`

## License

Proprietary — all rights reserved unless otherwise stated.
