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
| DEC-040 | Public Written Question Bank (parallel domain + admin upload) | CONFIRMED |
| DEC-041 | Scoped categories PRELIMINARY vs WRITTEN | CONFIRMED |
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
| DEC-037 | Platform-wide Inter + Noto Sans Bengali bilingual typography | CONFIRMED |
| DEC-038 | Homepage CMS (draft + published) | CONFIRMED |
| DEC-028 | Learner dashboard light/dark toggle | CONFIRMED |
| DEC-029 | Real-time support messaging (Socket.IO) | CONFIRMED |
| DEC-030 | Role-exclusive dashboard routing (ADMIN vs learner) | CONFIRMED |
| DEC-039 | Public guest timed exams (Quizzory-style) | CONFIRMED |
| DEC-040 | Public guest Model Tests (parallel to DEC-039) | CONFIRMED |
| DEC-042 | Topic Base Question Analysis (taxonomy + 8-col upload + public pages) | CONFIRMED |
| DEC-043 | Model Test listing guide CMS (sidebar “কীভাবে দিবেন”) | CONFIRMED |
| DEC-044 | Quiz listing guide CMS (sidebar “কুইজ কীভাবে দিবেন”) | CONFIRMED |
| DEC-045 | Auth-aware public Quiz / Model Test start + result CTA | CONFIRMED |
| DEC-046 | Admin-managed footer social media links (DB + CMS) | CONFIRMED |
| DEC-051 | Answers are subscriber-only on public routes (amends DEC-031/039/040/042) | SUPERSEDED by DEC-060 |
| DEC-052 | Admin grants / revokes learner subscriptions | SUPERSEDED by DEC-060 |
| DEC-060 | Free vs Paid system + SSLCommerz payments (replaces DEC-051/052) | CONFIRMED |
| DEC-061 | 7-day full-access trial + Topic Base login / paywall (amends DEC-060) | CONFIRMED |
| DEC-062 | 3-month plan, discounts, learner cancel / upgrade / downgrade, 7- / 3-day expiry reminders (no auto-charge) | CONFIRMED |
| DEC-063 | 7-day trial scoped to Topic Base only — no site-wide trial (amends DEC-061) | CONFIRMED |
| DEC-064 | IBA (5-option) Preli bulk upload + single-question Option E | CONFIRMED |
| DEC-065 | Homepage Free vs Paid plan cards, admin-editable (display only) | CONFIRMED |
| DEC-066 | Technical SEO: dynamic sitemap, crawlable bank pages, canonical host | CONFIRMED |
| DEC-067 | Activity KPIs + user lookup, staff/user audit trail, log retention | CONFIRMED |
| DEC-068 | Three paid plans, package reorder / single Recommended / safe delete, four-card pricing | CONFIRMED |
| DEC-069 | All public marketing text editable in the homepage CMS (sections, pricing labels, footer, page headers) | CONFIRMED |

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
| Amended | **DEC-051 (2026-11-23):** correct answers are omitted from public cards unless the viewer is an Admin or has an active subscription; the toggle is shown only when keys are present. |

### DEC-040 — Public Written Question Bank

| Field | Value |
|-------|-------|
| Question | Should written / descriptive questions get a dedicated public bank + admin bulk upload mirroring Preli (DEC-031/034), with model answers instead of MCQ options? |
| Decision | **Yes.** Parallel Prisma domain (`WrittenQuestion`, `WrittenUploadBatch`, placements, import rows) — do not overload MCQ `Question` tables. Admin Excel/CSV/`.docx` upload under `/admin/written-question-imports`. DOCX (OOXML only; reject legacy `.doc`): (1) template Word table, (2) **real exam papers** — header authority/post/`সময়; পরীক্ষার তারিখ; পূর্ণমান` (often in a 1-col table) + `০১।`/`1.` stems with `ক)–ঙ)`/`a)–e)` sub-lines grouped under the parent; answers optional; Unicode math preserved; auto-fill `questionDate`/`examYear`/`sheetPreamble` from header or `YYYY-MM-DD` filename, (3) labeled blocks. Sample via `GET …/template?format=docx`. No server-side `.doc` conversion. Public written-set APIs + marketing bank unchanged. **Publish on successful import when question text is present** (exam papers often omit model answers; blank answers must not hide the collection). Empty stem → DRAFT. Max 8 placements. |
| Impact | WrittenImportModule, `docx-parser` exam-paper mode, admin Written upload/preview, migration `20261118190000_written_question_bank` |
| Status | **CONFIRMED** (product request 2026-11-18; exam-paper DOCX 2026-11-19; publish-without-answer clarified 2026-11-19) |
| Amended | **DEC-051 (2026-11-23):** `modelAnswer` is omitted (and not searchable) on public routes unless the viewer is entitled. |

### DEC-041 — Scoped categories (Preliminary vs Written)

| Field | Value |
|-------|-------|
| Question | Should Preliminary and Written Question Banks share one category tree, or isolate taxonomies? |
| Decision | **Isolate via `Category.scope` enum `PRELIMINARY \| WRITTEN`.** Unique `(scope, slug)`; names unique per scope+parent. Public `GET /categories` defaults to PRELIMINARY; `?scope=WRITTEN` for Written. Admin `/admin/categories` tabbed UI. Written uploads/quick-create use WRITTEN only; Preli Excel imports use PRELIMINARY. Migration clones any trees already linked to written questions into WRITTEN and remaps FKs. Cross-scope parent moves rejected. |
| Impact | Prisma migration `20261119100000_category_scope_written_preli`, CategoriesModule, WrittenImport/QuestionImport indexes, admin Taxonomy tabs, Written upload dropdowns |
| Status | **CONFIRMED** (product request 2026-11-19) |

### DEC-042 — Topic Base Question Analysis

| Field | Value |
|-------|-------|
| Question | Should Topic Base Question Analysis be a dedicated bank (taxonomy + Excel upload + public topic pages), separate from Preli/Written, without changing the marketing navbar? |
| Decision | **Yes.** Add `CategoryScope.TOPIC` + optional `Category.iconKey`. Topic Base is **fully separate** from Preli/Written. Admin Taxonomy **Topics** tab supports **3-level** tree (Category → Sub → Child) + upload cascade IDs. Homepage **Topic Base** strip shows **Top 4 root Categories** + **Others** → `/topic-categories` folder explorer. Leaf Sub/Child folders show **title-first** Topic collections (upload batches); clicking a title opens `/topic-base/sets/:id` with that set’s questions (Preli/Written pattern). No question dump on Category or intermediate Sub folders. Marketing navbar unchanged. |
| Impact | Migrations `20261121120000_topic_base_question_analysis`, `20261121140000_topic_three_level_hierarchy`; TopicImportModule; public topic APIs; admin upload/taxonomy UI; homepage topics wiring |
| Status | **CONFIRMED** (product request 2026-11-21; 3-level hierarchy 2026-11-21) |
| Amended | **DEC-051 (2026-11-23):** Topic question keys are omitted on public routes unless the viewer is entitled. |

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
| Current assumption | **Preli / Written:** exactly two levels (root + child). **Topic Base (DEC-042):** up to **three** levels — Category → Sub Category → Child Category — enforced in `CategoriesService` (`maxDepthForScope`). |
| Recommended option | Enforce in service (scope-aware) |
| Impact | CategoriesModule, TopicImportModule, public Topic Base pages |
| Status | **CONFIRMED** for Topic Base depth-3 (product request 2026-11-21); Preli/Written remain depth-2 |

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
| Decision | **In-app PDF.js viewer** on `/news/d/:id` (and learner `/documents/:id`) with page nav, zoom, fit width/page, fullscreen. **No download / save / print buttons.** Bytes are served only via controlled proxies (`/api/pdf/:id` → API `GET /public/documents/:id/file`, and authenticated `/api/pdf/auth/:id` → `GET /documents/:id/file`). Server fetches short-lived Cloudinary URLs; client never receives storage URLs. Soft deterrents: `Content-Disposition: inline`, short private cache, context-menu / Ctrl+S / Ctrl+P blocked in the viewer, print CSS hides canvas. In-process PDF byte cache + long-timeout Next route handlers address slow authenticated Cloudinary RAW delivery. **Ops:** Nginx must route `^~ /api/pdf/` to the Next `web` upstream (not Nest) with ≥120s read timeout — a blanket `/api/` → API proxy 404s these paths. Route shell animation must not apply `transform` on ancestors of the fixed viewer. **Residual risk:** determined users can still capture bytes via DevTools/network/screenshots — do not claim absolute prevention. |
| Impact | `react-pdf` + worker in `public/`; PublicModule + Documents file proxies; no signed download URLs for learners |
| Status | **CONFIRMED** (product request 2026-11-12; hardened 2026-11-14; layout/nginx fix 2026-11-15) |

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
| Decision | **Yes — extend PracticeSet/PracticeAttempt (DEC-023).** Add `passMarkPercent`, attempt `elapsedSeconds`/`percentScore`/`passed`, progress autosave via `PATCH /practice-attempts/:id/progress`, server auto-finalize on expiry, answer snapshots for historical review, `GET /me/exam-performance`, and admin attempt list/detail. Scoring and deadline checks remain server-side. Trial/subscription answer privacy still gates explanations/correct flags on learner review. **Extension (2026-11-16):** one-question-at-a-time exam player UI; `PracticeAttempt.timerSeconds` (learner Timed/Untimed at start); `PracticeAttemptAnswer.markedForReview` round-tripped via progress/submit (no score impact); end-exam confirmation; resume skips prestart when `activeAttempt` exists. **Extension (2026-11-17):** learners may choose recommended admin duration, presets (15–120 min), or custom whole minutes (5–180); backend caps custom duration at admin set max when configured; redesigned exam player chrome (progress, navigator sheet on mobile, green answered / amber review states). |
| Impact | Prisma migrations `20261114140000_exam_timer_results_tracking`, `20261116170000_exam_player_timer_review`; PracticeModule; learner `features/practice-player`; admin practice UI |
| Status | **CONFIRMED** (product request 2026-11-14; player UX 2026-11-16) |

