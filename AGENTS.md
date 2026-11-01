# AGENTS.md — Confiro EdTech Platform

> Primary instruction file for AI coding agents and human developers.
> Read this first. Detailed specifications live in `docs/`.

## Project Summary

**Confiro** is a subscription-ready MCQ-based EdTech platform.

Users register, browse educational MCQs by category, view answers/explanations during a **seven-day full-access trial**, save questions and documents, browse educational news/PDFs, manage profiles, and track browsing activity.

Administrators manage users, questions, categories, news, PDFs, publishing workflows, analytics, and subscription-related settings.

**Current phase:** Documentation foundation complete. Feature implementation follows the roadmap in `docs/16-development-roadmap.md`.

---

## Mandatory Agent Behavior

Before implementing any feature:

1. Read this file and the relevant documents under `docs/`.
2. Follow approved architectural decisions; do not invent alternatives.
3. Never change the approved technology stack without explicit permission.
4. Never invent business requirements. If unclear, add an entry to `docs/19-decisions-and-assumptions.md` with status `NEEDS APPROVAL`.
5. Never bypass authentication or authorization.
6. Never expose secrets, API keys, or unrestricted upload credentials.
7. Never return restricted answer/explanation data to trial-expired free users — enforce this in the **backend**.
8. Never introduce unnecessary dependencies.
9. Write tests for important business logic (auth, access control, answer privacy).
10. Update documentation when architecture or requirements change.
11. Verify changes before marking tasks complete.
12. Report incomplete work honestly.

---

## Approved Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Lucide React |
| Backend | NestJS, Node.js, TypeScript, REST (`/api/v1`), Prisma, PostgreSQL, Redis, BullMQ, Swagger/OpenAPI |
| Auth | JWT access + refresh in HTTP-only cookies (web), CSRF double-submit + `X-CSRF-Token`, Argon2id, RBAC; Bearer also supported for non-browser clients |
| Storage | Cloudinary (via `StorageService` abstraction) |
| Jobs | Redis + BullMQ |
| Infra | Docker, Docker Compose, Nginx, GitHub Actions, Ubuntu VPS |

Do **not** introduce microservices, GraphQL, alternative ORMs, or payment providers without approval.

---

## Architecture Overview

**Style:** Modular monolith.

```
apps/
  web/          # Next.js frontend
  api/          # NestJS REST API
  worker/       # BullMQ workers (separate process/container)
packages/
  shared/       # API contracts, enums, Zod schemas, shared types (browser-safe only)
docs/           # Source of truth for requirements and architecture
docker/         # Docker Compose overlays and Nginx configs
```

**Backend flow:** `Controller → Service → Repository → Prisma → PostgreSQL`

**Frontend:** Feature-based folders; Server Components by default; Client Components only when interaction requires it; TanStack Query for server state.

See `docs/04-system-architecture.md`, `docs/11-frontend-architecture.md`, `docs/12-backend-architecture.md`.

---

## Confirmed Business Rules (Do Not Change)

| Rule | Detail |
|------|--------|
| Trial | Exactly **7 days** from successful registration; server-side timestamps; dynamic calculation; no job required to expire trials |
| Post-trial allowed | Login, homepage, browse/search/filter questions, view titles/content/options, save MCQs, profile, bookmarks, browsing activity, news |
| Post-trial denied | Correct answers, answer indicators, explanations — **excluded from API responses** |
| Question CRUD | **Admin only** |
| Payments | Not required for initial release; keep subscription modules modular for future paid plans |
| Identity | Unique WhatsApp number required at registration; email optional at register |
| Question access | Authenticated users only (DEC-003) |
| Post-trial PDFs | Published documents remain accessible when authenticated (DEC-001) |
| Password reset | Delivered by **email** (DEC-004); requires email on account |
| Web session | HTTP-only access/refresh cookies + CSRF header (DEC-012); never `localStorage` for tokens |

Full rules: `docs/01-business-requirements.md`, `docs/08-subscription-and-access-control.md`.

---

## NestJS Modules

`AuthModule`, `UsersModule`, `CategoriesModule`, `QuestionsModule`, `BookmarksModule`, `NewsModule`, `DocumentsModule`, `SubscriptionsModule`, `AnalyticsModule`, `AdminModule`, `CloudinaryModule` (implements `StorageService`), `BullMQModule`, `RedisModule`, `DatabaseModule`, `HealthModule`.

---

## Coding Rules (Summary)

### Backend

- Business logic in services; controllers thin.
- Validate all inputs with DTOs + Zod/class-validator as documented.
- Repository abstractions where they improve testability; avoid pointless layers.
- Use transactions for multi-record writes.
- Migrations only (`prisma migrate`); never `prisma db push` in production.
- Swagger for all public API endpoints.

### Frontend

- Feature-based organization under `apps/web`.
- API calls only through reusable service/client modules.
- Strict TypeScript; no `any` without justification.
- Avoid unnecessary global state.
- Never use frontend checks as the sole authorization gate for premium content.

### Database

- Normalized PostgreSQL schema via Prisma.
- Indexes for expected query patterns.
- Soft-delete where documented; otherwise hard-delete with clear cascade rules.
- Source of truth: Prisma migrations.

### Shared package

- Share contracts, enums, schemas, types only.
- Never share backend secrets, Prisma client, or Nest-only code with the browser.

