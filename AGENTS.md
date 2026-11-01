# AGENTS.md — Your Academy

> **Source of truth for AI coding agents.** Read this before any change.  
> Deep specs live in `docs/`. Cursor rules in `.cursor/rules/` mirror these constraints.

**Product:** Your Academy — subscription-ready MCQ EdTech platform.  
**Phase:** 2 complete (Prisma). Next: Phase 3 (Auth). See `docs/16-development-roadmap.md`.

---

## 1. Mandatory Agent Behavior

1. Read this file + relevant `docs/` before implementing.
2. Follow approved architecture; do not invent alternatives.
3. Never change the technology stack without explicit permission.
4. Never invent business requirements — add `NEEDS APPROVAL` in `docs/19-decisions-and-assumptions.md`.
5. Never bypass authentication or authorization.
6. Never expose secrets, API keys, or unrestricted upload credentials.
7. Never return restricted answers/explanations to non-entitled users — **backend only**.
8. Never introduce unnecessary dependencies.
9. Write tests for auth, access control, and answer privacy.
10. Update docs when architecture or requirements change.
11. Verify (`build` / `lint` / `typecheck` / targeted tests) before marking done.
12. Report incomplete work honestly.
13. Prefer small, focused diffs; match existing style.
14. Do not commit `.env`, secrets, dumps, or `node_modules`.

---

## 2. Repository Layout

```text
frontend/     Next.js (App Router) UI
backend/      NestJS REST API + Prisma
worker/       BullMQ workers (separate process)
shared/       Browser-safe types, enums, API contracts
docs/         Requirements & architecture
docker/       Compose, Dockerfiles, Nginx
.cursor/rules/  Always-on agent constraints
```

Package names: `@your-academy/frontend|backend|worker|shared`.

---

## 3. Approved Stack (Do Not Swap)

| Layer | Tech |
|-------|------|
| Frontend | Next.js App Router, React, TypeScript, Tailwind, shadcn/ui, TanStack Query, RHF, Zod, Lucide |
| Backend | NestJS, TypeScript, REST `/api/v1`, Prisma, PostgreSQL, Redis, BullMQ, Swagger |
| Auth | JWT access + refresh (HTTP-only cookies), CSRF double-submit + `X-CSRF-Token`, Argon2id, RBAC; Bearer for non-browser |
| Storage | Cloudinary via `StorageService` abstraction |
| Infra | Docker Compose, Nginx, GitHub Actions, Ubuntu VPS |
| Monorepo | pnpm workspaces + Turborepo |

Forbidden without approval: microservices, GraphQL, alternate ORMs, payment providers in v1.

---

## 4. Confirmed Business Rules

| ID | Rule |
|----|------|
| Trial | Exactly **7 days** from registration; server timestamps; **dynamic** expiry (`now < trialEndsAt`); no cron required to expire |
| Post-trial allowed | Login, homepage, browse/search/filter questions, titles/content/options, save MCQs, profile, bookmarks, activity, news, **published PDFs** (DEC-001) |
| Post-trial denied | Correct answers, indicators, explanations — **omit from API** |
| Questions CRUD | **Admin only** |
| Question browse | **Authenticated only** (DEC-003) |
| Payments | Not in v1; keep subscription tables modular |
| Register fields | name, WhatsApp (unique), password; avatar optional; email optional at register |
| Password reset | **Email** only (DEC-004); needs email on account; no enumeration |
| Web auth | HTTP-only cookies + CSRF (DEC-012); never `localStorage` for tokens |

---

## 5. Clean Code & Maintainability

### General

- TypeScript **strict**; no `any` without a one-line justification.
- Prefer readability over cleverness; extract when duplication is real — avoid premature abstraction.
- Comment **why**, not what; delete commented-out code.
- Keep modules cohesive; one responsibility per file/folder.
- Public exported functions: prefer explicit return types.
- Fail fast with clear errors; never swallow exceptions silently.