### DEC-024 — Excel bulk question upload

| Field | Value |
|-------|-------|
| Question | How should admins bulk-upload MCQs without duplicating content or re-importing the same file? |
| Decision | **Yes** — `QuestionUploadBatch` + `QuestionImportRow` with unique `batchCode`, SHA-256 `fileSha256` (re-uploads allowed; earlier batch linked via `duplicateFileBatchId`), and optional `Question.contentHash` (informational). **Duplicate / blank policy (2026-11-17):** identical stems (within-file or vs DB) and blank `প্রশ্ন` text are **VALID** and must be imported — never skipped as duplicates. Only genuinely unprocessable rows are INVALID (missing options ক–ঘ, unparseable non-empty `উত্তর`, missing category/date, etc.). One invalid row does not stop the batch. Partial unique index on `contentHash` **removed** (`20261117120000_allow_duplicate_question_hashes`). Confirm always inserts VALID (+ legacy DUPLICATE) rows. Summary: total / imported / invalid-skipped with per-row reasons. **Template:** Bangla columns `প্রশ্ন নং \| প্রশ্ন \| … \| উত্তর`. **Answer optional (2026-11-18):** empty `উত্তর`, blank/annotation placeholders (`-`, `N/A`, `Note`, `নাই`, …), or an omitted answer column are **VALID** (no Invalid/Missing Answer UI); unanswered imports save as **DRAFT**; answered rows still **PUBLISH**. Truly unparseable letters (e.g. `maybe`) remain INVALID. |
| Impact | Prisma migration, QuestionImportModule, admin Bulk upload UI, question bank associations via Subject/Topic/examTags |
| Status | **CONFIRMED** (product request 2026-11-11; duplicates + blank stems allowed 2026-11-17) |

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
| Impact | Prisma migration, BookmarksModule APIs, question detail `collection`, Save modal UI, bookmarks page folders (extended to PDFs and restored on the Saved page by DEC-059) |
| Status | **CONFIRMED** (product request 2026-11-12) |

### DEC-027 — Learner Orbit dark charcoal theme

| Field | Value |
|-------|-------|
| Question | Should the student app use a premium dark charcoal dashboard (Orbit-style reference)? |
| Decision | **Yes for `(app)` learner routes only.** Theme via `.learner-theme` CSS variable overrides (cool navy-charcoal surfaces, not flat black). Marketing, auth, and admin remain light navy/red. Color roles: brand red primary CTAs; soft blue secondary/selection/focus; soft green correct/progress; soft red incorrect; amber warning; purple insight/review; gold bookmarks. Learning aliases `--learn-*` and chart aliases `--viz-*`. **Typography (DEC-037):** platform-wide **Inter + Noto Sans Bengali**. Collapsible sidebar persisted in `localStorage`. No mock KPIs. |
| Impact | `globals.css` learner tokens, `(app)/layout`, sidebar/header, OptionRow/Badge statuses, dashboard KPI/chart tones, home remapped to Orbit layout |
| Status | **CONFIRMED** (product request 2026-11-12) |

### DEC-037 — Platform-wide Inter + Noto Sans Bengali bilingual typography

| Field | Value |
|-------|-------|
| Question | How should Bengali and English UI/educational text share a consistent type system? |
| Decision | **Site-wide bilingual stack:** (1) **Inter** for English/Latin UI. (2) **Noto Sans Bengali** for Unicode Bengali (UI + educational Q&A) — clear digits including **১**. Stack = Inter → Noto (`--font-stack`); reading stack prefers Noto first (`--font-reading-stack`). Loaded via `next/font` with `display: swap`. **letter-spacing: 0** everywhere Bn may appear (body + Tailwind `tracking-*` neutralized) — tracking splits conjuncts/digits. **Never** apply Latin OpenType numeric features (`tabular-nums` / `tnum` / `lnum`) or synthetic bold to Bengali reading text / `.type-bn-serial`. **SutonnyMJ rejected for web:** it is an ANSI/Bijoy font and cannot render Unicode Bengali stored in this product’s DB/CMS; embedding it would break Bn text. Noto Sans Bengali is the Unicode web equivalent for readable Bn numerals. No separate homepage marketing face — `.homepage-shell` uses the same stack. |
| Impact | `frontend/src/lib/fonts.ts`, `globals.css` (`.type-prose*`, `.type-bn-serial`, tracking resets), public MCQ/written cards, `docs/21-design-system.md` |
| Status | **CONFIRMED** (product request 2026-11-14; upgraded pairing same day; homepage marketing stack exception 2026-11-22; Bn digit serial fix 2026-11-22; Inter + Noto Sans Bengali site-wide + SutonnyMJ Unicode note 2026-11-22) |

### DEC-038 — Homepage CMS (draft + published)

