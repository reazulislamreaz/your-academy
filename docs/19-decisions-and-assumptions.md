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
| DEC-003 | Question bank requires authentication | SUPERSEDED by DEC-031 for public bank |
| DEC-018 | Published news publicly readable (marketing `/news`) | SUPERSEDED in part by DEC-032 |
| DEC-031 | Public Preli Question Bank (no login) | CONFIRMED |
| DEC-032 | Admin PUBLIC documents on পত্রিকার গুরুত্বপূর্ণ কলাম | CONFIRMED |
| DEC-033 | In-app PDF viewer; no download UI; API byte proxy | CONFIRMED |
| DEC-034 | Excel serial/preamble/sections + multi-subcategory placements + year chips | CONFIRMED |
| DEC-036 | Question.questionDate for admin upload/create; public sort/filter by date | CONFIRMED |
| DEC-035 | Exam timer, progress save, detailed results, performance tracking on PracticeSet | CONFIRMED |
| DEC-004 | Password reset delivered via email | CONFIRMED |
| DEC-012 | Web auth via HTTP-only cookies + CSRF protection | CONFIRMED |
| DEC-020 | pnpm workspaces + Turborepo | CONFIRMED |
| DEC-026 | MCQ Save to Collection folders | CONFIRMED |
| DEC-027 | Learner Orbit dark charcoal theme | CONFIRMED |
| DEC-037 | Platform-wide Anek Latin + Anek Bangla bilingual typography | CONFIRMED |
| DEC-028 | Learner dashboard light/dark toggle | CONFIRMED |
| DEC-029 | Real-time support messaging (Socket.IO) | CONFIRMED |
| DEC-030 | Role-exclusive dashboard routing (ADMIN vs learner) | CONFIRMED |

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
| Decision | **Originally no** for the authenticated learner practice routes (`/questions*`). **Updated by DEC-031:** a dedicated public Preli Question Bank + homepage feed expose published MCQs (including correct answers on cards) without login. Save/bookmarks and learner practice analytics still require auth. |
| Impact | Public `GET /api/v1/public/questions`; marketing `/preli-question-bank` + homepage cards; learner `/questions*` remains gated |
| Status | **SUPERSEDED in part by DEC-031** (2026-11-12) |

### DEC-031 — Public Preli Question Bank

| Field | Value |
|-------|-------|
| Question | Should admin-uploaded published MCQs appear on the marketing homepage and Preli Question Bank without login, showing options + correct answer? |
| Decision | **Yes.** Public bank is organized by admin **upload batches** (`QuestionUploadBatch` → Question Set). `GET /api/v1/public/question-sets` lists sets; `…/question-sets/:id/questions` returns MCQs in original upload order. Cards include correct-answer data for UI toggles; **Show All / Hide All Answers** is a client preference (`localStorage`) with per-question reveal when hidden. Homepage lists latest sets; `/preli-question-bank` is the hub. Save still requires login. |
| Impact | PublicModule batch APIs, marketing Question Set UI + answer visibility controls, DEC-003 exception for public surfaces only |
| Status | **CONFIRMED** (product request 2026-11-12; grouping + answer toggles same day) |

### DEC-034 — Excel serial, sheet preamble/sections, multi-placement, year filter

| Field | Value |
|-------|-------|
| Question | Product brief 2026-11-14: hide category badge after MCQ stem; show Excel `প্রশ্ন নং`; show first-column sheet preamble before MCQs + mid-sheet section headers; allow selecting up to 8 subcategories on upload so one Excel appears in multiple homepage/bank slots; year chips (2026/2025/2024…) beside category filters. |
| Decision | **Yes.** Persist `Question.sourceSerial` / `examYear` / `sectionTitle`, batch `sheetPreamble` / `examYear`, and junction `QuestionUploadBatchPlacement` (max 8). Parser keeps preamble above header and mid-sheet first-column section rows. Public cards omit `sourceLabel`; set page shows preamble + section breaks; Preli bank filters by `year` + placement `subcategoryId`. Homepage topic tiles resolve to subcategory placement filters when categories exist. **UI (revised):** Preli bank shows Search + **All Subcategories** dropdown + **All Years** dropdown (same Select pattern; years from published `examYear` only, never hard-coded or chip rows). Main-category filter removed from Preli. |
| Impact | Prisma migration `20261114120000_question_serial_sections_placements`, excel-parser, question-import upload, PublicModule, Preli/admin/marketing UI |
| Status | **CONFIRMED** (product request 2026-11-14) |

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

