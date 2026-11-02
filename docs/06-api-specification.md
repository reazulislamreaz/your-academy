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
| GET | `/users/me` | Own profile | User | USER/ADMIN |
| PATCH | `/users/me` | Update profile | User | USER/ADMIN |
| POST | `/users/me/avatar` | Avatar upload init/complete | User | USER/ADMIN |
| GET | `/users/me/stats` | Personal dashboard stats (bookmark counts, browsing seconds, recent saves) | User | USER/ADMIN |
| GET | `/admin/users` | List users | User | ADMIN |
| GET | `/admin/users/:id` | User detail | User | ADMIN |
| PATCH | `/admin/users/:id/status` | Suspend/reinstate | User | ADMIN |
| DELETE | `/users/me` | Delete own account | User | USER/ADMIN |

---

### 2.3 Categories

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/categories` | Active tree/list (names only; public for marketing/filters) | Public | — |
| GET | `/public/stats` | Published counts (questions/categories/news/documents) | Public | — |
| GET | `/categories/:id` | Detail | User | USER/ADMIN |
| POST | `/admin/categories` | Create | User | ADMIN |
| PATCH | `/admin/categories/:id` | Update | User | ADMIN |
| DELETE | `/admin/categories/:id` | Delete/deactivate | User | ADMIN |

Categories used for question filters require authentication (DEC-003).

---

### 2.4 Questions (Learner)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/questions` | Published list + filters | User | USER/ADMIN |
| GET | `/questions/:id` | Detail (answer fields gated) | User | USER/ADMIN |
| GET | `/questions/:id/navigation` | prev/next ids | User | USER/ADMIN |

Question endpoints require authentication (DEC-003). Guests receive `401`.

Query params for list: `cursor`, `limit`, `categoryId`, `subcategoryId`, `difficulty`, `q`, `sort=publishedAt_desc`.

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

### 2.6 Bookmarks

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/bookmarks/questions` | List (`cursor`, `limit`, optional `categoryId`) | User | USER/ADMIN |
| POST | `/bookmarks/questions` | `{ "questionId" }` | User | USER/ADMIN |
| DELETE | `/bookmarks/questions/:questionId` | Remove | User | USER/ADMIN |
| GET | `/bookmarks/documents` | List (`cursor`, `limit`) | User | USER/ADMIN |
| POST | `/bookmarks/documents` | `{ "documentId" }` | User | USER/ADMIN |
| DELETE | `/bookmarks/documents/:documentId` | Remove | User | USER/ADMIN |

`409` on duplicate. Lists are owner-scoped. Document detail includes `bookmarked`.

---

### 2.7 News & Documents

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/news` | Published list | Public/User | — |
| GET | `/news/:slug` | Article + linked **published** docs | Public/User | — |
| GET | `/documents` | Published document list (hides `PREMIUM` when not entitled) | User | USER/ADMIN |
| GET | `/documents/:id` | Metadata + signed download if allowed; `403 DOCUMENT_PREMIUM_REQUIRED` for gated PDFs | User | USER/ADMIN |
| GET | `/admin/news` | Admin list (drafts + published) | User | ADMIN |
| GET | `/admin/news/:id` | Admin detail + `documentIds` / linked docs | User | ADMIN |
| POST | `/admin/news` | Create draft (`documentIds?`) | User | ADMIN |
| PATCH | `/admin/news/:id` | Update (optional `documentIds` replaces associations) | User | ADMIN |
| POST | `/admin/news/:id/publish` | Publish | User | ADMIN |
| POST | `/admin/news/:id/unpublish` | Unpublish | User | ADMIN |
| DELETE | `/admin/news/:id` | Soft delete | User | ADMIN |
| GET | `/admin/documents` | Admin list | User | ADMIN |
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

### 2.11 Admin Dashboard

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/admin/dashboard` | Aggregated KPI payload | User | ADMIN |

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
