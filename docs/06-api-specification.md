# 06 — API Specification

Base URL: `/api/v1`  
Style: REST + JSON  
Docs: Swagger UI at `/api/docs` (non-production or protected in production)

## 1. Conventions

### 1.1 Success envelope

```json
{
  "success": true,
  "data": {},
  "meta": { "requestId": "…" }
}
```

List responses:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "requestId": "…",
    "pagination": {
      "nextCursor": "string|null",
      "prevCursor": "string|null",
      "limit": 20,
      "total": null
    }
  }
}
```

Prefer **cursor** pagination for questions. Offset allowed for small admin tables.

### 1.2 Error envelope

```json
{
  "success": false,
  "error": {
    "code": "QUESTION_NOT_FOUND",
    "message": "Human-readable message",
    "details": []
  },
  "meta": { "requestId": "…" }
}
```

| HTTP | Usage |
|------|--------|
| 400 | Malformed request |
| 401 | Unauthenticated |
| 403 | Authenticated but forbidden |
| 404 | Not found (no existence leak where required) |
| 409 | Conflict (duplicate WhatsApp, duplicate bookmark) |
| 422 | Validation failed |
| 429 | Rate limited |
| 500 | Unexpected |

### 1.3 Auth header / cookies (DEC-012 CONFIRMED)

- **Web:** `access_token` and `refresh_token` as HTTP-only Secure SameSite=`Lax` cookies; `csrf_token` (readable) for double-submit CSRF.
- Mutating browser requests must send `X-CSRF-Token` matching the CSRF cookie.
- Frontend uses `credentials: 'include'`.
- **Also supported:** `Authorization: Bearer <access>` for Swagger, tests, and non-browser clients.

---

## 2. Endpoint Inventory

Auth roles: `Public`, `User`, `Admin`. Entitlement notes apply inside handlers.

### 2.1 Auth

> **Roles (DEC-048):** `ADMIN` rows below also mean "or a role granted that section in `ROLE_PERMISSIONS`". Moderators may call `/admin/{questions,question-imports,written-question-imports,topic-question-imports,categories,exams,practice-sets,model-tests,news,documents}/*`; every other `/admin/*` route is Admin-only (`403 FORBIDDEN`).

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/auth/register` | Register + start trial | Public | — |
| POST | `/auth/login` | Login | Public | — |
| POST | `/auth/logout` | Revoke session | User | USER/ADMIN |
| POST | `/auth/refresh` | Rotate refresh | Cookie/body | — |
| POST | `/auth/change-password` | Change password | User | USER/ADMIN |
| POST | `/auth/forgot-password` | Start email reset (DEC-004) | Public | — |
| GET | `/auth/session` | Liveness check for the one-device rule; 401 `SESSION_REPLACED` when a newer login took over (DEC-053) | Learner/Staff | — |
| POST | `/auth/session/clear` | Clear auth cookies after `SESSION_REPLACED` (CSRF required, no session needed) | Public | — |
| POST | `/auth/reset-password` | Complete reset | Public | — |
| POST | `/auth/verify-email` | Confirm email via emailed token (DEC-048) | Public | — |

`forgot-password` body: `{ "email": "…" }` or `{ "whatsappNumber": "…" }` lookup that resolves to a user email for delivery — prefer email identifier for reset requests. Always returns generic success.

**POST `/auth/register` request**

```json
{
  "name": "string",
  "whatsappNumber": "+8801…",
  "password": "string",
  "email": "string|optional"
}
```

Profile picture: separate upload after auth or multipart field if approved.

**Responses:** `201` user + tokens; `409` duplicate WhatsApp; `422` validation.

**POST `/auth/login` request:** `{ "whatsappNumber", "password" }` → tokens + user summary including `trialEndsAt`, `entitlements` summary.

---

### 2.2 Users / Profile

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/users/me` | Own profile (+ `study` prefs: interests, onboarding, last question) | User | USER/ADMIN |
| PATCH | `/users/me` | Update profile | User | USER/ADMIN |
| PATCH | `/users/me/study-prefs` | Update preferred categories / continue pointer / onboarding flag | User | USER/ADMIN |
| POST | `/users/me/avatar` | Avatar upload init/complete | User | USER/ADMIN |
| POST | `/users/me/email/verification` | Re-send email confirmation link (3/min) | User | any |
| GET | `/users/me/stats` | Personal dashboard stats (bookmark counts, browsing seconds, recent saves) | User | USER/ADMIN |
| GET | `/admin/users` | List users (enriched: online, attempts, trial/sub; cursor/`q`/`status`/`role`/`createdFrom`/`createdTo`) | User | ADMIN |
| POST | `/admin/users` | Create staff account `{ name, whatsappNumber, password, role: ADMIN\|MODERATOR }` → `409 WHATSAPP_EXISTS` | User | ADMIN |
| PATCH | `/admin/users/:id` | Edit staff `{ name?, whatsappNumber?, email? }` (changed email → unverified) | User | ADMIN |
| PATCH | `/admin/users/:id/role` | `{ role }` → `403 CANNOT_CHANGE_OWN_ROLE`, `409 LAST_ADMIN` | User | ADMIN |
| POST | `/admin/users/:id/reset-password` | `{ newPassword }` — moderators only; revokes sessions (legacy; UI uses the routes below) | User | ADMIN |
| POST | `/admin/users/:id/password-reset/email` | `{ email? }` — save/confirm email, send standard reset email → `{ email, emailChanged, expiresAt }` (DEC-054) | User | ADMIN |
| POST | `/admin/users/:id/password-reset/link` | One-time reset link for WhatsApp → `{ resetUrl, expiresAt, whatsappNumber, name }` | User | ADMIN |
| POST | `/admin/users/:id/password-reset/temporary` | `{ password? }` → `{ temporaryPassword \| null, generated }`; forces change at next sign-in, revokes sessions | User | ADMIN |
| GET | `/admin/users/:id/password-reset/history` | Recent reset/password-change audit entries | User | ADMIN |
| GET | `/admin/users/:id/logins` | Recent sign-ins (device, IP, active/ended reason) (DEC-053) | User | ADMIN |
| POST | `/admin/users/:id/force-logout` | Revoke every active session → `{ sessionsRevoked }` | User | ADMIN |
| GET | `/admin/users/:id` | User detail (profile, study stats, sessions, observed engagement, recent events; subscription read-only) | User | ADMIN |
| PATCH | `/admin/users/:id/status` | Suspend/reinstate (any role; not self → `403`, not last admin → `409 LAST_ADMIN`; suspend revokes sessions) | User | ADMIN |
| DELETE | `/users/me` | Delete own account | User | USER/ADMIN |

---

### 2.3 Categories

Scoped taxonomies (DEC-041): `PRELIMINARY` (default) vs `WRITTEN`. Unique `(scope, slug)`.

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/categories` | Active tree (`?scope=PRELIMINARY\|WRITTEN`; default PRELIMINARY) | Public | — |
| GET | `/public/stats` | Published counts (questions/categories/news/documents) | Public | — |
| GET | `/public/documents` | Published `PUBLIC` documents for পত্রিকার গুরুত্বপূর্ণ কলাম (`cursor`, `limit`, `q`) | Public | — |
| GET | `/public/documents/:id` | Public document metadata + `view.available` (no storage URLs) | Public | — |
| GET | `/public/documents/:id/file` | PDF bytes proxy for in-app viewer (`Content-Disposition: inline`; no attachment) | Public | — |
| GET | `/documents/:id/file` | Authenticated in-app PDF bytes (inline; no signed download URL) | User | — |
| GET | `/public/questions` | Published MCQ cards (options; `correctAnswerLabel`/`correctAnswerBn` **only for entitled viewers**, DEC-051), `createdAt DESC`, cursor pagination + filters (`q`, `categoryId`, `subcategoryId`, `examTag`, `difficulty`, `uploadBatchId`). Anonymous: shared cache; signed-in: `private, no-store` | Public (+ optional JWT) | — |
| GET | `/public/question-sets` | Upload-based Question Sets (completed/archived batches with published MCQs), newest first; filters: `q`, `categoryId`, `subcategoryId`, `year` — taxonomy IDs must be `PRELIMINARY` scope or the filter returns empty | Public | — |
| GET | `/public/question-sets/years` | Distinct exam years for Preli bank year chips | Public | — |
| GET | `/public/question-sets/:id` | Question Set metadata (`sheetPreamble`, `examYear`, `placements`) | Public | — |
| GET | `/public/question-sets/:id/questions` | MCQs in a set in original upload `rowNumber` order (`sourceSerial`, `sectionTitle`; no category badge under stem); answer key only for entitled viewers (DEC-051) | Public (+ optional JWT) | — |
| POST | `/public/question-sets/:id/practice-score` | DEC-051 server-side Preli Practice scoring. Body `{ answers: { [questionId]: optionId } }` (unknown ids ignored). Returns `PublicPracticeScore`: `totalQuestions`, `correctCount`, `wrongCount`, `skippedCount`, `score`, `percent`, `answersVisible`, `answerSheet[{ id, selectedOptionId, isSkipped, isCorrect?, correctOptionId?, correctAnswerLabel? }]` — optional fields only when entitled. Throttled 10/min | Public (+ optional JWT) | — |
| GET | `/public/written-question-sets` | Written Question Sets (DEC-040); same filters as Preli — taxonomy IDs must be `WRITTEN` scope | Public | — |
| GET | `/public/written-question-sets/years` | Distinct years for Written bank year filter | Public | — |
| GET | `/public/written-question-sets/:id` | Written set metadata | Public | — |
| GET | `/public/written-question-sets/:id/questions` | Written questions in upload order (marks; `modelAnswer` only for entitled viewers and `q` searches it only for them — DEC-051) | Public (+ optional JWT) | — |
| GET | `/public/homepage` | Published homepage CMS payload + hero image URL (DEC-038; Cache-Control max-age=60) | Public | — |
| GET | `/public/social-links` | Enabled footer social links ordered by `sortOrder` (DEC-046) | Public | — |
| GET | `/admin/social-links` | All social links (including disabled) | User | ADMIN |
| POST | `/admin/social-links` | Create social link (unique platform) | User | ADMIN |
| PATCH | `/admin/social-links/:id` | Update URL / label / enabled / sortOrder | User | ADMIN |
| DELETE | `/admin/social-links/:id` | Delete social link | User | ADMIN |
| PUT | `/admin/social-links/reorder` | Replace sort order (`orderedIds` must list every id) | User | ADMIN |
| GET | `/admin/homepage` | Draft + published homepage CMS documents | User | ADMIN |
| PUT | `/admin/homepage/draft` | Replace draft payload (+ optional `heroImageAssetId`); normalizes `layout.sections` + tiles | User | ADMIN |
| POST | `/admin/homepage/publish` | Copy draft → published; snapshot `HomepageRevision`; invalidate public cache | User | ADMIN |
| POST | `/admin/homepage/restore` | Copy published → draft (discard unpublished draft edits) | User | ADMIN |
| GET | `/admin/homepage/revisions` | List recent homepage revision summaries (`?limit=`) | User | ADMIN |
| POST | `/admin/homepage/revisions/:id/restore` | Load revision payload into draft | User | ADMIN |
| GET | `/admin/categories` | Admin tree including inactive + usage counts (`?scope=`) | User | ADMIN |
| POST | `/admin/categories` | Create category/subcategory (`parentId`, `scope`); slug optional (auto); child inherits parent scope | User | ADMIN |
| PATCH | `/admin/categories/:id` | Update name/description/status/parent (no cross-scope moves) | User | ADMIN |
| POST | `/admin/categories/:id/activate` | Set active | User | ADMIN |
| POST | `/admin/categories/:id/deactivate` | Soft-hide from public dropdowns | User | ADMIN |
| DELETE | `/admin/categories/:id` | Soft-deactivate; `?hard=true` permanent delete only when unused | User | ADMIN |

Categories used for question filters require authentication (DEC-003).

---

### 2.4 Questions (Learner)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/questions` | Published list + filters | User | USER/ADMIN |
| GET | `/questions/:id` | Detail (answer fields gated) | User | USER/ADMIN |
| GET | `/questions/:id/navigation` | prev/next ids | User | USER/ADMIN |

Question endpoints require authentication (DEC-003). Guests receive `401`.

Query params for list: `cursor`, `limit`, `categoryId`, `subcategoryId`, `difficulty`, `q`, `examTag`, `sort=publishedAt_desc`.

**Question detail `data` shape (entitled):**

```json
{
  "id": "uuid",
  "title": "…",
  "content": "…",
  "difficulty": "MEDIUM",
  "category": { "id": "…", "name": "…" },
  "subcategory": null,
  "options": [
    { "id": "…", "label": "A", "content": "…", "isCorrect": true }
  ],
  "explanation": "…",
  "image": { "url": "…" },
  "publishedAt": "…"
}
```

**Same for non-entitled:** omit `explanation`; each option **omits** `isCorrect` (never send `false` either — absence only). Do not send `correctOptionId`.

---

### 2.5 Questions (Admin)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/admin/questions` | All statuses | User | ADMIN |
| POST | `/admin/questions` | Create draft | User | ADMIN |
| GET | `/admin/questions/:id` | Full detail incl. answers | User | ADMIN |
| PATCH | `/admin/questions/:id` | Update | User | ADMIN |
| POST | `/admin/questions/:id/publish` | Publish with validation | User | ADMIN |
| POST | `/admin/questions/:id/archive` | Archive | User | ADMIN |
| DELETE | `/admin/questions/:id` | Soft delete | User | ADMIN |

**Publish errors:** `422` if &lt;2 options or ≠1 correct.

---

### 2.5a Question imports (Admin, DEC-024)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/admin/question-imports/template` | Download Bangla Google Sheets `.xlsx` template (`প্রশ্ন নং…উত্তর`); `?iba=1` → IBA 5-option template (adds `ঙ` after `ঘ`) — DEC-064 | User | ADMIN |
| GET | `/admin/question-imports` | List batches (`status`, `q`, cursor) | User | ADMIN |
| POST | `/admin/question-imports/upload` | Multipart `file` + `displayName`/`subjectHint`/`topicHint` + optional `placementSubcategoryIds` (JSON array, max 8) for multi-slot homepage/bank placement. Optional `isIba=true` (DEC-064): 5 options ক–ঙ / A–E all required, answer A–E required; invalid rows are listed and skipped. Absent = unchanged 4-option rules (`ঙ` / `option_e` column ignored) | User | ADMIN |
| GET | `/admin/question-imports/:id` | Batch summary + duplicate-file warning | User | ADMIN |
| GET | `/admin/question-imports/:id/rows` | Preview rows (`status` filter) | User | ADMIN |
| POST | `/admin/question-imports/:id/confirm` | `{ skipDuplicates?: true }` import valid rows | User | ADMIN |
| GET | `/admin/question-imports/:id/file` | Download original upload | User | ADMIN |
| GET | `/admin/question-imports/:id/report` | Excel validation/import report | User | ADMIN |
| GET | `/admin/question-imports/:id/export` | Export imported questions to Excel | User | ADMIN |
| PATCH | `/admin/question-imports/:id/archive` | Archive batch (questions kept) | User | ADMIN |
| DELETE | `/admin/question-imports/:id` | Delete non-completed batch | User | ADMIN |

Duplicate file (`409 DUPLICATE_FILE`) when the same SHA-256 was already **completed**. Row-level duplicates use `contentHash` = SHA-256 of normalized question text **and** correct-answer content (same stem with a different correct option is not a duplicate).

### 2.5b Written Question Bank imports (DEC-040)

Parallel to Preli bulk upload. Template columns: `প্রশ্ন নং | প্রশ্ন | পরীক্ষার নাম ও সাল | প্রশ্নের তারিখ | নম্বর | মডেল উত্তর`. Accepts `.xlsx` / `.csv` / `.docx` (Word template table, **real exam papers** with `০১।` + `ক)–ঙ)` sub-lines, or labeled blocks). Legacy `.doc` rejected (`LEGACY_DOC_NOT_SUPPORTED`). Exam-paper uploads may omit form `questionDate` when the file header/filename supplies it.

| Method | Path | Description | Auth | Roles |
|--------|------|-------------|------|-------|
| GET | `/admin/written-question-imports/template` | Download written `.xlsx` template (`?format=docx` for sample Word guide) | User | ADMIN |
| GET/POST/PATCH/DELETE | `/admin/written-question-imports…` | Same lifecycle as `/admin/question-imports` (list, upload, rows, confirm, file, report, export, archive, delete) | User | ADMIN |

---

### 2.5d Topic Base Question Analysis (DEC-042)

Separate TOPIC taxonomy + MCQ bank. Excel template (8 columns): `প্রশ্ন নং | প্রশ্ন | পরীক্ষার নাম ও সাল | ক | খ | গ | ঘ | উত্তর`. Upload is lenient (no duplicate / validation rejection). Marketing navbar unchanged.

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/categories?scope=TOPIC` | Topic category tree (includes `iconKey`) | Public | — |
| GET | `/public/topic-directory` | Topic roots + nested Sub/Child folders | Public | — |
| GET | `/public/topic-subcategories/:id` | Topic folder meta for L1 Category, L2 Sub, or L3 Child (`level`) | Public | — |
| GET | `/public/topic-subcategories/:id/sets` | Title-first Topic collections for a **leaf** Sub/Child (`cursor`, `limit`; empty for Category or Sub with children) | Public | — |
| GET | `/public/topic-subcategories/:id/questions` | Cursor-paginated topic MCQs for that folder (legacy/folder dump; prefer sets); answer key only for entitled viewers (DEC-051) | Public (+ optional JWT) | — |
| GET | `/public/topic-sets/:id` | Topic upload-batch meta | Public | — |
| GET | `/public/topic-sets/:id/questions` | Cursor-paginated MCQs for one Topic collection (`q`); answer key only for entitled viewers (DEC-051) | Public (+ optional JWT) | — |
| GET | `/admin/topic-question-imports` | Topic batches (`cursor`, `limit`, optional `q`) | User | ADMIN |
| GET | `/admin/topic-question-imports/template` | 8-column Excel template | User | ADMIN |
| GET | `/admin/topic-question-imports/:id` | Topic batch detail (admin) | User | ADMIN |
| PATCH | `/admin/topic-question-imports/:id` | Update title + Category/Sub/Child (cascades to questions) | User | ADMIN |
| GET | `/admin/topic-question-imports/:id/questions` | Paginated Topic questions in the batch | User | ADMIN |
| POST | `/admin/topic-question-imports/:id/questions` | Add a question to the batch | User | ADMIN |
| PATCH | `/admin/topic-question-imports/:id/questions/:questionId` | Update a Topic question | User | ADMIN |
| DELETE | `/admin/topic-question-imports/:id/questions/:questionId` | Delete a Topic question | User | ADMIN |
| PATCH | `/admin/topic-question-imports/:id/archive` | Archive batch | User | ADMIN |
| DELETE | `/admin/topic-question-imports/:id` | Delete batch (+ cascade questions) | User | ADMIN |
| POST | `/admin/topic-question-imports/upload` | Multipart import (`file`, `categoryId`, `subcategoryId`, optional `childCategoryId`, `displayName`) | User | ADMIN |

Marketing UI: homepage Top 4 + Others → `/topic-categories` folder explorer. Leaf Sub/Child shows collection **titles**; `/topic-base/sets/:id` opens questions.

### 2.5c Public guest exams (DEC-039)

Quizzory-style timed exams with name-only entry. Separate from bank `Question` / PracticeSet. Correct answers are omitted until after submit; results include the key (DEC-060).

Admin Excel template (7 columns): `প্রশ্ন নং | প্রশ্ন | ক | খ | গ | ঘ | উত্তর`. `উত্তর` must be `a`/`b`/`c`/`d` (case-insensitive) or Bangla `ক`/`খ`/`গ`/`ঘ`; the API stores the resolved option text. `প্রশ্ন নং` is optional reference only. Row-level validation errors are returned on `EXCEL_PARSE_FAILED`.

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/public/exams` | Published exams (`q`, `cursor`, `limit`; `createdAt DESC`) | Public | — |
| GET | `/public/exams/meta/guide` | Quiz listing sidebar guide (`title` + ordered `items`) | Public | — |
| GET | `/public/exams/:idOrSlug` | Exam + questions (no correct answers / explanations) | Public | — |
| POST | `/public/exams/:idOrSlug/attempts` | Submit answers (`userName` required for guests; optional when JWT present — uses account name + sets `userId`); scores server-side | Public (+ optional JWT) | — |
| GET | `/public/exams/attempts/:attemptId` | Result: score/totals + own `selectedAnswer` per question + `answersVisible`. `correctAnswer` / `explanation` / `isCorrect` only for entitled viewers (DEC-051); `private, no-store` | Public (+ optional JWT) | — |
| GET | `/me/timed-attempts` | Linked public Quiz + Model Test attempts for the signed-in user | Auth | — |
| POST | `/me/timed-attempts/claim` | Attach a guest attempt (`kind`, `attemptId`) to the current user after register | Auth | CSRF |
| GET | `/admin/exams` | Admin list (`cursor`, `limit`) | User | ADMIN |
| GET | `/admin/exams/guide` | Quiz listing sidebar guide config | User | ADMIN |
| PUT | `/admin/exams/guide` | Replace guide title + ordered steps | User | ADMIN |
| GET | `/admin/exams/template` | 7-column Excel template download | User | ADMIN |
| POST | `/admin/exams/upload` | Multipart create (`title`, `description`, `durationInMinutes`, `.xlsx` file) | User | ADMIN |

### 2.5a Public guest Model Tests (DEC-040)

Parallel to guest exams. Header row may follow title/date preamble rows. Same 7-column template; `উত্তর` = `a`–`d` or `ক`–`ঘ`. Attempt results include `skippedCount`.

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/public/model-tests` | Published list (`q`, `year`, `categoryId`, `cursor`, `limit`) | Public | — |
| GET | `/public/model-tests/meta/years` | Distinct published years for filters | Public | — |
| GET | `/public/model-tests/meta/categories` | Categories with ≥1 published Model Test | Public | — |
| GET | `/public/model-tests/meta/guide` | Listing sidebar guide (`title` + ordered `items`) | Public | — |
| GET | `/public/model-tests/:idOrSlug` | Detail + questions (no answers) | Public | — |
| POST | `/public/model-tests/:idOrSlug/attempts` | Submit answers; optional JWT attaches `userId` + account name (DEC-045) | Public (+ optional JWT) | — |
| GET | `/public/model-tests/attempts/:attemptId` | Result: same shape and DEC-051 gating as guest exam results (`answersVisible`) | Public (+ optional JWT) | — |
| GET | `/admin/model-tests` | Admin list (`cursor`, `limit`) | User | ADMIN |
| GET | `/admin/model-tests/categories` | All Model Test categories | User | ADMIN |
| POST | `/admin/model-tests/categories` | Create category (`name`) | User | ADMIN |
| GET | `/admin/model-tests/guide` | Listing sidebar guide config | User | ADMIN |
| PUT | `/admin/model-tests/guide` | Replace guide title + ordered steps | User | ADMIN |
| GET | `/admin/model-tests/template` | 7-column Excel template (with sample preamble) | User | ADMIN |
| POST | `/admin/model-tests/upload` | Multipart create (`categoryId` optional) | User | ADMIN |
| PATCH | `/admin/model-tests/:id` | Update meta / publish flag | User | ADMIN |
| DELETE | `/admin/model-tests/:id` | Delete model test + questions/attempts | User | ADMIN |

---

### 2.5b Practice sets (DEC-023)

Timed/untimed quizzes and model tests built from published questions. Review payloads still strip answers/explanations when the learner is not entitled.

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/practice-sets` | Published sets (`kind`, `examTag`, `categoryId`, `subcategoryId`, `isDaily`, cursor) | User | USER/ADMIN |
| GET | `/practice-sets/:idOrSlug` | Detail + questions (no correct flags); includes `activeAttempt.savedAnswers`, `serverNow` | User | USER/ADMIN |
| POST | `/practice-sets/:idOrSlug/attempts` | Start (or resume) attempt; returns `expiresAt` when timed | User | USER/ADMIN |
| PATCH | `/practice-attempts/:id/progress` | Mid-attempt answer autosave (server deadline enforced) | User | USER/ADMIN |
| POST | `/practice-attempts/:id/submit` | Finalize + score; idempotent if already submitted; marks `EXPIRED` after deadline | User | USER/ADMIN |
| GET | `/practice-attempts/:id` | Detailed result (marks, %, time, pass/fail, answer analysis; privacy gated) | User | USER/ADMIN |
| GET | `/me/practice-attempts` | Own submitted/expired history | User | USER/ADMIN |
| GET | `/me/exam-performance` | Aggregated exam KPIs, trends, subject strengths/weaknesses | User | USER/ADMIN |
| GET | `/admin/practice-sets` | Admin list | User | ADMIN |
| POST | `/admin/practice-sets` | Create draft (`durationSeconds`, marks, negative marks, `passMarkPercent`, `questionIds`) | User | ADMIN |
| PATCH | `/admin/practice-sets/:id` | Update draft/settings (duration, marks, pass mark, items) | User | ADMIN |
| PATCH | `/admin/practice-sets/:id/publish` | Publish | User | ADMIN |
| PATCH | `/admin/practice-sets/:id/archive` | Archive | User | ADMIN |
| GET | `/admin/practice-attempts` | Student exam history filters (`userId`, `practiceSetId`, `categoryId`, `status`, `minPercent`, `maxPercent`) | User | ADMIN |
| GET | `/admin/practice-attempts/:id` | Admin answer review for any student attempt | User | ADMIN |

`kind`: `DAILY_QUIZ` \| `SUBJECT_QUIZ` \| `TOPIC_QUIZ` \| `MODEL_TEST` \| `PREVIOUS_YEAR_SET`.

---

### 2.6 Bookmarks

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/bookmarks/collections` | List folders with `questionCount` + `documentCount`, plus uncategorized counts (`questionId?` or `documentId?` for picker state) | User | USER/ADMIN |
| POST | `/bookmarks/collections` | `{ "name" }` create folder | User | USER/ADMIN |
| PATCH | `/bookmarks/collections/:id` | Rename `{ "name" }` | User | USER/ADMIN |
| DELETE | `/bookmarks/collections/:id` | Delete folder (saved MCQs and PDFs stay saved, uncategorized) | User | USER/ADMIN |
| GET | `/bookmarks/questions` | List (`cursor`, `limit`, optional `categoryId`, `collectionId` or `uncategorized`) | User | USER/ADMIN |
| GET | `/bookmarks/questions/details` | Saved MCQs with stem + options (`cursor`, `limit` ≤100, `collectionId` or `uncategorized`). `data: { items, answersVisible }`; `isCorrect` / `explanation` omitted unless entitled (DEC-051) | User | USER/ADMIN |
| POST | `/bookmarks/questions/practice-score` | Score a saved-questions exam `{ "questionIds": uuid[1..200], "answers": { questionId: optionId } }`. Only the caller's saved, published MCQs count; per-question key + explanation only when entitled. Throttled 10/min | User + CSRF | USER/ADMIN |
| POST | `/bookmarks/questions` | Save/move `{ "questionId", "collectionId?", "newCollectionName?" }` (upsert; DEC-026) | User | USER/ADMIN |
| PATCH | `/bookmarks/questions/:questionId` | Move `{ "collectionId": uuid\|null }` | User | USER/ADMIN |
| DELETE | `/bookmarks/questions/:questionId` | Unsave | User | USER/ADMIN |
| GET | `/bookmarks/documents` | List (`cursor`, `limit`, `collectionId` or `uncategorized`); rows include `collection` | User | USER/ADMIN |
| POST | `/bookmarks/documents` | Save/move `{ "documentId", "collectionId?", "newCollectionName?" }` (upsert, same rules as MCQs; DEC-059) | User | USER/ADMIN |
| PATCH | `/bookmarks/documents/:documentId` | Move `{ "collectionId": uuid\|null }` | User | USER/ADMIN |
| DELETE | `/bookmarks/documents/:documentId` | Remove | User | USER/ADMIN |

Question and document bookmark rows are owner-scoped; at most one folder per user+item. Re-save to the same folder is idempotent; another folder moves. Filtering by a folder the caller does not own returns 404 `COLLECTION_NOT_FOUND`. Question detail includes `bookmarked` + `collection`. Document detail includes `bookmarked`.

---

### 2.7 News & Documents

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/news` | Published list (`cursor`, `limit`, `hasNextPage`) | Public/User | — |
| GET | `/news/:slug` | Article + linked **published** docs | Public/User | — |
| GET | `/documents` | Published document list (`cursor`, `limit`; hides `PREMIUM` when not entitled) | User | USER/ADMIN |
| GET | `/documents/:id` | Metadata + signed download if allowed; `403 DOCUMENT_PREMIUM_REQUIRED` for gated PDFs | User | USER/ADMIN |
| GET | `/ready` | Readiness: Postgres + Redis must be up | Public | — |
| GET | `/admin/news` | Admin list (drafts + published; `cursor`, `limit`) | User | ADMIN |
| GET | `/admin/news/:id` | Admin detail + `documentIds` / linked docs | User | ADMIN |
| POST | `/admin/news` | Create draft (`documentIds?`) | User | ADMIN |
| PATCH | `/admin/news/:id` | Update (optional `documentIds` replaces associations) | User | ADMIN |
| POST | `/admin/news/:id/publish` | Publish | User | ADMIN |
| POST | `/admin/news/:id/unpublish` | Unpublish | User | ADMIN |
| DELETE | `/admin/news/:id` | Soft delete | User | ADMIN |
| GET | `/admin/documents` | Admin list (`cursor`, `limit`) | User | ADMIN |
| GET | `/admin/documents/:id` | Admin detail | User | ADMIN |
| POST | `/admin/documents` | Create metadata (+ placeholder media until Cloudinary) | User | ADMIN |
| PATCH | `/admin/documents/:id` | Update / publish toggle | User | ADMIN |
| DELETE | `/admin/documents/:id` | Soft delete | User | ADMIN |

---

### 2.8 Storage

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/storage/sign-upload` | Signed Cloudinary params | User | USER/ADMIN |
| POST | `/storage/confirm` | Persist MediaAsset after client upload | User | USER/ADMIN |

Admin vs user allowed MIME/size differ by purpose (`avatar`, `question-image`, `news-cover`, `pdf`).

---

### 2.9 Free vs Paid, packages, payments (DEC-060)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/public/access-config` | `{ paidSystemEnabled, paymentsConfigured }` | Public | — |
| GET | `/public/packages` | Active, non-deleted packages (`priceBdt`, `discountedPriceBdt`, `effectivePriceBdt` decimal strings, `isPopular`) | Public | — |
| GET | `/me/access` | `UserAccessSnapshot` `{ paidSystemEnabled, fullAccess, isPaid, subscriptionEndsAt, isTrialActive, topicAccess, trialEndsAt, trialDaysLeft }` (trial = Topic Base only, DEC-063) (also `user.access` on `/users/me`) | User | any |
| GET | `/me/subscription` | Own plan (`SubscriptionSummary` incl. `cancelAtPeriodEnd`, `scheduledPackageName`) + last 50 payments + `billing` (`renewalPackage`, `scheduledPackage`, `options[]` with `change` NEW / RENEW / UPGRADE / DOWNGRADE) — DEC-062 | User | any |
| POST | `/me/subscription/cancel` · `/resume` | Turn renewal off / back on (access runs to `endsAt`). `409 SUBSCRIPTION_NOT_ACTIVE`, `409 SUBSCRIPTION_ALREADY_CANCELLED` / `SUBSCRIPTION_NOT_CANCELLED`, `409 SUBSCRIPTION_NOT_NEEDED` (Admin). Returns `MySubscriptionDto` | User + CSRF | USER / MODERATOR |
| POST / DELETE | `/me/subscription/scheduled-change` | `{ packageId }` schedules a **downgrade** for the next renewal (`422 PLAN_CHANGE_NOT_DOWNGRADE` for upgrades — buy those via checkout) / remove it (`409 NO_SCHEDULED_CHANGE`) | User + CSRF | USER / MODERATOR |
| POST | `/payments/checkout` | `{ packageId }` → `{ tranId, gatewayUrl }`. Price/user from server. `403 PAID_SYSTEM_OFF`, `503 PAYMENT_NOT_CONFIGURED`, `503 PAYMENT_GATEWAY_UNAVAILABLE` (order stays PENDING), `502 PAYMENT_GATEWAY_ERROR`, `409 SUBSCRIPTION_NOT_NEEDED` (Admin), `409 PACKAGE_PRICE_INVALID` (< ৳10 / > ৳500,000). Throttled 10/min | User + CSRF | USER / MODERATOR |
| GET | `/payments/orders/:tranId/status` | `PaymentOrderPublicStatus` for result pages (no session needed; tran_id is random) | Public | — |
| POST | `/payments/sslcommerz/success` · `/fail` · `/cancel` | Gateway browser callbacks (form POST, **no CSRF / JWT**). Validated server-side, then `303` → `${APP_PUBLIC_URL}/payment/{success|failed|cancelled}?tran_id=` | Gateway | — |
| POST | `/payments/sslcommerz/ipn` | IPN listener (source of truth). `200 { received, outcome }`; `503` when the validation API was unreachable (gateway retries) | Gateway | — |
| GET/PATCH | `/admin/access-settings` | `{ paidSystemEnabled, preliFreeSetCount, writtenFreeSetCount }` | User + CSRF | `subscriptions` |
| GET/POST | `/admin/packages` | List (with `orderCount`) / create | User + CSRF | `subscriptions` |
| PATCH/DELETE | `/admin/packages/:id` | Update / delete → `{ softDeleted }` (soft when referenced). `422 PACKAGE_DISCOUNT_INVALID` (discount ≥ price), `422 PACKAGE_DURATION_RETIRED` (switching to MONTHLY) | User + CSRF | `subscriptions` |
| POST | `/admin/subscriptions/reminders/run` | Run the 7- / 3-day expiry reminder pass now → `{ sent7, sent3, failed }` (DEC-062; also hourly) | User + CSRF | `subscriptions` |
| GET | `/admin/subscribers` | Users + `SubscriptionSummary`; `q`, `state` (FREE/ACTIVE/SCHEDULED/EXPIRED/DISABLED), `packageId`, cursor | User | `subscriptions` |
| GET | `/admin/subscribers/:userId` | Detail + events + payments | User | `subscriptions` |
| POST | `/admin/subscribers/:userId/grant` | `{ packageId }` (adds duration) **or** `{ endsAt }` (sets end), `note?` | User + CSRF | `subscriptions` |
| POST | `/admin/subscribers/:userId/extend` | `{ days (1–3650), note? }` | User + CSRF | `subscriptions` |
| POST | `/admin/subscribers/:userId/disable` · `/enable` | Revoke / restore immediately (`note?`) | User + CSRF | `subscriptions` |
| GET | `/admin/payments` | Orders; `status`, `q` (tran_id / val_id / user), `packageId`, `from`, `to`, cursor | User | `payments` |
| GET | `/admin/payments/:id` · `/:id/logs` | Order · redacted gateway log | User | `payments` |
| POST | `/admin/payments/:id/recheck` · `/approve` · `/mark-refunded` | Transaction Query re-check · accept a RISK hold (re-validated) · label refunded | User + CSRF | `payments` |

**Topic Base (DEC-061):** `/public/topic-subcategories/:id/questions` and `/public/topic-sets/:id/questions` need a session (always) plus trial / subscription when the paid system is ON, else `403 CONTENT_LOCKED`. `user.access` adds `isTrialActive`, `trialEndsAt`, `trialDaysLeft`.

**Locks:** set lists, `/public/model-tests` and `/public/question-sets/:id` / `written-question-sets/:id` return `locked: boolean`. Set questions, practice-score, `/public/questions?uploadBatchId=`, `/questions/:id` (+ attempts), Model Test detail / attempts / results answer **`403 CONTENT_LOCKED`** with `details: [{ reason: 'PAID_REQUIRED', loginRequired }]` for viewers without access. Question lists simply omit MCQs of locked sets.

---

### 2.10 Analytics

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/analytics/sessions` | Start session | User | USER/ADMIN |
| POST | `/analytics/sessions/:id/heartbeat` | Heartbeat | User | USER/ADMIN |
| POST | `/analytics/sessions/:id/end` | End | User | USER/ADMIN |
| GET | `/analytics/me/summary` | Personal summary | User | USER/ADMIN |
| GET | `/admin/analytics/overview` | Platform KPIs | User | ADMIN |
| GET | `/admin/analytics/browsing` | Browsing aggregates | User | ADMIN |

Heartbeat body: `{ "clientTimestamp": "ISO", "visibilityState": "visible|hidden", "clientInstanceId": "…" }`. Server ignores hidden/idle per policy.

---

### 2.11 Admin Dashboard & Activity (Phase 1)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/admin/dashboard` | Aggregated KPI payload (includes online, 24h registrations, engagement today, top subjects) | User | ADMIN |
| GET | `/admin/activity/overview` | Registered, online (heartbeat window + 5/15/30m buckets), engagement today/7d/30d | User | ADMIN |
| GET | `/admin/activity/online` | Searchable online list (`BrowsingSession` ACTIVE + heartbeat ≤90s) | User | ADMIN |
| GET | `/admin/activity/events` | `LearningActivityEvent` timeline (`userId`/`type`/`subjectId`/`from`/`to`, cursor) | User | ADMIN |
| GET | `/admin/activity/trends` | Daily series: attempts, practice completes, activeSeconds | User | ADMIN |
| GET | `/admin/activity/export` | CSV export of filtered events (admin only) | User | ADMIN |
| GET | `/admin/audit` | Paginated `AuditLog` browser | User | ADMIN |
| POST | `/admin/questions/:id/duplicate` | Clone question as DRAFT | User | ADMIN |

Online rule (DEC-009): ACTIVE session with `lastHeartbeatAt` within **90 seconds**.

---

### 2.12 Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Liveness | Public |
| GET | `/ready` | DB + Redis readiness | Public / internal |

---

## 3. Filtering & Sorting Standards

- Filters: query string scalar IDs/enums
- Search: `q` max 100 chars
- Sort allowlist only (`publishedAt_desc`, `publishedAt_asc`, `title_asc`)
- `limit` default 20, max 100

## 4. Idempotency

- Bookmark POST: unique constraint → 409
- Heartbeat: idempotent for same interval window
- Publish: safe to retry if already published → 200 with current state

## 5. Swagger Requirements

Every endpoint: summary, auth, request/response DTO, error codes. Tag by module. Keep this document synchronized when endpoints change.