### DEC-009 — Idle threshold for browsing time / online presence

| Field | Value |
|-------|-------|
| Question | When does idle pause accrual, and when is a learner “online” for admin? |
| Current assumption | Heartbeat every ~30s while visible; idle pause accrual after **120s** without interaction (analytics). Admin **online** = `BrowsingSession.status=ACTIVE` and `lastHeartbeatAt` within **90s** (3× 30s heartbeat). Measured study time = `accruedSeconds`; session wall time shown separately. |
| Recommended option | Keep 90s online window; keep 120s accrual idle; document both |
| Impact | Analytics heartbeat; admin activity/online APIs |
| Status | **CONFIRMED** (Phase 1 admin analytics) |

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
| Decision | **Yes** for article deep links (`/news/:slug`). **List hub updated by DEC-032:** marketing `/news` (পত্রিকার গুরুত্বপূর্ণ কলাম) lists published **PUBLIC** admin documents (PDFs), not news articles. |
| Impact | `(marketing)/news` routes; removed `/news` from learner auth middleware prefixes |
| Status | **SUPERSEDED in part by DEC-032** (2026-11-12) |

### DEC-032 — Newspaper columns = public documents

| Field | Value |
|-------|-------|
| Question | Should admin-uploaded documents appear on পত্রিকার গুরুত্বপূর্ণ কলাম without login? |
| Decision | **Yes.** `GET /api/v1/public/documents` (+ `/:id` metadata) returns published documents with `visibility = PUBLIC`. Admin document create defaults to `PUBLIC` so new published uploads appear on marketing `/news`. Learner `/documents` library and AUTHENTICATED/PREMIUM rules (DEC-001) remain for the authenticated app. |
| Impact | PublicModule document endpoints; `(marketing)/news` + `/news/d/:id`; admin Documents create default |
| Status | **CONFIRMED** (product request 2026-11-12) |

### DEC-033 — In-app PDF viewer (no download UI)

| Field | Value |
|-------|-------|
| Question | How should পত্রিকার গুরুত্বপূর্ণ কলাম PDFs be read, and can users download them? |
| Decision | **In-app PDF.js viewer** on `/news/d/:id` with page nav, zoom, fit width/page, fullscreen. **No download / save / print buttons.** Bytes are served only via `GET /api/v1/public/documents/:id/file` (server fetches short-lived Cloudinary URL; client never receives storage URLs). Soft deterrents: `Content-Disposition: inline`, short private cache, context-menu / Ctrl+S / Ctrl+P blocked in the viewer, print CSS hides canvas. **Residual risk:** determined users can still capture bytes via DevTools/network/screenshots — do not claim absolute prevention. |
| Impact | `react-pdf` + worker in `public/`; PublicModule file proxy; DocumentsService view metadata |
| Status | **CONFIRMED** (product request 2026-11-12) |

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

### DEC-022 — Learner attempt / accuracy analytics

| Field | Value |
|-------|-------|
| Question | Should the learner dashboard show exams attempted, correct/wrong counts, accuracy %, and subject-wise performance? |
| Decision | **Yes** — persist `QuestionAttempt` on Check answer (`POST /questions/:id/attempts`). Correctness is computed server-side (still omitted from GET detail when not entitled). Aggregates exposed on `GET /users/me/stats.performance`. |
| Impact | Schema migration, QuestionsModule, practice player, learner dashboard |
| Status | **CONFIRMED** (product request 2026-11-11) |

