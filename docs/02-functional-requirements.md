# 02 — Functional Requirements

Module-level requirements. API shapes: `06-api-specification.md`. Entitlements: `08-subscription-and-access-control.md`.

---

## Module A — Authentication

| ID | Requirement |
|----|-------------|
| FR-A01 | Register with name, WhatsApp number, password; optional profile picture |
| FR-A02 | Reject duplicate WhatsApp numbers |
| FR-A03 | On successful registration, set `trialStartedAt` and `trialEndsAt = start + 7 days` |
| FR-A04 | Login with WhatsApp number + password |
| FR-A05 | Logout revokes current refresh session |
| FR-A06 | Refresh token rotation; reuse detection invalidates session family |
| FR-A07 | Authenticated password change requires current password; revokes other sessions |
| FR-A08 | Password reset via emailed time-limited token (DEC-004); requires account email; generic response if missing/unknown |
| FR-A09 | List/revoke own sessions (optional v1 stretch; at minimum server-side session store) |
| FR-A10 | Account deletion: soft-delete or anonymize per DEC-005; revoke sessions |
| FR-A11 | Guards for JWT auth and RBAC (`USER`, `ADMIN`) |
| FR-A12 | Admin authenticates via same mechanism with elevated role |

**Security:** Argon2id; rate limits; no password in logs/responses.

---

## Module B — User Management

| ID | Requirement |
|----|-------------|
| FR-B01 | View own profile (name, WhatsApp, avatar, role, trial/subscription summary) |
| FR-B02 | Update name and profile picture |
| FR-B03 | WhatsApp number change with uniqueness check (re-verification policy DEC-006) |
| FR-B04 | Password management (change; reset hooks) |
| FR-B05 | Account status: `ACTIVE`, `SUSPENDED`, `DELETED` — suspended users cannot authenticate |
| FR-B06 | User activity summary on dashboard (bookmarks count, browsing time, recent items) |
| FR-B07 | User-specific browsing statistics from analytics module |
| FR-B08 | Admin can list/search users, view status, suspend/reinstate |

---

## Module C — Categories

Hierarchical categories (parent category → subcategories). Example: Programming → JavaScript, TypeScript, Node.js, React, Database.

| ID | Requirement |
|----|-------------|
| FR-C01 | Admin create/update/delete (or soft-deactivate) categories |
| FR-C02 | Activate/deactivate without breaking historical question references |
| FR-C03 | Create subcategory under a parent; depth limited to **2 levels** (parent + child) unless DEC-007 expands |
| FR-C04 | Prevent cycles and invalid parent-child links |
| FR-C05 | Public/authenticated listing of active categories for filters |
| FR-C06 | Category-based question filtering |

**Data model:** self-referential `parentId` nullable; unique slug per level or globally unique slug (see schema).

---

## Module D — MCQ Question Management

### Question fields

Short title; full content; multiple options; exactly one correct; detailed explanation; main category; optional subcategory; difficulty; status (`DRAFT` \| `PUBLISHED` \| `ARCHIVED`); created/updated/published timestamps; optional image/attachment via storage metadata.

### Admin operations

| ID | Requirement |
|----|-------------|
| FR-D01 | CRUD questions (admin) |
| FR-D02 | Publish only when validation passes: ≥2 options (recommended 4), **exactly one** correct |
| FR-D03 | Archive/unpublish; archived hidden from default user listings |
| FR-D04 | Attach/replace question image via Cloudinary abstraction |

### Listing & detail

| ID | Requirement |
|----|-------------|
| FR-D05 | List: latest, all published; filters: category, subcategory, difficulty; search; sort; pagination |
| FR-D06 | Detail: full question + options; correct answer + explanation **if entitled** |
| FR-D07 | Deterministic previous/next among the current filtered/sorted published set (document algorithm) |
| FR-D08 | Bookmark action on detail |

**Answer privacy:** serializers/services strip `isCorrect`, `correctOptionId`, and `explanation` when `AccessControlService` denies premium content.

**Previous/next (proposed algorithm):** Order by `publishedAt DESC, id DESC` (stable). Prev/next = adjacent rows in that total order within the active filter scope. Confirm DEC-008.

---

## Module E — Bookmark Management

| ID | Requirement |
|----|-------------|
| FR-E01 | Bookmark question / PDF document / news-associated PDF |
| FR-E02 | Remove bookmark |
| FR-E03 | List bookmarks with pagination; filter by type and category where applicable |
| FR-E04 | Unique constraint per `(userId, resourceId, resourceType)` |
| FR-E05 | Store references only — no duplicated question/PDF payloads |

---

## Module F — News and PDF Management

| ID | Requirement |
|----|-------------|
| FR-F01 | Admin CRUD news articles; publish/unpublish |
| FR-F02 | Upload PDFs; associate with news and/or standalone educational documents |
| FR-F03 | Users browse published news and read articles |
| FR-F04 | Users view eligible PDFs and bookmark them |
| FR-F05 | Delete/archive resources with storage cleanup jobs |

**PDF eligibility post-trial (DEC-001 CONFIRMED):** Published PDFs/documents remain accessible to authenticated users after trial; only MCQ answers/explanations are gated. Default visibility `AUTHENTICATED`.

---

## Module G — Subscription and Access Control

| ID | Requirement |
|----|-------------|
| FR-G01 | Central `AccessControlService` evaluates role, trial, subscription, resource publication |
| FR-G02 | Entitlements: e.g. `VIEW_ANSWERS`, `VIEW_EXPLANATIONS`, `MANAGE_QUESTIONS`, … |
| FR-G03 | SubscriptionPlan / UserSubscription / Payment tables exist for future use; no payment capture in v1 |
| FR-G04 | Paid subscription (future) restores premium permissions when `status=ACTIVE` and within period |

---

## Module H — Browsing Analytics

| ID | Requirement |
|----|-------------|
| FR-H01 | Start browsing session (authenticated) |
| FR-H02 | Heartbeat every **30 seconds** while visible and not idle |
| FR-H03 | Terminate session on explicit end, logout, or timeout |
| FR-H04 | Ignore / down-weight heartbeats when tab hidden (Page Visibility API) |
| FR-H05 | Idle threshold (proposed 2 minutes without interaction) pauses accrual — DEC-009 |
| FR-H06 | Multi-tab: single logical accrual policy (proposed: max one active billable session per user; extra tabs heartbeat same session or are no-ops) — DEC-010 |
| FR-H07 | Reject heartbeats that imply impossible elapsed time; clamp to interval + small skew |
| FR-H08 | User reports and admin aggregates (daily/weekly totals) |

Do not trust client-reported duration blindly; server computes deltas from last accepted heartbeat.

---

## Module I — Admin Dashboard

| ID | Requirement |
|----|-------------|
| FR-I01 | KPIs: total users, active users, new registrations, trial-active, trial-expired, question counts by status, categories, news, PDFs, browsing stats |
| FR-I02 | Recent activities feed (audit log subset) |
| FR-I03 | Entry points to user and content management |
| FR-I04 | All endpoints require `ADMIN` role |

---

## Cross-Cutting Functional Rules

- Only **published** content appears in default learner listings.
- Soft-deactivated categories remain on historical questions but are excluded from “active filter” pickers.
- All file uploads go through backend validation + Cloudinary abstraction.
- Destructive admin actions write audit logs.
