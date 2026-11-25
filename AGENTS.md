# AGENTS.md — Your Academy

> **Source of truth for AI coding agents.** Read this before any change.  
> Deep specs live in `docs/`. Cursor rules in `.cursor/rules/` mirror these constraints.

**Product:** Your Academy — subscription-ready MCQ EdTech platform.  
**Phase:** Phases 2–13 complete in-repo (prod Compose/TLS/deploy scaffolding). Live VPS cutover: `docs/22-operations-runbook.md`. See `docs/16-development-roadmap.md` and `docs/20-production-readiness-audit.md`.

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
9. Write tests for auth, access control, and Free vs Paid locks (DEC-060).
10. Update docs when architecture or requirements change.
11. Verify (`build` / `lint` / `typecheck` / targeted tests) before marking done.
12. **Before push to GitHub:** always check link issues (nav, CTAs, `Link`/`href`/`router` paths, API client routes, docs URLs) and fix broken or stale links in the same change set — see `.cursor/rules/link-check-before-push.mdc`.
13. Report incomplete work honestly.
14. Prefer small, focused diffs; match existing style.
15. Do not commit `.env`, secrets, dumps, or `node_modules`.

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

Forbidden without approval: microservices, GraphQL, alternate ORMs, payment providers other than SSLCommerz (DEC-060).

---

## 4. Confirmed Business Rules

| ID | Rule |
|----|------|
| Trial | **7 days of free Topic-Based access only** from account creation (DEC-061, scoped by DEC-063): `users.trial_ends_at` = DB `now() + 7 days` at insert (existing accounts backfilled from `created_at`). Server time only. It unlocks **only** `TOPIC` content in `AccessPolicyService` — it is **never** `fullAccess` and unlocks nothing else (sets beyond N, PAID Model Tests, PREMIUM PDFs stay locked). `access.topicAccess` drives the topic UI gate. Days left on the learner dashboard |
| Free plan (paid system ON; trial or not) | First **N** Preli and first **N** Written sets (admin-set, default 10, display order), FREE Model Tests, Quizzes, practice sets, news, non-PREMIUM PDFs, profile, bookmarks. Paid system **OFF** → everything open (DEC-060) |
| Topic Base | Directory / set **names** public; topic **questions** require login **always** (even with paid system OFF), then 7-day trial or active subscription when paid system is ON → else 403 `CONTENT_LOCKED` + paywall (DEC-061 / DEC-063). Signed-out visitors are sent to `/login?next=<page>` |
| Locked content | Sets beyond N, PAID Model Tests, PREMIUM PDFs: listed with `locked: true`, content routes return **403 `CONTENT_LOCKED`** and never load questions. Decided only by `AccessPolicyService` (Admin → switch → free item → active subscription). Answers are **not** separately gated (DEC-060 replaces DEC-051) |
| Questions CRUD | **Admin or Moderator** (content sections only — DEC-048) |
| Question browse | Public Preli / Written / Topic banks + homepage via `/api/v1/public/*` (DEC-031/040/042); a bank MCQ inherits its set's lock; learner practice `/questions*` remains authenticated (DEC-003) |
| Plans & renewal | **3 Months / 6 Months / 1 Year** (Monthly retired) with optional discounted price + Popular badge. **No automatic charging** (DEC-062): learners renew from `/billing`; upgrade = pay now, time added on top; downgrade = scheduled for the next renewal; cancel = access until end date. Reminder emails 7 and 3 days before the end (verified email, once per period) |
| Payments | **SSLCommerz** (DEC-060): server-priced checkout, activation only after Order Validation API + amount/currency/tran_id/store match, IPN is source of truth, idempotent apply. Admins also grant/extend/disable manually; every change logged in `subscription_events` |
| Register fields | name, WhatsApp (unique), password; avatar optional; email optional at register |
| Password reset | Self-service by **email** (DEC-004, no enumeration); Admin-assisted email link / WhatsApp link / temporary password for accounts without email (DEC-054) |
| Sessions | **One device at a time** for learners (DEC-053): new login revokes others → `401 SESSION_REPLACED`; staff opt-in via `SINGLE_SESSION_STAFF` |
| Web auth | HTTP-only cookies + CSRF (DEC-012); never `localStorage` for tokens |
| Guest exams | Public timed `Exam` / `ExamQuestion` / `ExamAttempt` (DEC-039) + Model Tests; separate from bank `Question` + PracticeSet; results include the key. PAID Model Tests (detail, submit, result) need access (DEC-060) |
| Dashboard roles | `ADMIN` (everything) / `MODERATOR` (Preli, Written, Topic, Quiz, Model Test, Newspaper only). Permissions in `shared/src/permissions.ts`; every `/admin/*` route needs `@RequirePermission` (DEC-048). Staff accounts are Admin-created only |

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