### DEC-023 — Practice sets (quizzes & model tests)

| Field | Value |
|-------|-------|
| Question | Should Your Academy add timed quizzes / model tests inspired by QBookBD-style prep workflows? |
| Decision | **Yes** — introduce `PracticeSet` (+ items/attempts) for daily/subject/topic quizzes, model tests, and previous-year-**style** collections. Questions stay in existing Category depth-2 tree; govt-job tracks use `Question.examTags`. Demo seed must label synthetic items (`sourceNote`) and must **not** falsely claim official previous-year papers. Answer privacy (trial/subscription) still applies on review payloads. |
| Impact | Prisma models, PracticeModule APIs, learner prep hubs, admin practice-set management, seed catalog |
| Status | **CONFIRMED** (product request 2026-11-11) |

### DEC-035 — Exam timer, results analysis, and performance tracking

| Field | Value |
|-------|-------|
| Question | Should timed exams support backend-validated countdown, mid-attempt progress save, detailed result/analysis pages, profile/dashboard exam analytics, admin duration/marks/negative/pass config, and admin student exam history — without a separate Exam domain? |
| Decision | **Yes — extend PracticeSet/PracticeAttempt (DEC-023).** Add `passMarkPercent`, attempt `elapsedSeconds`/`percentScore`/`passed`, progress autosave via `PATCH /practice-attempts/:id/progress`, server auto-finalize on expiry, answer snapshots for historical review, `GET /me/exam-performance`, and admin attempt list/detail. Scoring and deadline checks remain server-side. Trial/subscription answer privacy still gates explanations/correct flags on learner review. |
| Impact | Prisma migration `20261114140000_exam_timer_results_tracking`, PracticeModule, Users stats, admin practice UI, learner player/results/home/profile |
| Status | **CONFIRMED** (product request 2026-11-14) |

### DEC-024 — Excel bulk question upload

| Field | Value |
|-------|-------|
| Question | How should admins bulk-upload MCQs without duplicating content or re-importing the same file? |
| Decision | **Yes** — add `QuestionUploadBatch` + `QuestionImportRow` with unique `batchCode`, SHA-256 `fileSha256` (block re-import of identical completed files), and `Question.contentHash` for cross-file duplicate detection. **Duplicate rule (2026-11-14):** a row is a duplicate only when **both** normalized question text **and** correct-answer option content match (within-file and vs DB). Same stem with a different correct answer is allowed. Hash = SHA-256 of `qa:v1` + normalized stem + normalized correct-option text (HTML/whitespace/Latin casefold; option letter/order ignored). Legacy text-only hashes are upgraded on touch and compared with an answer check during transition. Partial unique index on alive `contentHash`. Upload → validate/preview → confirm import (skip duplicates). Original files stored under local `QUESTION_IMPORT_DIR` / `backend/storage/question-imports` (admin operational artifacts; Cloudinary remains for learner media). Imports run in chunked API transactions; BullMQ can be added later for multi-thousand-row jobs if request timeouts become an issue. **Template (2026-11-12):** Google Sheets Bangla columns `প্রশ্ন নং \| প্রশ্ন \| পরীক্ষার নাম ও সাল \| ক \| খ \| গ \| ঘ \| উত্তর` (answers ক–ঘ). Subject/Topic set on the upload collection (not in-sheet). Header may appear below a title row; English legacy headers still accepted on upload. |
| Impact | Prisma migration, QuestionImportModule, admin Bulk upload UI, question bank associations via Subject/Topic/examTags |
| Status | **CONFIRMED** (product request 2026-11-11; template updated 2026-11-12) |

### DEC-025 — Learning activity event model (admin Phase 1)

