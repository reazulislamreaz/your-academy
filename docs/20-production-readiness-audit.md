# 20 — Production Readiness Audit

**Date:** 2026-11-02  
**Scope:** Full monorepo (`frontend/`, `backend/`, `worker/`, `shared/`, `docs/`, `docker/`)  
**Goal:** Baseline before premium UI/UX + full functional hardening (user request).

---

## 1. Executive verdict

The **backend core is largely scaffolded and API-wired** (auth, trial privacy, questions, categories, bookmarks, news, analytics sessions, admin KPIs). The **frontend is a thin functional prototype** (~12 routes, ~2 UI primitives, static homepage) — not a production EdTech product UI.

| Layer | Maturity | Notes |
|-------|----------|-------|
| Docs / AGENTS | Strong | Phases 0–13 documented; decisions registered |
| Backend APIs | Good scaffold | Most learner/admin endpoints exist; gaps in Documents module & real Cloudinary/SMTP |
| Database / Prisma | Good | Schema + migrations + seed; 18 tables |
| Worker | Stub | Queues online; jobs log-only |
| Frontend UX | Weak | Works for happy-path demos; missing design system depth, filters, guards, admin CRM |
| Tests | Weak | One access-control unit spec; no e2e |
| Integration depth | Partial | Pages call APIs but ignore pagination meta, filters, refresh-on-401, role-based nav |

**Do not rewrite the backend.** Improve frontend architecture toward `docs/11-frontend-architecture.md`, close backend stubs that block product flows (documents, storage, email), and harden auth/access UX.

---

## 2. Route / surface inventory

### Frontend (`frontend/src/app`)

| Path | Status | Data source |
|------|--------|-------------|
| `/` | Static marketing hero only | Hardcoded copy — no categories/news/questions |
| `/login`, `/register` | Working forms | Real `/auth/*` |
| `/questions` | List only | API — **no search/filter/sort/pagination UI** |
| `/questions/[id]` | Detail + bookmark + prev/next | API; answer privacy UX present |
| `/bookmarks` | Question bookmarks list | API — no document bookmarks, no unsave |
| `/news`, `/news/[slug]` | List/detail | API — thin |
| `/profile` | Read-only cards | `/users/me` + stats — **no edit, logout, settings** |
| `/admin/dashboard` | KPI grid | `/admin/dashboard` |
| `/admin/questions` | Create+publish form + list | API — **no edit/archive, no draft workflow UI** |

**Missing vs docs/11:** `(public)` group, `/documents`, password reset pages, admin users/categories/news/documents/analytics, middleware auth guards, feature folders, typed API modules, heartbeat client, shadcn depth, RHF+Zod forms.

### Backend controllers (`/api/v1`)

| Domain | Endpoints (summary) | Gaps |
|--------|---------------------|------|
| Auth | register, login, refresh, logout, change-password, forgot/reset | SMTP delivery stubbed via worker log |
| Users | me, patch me, stats, me/access | OK for v1 |
| Categories | list; admin create/patch/delete | No frontend admin UI |
| Questions | list/detail/nav; admin CRUD/publish/archive | Frontend ignores filters/cursor |
| Bookmarks | questions + documents CRUD | Document UI missing |
| News | list/slug; admin create/publish | No admin news UI; limited learner polish |
| Analytics | sessions start/heartbeat/end; me/summary | **No frontend heartbeat** |
| Admin | dashboard KPIs | No users list, audit log UI |
| Storage | sign-upload | **Placeholder signature** |
| Documents | list + detail | Download URL gated until Cloudinary closeout |
| Public | `/public/stats` | Marketing counts |
| Health | `/health`, `/ready` | OK |

---

## 3. Design system audit

**Present:** CSS variables in `globals.css` (cream `--bg`, teal accent, Fraunces + Sora), `Button` + `Input` only, shared header.

**Problems (vs premium product bar + user design rules):**

- Warm cream + serif display + teal is closer to a default “tasteful AI” palette than a distinctive brand system.
- Nearly every page uses the same rounded white cards + display H1 — repetitive.
- No token scale for spacing/type/shadows beyond a few vars.
- No mobile nav (header wraps pills; admin links always visible).
- Admin and learner share one chrome — not a separate admin shell.
- No skeletons, toasts, modals, tables, badges, empty illustrations.
- `@import` Google Fonts in CSS (perf / FOIT risk); prefer `next/font`.
- Glass/`backdrop-blur` + heavy radius everywhere — feels template-like.

---

## 4. Functionality gaps (user impact ranked)

### P0 — Blocks “real product” feel

1. **Homepage is static** — no live categories, news, or sample questions from DB.
2. **Questions discovery incomplete** — backend supports `q`, category, subcategory, difficulty, cursor; UI ignores all.
3. **Auth session UX incomplete** — no logout; no 401→refresh→retry; no middleware; Admin always in nav.
4. **Profile is read-only** — no PATCH form, password change, or trial countdown UX.
5. **No password reset UI** — API exists (DEC-004); pages missing.
6. **Documents/PDF product missing** — schema/bookmarks exist; no Documents API/UI; storage stub.
7. **Admin is KPI + one form** — missing categories/news/users/documents/edit/archive/draft; no confirm dialogs.
8. **Analytics heartbeat never started** from frontend — browsing stats stay near zero for real users.

### P1 — Quality / trust

9. Bookmark toggle is add-only (no remove / saved state).
10. Question detail: select-answer interaction missing (display-only options).
11. Pagination meta discarded by `apiFetch` (only returns `data`).
12. Empty/error states are plain text; no skeletons.
13. News admin + rich detail (related PDFs download) incomplete.
14. Cloudinary unsigned placeholder — unsafe if used in prod.
15. Email worker log-only — reset links may only appear in logs/non-prod.