| Field | Value |
|-------|-------|
| Question | Can admins edit the full marketing homepage without code changes? |
| Decision | **Yes.** Singleton `HomepageContent` rows (`DRAFT` + `PUBLISHED`) hold a validated JSON payload covering Hero, Categories, Written Categories, Topics, Why/Progress/CTA, Latest headers, Newsletter, plus extended CMS blocks (trial banner, how-it-works, features, FAQ, dashboard preview, live stats, sample MCQ, news, custom HTML-safe content). `layout.sections` stores ordered `{ id, type, visible }` entries (builtins + `custom:<uuid>`). Publish copies draft → published and snapshots a `HomepageRevision`; restore copies published → draft; admins may list/restore revisions. Public `GET /public/homepage` serves published only (Nest in-memory cache invalidated on publish; Next fetch tagged `homepage`). After admin publish, Next route `POST /api/revalidate/homepage` runs `revalidateTag('homepage')` + `revalidatePath` for `/` and category directories so live pages refresh immediately (30s ISR is fallback only). Marketing homepage renders sections dynamically from published layout order/visibility. Hero images via Cloudinary purpose `homepage-hero`. Category/topic tiles may include optional `logoAssetId` (Cloudinary purpose `homepage-tile-logo`, eager fit 256×256). Homepage preview shows **4 editable tiles + fixed Others at position 5** (`HOMEPAGE_EDITABLE_PREVIEW_SLOTS` + reserved `id: others`). Backend `normalizeHomepagePayload` / tile helpers enforce layout completeness and exactly one visible Others tile at slot 5 on every draft save/read — clients cannot reorder, demote, hide, or delete Others (title/logo remain editable). Admin managers list the **full** tile array (up to 200). Full section CMS lives at `/admin/homepage` (`HomepageCms`: reorder, visibility, section editors, draft/publish/discard, preview, revisions). **Question Bank Categories** (`/admin/question-bank-categories`) is a dedicated **Homepage Titles** manager: Top 4 + fixed Others + expandable DB taxonomy catalog. Admins may promote any root **or subcategory** into the Top 4 without duplicating Category rows; category tiles support optional `categoryId` + `subcategoryId`. Taxonomy CRUD stays on `/admin/categories`. **Homepage Topics preview** remains admin-curated (Top 4 + Others). **Dedicated pages:** `/question-bank-categories` = All Target Exam Categories (flat `HomepageTileCard` grid: published CMS Top 4 + library first, then any remaining live nodes from `GET /categories`, logos/icons from CMS); `/topic-categories` = **All Topics** (full CMS topic tile grid including Top 4, same `HomepageTileCard` chrome as homepage). Others / View all → those routes — never Others-only / never exclude the homepage Top 4. Dedicated tile managers share `HomepageSectionWorkspace` at `/admin/question-bank-categories` and `/admin/topic-categories`. |
| Impact | Prisma `HomepageContent` + `HomepageRevision`, `HomepageModule`, admin Homepage CMS + titles managers, marketing dynamic section renderer, shared `homepagePayloadSchema` / layout helpers / Others normalize, `AllTopicsDirectory` |
| Status | **CONFIRMED** (product request 2026-11-14; tile logos + Others pages 2026-11-15; top-5 + full admin sync 2026-11-17; topics admin-curated only 2026-11-17; homepage titles + subcategory promote 2026-11-17; fixed Others #5 2026-11-17; full section layout CMS + revisions 2026-11-17; Top 4 promote/demote normalize fix 2026-11-17; Others full flat grids include Top 4 2026-11-18; FAQ presentation no longer replaces CMS `accessFaq.faqs` with defaults when copy mentions “trial” 2026-11-21; section eyebrows + liveStats heading/subtitle + custom stack/band layout editable in Admin Homepage CMS 2026-11-22) |

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

### DEC-039 — Public guest timed exams (Quizzory-style)

| Field | Value |
|-------|-------|
| Question | Should Your Academy offer public timed exams with name-only entry (no login), Excel upload, countdown auto-submit, and post-attempt answer-sheet review — separate from authenticated PracticeSet exams? |
| Decision | **Yes.** Add `Exam` / `ExamQuestion` / `ExamAttempt` (guest domain; does **not** reuse bank `Question`). Admin upload at `/admin/exams/upload` (ExcelJS). Public listing `/exams` (newest first), take `/exams/[id]`, result with answer sheet + Bangla registration CTA. Correct answers omitted until submit. Learner “Govt job prep” moves to `/exam-tracks` so marketing can own `/exams`. NestJS `/api/v1/public/exams*` + `/api/v1/admin/exams*` (no Next.js Server Actions for scoring). Authenticated PracticeSet exams (DEC-023/035) remain unchanged. **Guest Excel template (2026-11-21):** fixed **7 columns** `প্রশ্ন নং \| প্রশ্ন \| ক \| খ \| গ \| ঘ \| উত্তর`. `উত্তর` is a single letter `a`–`d` (case-insensitive; Bangla `ক`–`ঘ` also mapped). Stored `correctAnswer` is the matching option text. Legacy Preli 9-column sheets (exam name / date) and English OptionA–D / free-text answer matching are **deprecated** for guest exams — download the current template. Blank / non-sequential `প্রশ্ন নং` and blank spacer rows are allowed; row errors name the spreadsheet row and field. |
| Impact | Prisma migration `20261118170000_guest_exams`, ExamsModule, marketing `/exams*`, admin upload UI, marketing nav |
| Status | **CONFIRMED** (product request 2026-11-18; template revised 2026-11-21) |
| Amended | **DEC-051 (2026-11-23):** results show score/totals + own selections to everyone; answer key, explanations and per-question correctness only for entitled viewers. |

### DEC-040 — Public guest Model Tests (parallel to guest Quiz)

| Field | Value |
|-------|-------|
| Question | Should Model Tests be a dedicated guest timed-exam product (admin Excel upload, public listing, single-page timer sheet, unanswered confirm, results + guest register CTA) without changing DEC-039 Quiz/Guest Exam? |
| Decision | **Yes.** Add isolated `ModelTest` / `ModelTestQuestion` / `ModelTestAttempt` tables and `ModelTestsModule`. Admin `/admin/model-tests/upload`. Public `/model-test` (listing/search/year filter), take `/model-test/[id]`, result `/model-test/[id]/result/[attemptId]`. Marketing **Exams** nav is a dropdown: Model Test → `/model-test`, Quiz → `/exams` (unchanged). Excel parser scans for header row with `প্রশ্ন নং` + `প্রশ্ন` (preamble title/date rows OK); 7 columns; `উত্তর` = `a`–`d` or `ক`–`ঘ`. Incomplete submit shows Skip & Submit / Go Back. Guest result shows register CTA. Authenticated learner `/model-tests` PracticeSet route remains separate. |
| Impact | Migration `20261121160000_model_tests`, ModelTestsModule, marketing `/model-test*`, admin upload, Exams dropdown |
| Status | **CONFIRMED** (product request 2026-11-21) |
| Amended | **DEC-051 (2026-11-23):** Model Test results follow the same rule as guest Quiz results (key / explanations / correctness subscriber-only). |

### DEC-043 — Model Test listing guide CMS

| Field | Value |
|-------|-------|
| Question | Should the `/model-test` sidebar block “মডেল টেস্ট কীভাবে দিবেন” (title + ordered steps) be editable from the Admin Dashboard instead of hardcoded frontend copy? |
| Decision | **Yes.** Singleton `ModelTestGuideConfig` (`id = default`) stores `title` + ordered JSON `items[{ id, text }]` (UTF-8 Bengali). Seeded with the original Bangla steps. Public `GET /api/v1/public/model-tests/meta/guide`; admin `GET`/`PUT /api/v1/admin/model-tests/guide` (CSRF). Admin editor lives on `/admin/model-tests/upload` under **Listing guide** (edit title, add/edit/reorder/delete steps, Save). After save, Next `POST /api/revalidate/model-test` runs `revalidateTag('model-test-guide')` + `revalidatePath('/model-test')`. Empty step list hides the numbered list but keeps the title. Hardcoded defaults are seed/fallback only — never overwrite a saved admin row. |
| Impact | Migration `20261121180000_model_test_guide_config`, ModelTestsService guide methods, admin guide editor, dynamic `/model-test` sidebar |
| Status | **CONFIRMED** (product request 2026-11-21) |

### DEC-044 — Quiz listing guide CMS

| Field | Value |
|-------|-------|
| Question | Should the `/exams` (Quiz) listing match Model Test layout and expose an editable “কুইজ কীভাবে দিবেন” sidebar guide from Admin? |
| Decision | **Yes.** Mirror DEC-043 with singleton `ExamGuideConfig`. Public `GET /api/v1/public/exams/meta/guide`; admin `GET`/`PUT /api/v1/admin/exams/guide`. Admin editor on `/admin/exams/upload` under **Listing guide**. After save, Next `POST /api/revalidate/exams` revalidates `/exams`. Quiz listing UI aligns with Model Test (full-width grid + sticky guide; remove filler eyebrow/subtitle/card descriptions). |
| Impact | Migration `20261121190000_exam_guide_config`, ExamsService guide methods, admin guide editor, dynamic `/exams` sidebar |
| Status | **CONFIRMED** (product request 2026-11-21) |

### DEC-045 — Auth-aware public Quiz / Model Test flow

| Field | Value |
|-------|-------|
| Question | Should logged-in users skip the candidate-name gate, auto-save public Quiz/Model Test scores to their account, and never see the register CTA — while guests still enter a name, see Register Now / Explore More, and have the guest attempt claimed after registration? |
| Decision | **Yes (identical for Quiz + Model Test).** Optional `userId` on `ExamAttempt` / `ModelTestAttempt`. Submit endpoints use `OptionalJwtAuthGuard`; when authenticated, candidate name = account `User.name` and `userId` is set. Guests must enter a non-empty name (≥2). Result Overview hides the registration card when `useMe` has a session; guests see a soft-gradient CTA with **Register Now** + **Explore More Exams**, storing `sessionStorage` + `?next=` for return. After register, `POST /api/v1/me/timed-attempts/claim` links the attempt. `GET /api/v1/me/timed-attempts` powers `/results` history. |
| Impact | Migration `20261121195000_timed_attempt_user_id`, MeTimedAttemptsController, player + result UI, register claim |
| Status | **CONFIRMED** (product request 2026-11-21) |

### DEC-046 — Admin-managed footer social media links

| Field | Value |
|-------|-------|
| Question | Should footer social profile URLs be managed from the Admin Dashboard (add/edit/delete/enable) instead of `NEXT_PUBLIC_SOCIAL_*` env vars? |
| Decision | **Yes.** Persist `SocialLink` rows (`platform` unique enum, `url`, optional `label`, `enabled`, `sortOrder`) in Postgres. Public `GET /api/v1/public/social-links` returns enabled links with non-empty URLs for the marketing footer. Admin CRUD at `/api/v1/admin/social-links` (+ reorder). Admin UI `/admin/social-links`. Platforms: Facebook, Instagram, YouTube, LinkedIn, X, WhatsApp, Telegram, TikTok. After mutations, Next `POST /api/revalidate/social-links` purges `social-links` tag so layouts refresh without code/env changes. Env-based footer socials are deprecated. |
| Impact | Migration `20261122153000_social_links`, SocialLinksModule, admin page, marketing footer props |
| Status | **CONFIRMED** (product request 2026-11-22) |

### DEC-047 — Public Privacy Policy page

| Field | Value |
|-------|-------|
| Question | Should the marketing site publish a Privacy Policy, and what must it say? |
| Decision | Public page at `/privacy-policy` under `(marketing)` (footer "Account" column link, sitemap, public marketing prefix, not in robots disallow). 17 sections. Content describes only data flows present in code/config. Update the page whenever a cookie, vendor, TTL, or personal-data field changes. |
| Impact | `frontend/src/app/(marketing)/privacy-policy/page.tsx`, footer, sitemap, role-routing, social-links revalidate paths |
| Status | **PUBLISHED — PROPOSED VALUES NEED OWNER + LEGAL APPROVAL** (2026-11-23). Owner supplied name, hosting provider, and proposed jurisdiction and authorised publishing. |

**Verified from code / config (2026-11-23)**

| Fact | Source |
|------|--------|
| Platform name: Your Academy; domain `youracademy.com.bd` | Owner; `robots.ts`, `.env.production` `WEB_ORIGIN` |
| Hosting: BahariHost VPS (owner-supplied) running Docker Compose | Owner; `docs/22`, `docker-compose.prod.yml` |
| Cloudflare in front (DNS, proxy, TLS, security) | `docs/22` §1, `scripts/cloudflare-prod-ssl.sh` |
| Email: Gmail SMTP (`smtp.gmail.com`), sender `youracademy04@gmail.com` | `.env.production` |
| Files: Cloudinary | `.env.production` (`CLOUDINARY_*` set), `StorageService` |
| Cookies: access 15 min, refresh + CSRF 7 days, support guest 30 days | `.env.production` TTLs, `cookie.service.ts`, `support.types.ts` |
| Password-reset link 1 hour, single use | `auth.service.ts` default (prod unset) |
| Heartbeat every 30 s; IP + user-agent on `AuthSession`; IP on `AuditLog` | schema, DEC heartbeat |
| No analytics, ads, payments, leaderboards, or self-service account deletion | code search |
| Container logs rotated by size (json-file 10 MB × 5) | `docker-compose.prod.yml` |
| DB backups: manual `scripts/backup-db.sh`; no schedule in repo | `scripts/` |

**Proposed values (published; need approval / legal review)**

| Item | Value | Why |
|------|-------|-----|
| Contact email | `support@youracademy.com.bd` | Forwarded to the team Gmail inbox by Cloudflare Email Routing (DEC-050). |
| Postal address | Omitted | Not in project; not invented. Legal review may require one. |
| Jurisdiction | Bangladesh (laws "that apply to us"; no statute cited) | Owner-proposed; specific statute is for counsel. |
| Server country | **Not stated** | Not verifiable (deploy host is a GitHub secret; baharihost.com refused automated fetch). Owner should confirm the data-centre location; add it to §8/§14 if wanted. |
| Deletion after verified request | 30 days | Common practice; **manual process** (no endpoint). |
| Guest exam results + support chats | up to 24 months from last activity | Balances support history vs. minimisation. **No purge job yet**: implement or clean up manually. |
| Security / audit records | up to 12 months | Typical abuse-investigation window. **No purge job yet**. |
| Backups | deleted data gone from backups within 90 days | **Backup rotation not automated**: implement before relying on it. |
| Rights response time | 30 days | Common international benchmark. |
| Minimum age | 13; under-18 with parent/guardian permission | Common floor; Bangladesh Children Act 2013 treats under-18 as children. **Not enforced at registration**. Legal review. |
| Legal bases | service provision, legitimate interests, consent (optional fields), legal obligation | Standard framework; legal review. |
| Cloudflare cookies (`__cf_bm`) | "may be set" | Depends on Cloudflare zone settings; not verifiable from repo. |

### DEC-048 — Dashboard roles: Admin + Moderator, account settings, email verification

| Field | Value |
|-------|-------|
| Question | Should the dashboard support a limited Moderator role, admin-created staff accounts, self-service account settings, and verified-email password reset? |
| Decision | **Yes.** `UserRole` gains `MODERATOR`. Permissions live in one map (`shared/src/permissions.ts`); backend `@RequirePermission` + `PermissionsGuard` on every `/admin/*` route (replaces `RolesGuard`), frontend nav/route gate/middleware read the same map. **Moderator** = full CRUD on Preli, Written, Topic, Quiz (**guest exams + practice sets**), Model Test, Newspaper (**documents + news**), plus the shared category trees and own Account Settings. Everything else (users, roles, homepage, social links/settings, support, dashboard KPIs, activity, audit, **exam results**) is Admin-only → `403`. Only Admins create staff accounts (WhatsApp E.164 + Argon2id password + role); nobody changes their own role or deactivates themselves; the last active Admin cannot be demoted/deactivated; Admins can reset **moderator** passwords (revokes sessions). Every staff user gets `/admin/account` (change password with current + confirm; add/change email with emailed confirmation link). Password reset links: 30 min, hashed, single-use; staff need a **verified** email, **learners keep the legacy rule** (any email) so existing students are not locked out. Learner self-registration unchanged. First admin: `pnpm admin:create`. |
| Impact | Migration `20261123120000_staff_roles_email_verification` (enum value, `users.email_verified_at`, `email_verification_tokens`; backfills existing admin emails as verified). Admin/users/auth/storage/worker changes; `/admin/account`, `/verify-email`; docs 06, 07, 17. |
| Status | **CONFIRMED** (product request 2026-11-23; quiz/newspaper scope and learner reset rule chosen by owner) |

### DEC-049 — Self-host web fonts (no build-time Google Fonts fetch)

| Field | Value |
|-------|-------|
| Question | CI run 45165955497 failed in `next build`: `next/font/google` crashed parsing a Google Fonts response (`Cannot read properties of null (reading '1')` in `loader.js`). CI starts without a build cache, so every build depends on Google Fonts answering correctly. Keep it? |
| Decision | **No.** Keep the same faces (DEC-037) but self-host them with `next/font/local`: `frontend/src/fonts/inter-latin-wght.woff2` (Inter 400–700, latin, preloaded) and `noto-sans-bengali-bengali-wght.woff2` (Noto Sans Bengali 100–900, bengali unicode-range). Same CSS variables (`--font-latin`, `--font-bengali`). SIL OFL 1.1 — see `src/fonts/LICENSE.md`. No new npm dependency. |
| Impact | `frontend/src/lib/fonts.ts`, `frontend/src/fonts/*`. Production builds no longer need outbound network for fonts. Inter Cyrillic/Greek/Vietnamese subsets are no longer bundled (unused by the product). |
| Status | **CONFIRMED** (2026-11-23, CI fix) |

### DEC-050 — Transactional email via Resend from our own domain

| Field | Value |
|-------|-------|
| Question | Password reset emails land in spam. How should transactional email be sent? |
| Decision | Send through **Resend** SMTP (`smtp.resend.com:465`, no new npm dependency — Nodemailer) from `Your Academy <support@youracademy.com.bd>`; `Reply-To: support@youracademy.com.bd` via **Cloudflare Email Routing** → team Gmail. DNS: Resend DKIM + `send.` SPF/MX, Cloudflare routing MX/SPF, DMARC `p=none` → `quarantine` after 2–4 weeks. One shared branded template (`worker/src/email/`) for reset + verification: multipart HTML/text, Message-ID on our domain, masked send logging. Token logic/TTL unchanged; the API only passes `expiresInMinutes` for display. Personal Gmail SMTP is retired. |
| Impact | `worker/src/email/*`, `worker/src/main.ts`, `frontend/public/images/email-logo.png`, `.env.example`, docs 17 + 23. Server env must switch to Resend values. |
| Status | **CONFIRMED** (owner chose Resend + Cloudflare routing, 2026-11-23). DNS + Resend account pending on owner. |

### DEC-051 — Answers are subscriber-only on public routes

| Field | Value |
|-------|-------|
| Question | Public banks (DEC-031/040/042) and guest Quiz / Model Test results (DEC-039/040) shipped answer keys to anyone. Should answers stay free? |
| Decision | **No — "public browse, answers paid".** Question text and options stay public without login. Correct answers (`correctAnswerLabel`, `correctAnswerBn`, `correctAnswer`, `correctOptionId`, `isCorrect`), explanations and written `modelAnswer` are **omitted** (absent, never faked) unless the viewer is an **Admin** or has an **active subscription**, decided only by `AccessControlService.canViewerSeeAnswers` (moderators are not entitled by role). Answer-bearing public routes use `OptionalJwtAuthGuard` (never throws; expired/invalid cookies = anonymous). Responses to a signed-in viewer are `Cache-Control: private, no-store` + `Vary: Cookie, Authorization`; anonymous `GET /public/questions` keeps its short shared cache. Guest exam / model test results return score, totals and the viewer's own selections to everyone, plus `answersVisible`; key/explanations/per-question correctness only when entitled. Preli Practice is scored server-side (`POST /public/question-sets/:id/practice-score`) instead of in the browser. Written search no longer matches inside model answers for non-entitled viewers. SSR result pages forward the visitor's cookies. UI shows "Answers are available with a subscription". |
| Residual risk | Any score is a weak oracle: a visitor can submit single answers and infer keys from the score. Mitigated by throttling (practice-score 10/min, exam submit 20/min per IP); not eliminated. |
| Impact | `PublicController`/`PublicService`, `ExamsService`/`ModelTestsService.getAttemptResult`, public exam/model-test controllers, `AccessControlService.canViewerSeeAnswers`; shared `ExamAttemptResult`/`ModelTestAttemptResult` (`answersVisible`, optional key fields), `PublicPracticeScore`; marketing cards, set views, result views, homepage sample MCQ. |
| Status | **SUPERSEDED by DEC-060** (2026-11-24) — answers are no longer gated; whole sets / tests are. |

### DEC-052 — Admin grants / revokes learner subscriptions

| Field | Value |
|-------|-------|
| Question | Payments are out of v1 (PAYMENTS-V1), and nothing created `UserSubscription` rows. How does a learner become entitled? |
| Decision | **Admins grant access manually.** Admin-only (`users` permission) endpoints under `/api/v1/admin/users/:id/subscription`: `GET` (current + last 20), `POST` grant `{ endsAt, startsAt?, note? }` (end must be after start and in the future; Admin targets rejected — already entitled), `POST …/revoke` `{ note? }` or `DELETE` (cancels every ACTIVE subscription not yet ended; 404 if none). Grant cancels any open ACTIVE subscription in the same transaction, then creates an ACTIVE row on the `PREMIUM` plan (upserted if the seed did not run). Audited as `SUBSCRIPTION_GRANT` / `SUBSCRIPTION_REVOKE`; the note is stored only in the audit log (no schema change). Entitlement is still read by `AccessControlService`. |
| Impact | `AdminSubscriptionsModule` (`backend/src/subscriptions/admin-subscriptions.*`), shared `AdminUserSubscriptionOverview`, `frontend/src/features/admin/users/user-subscription-card.tsx`. |
| Status | **SUPERSEDED by DEC-060** (2026-11-24) — module removed; manual grants live in `/admin/subscribers`. |

### DEC-053 — One device at a time (single active session)

| Field | Value |
|-------|-------|
| Question | How do we stop one paid account being shared across devices? |
| Decision | Every login (and register) revokes all other `AuthSession` rows of the account with `revokedReason = REPLACED`, under a per-user Postgres advisory lock so near-simultaneous logins leave exactly one winner; refresh rotation takes the same lock. `JwtStrategy` already loads the session per request, so a replaced device's access token fails immediately with **401 `SESSION_REPLACED`** (refresh answers the same, without the token-reuse family kill). Browser: `SessionWatcher` polls `GET /auth/session` every 45 s while visible and on focus; `apiFetch` clears cookies (`POST /auth/session/clear`) and sends the user to `/login?reason=session-replaced`, which explains why. Tabs share cookies → one session. Applies to learners; staff only when `SINGLE_SESSION_STAFF=true` (owner chose learners-only default, 2026-11-23). `SINGLE_SESSION_ENABLED=false` turns it off. Sessions now store user agent + IP; Admin sees recent sign-ins and can force-logout (`/admin/users/:id/logins`, `/force-logout`). Supersedes the unlimited-sessions behaviour noted under DEC-016. |
| Impact | `auth.service.ts`, `session-lock.ts`, `jwt.strategy.ts`, `auth.controller.ts`, `admin-user-sessions.service.ts`, migration `20261123180000_password_reset_and_single_session`, `frontend/src/features/auth/session-watcher.tsx`, `lib/api/client.ts`, login page. Residual: Socket.IO support chat checks the session only at handshake, so an open chat socket on the old device stays connected until it reconnects. |
| Status | **CONFIRMED** (owner request, 2026-11-23) |

### DEC-054 — Admin-assisted password reset

| Field | Value |
|-------|-------|
| Question | Learners who never added an email are stuck when they forget their password. |
| Decision | Admin-only (`users` permission) "Reset password" on the user list and detail page, for USER and MODERATOR accounts (not Admins, not self, not suspended). **A — Email:** Admin adds/confirms/changes the email (format + uniqueness checked), it is saved unverified, the standard reset email is sent, and the address is marked verified when that link is used (`PasswordResetToken.verifiesEmail`). The previous address, if any, gets an "email changed" notice. **B — WhatsApp:** the same single-use link is returned once to the Admin with Copy and "Open in WhatsApp" (bilingual message to `wa.me/<user>`). **C — Temporary password:** generated (12 chars) or typed; sets `User.mustChangePassword`, revokes all sessions; the API answers **403 `PASSWORD_CHANGE_REQUIRED`** for everything but `/users/me`, `/auth/session`, `/auth/change-password`, `/auth/logout` until the user sets a new one at `/change-password`. All options reuse one token system (`issuePasswordResetToken`: SHA-256 only, single-use, `PASSWORD_RESET_TTL_SECONDS`, newer link voids older). Every successful reset signs out all devices. Rate limit: `ADMIN_RESET_LIMIT_PER_USER` (default 5) per user per 15 min plus 10/min per admin. Audit actions `ADMIN_PASSWORD_RESET_EMAIL|LINK|TEMPORARY`, `PASSWORD_RESET_COMPLETED`; history on the user page. Plain passwords and links are never logged or audited. Forgot-password page always shows "No email? Contact support on WhatsApp" (`NEXT_PUBLIC_SUPPORT_WHATSAPP`) rather than revealing whether a number has an email (no enumeration, DEC-004). Learners with no email see a dismissible reminder to add one. Amends DEC-004 (email-only) and DEC-048 (moderator-only admin reset — that UI is replaced; the old endpoint remains). |
| Impact | `admin-password-reset.service.ts`, `auth/password-reset-tokens.ts`, worker `email-changed-notice` job, frontend `admin-password-reset-dialog.tsx`, `user-security-cards.tsx`, `(auth)/change-password`, forgot-password page, `no-email-reminder.tsx`. |
| Status | **CONFIRMED** (owner request, 2026-11-23) |

### DEC-055 — Per-user / per-IP rate limits behind the proxy

| Field | Value |
|-------|-------|
| Question | Throttling keyed on the socket address put every visitor in one bucket behind nginx/Cloudflare. |
| Decision | `trust proxy` (`TRUST_PROXY`, default private ranges) and `AppThrottlerGuard`: signed-in requests are tracked per user id (verified JWT), guests per client IP (`TRUSTED_CLIENT_IP_HEADER`, e.g. `cf-connecting-ip` when the origin only accepts Cloudflare traffic). A second `content` throttler caps question/exam content requests at `CONTENT_RATE_LIMIT_PER_10_MIN` (default 300) per user/IP to slow bulk scraping; hits are logged. Storage is in-memory (single API instance). |
| Impact | `backend/src/main.ts`, `app.module.ts`, `common/guards/app-throttler.guard.ts`. |
| Status | **CONFIRMED** (owner request, 2026-11-23) |

### DEC-056 — Shared exam UI for Quiz, Model Test and practice sets

| Field | Value |
|-------|-------|
| Question | Quiz/Model Test pages were long single-page sheets without navigation, review marks or a start screen. |
| Decision | One shared `frontend/src/features/exam-ui/` (start screen, one-question-at-a-time take screen with view-all toggle, sticky countdown + progress, navigator side panel / mobile bottom sheet, mark for review, clear answer, keyboard 1–4 / A–D / ←→, submit confirmation with unanswered count, result summary + All/Correct/Wrong/Skipped review). Behaviour changes: **Quiz may be submitted with unanswered questions** after the confirmation dialog (the API already accepted blanks; amends DEC-039's "answer every question" UI rule); **signed-in users press Start** before the timer begins (was: timer started on page open; amends DEC-045). Quiz "Wrong" is displayed as `wrongCount − skipped` so the three counts add up; scoring and API values are unchanged. Review correctness comes only from the API (`isCorrect` / `correctAnswer`), respecting DEC-051 locked answers. Progress stays in sessionStorage (survives refresh). |
| Impact | `features/exam-ui/*`, guest-exams, model-tests, practice-player, practice-set cards/list, `results/[id]`. No backend change. |
| Status | **CONFIRMED** (owner request, 2026-11-23) |

### DEC-057 — Unified Saved questions & PDFs view

| Field | Value |
|-------|-------|
| Question | Should the learner Saved page split MCQs and PDFs and expose folder switching? |
| Decision | **No.** `/bookmarks` shows saved MCQs and PDFs together in one newest-first list (merged client-side from the existing `/bookmarks/questions` and `/bookmarks/documents` streams), styled after the shared exam UI (DEC-056). Learners can open any item one at a time inline (question practice with Check answer; embedded PDF viewer) with Previous / Next, a numbered navigator (side panel ≥ lg, bottom sheet below) and ←/→ keys. The open item is kept in `?item=q:<id>|d:<id>` via `history.replaceState` (no reload). The folder sidebar and move-to-folder control are removed from this page *(folders restored by DEC-059)*; `BookmarkCollection` data and APIs (DEC-026) are unchanged and the Save dialog on question pages still offers folders. Answer keys still come only from `/questions/:id` entitlement (DEC-051). |
| Impact | `app/(app)/bookmarks/page.tsx`, `features/bookmarks/saved-*.ts(x)`. No schema or API change. |
| Status | **CONFIRMED** (owner request, 2026-11-24) |


### DEC-058 — Quiz and Model Test open in View All

| Field | Value |
|-------|-------|
| Question | Which layout should a timed Quiz / Model Test start in? |
| Decision | **View All** (every question on one scrolling page) for every new attempt, wherever it is started from. "One at a time" stays available from the header toggle. A refresh resumes the learner's last chosen mode; sessions saved before this change default to View All. Timer, scoring, submission and navigator are unchanged. Practice sets (`practice-player`) are not affected. Amends DEC-056. |
| Impact | `features/exam-ui/timed-sheet-player.tsx` only. |
| Status | **CONFIRMED** (owner request, 2026-11-24) |

### DEC-059 — Folders for saved MCQs and PDFs, View All sheet, exams from saved questions

| Field | Value |
|-------|-------|
| Question | Owner request: organize saved questions **and PDFs** in folders, filter by folder, read saved questions continuously, and take an exam from them. |
| Decision | **Folders:** PDFs join the existing private `BookmarkCollection` folders (nullable `document_bookmarks.collection_id`, `ON DELETE SET NULL`; existing PDF saves stay saved with no folder). The DEC-026 rule now covers both kinds: one bookmark per user+item, in one folder or none — re-saving to the same folder is a no-op (no duplicates), another folder moves it. Save picker (with "Create new folder") on question and PDF pages; rename/delete (with confirmation — items stay saved, unfiled) on the Saved page. **Saved page:** folder chips (All saved items / each folder / No folder) replace DEC-057's "no folders" layout; View All is the default and shows each saved MCQ's full stem and options, plus the key and explanation only when the API sends them (DEC-051); PDFs open in the inline reader; one-at-a-time mode stays. Each item has a folder menu. **Exam:** "Take exam" uses all saved MCQs or the selected folder (newest 200 max), the shared timed exam player (DEC-056/058, View All default, learner picks 1–180 min) and the Preli Practice result view. Scoring is stateless and server-side (`POST /bookmarks/questions/practice-score`): only the caller's own saved, published MCQs count, forged option ids count as skipped, keys only for entitled users, throttled 10/min. Results are kept in the browser tab like Preli Practice (no attempt history). Question images are not shown: no learner API exposes `Question.imageAssetId` yet. Amends DEC-026 and supersedes the folder removal in DEC-057. |
| Impact | Migration `20261124120000_document_bookmark_folders`; `bookmarks.service/controller/dto` (+ `SubscriptionsModule` import); frontend `app/(app)/bookmarks/**` (page, `exam`, `exam/result`, copy-protection layouts), `features/bookmarks/*` (folder bar, sheet card, saved exam, save dialog for PDFs), `PreliPracticeStartModal` / `PreliPracticeResultView` gained label props. |
| Status | **CONFIRMED** (owner request, 2026-11-24) |


### DEC-060 — Free vs Paid system with SSLCommerz payments

| Field | Value |
|-------|-------|
| Question | Replace the answer-gating subscription (DEC-051/052) with a sellable Free vs Paid plan and online payment. |
| Decision | **Access** (one place: `AccessPolicyService`, backend `billing/`): Admin → everything; **Paid System OFF** (site setting, default OFF) → everything for everyone and purchases blocked on the server; otherwise content marked free is open and the rest needs an **active subscription** (`disabledAt IS NULL AND startsAt ≤ now < endsAt`, checked per request — expiry needs no job). Moderators have no paid bypass. **What is locked:** Preli and Written sets after the first **N** (separate N per bank, default 10, admin-editable) in the public display order `questionDate DESC NULLS LAST, createdAt DESC, id DESC` over the **unfiltered** list — so newest N are free and a new upload shifts the window (owner-approved); Model Tests marked **PAID** (per-test Free/Paid toggle, existing tests migrated to FREE); `PREMIUM` documents. A bank MCQ inherits its set's lock (`/questions*`, `/public/questions`, saved-question details and saved exams skip locked ones). Topic Base, Quizzes, practice sets and other documents stay free. Locked items stay **listed** with `locked: true` (title only) and every content route answers **403 `CONTENT_LOCKED`** (`details[0].loginRequired`) without loading questions. Answer keys / explanations are **no longer gated** — open content includes them (reverses DEC-051). **Packages** (`subscription_packages`): name, duration MONTHLY / SIX_MONTHS / YEARLY (calendar months), price BDT (decimal), description, features, active, sort; soft-deleted once any order/subscription/event references them. **Subscriptions**: one row per user; buying while active adds the duration to the current end date; expired/disabled → restarts from now. Every change is logged in `subscription_events` (actor, source MANUAL / PAYMENT / MIGRATION, previous/new end) and audited. **Payments (SSLCommerz v4)**: `POST /payments/checkout {packageId}` — server reads price, snapshots amount/package on a PENDING `payment_orders` row with a random unique `tran_id`, opens a gateway session. success/fail/cancel/IPN are CSRF-free POST routes that trust nothing posted: a subscription is extended only after the **Order Validation API** says VALID/VALIDATED and tran_id, amount, currency (BDT) and store match the stored order; `verify_sign` is checked when present; `risk_level = 1` → RISK (held, admin can approve after review). Apply happens once: order row `FOR UPDATE` + `appliedAt` in the same transaction as the extension (user row locked too). A re-check loop in the API (every 10 min, `SKIP LOCKED` claims) and an admin **Re-check** button query the Transaction Query API for PENDING orders; orders with no gateway transaction after `PAYMENT_PENDING_EXPIRE_MINUTES` become FAILED. Every gateway request/response/callback is stored in `payment_gateway_logs` without the store password or signatures. Missing credentials → `503 PAYMENT_NOT_CONFIGURED` (no crash). |
| Migration | `20261124180000_paid_system_sslcommerz` (single transaction): copies every user with an ACTIVE legacy subscription ending in the future into the new table with the **same start / end dates**, logs every legacy row as a `MIGRATED` event, aborts if the carried-over count differs, then drops `subscription_plans`, `user_subscriptions` (old shape), `payments` and the unused trial columns. |
| Residual risk | The re-check loop runs inside the API process (not the BullMQ worker) so payment validation lives in one codebase; with several API replicas the `SKIP LOCKED` claim prevents double work and applying is idempotent anyway. Refunds are made in the SSLCommerz panel; "Mark refunded" only labels the order and does not revoke access (disable the subscription separately). |
| Impact | `backend/src/billing/*` (replaces `backend/src/subscriptions/*`), public / questions / bookmarks / model-tests / documents / auth / users / admin services, shared `billing.ts`, frontend `features/billing`, `/packages`, `/payment/*`, admin Packages / Paid system / Subscribers / Payments, lock UI on lists and detail pages, profile "My plan". |
| Status | **CONFIRMED** (owner approval 2026-11-24) |

### DEC-061 — 7-day free trial and Topic Base access

| Field | Value |
|-------|-------|
| Question | Topic Base was free and trials were removed by DEC-060. The owner now wants topic categories behind login, a 7-day trial for every account, and a paywall afterwards. |
| Decision | **Trial:** `users.trial_ends_at` (NOT NULL, DB default `now() + 7 days`, so every creation path uses server time). Existing accounts are backfilled with `created_at + 7 days` (owner chose sign-up date, so most existing accounts are already past their trial). A running trial is **full access everywhere** — same as an active subscription in `AccessPolicyService` (sets beyond N, PAID Model Tests, PREMIUM PDFs, Topic Base). `/users/me` → `access.{ isTrialActive, trialEndsAt, trialDaysLeft }` (days rounded up, computed by the API); the learner dashboard and profile show them. **Topic Base:** directory and set names stay public; `GET /public/topic-subcategories/:id/questions` and `/public/topic-sets/:id/questions` require a signed-in account **always** (also with the paid system OFF), then trial / subscription / Admin when the paid system is ON, else `403 CONTENT_LOCKED` (`loginRequired` true for guests). Topic set pages redirect signed-out visitors to `/login?next=<same page>` and show a paywall (plans, prices, **Subscribe Now** → SSLCommerz checkout) to signed-in users without access; a 403 from the API also shows the paywall. The web client refreshes an expired access cookie and retries once when a public route answers `CONTENT_LOCKED` with `loginRequired` while session cookies exist. |
| Impact | Migration `20261125090000_seven_day_trial`; `AccessPolicyService` (`TOPIC` kind, trial), `PublicController` topic routes, shared `UserAccessSnapshot`; frontend `TopicAccessGate`, `Paywall`, `TrialStatusCard`, `lib/api/client.ts`. Admin subscriber list still shows subscription state only (a trial user appears as Free). |
| Status | **CONFIRMED** (owner decisions 2026-11-25) |
### DEC-062 — Subscription lifecycle: 3-month plan, discounts, cancel / upgrade / downgrade, expiry reminders

| Field | Value |
|-------|-------|
| Question | The owner asked for 3-Month / 6-Month / 1-Year plans with full admin control, a learner billing page (upgrade, downgrade, cancel), an auto-renewal toggle with a consent modal, and 7- / 3-day reminder emails. |
| Owner answers (2026-11-25) | 1) SSLCommerz **tokenization / recurring is not enabled** → no automatic charging; use reminder emails + a one-click **Renew** button. 2) **3 Months replaces Monthly.** 3) **Upgrade** = pay now, the new plan's duration is added on top of the remaining time; **downgrade** = applied at the next renewal. |
| Decision | **Plans:** `PackageDuration` gains `THREE_MONTHS`; `MONTHLY` stays in the enum only for old orders / packages (admin can no longer choose it). Migration `20261125120100_three_month_plan` hides live Monthly packages and creates one "3 Months" package from the first of them at the **same per-month rate (price × 3)** — the admin should review that price. Packages gain `discounted_price_bdt` (must be below `price_bdt`; checkout charges `discounted ?? price`) and `is_popular` (badge). **Lifecycle** (`user_subscriptions`): `cancel_at_period_end` + `canceled_at` (learner will not renew; access runs to `ends_at`), `scheduled_package_id` (downgrade; the Renew button buys it), `reminder_7d_sent_at` / `reminder_3d_sent_at`. Plan change kind (`classifyPlanChange`): longer plan, or same length at a higher effective price = UPGRADE (normal checkout, applies at once, time added on top); otherwise DOWNGRADE (scheduled only). Any successful purchase clears cancel + scheduled change and the reminder flags; every change of `ends_at` (purchase, admin grant / extend / set end) clears the reminder flags. New `subscription_events.action` values `CANCEL`, `RESUME`, `SCHEDULE_CHANGE`, `CLEAR_SCHEDULED_CHANGE`. **Reminders:** `SubscriptionRemindersService` (API, hourly timer, also `POST /admin/subscriptions/reminders/run`) emails learners with a **verified** email when an ACTIVE plan ends within 7 days (then within 3 days); each reminder is claimed by a conditional UPDATE on its flag + the same `ends_at`, and the BullMQ jobId is `subscription-reminder-<sub>-<window>d-<endsAtMs>`, so no duplicates across replicas or re-runs. Skipped while the paid system is OFF. |
| Not built (by the owner's answer) | **Auto-renewal toggle + consent modal** (`autoRenewEnabled`, `autoRenewConsentAt`): there is nothing to auto-charge without SSLCommerz recurring, and a toggle promising automatic charges would be misleading. All copy says "you are never charged automatically". Revisit (NEEDS APPROVAL) when tokenization is enabled on the merchant account. |
| Rollback note | After `20261125120100_three_month_plan`, a `THREE_MONTHS` package exists; app versions before DEC-062 cannot read that enum value (Prisma) and their `/public/packages` would fail. Before rolling back below this version, deactivate / soft-delete 3-month packages (or restore the pre-deploy backup). |
| Impact | Migrations `20261125120000_subscription_lifecycle`, `20261125120100_three_month_plan`; `PackagesService`, `SubscriptionsService`, `SubscriptionRemindersService`, `BillingController` (`/me/subscription/*`), admin controller; worker `subscription-reminder` email; frontend `/billing` (My Subscription), pricing card (discount + Popular), admin package form, subscriber pages. |
| Status | **CONFIRMED** (owner decisions 2026-11-25) |
### DEC-063 — 7-day trial applies to Topic Base only

| Field | Value |
|-------|-------|
| Question | DEC-061 made the 7-day trial full access to the whole site. The owner wants no site-wide trial: the 7 free days should apply **only** to Topic-Based questions, and every other section must keep its exact Free / Paid plan rules. |
| Decision | `AccessPolicyService.resolve`: `fullAccess = isAdmin \|\| isPaid \|\| !paidSystemEnabled` (trial removed). `canAccess({ kind: 'TOPIC' })`: login required → full access → else `isTrialActive`. All other kinds are unchanged, so trial users see the normal free plan (first N sets, FREE Model Tests, non-PREMIUM PDFs, …). `UserAccessSnapshot.topicAccess` (= signed in and (`fullAccess` or trial)) drives the web `TopicAccessGate`; the API enforces the same rule on `/public/topic-subcategories/:id/questions` and `/public/topic-sets/:id/questions`. No schema change (`users.trial_ends_at` is reused). Dashboard / profile / paywall copy now says "Topic-Based free access". |
| Impact | `access-policy.service.ts` (+ tests), shared `UserAccessSnapshot`, frontend `topic-access-gate.tsx`, `trial-status-card.tsx`, `my-plan-card.tsx`, `paywall.tsx`. Amends DEC-061. |
| Status | **CONFIRMED** (owner request 2026-11-25) |
### DEC-064 — IBA (5-option) Preli bulk upload

| Field | Value |
|-------|-------|
| Question | IBA exam questions have 5 options (A–E); the Preli bulk upload only handled 4. The owner asked to add IBA support without changing the existing flow. |
| Decision | Upload page checkbox **IBA Questions (5 options)**, off by default. Off = existing parser, validation, template and import exactly as before (a `ঙ` / `option_e` column is ignored; answer E stays invalid). On = `ঙ` (option E) column required, all five options and an answer ক–ঙ / A–E required; failing rows are INVALID with a reason and skipped, valid rows import. Questions get a 5th `question_options` row (label `E`) and the `iba` exam tag (existing `exam_tags`; no new question column — options are rows, not columns). Staging: `question_upload_batches.is_iba`, `question_import_rows.option_e` (migration `20261126090000_iba_five_option_import`, manual rollback in its `down.sql`). Parser additions apply to both modes but cannot change accepted files: UTF-8 BOM stripped from headers, snake_case headers `option_a…option_e` / `correct_answer` recognised. Single-question form: "IBA question" checkbox shows Option E and sets / clears the `iba` tag (`isIba` on create / update; omitted = unchanged). Learner views label the 5th option ঙ. Import keeps its existing 25-row transaction chunks. Model Tests and timed Exams (own 4-option storage and uploads) are unchanged. |
| Status | **CONFIRMED** (owner approval 2026-11-26) |
### DEC-065 — Homepage "Access & Pricing" Free vs Paid cards (admin-editable, display only)

| Field | Value |
|-------|-------|
| Question | The homepage access section only had free-text highlights (and outdated "paid plans coming later" copy). The owner wants Free vs Paid plan cards that match what the system enforces, editable from the dashboard. |
| Decision | New table `plan_features` (`plan_key` FREE / PAID, `label` ≤ 200, `is_included`, `sort_order`, `is_active`), seeded by its migration with the list derived from `AccessPolicyService`. Labels may contain `{preliFreeSets}`, `{writtenFreeSets}`, `{topicTrialDays}`, filled from live settings (`TOPIC_TRIAL_DAYS` = 7, the DB trial default) — Bangla digits for Bangla labels. `GET /public/plan-comparison` (no-cache) returns active rows, the paid switch, whether SSLCommerz is configured, and the cheapest active package (shown as "৳X / 3 months" + "See all plans"). Homepage cards: Free (CMS CTA, default "Start Free") and Paid ("Recommended"); logged-in learners see "Current Plan" on their plan; the Paid button is "Upgrade" → /packages when payments are configured, otherwise "Contact us to upgrade", which opens the existing support chat; with the paid system OFF a notice says everything is free and there is no Upgrade button. On API error or with no active rows the section renders its previous layout unchanged. Heading / intro / Free-card CTA / FAQ stay in Admin → Homepage (no duplicate settings record). Admin → Pricing & Plan Features (`subscriptions` permission) adds / edits / hides / deletes / reorders rows. Built-in homepage defaults updated: paid plans are live; free users see answers and explanations in every set they can open. Published homepage content is untouched. |
| Not used for | Access control — labels never grant or deny anything. |
| Status | **CONFIRMED** (owner approval 2026-11-26) |
### DEC-066 — Technical SEO: dynamic sitemap, crawlable bank pages, canonical host

| Field | Value |
|-------|-------|
| Problem | Search Console could not use the sitemap / did not index the Preli and Written bank pages. The sitemap was valid but listed only 10 static URLs; robots.txt blocked `/api/`, so Googlebot could not load the public data client-rendered pages fetch; the bank pages had no H1, no canonical and no server-rendered list; ~750 set pages shared one default title; `www` served duplicate pages with 200. |
| Decision | `sitemap.xml` built from the public API hourly (static landing pages + free Preli / Written sets, PUBLIC PDFs, quizzes, free Model Tests); locked sets, login-only PDFs and Topic-Based sets are excluded and locked / unknown set pages send `noindex, follow`. robots.txt allows `/api/v1/public/`, `/api/v1/categories`, `/api/v1/news/`, `/api/pdf/` (blocks `/api/pdf/auth/`, `/payment/`). Bank pages server-render an H1, intro and the first 20 collections (client refetches with the viewer's session; filters unchanged). Public layout sets a self-referencing canonical (query strings dropped). Per-set / per-PDF / per-article titles, descriptions and BreadcrumbList; Organization + WebSite on the homepage; Article only for real news articles. nginx 301s `www` (http and https) to `https://youracademy.com.bd` in one hop. |
| Status | **CONFIRMED** (owner request 2026-11-26) |
### DEC-067 — Activity KPIs, user lookup, richer audit log, log retention

| Field | Value |
|-------|-------|
| Decision | **Activity:** `GET /admin/activity/kpis` (registrations 24h/7d/30d, online now + 5 min, DAU = heartbeat or activity in 24h, active paid / free, first-purchase conversions 7d/30d), `GET /admin/activity/users/lookup` (full UUID exact, UUID prefix via parameterized `id::text LIKE`, else name / email / WhatsApp; never 500), feed filters `plan` (FREE/PAID) and `role`; malformed `userId` → 400. New `LearningActivityType` values REGISTER, PASSWORD_CHANGE, PROFILE_UPDATE, SUBSCRIPTION, MODEL_TEST_SUBMIT, QUIZ_SUBMIT, SET_VIEW (set views at most once per user + set per 30 min). **Audit:** `audit_logs` gains `actor_role`, `severity` (INFO/WARNING/CRITICAL, derived from the action when not given) and `user_agent`; a global `StaffAuditInterceptor` records every successful staff POST/PUT/PATCH/DELETE under `/api/v1/admin` (route, target id, redacted body summary, IP, UA). User events: USER_REGISTER, AUTH_LOGIN, AUTH_LOGIN_FAILED (masked number + reason), PASSWORD_RESET_REQUESTED, PASSWORD_CHANGE, EMAIL_CHANGE, SUBSCRIPTION_PURCHASE / CANCEL / RESUME / SCHEDULE_CHANGE. Non-UUID audit targets go to `metadata.targetRef` (they previously failed silently). `GET /admin/audit` filters: scope (staff/user), q (actor name / WhatsApp / User ID), action, severity, from/to; `GET /admin/audit/actions`. **Retention:** `POST /admin/logs/purge/preview` and `POST /admin/logs/purge` (audit, activity or both; older than 90 days, before a date, or a range; body `confirm: "DELETE"`; Admin role re-checked; writes an un-purgeable CRITICAL `LOGS_PURGED` entry). Optional daily automatic 90-day purge with `LOG_RETENTION_AUTO_PURGE=true` (off by default). Migration `20261126150000_audit_activity_upgrade` (expand-only, `down.sql`). |
| Rollback note | Older app versions cannot read the new `LearningActivityType` values; rolling back below this release breaks the activity feed until those rows are removed. |
| Status | **CONFIRMED** (owner request 2026-11-26) |
### DEC-068 — Three paid plans, package admin rules, four-card pricing

| Field | Value |
|-------|-------|
| Decision | Migration `20261126170000_three_paid_plans` adds 6 Months (৳449) and 1 Year (৳899, Recommended) only if those durations are missing, marks exactly one package Recommended, and replaces the 3 Months placeholder text only while it still equals the test text (ID, price, subscribers untouched). Admin → Packages: up/down reorder (`POST /admin/packages/reorder`), saving a Recommended package unmarks all others (same transaction), delete only for packages with no orders / subscriptions / history — otherwise `409 PACKAGE_IN_USE` and the admin is offered Deactivate (hidden from homepage and /packages, records kept). Homepage: Free + one card per active package in admin order; paid features = shared Paid `plan_features` + the package's extras (deduplicated); savings vs the 3 Months per-month price; "Recommended" only on the admin-marked package; "Upgrade" starts checkout for that package (logged-out → login, then /packages); no generic Paid card when nothing is on sale. Renewal adds the remaining days (`SubscriptionsService.extendWithin` starts from the current end date while the plan runs). |
| Status | **CONFIRMED** (owner approval 2026-11-26) |
### DEC-069 — All public marketing text editable in the homepage CMS

| Field | Value |
|-------|-------|
| Decision | No new table or second system: new keys in the existing homepage CMS payload (`homepage_content`, draft → publish → revisions → `homepage` cache purge). Added: `hero.quickLinks` + `quickLinksLabel`; `liveStats.labels`; `sampleMcq.label / heading / bullets / emptyTitle / emptyDescription`; `dashboardPreview.tiles` (4, icons by position); `accessFaq.pricing` (every plan-card label — prices, per-month and savings stay computed); `footer` (tagline, Account heading + links, help note, copyright); `pageHeaders` for `/preli-question-bank`, `/written-question-bank`, `/model-test`, `/exams`, `/news`, `/packages`, `/written-question-bank-categories` (eyebrow, H1, intro, SEO title + description). Defaults live in the shared schema **at field level** and equal the previous live text, so stored payloads without these keys render unchanged — no data migration (owner choice). Links must be internal paths or `https://`. Admin → Homepage panels edit the section fields (with links to Packages and Pricing Features and a per-section Preview link); new **Admin → Page Headers & Footer** edits `pageHeaders` + `footer`, merging into the latest draft. Pages read the *published* payload server-side via `lib/site-content.ts` and fall back to the defaults on missing content or API failure; publishing also revalidates the seven listing paths. |
| Status | **CONFIRMED** (owner approval 2026-11-26) |
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