- Central `AccessPolicyService` (`backend/src/billing/`, DEC-060) — do not duplicate paid-switch / free-N / subscription math anywhere else.
- Never load or return locked content; refuse with `403 CONTENT_LOCKED` (`AccessPolicyService.assertAccess`).
- RBAC guards on every protected route; IDOR checks on user-owned resources.
- Staff: content management via `/admin/*` guarded by `PermissionsGuard` + `@RequirePermission` (DEC-048) — never add an `/admin/*` route without one. Learner answer bypass per DEC-014 stays **Admin-only**.

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
- Category depth max 2 for Preli/Written; Topic Base allows depth 3 (Category → Sub → Child); no self-parent.
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

- Critical: Free vs Paid locks, payment validation + idempotency, auth, RBAC, publish validation, bookmark ownership.
- Backend: Jest + Supertest.
- Do not mark access-control work done without automated tests.
- Prefer factories/fixtures; never use real personal WhatsApp numbers.

---

## 15. Environment & Secrets

- Catalog: `docs/17-environment-variables.md`.
- Required for local: copy `.env.example` → `.env` (gitignored).
- SSLCommerz: `SSLCZ_STORE_ID`, `SSLCZ_STORE_PASSWORD`, `SSLCZ_IS_LIVE` (env only; empty = payments off). Setup: README "Payments (SSLCommerz)".
- Seed admin via `BOOTSTRAP_ADMIN_*` — change default password before real use.

---

## 16. Documentation Map

| Doc | Topic |
|-----|-------|
| `docs/00`–`03` | Overview, business, functional, NFR |
| `docs/19` DEC-031 | Public Preli Question Bank (no login) |
| `docs/19` DEC-046 | Admin-managed footer social links |
| `docs/19` DEC-048 | Admin / Moderator roles, account settings, email verification |
| `docs/19` DEC-060 | Free vs Paid system, packages, SSLCommerz payments (supersedes DEC-051 / DEC-052) |
| `docs/19` DEC-061 | 7-day trial + Topic Base login / paywall |
| `docs/19` DEC-063 | 7-day trial scoped to Topic Base only (no site-wide trial) |
| `docs/19` DEC-062 | 3-month plan, discounts, cancel / upgrade / downgrade, expiry reminders (no auto-charge) |
| `docs/04`–`06` | Architecture, DB, API |
| `docs/07`–`08` | Auth, access control |
| `docs/09`–`10` | Cloudinary, BullMQ |
| `docs/11`–`12` | Frontend, backend structure |
| `docs/13`–`15` | Security, testing, Docker |
| `docs/16`–`19` | Roadmap, env, coding standards, decisions |
| `docs/20`–`22` | Production audit, design system, ops runbook |
| `docs/23` | Email deliverability (Resend, SPF/DKIM/DMARC) |

Cursor rules (always apply / path-scoped): `.cursor/rules/*.mdc`.

---

## 17. Definition of Done (Feature)

- [ ] Implements documented requirements only
- [ ] AuthZ enforced server-side
- [ ] No secrets in repo or logs
- [ ] Types clean; lint/typecheck/build pass
- [ ] Tests for critical business paths
- [ ] Docs/`AGENTS.md` updated if behavior or architecture changed
- [ ] Free vs Paid locks preserved when touching questions / sets / model tests API
- [ ] Links checked and fixed (nav, CTAs, routes, API clients) before GitHub push

---

## 18. Next Phase

**Phases 2–13 done** (including prod Compose/TLS/deploy runbook).  
**Next:** Follow `docs/22-operations-runbook.md` for live VPS cutover.  
See `docs/16-development-roadmap.md`.