| Field | Value |
|-------|-------|
| Question | How should admin activity analytics be sourced? |
| Decision | Append-only `LearningActivityEvent` (LOGIN/LOGOUT/QUESTION_ATTEMPT/PRACTICE_*/BOOKMARK_*/DOCUMENT_VIEW) written from learner paths; admin aggregates also use `BrowsingSession`, `QuestionAttempt`, `PracticeAttempt`, `AuditLog`. Prefer on-read aggregation in Phase 1; optional `UserDailyStudyRollup` later if slow. |
| Impact | Schema migration, LearningActivityService, admin activity APIs/UI |
| Status | **CONFIRMED** (Phase 1 admin analytics) |

### DEC-026 — MCQ Save to Collection (folders)

| Field | Value |
|-------|-------|
| Question | Can learners organize saved MCQs into personal folders (Facebook-style Save to Collection)? |
| Decision | **Yes for MCQs.** `BookmarkCollection` is private per user. A question is saved at most once per user (`@@unique([userId, questionId])`) and may sit in **one** collection or uncategorized (`collectionId` null). Re-saving / picking another folder **moves** the bookmark. Creating a folder + saving is one atomic flow. Deleting a folder uncategorizes its bookmarks (`ON DELETE SET NULL`). PDF bookmarks stay flat (no collections in v1). Caps: name ≤80 chars; ≤50 collections per user. |
| Impact | Prisma migration, BookmarksModule APIs, question detail `collection`, Save modal UI, bookmarks page folders |
| Status | **CONFIRMED** (product request 2026-11-12) |

### DEC-027 — Learner Orbit dark charcoal theme

| Field | Value |
|-------|-------|
| Question | Should the student app use a premium dark charcoal dashboard (Orbit-style reference)? |
| Decision | **Yes for `(app)` learner routes only.** Theme via `.learner-theme` CSS variable overrides (cool navy-charcoal surfaces, not flat black). Marketing, auth, and admin remain light navy/red. Color roles: brand red primary CTAs; soft blue secondary/selection/focus; soft green correct/progress; soft red incorrect; amber warning; purple insight/review; gold bookmarks. Learning aliases `--learn-*` and chart aliases `--viz-*`. **Typography (DEC-037):** platform-wide **Anek Latin + Anek Bangla**. Collapsible sidebar persisted in `localStorage`. No mock KPIs. |
| Impact | `globals.css` learner tokens, `(app)/layout`, sidebar/header, OptionRow/Badge statuses, dashboard KPI/chart tones, home remapped to Orbit layout |
| Status | **CONFIRMED** (product request 2026-11-12) |

### DEC-037 — Platform-wide Hind Siliguri bilingual typography

| Field | Value |
|-------|-------|
| Question | How should Bengali and English UI/educational text share a consistent type system? |
| Decision | **Two-tier typography:** (1) **Anek Latin + Anek Bangla** for UI/brand (headings, nav, buttons, dashboards). (2) **Hind Siliguri** for educational Q&A (MCQ stems, options, answers, explanations, exam prose) — regular 400 / medium 500, reading line-height ~1.85. Loaded via `next/font`; CSS `--font-stack` vs `--font-reading-stack`. |
| Impact | `frontend/src/lib/fonts.ts`, `globals.css`, shared UI controls, MCQ/reading surfaces, `docs/21-design-system.md` |
| Status | **CONFIRMED** (product request 2026-11-14; upgraded pairing same day) |

### DEC-028 — Learner dashboard light / dark toggle

| Field | Value |
|-------|-------|
| Question | Can learners switch between light and dark appearance in the student dashboard only? |
| Decision | **Yes, `(app)` only.** `.learner-theme[data-theme=light|dark]` token sets. Default **light** for first visit. Persist in `localStorage` key `ya-learner-color-scheme`. Header Sun/Moon toggle; FOUC boot script before paint. Marketing, auth, and admin are unaffected and never inherit this toggle. |
| Impact | Dual learner token sets, `LearnerThemeProvider` / toggle, `(app)/layout` boot script |
| Status | **CONFIRMED** (product request 2026-11-12) |