Details: `docs/18-coding-standards.md` and `.cursor/rules/*`.

---

## Security Non-Negotiables

- Argon2id for passwords.
- Short-lived JWT access tokens + rotating refresh tokens stored hashed server-side.
- Web: HTTP-only Secure cookies for access/refresh; CSRF double-submit + `X-CSRF-Token` on mutations (DEC-012).
- Session revocation on logout/password change.
- RBAC on every protected route.
- IDOR checks: users may only access/modify their own resources unless admin.
- Rate limit auth and sensitive endpoints.
- Helmet, CORS with credentials + explicit origin allowlist.
- Cloudinary: signed uploads / server-side upload; no API secrets on frontend.
- Private/authenticated delivery or signed URLs for restricted files.
- Never log secrets or tokens.

See `docs/13-security-and-threat-model.md` and `.cursor/rules/security-standards.mdc`.

---

## Cloudinary Rules

- Use `StorageService` abstraction (`upload`, `delete`, `generateSignedUrl`, `getMetadata`).
- Store metadata in DB (publicId, resourceType, deliveryType, format, size, mimeType, etc.) — never store file bytes/base64 in PostgreSQL.
- Compensating cleanup jobs when DB and Cloudinary diverge.
- Validate MIME type, size, ownership before accept/delete.

See `docs/09-cloudinary-storage-architecture.md`.

---

## BullMQ Rules

- Queues by responsibility: `email`, `document-processing`, `image-processing`, `analytics`, `maintenance`.
- Not for ordinary synchronous CRUD.
- Jobs must be idempotent; tolerate retries/duplicates (at-least-once).
- Configure concurrency, retries, exponential backoff, timeouts, failed-job handling, graceful shutdown.
- Prefer separate `worker` container for processing.

See `docs/10-redis-and-bullmq-architecture.md`.

---

## Docker Rules

- Services: `web`, `api`, `worker`, `postgres`, `redis`, `nginx`.
- Multi-stage builds; non-root users; health checks.
- Separate dev and production Compose files.
- Do not expose Postgres/Redis publicly in production.
- Cloudinary is external — not containerized.
- No hardcoded secrets.

See `docs/15-docker-and-deployment.md`.

---

## Testing Requirements

- Backend: Jest + Supertest (unit, integration, API, authz, answer-privacy).
- Frontend: component, form, auth flow, admin permission tests.
- System: e2e, Docker smoke, load, security, backup/restore as phased in.
- Critical path: **trial/subscription gating of answers and explanations** must have automated tests.

See `docs/14-testing-strategy.md`.

---

## API Conventions

- Base path: `/api/v1`
- Consistent envelope for success/error responses.
- Cursor or offset pagination as specified per resource (cursor preferred for large question lists).
- Document every endpoint in Swagger and `docs/06-api-specification.md`.

---

## Naming Conventions

| Area | Convention |
|------|------------|
| Files/folders | `kebab-case` |
| TypeScript types/classes | `PascalCase` |
| Functions/variables | `camelCase` |
| DB tables (Prisma models) | `PascalCase` models → `snake_case` mapped tables |
| Env vars | `SCREAMING_SNAKE_CASE` |
| API routes | `kebab-case` plural nouns |
| Queues | `kebab-case` with `-queue` suffix in docs; BullMQ names as documented |

---

## Error Handling & Logging

- Domain/HTTP exceptions from services; map to consistent API error shape.
- Structured logging (request id, user id when available); never log passwords, tokens, or secrets.
- Distinguish 401 / 403 / 404 / 409 / 422 / 429 carefully.

---

## Environment & Secrets

- All config via environment variables (see `docs/17-environment-variables.md`).
- `.env` files are local-only; never commit secrets.
- Validate env at process startup.

---

## Documentation Map

| Doc | Topic |
|-----|-------|
| `docs/00-project-overview.md` | Product and goals |
| `docs/01-business-requirements.md` | Confirmed business rules |
| `docs/02-functional-requirements.md` | Module requirements |
| `docs/03-non-functional-requirements.md` | NFRs / SLOs |
| `docs/04-system-architecture.md` | System design |
| `docs/05-database-design.md` | Schema & ER |
| `docs/06-api-specification.md` | Endpoint inventory |
| `docs/07-authentication-and-authorization.md` | AuthN/AuthZ |
| `docs/08-subscription-and-access-control.md` | Trial & entitlements |
| `docs/09-cloudinary-storage-architecture.md` | File storage |
| `docs/10-redis-and-bullmq-architecture.md` | Jobs |
| `docs/11-frontend-architecture.md` | Web app |
| `docs/12-backend-architecture.md` | NestJS |
| `docs/13-security-and-threat-model.md` | Security |
| `docs/14-testing-strategy.md` | Tests |
| `docs/15-docker-and-deployment.md` | DevOps |
| `docs/16-development-roadmap.md` | Phased delivery |
| `docs/17-environment-variables.md` | Env catalog |
| `docs/18-coding-standards.md` | Style & patterns |
| `docs/19-decisions-and-assumptions.md` | Decision register |

---

## Next Implementation Phase

After documentation (Phase 0): **Phase 1 — Monorepo and infrastructure setup**  
See `docs/16-development-roadmap.md`.
