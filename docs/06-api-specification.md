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

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/auth/register` | Register + start trial | Public | — |
| POST | `/auth/login` | Login | Public | — |
| POST | `/auth/logout` | Revoke session | User | USER/ADMIN |
| POST | `/auth/refresh` | Rotate refresh | Cookie/body | — |
| POST | `/auth/change-password` | Change password | User | USER/ADMIN |
| POST | `/auth/forgot-password` | Start email reset (DEC-004) | Public | — |
| POST | `/auth/reset-password` | Complete reset | Public | — |

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
| GET | `/users/me/stats` | Personal dashboard stats (bookmark counts, browsing seconds, recent saves) | User | USER/ADMIN |
| GET | `/admin/users` | List users (enriched: online, attempts, trial/sub; cursor/`q`/`status`/`createdFrom`/`createdTo`) | User | ADMIN |
| GET | `/admin/users/:id` | User detail (profile, study stats, sessions, observed engagement, recent events; subscription read-only) | User | ADMIN |
| PATCH | `/admin/users/:id/status` | Suspend/reinstate | User | ADMIN |
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
| GET | `/public/questions` | Published MCQ cards (options + correct answer), `createdAt DESC`, cursor pagination + filters (`q`, `categoryId`, `subcategoryId`, `examTag`, `difficulty`, `uploadBatchId`) | Public | — |
| GET | `/public/question-sets` | Upload-based Question Sets (completed/archived batches with published MCQs), newest first; filters: `q`, `categoryId`, `subcategoryId`, `year` — taxonomy IDs must be `PRELIMINARY` scope or the filter returns empty | Public | — |
| GET | `/public/question-sets/years` | Distinct exam years for Preli bank year chips | Public | — |
| GET | `/public/question-sets/:id` | Question Set metadata (`sheetPreamble`, `examYear`, `placements`) | Public | — |
| GET | `/public/question-sets/:id/questions` | MCQs in a set in original upload `rowNumber` order (`sourceSerial`, `sectionTitle`; no category badge under stem) | Public | — |
| GET | `/public/written-question-sets` | Written Question Sets (DEC-040); same filters as Preli — taxonomy IDs must be `WRITTEN` scope | Public | — |
| GET | `/public/written-question-sets/years` | Distinct years for Written bank year filter | Public | — |
| GET | `/public/written-question-sets/:id` | Written set metadata | Public | — |
| GET | `/public/written-question-sets/:id/questions` | Written questions in upload order (modelAnswer, marks) | Public | — |
| GET | `/public/homepage` | Published homepage CMS payload + hero image URL (DEC-038; Cache-Control max-age=60) | Public | — |
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
| GET | `/admin/question-imports/template` | Download Bangla Google Sheets `.xlsx` template (`প্রশ্ন নং…উত্তর`) | User | ADMIN |
| GET | `/admin/question-imports` | List batches (`status`, `q`, cursor) | User | ADMIN |
| POST | `/admin/question-imports/upload` | Multipart `file` + `displayName`/`subjectHint`/`topicHint` + optional `placementSubcategoryIds` (JSON array, max 8) for multi-slot homepage/bank placement | User | ADMIN |
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
| GET | `/public/topic-directory` | Topic roots + subcategory question counts | Public | — |
| GET | `/public/topic-subcategories/:id` | Topic subcategory meta | Public | — |
| GET | `/public/topic-subcategories/:id/questions` | Cursor-paginated topic MCQs (`q`) | Public | — |
| GET | `/admin/topic-question-imports` | Recent topic batches | User | ADMIN |
| GET | `/admin/topic-question-imports/template` | 8-column Excel template | User | ADMIN |
| POST | `/admin/topic-question-imports/upload` | Multipart import (`file`, `categoryId`, `subcategoryId`, optional `displayName`) | User | ADMIN |

### 2.5c Public guest exams (DEC-039)

Quizzory-style timed exams with name-only entry. Separate from bank `Question` / PracticeSet. Correct answers are omitted until after submit.

Admin Excel template (7 columns): `প্রশ্ন নং | প্রশ্ন | ক | খ | গ | ঘ | উত্তর`. `উত্তর` must be `a`/`b`/`c`/`d` (case-insensitive) or Bangla `ক`/`খ`/`গ`/`ঘ`; the API stores the resolved option text. `প্রশ্ন নং` is optional reference only. Row-level validation errors are returned on `EXCEL_PARSE_FAILED`.

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/public/exams` | Published exams, `createdAt DESC` | Public | — |
| GET | `/public/exams/:idOrSlug` | Exam + questions (no correct answers / explanations) | Public | — |
| POST | `/public/exams/:idOrSlug/attempts` | Submit answers (`userName`, `userAnswers`, optional `elapsedSeconds`/`timedOut`); scores server-side | Public | — |
| GET | `/public/exams/attempts/:attemptId` | Result + full answer sheet (correct + explanation) | Public | — |
| GET | `/admin/exams` | Admin list | User | ADMIN |
| GET | `/admin/exams/template` | 7-column Excel template download | User | ADMIN |
| POST | `/admin/exams/upload` | Multipart create (`title`, `description`, `durationInMinutes`, `.xlsx` file) | User | ADMIN |

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
| GET | `/bookmarks/collections` | List folders + uncategorized counts (`questionId?` for picker state) | User | USER/ADMIN |
| POST | `/bookmarks/collections` | `{ "name" }` create folder | User | USER/ADMIN |
| PATCH | `/bookmarks/collections/:id` | Rename `{ "name" }` | User | USER/ADMIN |
| DELETE | `/bookmarks/collections/:id` | Delete folder (bookmarks become uncategorized) | User | USER/ADMIN |
| GET | `/bookmarks/questions` | List (`cursor`, `limit`, optional `categoryId`, `collectionId` or `uncategorized`) | User | USER/ADMIN |
| POST | `/bookmarks/questions` | Save/move `{ "questionId", "collectionId?", "newCollectionName?" }` (upsert; DEC-026) | User | USER/ADMIN |
| PATCH | `/bookmarks/questions/:questionId` | Move `{ "collectionId": uuid\|null }` | User | USER/ADMIN |
| DELETE | `/bookmarks/questions/:questionId` | Unsave | User | USER/ADMIN |
| GET | `/bookmarks/documents` | List (`cursor`, `limit`) | User | USER/ADMIN |
| POST | `/bookmarks/documents` | `{ "documentId" }` | User | USER/ADMIN |
| DELETE | `/bookmarks/documents/:documentId` | Remove | User | USER/ADMIN |

Question bookmark rows are owner-scoped; at most one folder per user+question. Re-save to the same folder is idempotent; another folder moves. Document bookmarks remain flat. Question detail includes `bookmarked` + `collection`. Document detail includes `bookmarked`.

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

### 2.9 Subscriptions (v1 read-mostly)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/me/access` | Trial + subscription + entitlements | User | USER/ADMIN |
| GET | `/admin/subscription-plans` | List plans | User | ADMIN |
| POST | `/admin/subscription-plans` | Create/update plans | User | ADMIN |

No payment capture endpoints in v1.

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