### DEC-029 — Real-time support messaging (Socket.IO)

| Field | Value |
|-------|-------|
| Question | Should the platform offer real-time Admin Support chat for guests and students? |
| Decision | **Yes.** Socket.IO on the Nest API (Redis adapter) for support chat only. Guests provide **name + WhatsApp** before chatting (`support_guest_token` HttpOnly cookie). Authenticated learners use JWT cookies. All `ADMIN`s share the inbox; optional `assignedAdminId`, internal notes, close/reopen/archive. Attachments via Cloudinary purpose `support-attachment` (authenticated). Guest→account link when WhatsApp matches on register/login. **Message order:** list/paginate by server `createdAt` ASC (tie-break `id`); never by UUID alone. Cursor = `createdAtISO~id`. Inbox conversations sort by `lastMessageAt` DESC. |
| Impact | Prisma support models, `SupportModule` + gateway, storage purpose, marketing/learner FAB, admin Support Inbox |
| Status | **CONFIRMED** (product request 2026-11-12; ordering clarified 2026-11-14) |

### DEC-030 — Role-exclusive dashboard routing

| Field | Value |
|-------|-------|
| Question | Can `ADMIN` users use the learner/student dashboard, and can learners open `/admin/*`? |
| Decision | **No cross-dashboard access.** After login, `ADMIN` → `/admin/dashboard` only; `USER` → `/home`. Middleware + `LearnerGate` / `AdminGate` block the other shell even via direct URL or `?next=`. Learner nav never exposes admin console links. Backend `/api/v1/admin/*` (and admin mutations) stay behind `JwtAuthGuard` + `RolesGuard(ADMIN)`. Learner content APIs may still authorize admins where DEC-014 applies (answer privacy bypass); UI dashboards remain exclusive. |
| Impact | `middleware.ts`, `role-routing.ts`, `postLoginPath`, `(app)`/`(admin)` gates, nav/user-menu cleanup |
| Status | **CONFIRMED** (product request 2026-11-12) |

### DEC-036 — Question date (`questionDate`)

| Field | Value |
|-------|-------|
| Question | Should admins set a real calendar date per question (manual + bulk), and should public Preli sorting/year filters use that date instead of upload `createdAt`? |
| Decision | **Yes.** Add optional `Question.questionDate` / `QuestionImportRow.questionDate` / batch `questionDate` (timestamptz). Excel column `প্রশ্নের তারিখ` (+ English aliases); bulk configure step requires a default date applied when rows omit it. `examYear` remains denormalized (`YYYY` from `questionDate`) for filters. Public question-set list sorts by `questionDate DESC` (nulls last), then `createdAt`; year filter matches `questionDate` year and legacy `examYear`. |
| Impact | Prisma migration `20261114160000_question_date`, excel-parser, question-import, questions DTOs/form, PublicModule years/list |
| Status | **CONFIRMED** (product request 2026-11-14) |

### Deferred / NEEDS APPROVAL (explicitly out of Phase 1)

| Item | Notes |
|------|-------|
| Multi-format questions | Keep single-correct MCQ (2–6 options) only; True/False as 2-option MCQ in templates |
| Payment admin / plan CRUD / refunds | PAYMENTS-V1 still deferred |
| WebSockets / SSE for online presence | Still deferred for browsing presence (heartbeat/polling). **Exception:** Socket.IO approved for support chat only (DEC-029) |
| ZIP image packs / JSON import packages | Defer unless same MCQ schema map is trivial |
| Bull Board / async multi-thousand import worker | Keep sync chunked import; revisit on timeouts |
| Staff role matrix / platform settings / notification center | Later |
| Support message reply/quote, edit, soft-delete | Needs schema (`replyToMessageId`, `editedAt`, `deletedAt`) — UI quotes text locally until approved |
| Admin-initiated outbound DM to arbitrary users | Needs create-conversation-by-userId API — inbox currently reuses open guest/learner threads |

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
