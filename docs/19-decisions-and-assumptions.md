# 19 — Decisions and Assumptions Register

Use this register for anything not explicitly confirmed in the master requirements. Do **not** silently invent product rules during implementation.

Status values: `CONFIRMED` | `PROPOSED` | `NEEDS APPROVAL`

---

## Confirmed Baseline (Reference)

| ID | Summary | Status |
|----|---------|--------|
| BR-001…010 | See `01-business-requirements.md` | CONFIRMED |
| TECH-STACK | Next.js + NestJS + Prisma + Postgres + Redis + BullMQ + Cloudinary + Docker | CONFIRMED |
| ARCH-MONOLITH | Modular monolith | CONFIRMED |
| TRIAL-DYNAMIC | No cron required for trial expiry recognition | CONFIRMED |
| ANSWER-PRIVACY-API | Backend omits answers/explanations post-trial | CONFIRMED |
| PAYMENTS-V1 | No payment integration in initial release | CONFIRMED |
| DEC-001 | Post-trial published PDFs/documents remain accessible | CONFIRMED |
| DEC-003 | Question bank requires authentication | CONFIRMED |
| DEC-004 | Password reset delivered via email | CONFIRMED |
| DEC-012 | Web auth via HTTP-only cookies + CSRF protection | CONFIRMED |
| DEC-020 | pnpm workspaces + Turborepo | CONFIRMED |

---

## Open / Proposed Decisions

### DEC-001 — Post-trial PDF / document access

| Field | Value |
|-------|-------|
| Question | After trial expiry, can users still open/download PDFs and educational documents? |
| Decision | **Yes** — authenticated users may open/download **published** documents after trial expiry. Only MCQ answers/explanations are gated. Default `Document.visibility = AUTHENTICATED`. `PREMIUM` reserved for future paid-only PDFs. |
| Impact | DocumentsModule, AccessControl entitlements, API download auth |
| Status | **CONFIRMED** |

### DEC-002 — Minimum options per question

| Field | Value |
|-------|-------|
| Question | Exact minimum/maximum MCQ options? |
| Current assumption | Min **2**, max **6**; UX recommends 4 |
| Recommended option | Enforce min 2 / max 6 at publish |
| Impact | Publish validation, admin UI |
| Status | **PROPOSED** |

### DEC-003 — Guest access to questions

| Field | Value |
|-------|-------|
| Question | Can unauthenticated users browse full questions/options? |
| Decision | **No.** Guests may view marketing pages and published news (per DEC-018). The question bank (list, detail, options, navigation) requires authentication. |
| Impact | API guards on `/questions*`; frontend redirects guests to login |
| Status | **CONFIRMED** |

### DEC-004 — Password reset delivery channel

| Field | Value |
|-------|-------|
| Question | How are reset tokens delivered? |
| Decision | **Email.** `forgot-password` emails a time-limited reset link/token when the account has an email address. Registration email remains optional (BR-006), but password reset only succeeds when the user has an email on file; otherwise the API still returns a generic success response and no email is sent (no account enumeration). WhatsApp OTP remains a future enhancement, not v1. |
| Impact | Auth module; requires SMTP/email provider config; email field on User used for delivery |
| Status | **CONFIRMED** |

### DEC-005 — Account deletion behavior

| Field | Value |
|-------|-------|
| Question | Soft-delete vs hard-delete; what happens to WhatsApp uniqueness and content authorship? |
| Current assumption | Soft-delete user; anonymize WhatsApp/email to sentinel values; keep questions with `createdById` set null; delete bookmarks/sessions; purge avatar |
| Recommended option | Soft-delete + anonymize |
| Impact | UsersModule, GDPR-like expectations |
| Status | **PROPOSED** |

### DEC-006 — WhatsApp number change policy

| Field | Value |
|-------|-------|
| Question | Can users change WhatsApp freely? Re-verify? |
| Current assumption | Allow change with uniqueness check; **no OTP** in v1; rate-limit changes |
| Recommended option | Require OTP when OTP infrastructure exists |
| Impact | Profile API, abuse |
| Status | **PROPOSED** |

### DEC-007 — Category depth

| Field | Value |
|-------|-------|
| Question | Only two levels? |
| Current assumption | **Exactly two levels** (root + child) |
| Recommended option | Enforce in service |
| Impact | CategoriesModule |
| Status | **PROPOSED** |

### DEC-008 — Previous/next ordering

| Field | Value |
|-------|-------|
| Question | Deterministic order definition? |
| Current assumption | `publishedAt DESC, id DESC` within active filters |
| Recommended option | Same |
| Impact | Questions navigation API |
| Status | **PROPOSED** |

### DEC-009 — Idle threshold for browsing time

| Field | Value |
|-------|-------|
| Question | When does idle pause accrual? |
| Current assumption | **120 seconds** without interaction |
| Recommended option | 120s configurable |
| Impact | Analytics heartbeat |
| Status | **PROPOSED** |

### DEC-010 — Multi-tab browsing sessions

| Field | Value |
|-------|-------|
| Question | How to aggregate concurrent tabs? |
| Current assumption | At most **one ACTIVE** billable session per user; additional tabs send heartbeats that attach to the same session or are ignored if another instance owns it; accrued time is not multiplied by tab count |
| Recommended option | Single active session with `clientInstanceId` ownership steal after timeout |
| Impact | AnalyticsModule schema/indexes |
| Status | **NEEDS APPROVAL** |

### DEC-011 — Internationalization