### P2 — Hardening

16. Single unit test (`access-control.service.spec.ts`); no auth/privacy e2e.
17. No Bengali typography path (if bilingual required — **NEEDS APPROVAL** if not in docs).
18. Production TLS/deploy still Phase 13.
19. shadcn/ui / RHF / Zod / Lucide largely unused despite stack approval.
20. Shared package contracts underused by frontend pages (inline types).

---

## 5. What already works (preserve)

- Cookie auth + CSRF header wiring in `apiFetch`
- Trial answer/explanation omission via `AccessControlService` (backend)
- Question list/detail/navigation APIs
- Admin create → publish happy path
- Bookmarks create + list (questions)
- News publish/browse APIs
- Admin dashboard aggregates
- Docker Postgres/Redis; env `your_academy`; `/ready` green
- Seed admin + Programming categories

---

## 6. Architecture alignment

| Doc expectation | Reality |
|-----------------|---------|
| `docs/11` feature folders + typed clients | Flat pages + single `client.ts` |
| Separate admin experience | Same header/layout |
| Server Components default | Almost all pages `"use client"` |
| Heartbeat client | Absent |
| Documents module | Absent |
| Real Cloudinary | Stub |
| Phase 12 tests | Not started meaningfully |

---

## 7. Security / performance notes

- Answer privacy correctly backend-enforced — keep it that way.
- Frontend must never invent `isCorrect`.
- Admin routes need layout-level role gate + API already 403s.
- Storage placeholder signature must not ship to production.
- Prefer `next/font`, image optimization, query key filters, cursor pagination UI.
- Respect `prefers-reduced-motion` when adding motion.

---

## 8. Recommended design direction (for Phase 2 approval)

Intentional brand — **not** purple SaaS, **not** cream+terracotta broadsheet, **not** dark neon:

- Working name direction: **“Study desk / exam calm”** — cool off-white paper (`#F7F8FA`), deep ink (`#0B1220`), **single accent indigo-teal hybrid avoided**; prefer **deep navy + focused amber CTA** (exam highlighter metaphor) OR **forest academic** with restrained accent — pick one in Phase 2 tokens.
- Typography: distinctive pair via `next/font` (e.g. display + readable body; add Noto Sans Bengali **only if** bilingual confirmed).
- Layout: marketing full-bleed hero with brand-first; app shell with sidebar on desktop / drawer on mobile; admin denser data UI (tables, not marketing cards).
- Motion: 2–3 purposeful transitions (nav, page enter, answer reveal) + skeletons.

Exact token sheet to be established in Design System phase before page rewrites.

---

## 9. Out of scope (unless approved)

- Payment providers (PAYMENTS-V1)
- Microservices / GraphQL / stack swaps
- Inventing product rules not in docs (use DEC register)

---

## 10. Phase gate

**Phase 1 (this document): COMPLETE.**  
Next: prioritized plan approval → Design System → Public site → Auth/Dashboard → Admin → Integration cleanup → Perf/Security → Test audit.

---

## 11. Addendum — deep-pass findings (2026-11-02)

Consolidated from focused backend and docs reviews (complements §§1–9).

### Docs / roadmap

- `docs/16-development-roadmap.md` still says “Recommended Next Step: Start Phase 1” while Phases 0–3 are marked complete and substantial Phase 4–11 code exists — **doc drift**; fix during implementation.
- **i18n / Bengali UI:** deferred in product docs — do **not** add bilingual UI unless newly approved.
- Open DECs remain (002, 005–011, 013–019); do not invent answers — use `docs/19`.

### Backend specifics

| Finding | Impact |
|---------|--------|
| `GET /categories` requires JWT | Guest homepage “featured categories” needs public read **or** server-only marketing fetch — decide in Phase 3/6 |
| `AuditLog` model never written | Admin audit UI would be empty until writers added |
| JWT secret fallback hardcoded if env missing | Prod risk — fail fast when `JWT_ACCESS_SECRET` unset |
| No BullMQ producers in API | Worker queues idle; forgot-password not enqueued |
| News: create/publish only | No PATCH/unpublish/delete |
| No `/admin/users`, sessions list, account delete, avatar, `storage/confirm` | Spec gaps vs `docs/06` |
| `/ready` checks DB only | Redis not in readiness |
| Answer stripping on detail is manual; `stripAnswerFields` unused | Prefer one path + HTTP privacy tests |

### Confirmed preserve list (extra)

- Helmet, CORS credentials, ValidationPipe whitelist in `main.ts`
- Refresh-token family revoke on reuse
- News learner routes are **public** (aligned with guest marketing + DEC-003 for questions-only auth)

### Frontend specifics

| Finding | Impact |
|---------|--------|
| No mocks/TODOs in product copy — gaps are **missing surfaces**, not fake data | Prefer build-out over rip-and-replace |
| shadcn **not installed** (`components.json` absent); CVA/RHF/Zod/Lucide deps unused | Phase 2 must actually wire the approved stack |
| Empty scaffold dirs: `(admin)/categories`, `features/auth`, etc. | Clean up or fill in Phase 3–5 |
| No `middleware.ts` / `loading.tsx` / `error.tsx` / `not-found.tsx` | Add with auth + shell work |
| Home promises filters/docs that UI does not deliver | Align marketing claims with shipped features |
| Question options are static divs (not selectable study UX) | Phase 3 detail redesign |
| Admin create always publishes + hardcodes `MEDIUM` | Phase 5 draft/edit/difficulty |
| `@your-academy/shared` unused in frontend source | Typed clients in Phase 4/6 |