### Naming

| Area | Convention |
|------|------------|
| Files / folders | `kebab-case` |
| React components | `PascalCase` |
| Nest files | `users.module.ts`, `users.service.ts`, `create-user.dto.ts` |
| Types / classes | `PascalCase` |
| Functions / vars | `camelCase` |
| Prisma models | `PascalCase` → tables `snake_case` via `@@map` / `@map` |
| Env vars | `SCREAMING_SNAKE_CASE` |
| API routes | plural `kebab-case` under `/api/v1` |
| Error codes | `SCREAMING_SNAKE` strings (e.g. `QUESTION_NOT_FOUND`) |

### DRY & structure

- Shared contracts only in `shared/` (no Prisma, no secrets, no Node-only APIs).
- Use `createSuccessResponse` / `createErrorResponse` from `@your-academy/shared` for envelopes.
- Frontend API access only via typed clients under `frontend/src/lib/api/` (create when needed).
- Backend: `Controller → Service → Repository(optional) → Prisma`.
- Controllers stay thin; business rules in services.
- Feature folders for frontend domains; Nest module-per-domain for backend.

### Git / PRs

- Imperative commit messages focused on **why**.
- Do not amend/push unless the user asks (follow user git rules).

---

## 6. Backend Rules

- Nest modules: Auth, Users, Categories, Questions, Bookmarks, News, Documents, Subscriptions, Analytics, Admin, Cloudinary/Storage, BullMQ, Redis, Database, Health.
- Validate all inputs at the boundary (Zod preferred when shared with frontend; otherwise class-validator — pick one style per module and stay consistent).
- Global validation: whitelist + forbid non-whitelisted.
- Transactions for multi-row writes.
- Prisma migrations only; **never** `prisma db push` in production.
- Schema path: `backend/prisma/`. Commands: `pnpm db:deploy`, `pnpm db:seed`, `pnpm db:generate`.
- Enable `app.enableShutdownHooks()`; handle SIGTERM in worker.
- Swagger for every public endpoint when auth lands.
- Soft-delete only where schema documents it.
- Allowlist sort/filter query params — no raw client sort strings into Prisma `orderBy` without mapping.

### Access control

- Central `AccessControlService` (Phase 5) — do not duplicate trial/subscription math.
- Strip `isCorrect` / `explanation` / `correctOptionId` when not entitled; absence only (never fake `false`).
- RBAC guards on every protected route; IDOR checks on user-owned resources.
- Admins: content management via `/admin/*`; learner answer bypass per DEC-014 (proposed admin bypass).

---

## 7. Frontend Rules

- Server Components by default; `"use client"` only for interactivity.
- TanStack Query for server state; avoid unnecessary global stores.
- React Hook Form + Zod; align schemas with `shared/` when possible.
- shadcn/ui + Lucide; Tailwind with CSS variables.
- `credentials: 'include'` on API calls; send `X-CSRF-Token` on mutations.
- Never store JWTs in `localStorage` / `sessionStorage`.
- UI hiding is UX only — API is the security boundary for answers.
- Route groups: `(public)`, `(auth)`, `(app)`, `(admin)`.
- Accessible forms (labels), keyboard-operable admin tables.

---

## 8. Security Rules

- Argon2id passwords; never log passwords, hashes, tokens, CSRF secrets, or Cloudinary signatures.
- Short-lived access JWT; rotating refresh tokens hashed in `AuthSession`; revoke on logout/password change; reuse detection invalidates family.
- Cookies: HTTP-only + Secure (prod) + SameSite=`Lax` for access/refresh; readable CSRF cookie + header.
- Rate-limit login, register, forgot-password.
- Helmet + CORS credentials with **explicit** origin allowlist (never `*` with credentials).
- Prisma parameterized queries only.
- File uploads: MIME/size allowlists; signed or server-side Cloudinary only; no API secret in frontend.
- Validate env at startup for required secrets in production.
- `.env` / `.env.*` gitignored; only `.env.example` may be committed.
- Do not claim absolute security — document mitigations and residual risk.