| Field | Value |
|-------|-------|
| Question | Multi-language UI/content in v1? |
| Current assumption | Single locale |
| Recommended option | Defer i18n framework |
| Impact | Frontend |
| Status | **PROPOSED** |

### DEC-012 — Token storage strategy (web)

| Field | Value |
|-------|-------|
| Question | Access token in memory vs cookie? CSRF approach? |
| Decision | **HTTP-only cookies for both access and refresh tokens**, plus **CSRF protection** on cookie-authenticated mutating requests. Never store tokens in `localStorage` or readable JS storage. `Authorization: Bearer` remains supported for Swagger, non-browser clients, and tests. |
| Cookie details | Access: HTTP-only, Secure (prod), SameSite=`Lax`, short TTL. Refresh: HTTP-only, Secure (prod), SameSite=`Lax`, longer TTL, preferably path-scoped to `/api/v1/auth/refresh` (and logout). |
| CSRF details | Double-submit CSRF cookie (non-HTTP-only) + require matching `X-CSRF-Token` header on unsafe methods (`POST`/`PATCH`/`PUT`/`DELETE`) when the browser sends auth cookies. Safe methods (`GET`/`HEAD`/`OPTIONS`) skip CSRF. CORS must use credentials with explicit origin allowlist (not `*`). |
| Impact | Auth UX, Nginx, CORS `credentials: true`, frontend `credentials: 'include'`, CSRF middleware/guard |
| Status | **CONFIRMED** |

### DEC-013 — Password complexity

| Field | Value |
|-------|-------|
| Question | Exact password policy? |
| Current assumption | Min 8 characters; at least one letter and one number |
| Recommended option | Same; HIBP optional later |
| Impact | Register/change-password validation |
| Status | **PROPOSED** |

### DEC-014 — Admin bypass on learner question routes

| Field | Value |
|-------|-------|
| Question | Do admins see answers on `/questions/:id` when their personal trial expired? |
| Current assumption | **Yes**, `ADMIN` role grants `VIEW_ANSWERS` / `VIEW_EXPLANATIONS` |
| Recommended option | Yes for support efficiency |
| Impact | AccessControlService |
| Status | **PROPOSED** |

### DEC-015 — Bull Board / queue UI

| Field | Value |
|-------|-------|
| Question | Expose queue dashboard? |
| Current assumption | Optional, admin-only, disabled by default in prod |
| Recommended option | Enable in staging first |
| Impact | Worker/API ops |
| Status | **PROPOSED** |

### DEC-016 — Trial abuse prevention beyond unique WhatsApp

| Field | Value |
|-------|-------|
| Question | What additional controls ship in v1? |
| Current assumption | Unique WhatsApp + auth rate limits only; document OTP/device/IP caps as future |
| Recommended option | WhatsApp OTP as first hardening after MVP |
| Impact | Registration conversion vs abuse |
| Status | **NEEDS APPROVAL** (future scope) |

### DEC-017 — Search implementation

| Field | Value |
|-------|-------|
| Question | Postgres `ILIKE` vs `pg_trgm` vs external search? |
| Current assumption | `ILIKE` / simple for v1; add `pg_trgm` if needed |
| Recommended option | Start simple |
| Impact | Questions list performance |
| Status | **PROPOSED** |

### DEC-018 — News guest readability

| Field | Value |
|-------|-------|
| Question | Full news articles public? |
| Current assumption | Published news **publicly readable**; default educational PDFs use `AUTHENTICATED` visibility (DEC-001) |
| Recommended option | Public news for marketing SEO |
| Impact | News routes |
| Status | **PROPOSED** |

### DEC-019 — Soft delete vs archive for questions

| Field | Value |
|-------|-------|
| Question | Is `ARCHIVED` enough or also `deletedAt`? |
| Current assumption | Use status `ARCHIVED` for unpublish; `deletedAt` for admin soft-delete hidden from all UIs |
| Recommended option | Both |
| Impact | Schema, admin filters |
| Status | **PROPOSED** |

### DEC-020 — Monorepo tooling

| Field | Value |
|-------|-------|
| Question | pnpm + Turborepo vs npm workspaces? |
| Decision | **pnpm workspaces + Turborepo** (implemented in Phase 1) |
| Impact | Phase 1 scaffolding |
| Status | **CONFIRMED** |

### DEC-021 — Study preferences persistence

| Field | Value |
|-------|-------|
| Question | Where are onboarding topic picks and Continue-learning pointers stored? |
| Decision | **Postgres on `User`** via `preferredCategoryIds`, `lastQuestionId` (+ optional filter QS), `onboardingCompletedAt`. Exposed on `GET /users/me` and `PATCH /users/me/study-prefs` (auth + CSRF). Not localStorage. |
| Impact | UsersModule, schema migration, study home / onboarding / practice player |
| Status | **CONFIRMED** (audit 2026-11-05) |

---

## Assumption Log (Non-Decision Facts We Are Proceeding With)

1. Product name in repo context is **Your Academy**.
2. Primary deployment target is a single Ubuntu VPS with Docker Compose initially.
3. Heartbeat interval is **30 seconds** as specified.
4. Cloudinary remains the only planned object store for v1.
5. Email is optional at registration unless business later mandates it.
6. Worker runs as a separate container from API.

---

## How to Resolve

1. Mark status `CONFIRMED` here when approved.
2. Update affected docs (`01`, `02`, `06`, `08`, etc.) in the same change.
3. Tell implementing agents via `AGENTS.md` only if the rule is cross-cutting and easy to miss.