---

## 9. Database Rules

- Match `docs/05-database-design.md`.
- Indexes for list/filter/navigation patterns.
- Partial unique: one correct option per question; one ACTIVE browsing session per user.
- Category depth max 2; no self-parent.
- Publish requires ≥2 options and exactly one correct (service validation).
- Deterministic prev/next: `publishedAt DESC, id DESC` within filters (DEC-008).

---

## 10. Cloudinary Rules

- Depend on `StorageService` interface, not SDK in domain modules.
- Persist metadata in `MediaAsset` — never file bytes/base64 in Postgres.
- Compensating cleanup jobs when DB and Cloudinary diverge.
- Private/authenticated delivery or short-lived signed URLs for restricted files.

---

## 11. BullMQ / Redis Rules

- Queues: email, document-processing, image-processing, analytics, maintenance.
- Not for ordinary CRUD.
- Jobs idempotent (at-least-once); retries + exponential backoff + timeouts + graceful shutdown.
- Worker in separate `worker/` process/container.
- Redis is broker/cache — not system of record for auth sessions (Postgres holds sessions).

---

## 12. API Conventions

- Base: `/api/v1` (health/ready may also exist at root for probes).
- Envelope: `{ success, data|error, meta: { requestId, pagination? } }`.
- Errors: stable `code` + HTTP 400/401/403/404/409/422/429/500 as appropriate.
- Cursor pagination for large question lists; limit default 20 max 100.
- Keep `docs/06-api-specification.md` and Swagger in sync.

---

## 13. Docker & Ops

- Services: `web`, `api`, `worker`, `postgres`, `redis`, `nginx`.
- Multi-stage builds; non-root users; healthchecks; separate compose for dev/prod.
- Never expose Postgres/Redis publicly in production.
- No secrets baked into images; use env/secret store.
- Migrations: `prisma migrate deploy` as explicit deploy step.

---

## 14. Testing Rules

- Critical: trial/subscription answer privacy, auth, RBAC, publish validation, bookmark ownership.
- Backend: Jest + Supertest.
- Do not mark access-control work done without automated tests.
- Prefer factories/fixtures; never use real personal WhatsApp numbers.

---

## 15. Environment & Secrets

- Catalog: `docs/17-environment-variables.md`.
- Required for local: copy `.env.example` → `.env` (gitignored).
- `TRIAL_DAYS` must remain `7` unless business approves change.
- Seed admin via `BOOTSTRAP_ADMIN_*` — change default password before real use.

---

## 16. Documentation Map

| Doc | Topic |
|-----|-------|
| `docs/00`–`03` | Overview, business, functional, NFR |
| `docs/04`–`06` | Architecture, DB, API |
| `docs/07`–`08` | Auth, access control |
| `docs/09`–`10` | Cloudinary, BullMQ |
| `docs/11`–`12` | Frontend, backend structure |
| `docs/13`–`15` | Security, testing, Docker |
| `docs/16`–`19` | Roadmap, env, coding standards, decisions |

Cursor rules (always apply / path-scoped): `.cursor/rules/*.mdc`.

---

## 17. Definition of Done (Feature)

- [ ] Implements documented requirements only
- [ ] AuthZ enforced server-side
- [ ] No secrets in repo or logs
- [ ] Types clean; lint/typecheck/build pass
- [ ] Tests for critical business paths
- [ ] Docs/`AGENTS.md` updated if behavior or architecture changed
- [ ] Answer privacy preserved when touching questions API

---

## 18. Next Phase

**Phase 3 — Authentication & user management**  
Cookies + CSRF, Argon2id, refresh rotation, profile basics.  
See `docs/16-development-roadmap.md` and `docs/07-authentication-and-authorization.md`.
