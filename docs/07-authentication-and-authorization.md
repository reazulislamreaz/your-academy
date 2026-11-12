# 07 — Authentication and Authorization

## 1. Goals

- Secure registration/login with WhatsApp number + password
- Short-lived access tokens + rotating refresh tokens
- Server-side session revocation
- RBAC for `USER` and `ADMIN`
- No privilege escalation paths via client manipulation
- Web browser auth via **HTTP-only cookies + CSRF** (DEC-012)

## 2. Identity

| Field | Rule |
|-------|------|
| WhatsApp number | Required, unique, stored E.164-normalized |
| Password | Min length policy (proposed ≥8 with complexity DEC-013); Argon2id |
| Email | Optional at registration; required on account for password-reset email (DEC-004) |
| Role | `USER` default; `ADMIN` assigned out-of-band / seed |

## 3. Password Hashing

- Algorithm: **Argon2id**
- Parameters: tune for ~50–100ms on target hardware; document chosen memory/time/parallelism in env
- Never log plaintext or hashes in application logs

## 4. Token Model (DEC-012 CONFIRMED)

### Access token (JWT)

| Claim | Purpose |
|-------|---------|
| `sub` | userId |
| `role` | USER/ADMIN |
| `sid` | sessionId |
| `iat` / `exp` | Issued / expiry |

- Lifetime: **15 minutes** (configurable)
- Signed with strong secret (HS256 acceptable for v1 single service; document rotation)
- **Web delivery:** HTTP-only cookie (e.g. `access_token`), `Secure` in production, `SameSite=Lax`
- **Non-browser:** `Authorization: Bearer <access>` still accepted (Swagger, mobile later, automated tests)
- Not readable by JavaScript; never `localStorage` / `sessionStorage`

### Refresh token

- Opaque random credential (≥256 bits)
- Stored **hashed** (SHA-256) in `AuthSession`
- Lifetime: **30 days** (configurable)
- **Web delivery:** HTTP-only cookie (e.g. `refresh_token`), `Secure` in production, `SameSite=Lax`
- Implemented: refresh cookie `Path=/api/v1/auth` (covers `/refresh` + `/logout`); access/CSRF remain `Path=/`
- **Rotation:** each refresh issues new token, marks old revoked, links `replacedBySessionId`
- **Reuse detection:** presenting revoked token in family → revoke entire family

### Cookie flags (production)

| Cookie | HttpOnly | Secure | SameSite | Notes |
|--------|----------|--------|----------|-------|
| `access_token` | yes | yes | Lax | Short-lived JWT |
| `refresh_token` | yes | yes | Lax | Opaque; rotate on use |
| `csrf_token` | **no** | yes | Lax | Double-submit value; readable by JS |

Clear all auth cookies on logout. Align `Domain` via `COOKIE_DOMAIN` when web and API share a parent domain; otherwise use same-site reverse-proxy under one origin (preferred with Nginx).

## 5. CSRF Protection (DEC-012)

Because access/refresh cookies authenticate the browser automatically, CSRF defenses are mandatory for mutating requests.

### Pattern: double-submit cookie + header

1. On login/register/refresh (successful auth), issue `csrf_token` cookie (readable by JS) with a strong random value.
2. Frontend JavaScript reads `csrf_token` and sends it as `X-CSRF-Token` on `POST` / `PATCH` / `PUT` / `DELETE`.
3. API CSRF guard compares header to cookie (constant-time). Mismatch → `403` with code `CSRF_VALIDATION_FAILED`.
4. Skip CSRF for:
   - Safe methods: `GET`, `HEAD`, `OPTIONS`
   - Requests authenticated **only** via `Authorization: Bearer` (no reliance on auth cookies) — optional exemption for API clients
   - Webhook endpoints if added later (separate shared-secret auth)

### CORS

- Explicit origin allowlist (`WEB_ORIGIN`); never `*` with credentials
- `Access-Control-Allow-Credentials: true`
- Frontend fetch/XHR: `credentials: 'include'`

### SameSite note

`SameSite=Lax` reduces cross-site POST risk but is not a complete CSRF substitute (e.g. some cross-site GET side effects, or future cookie policy changes). Keep the CSRF header requirement.

## 6. Flows

### Register

1. Validate DTO; normalize WhatsApp
2. Reject if number exists
3. Hash password; create User with `trialStartedAt=now`, `trialEndsAt=now+7d`
4. Create AuthSession; set `access_token`, `refresh_token`, and `csrf_token` cookies
5. Return user profile JSON (tokens not required in body for web)

### Login

1. Rate-limit by IP + WhatsApp
2. Lookup user; reject if not ACTIVE
3. Verify Argon2id
4. Create session; set auth + CSRF cookies; return profile summary including `trialEndsAt` / entitlements

### Logout

1. Auth required (+ CSRF on cookie session)
2. Revoke current session
3. Clear auth and CSRF cookies

### Refresh

1. Read refresh cookie
2. Lookup hash; validate expiry/revocation
3. Rotate refresh; set new access (+ refresh) cookies; renew CSRF cookie
4. CSRF: refresh may be treated as cookie-only endpoint; still require CSRF header when called from browser XHR

### Change password

1. Verify current password
2. Update hash
3. Revoke all sessions except optional current; re-issue cookies for current session if kept
4. Audit log

### Password reset (DEC-004 CONFIRMED — email)

1. `forgot-password`: always return generic success (no account enumeration)
2. If user exists, is ACTIVE, and has an email: store hashed reset token with TTL; enqueue `email-queue` job with one-time link
3. If user has no email: do nothing beyond generic success
4. `reset-password`: validate token; set password; revoke sessions
5. WhatsApp OTP reset is out of scope for v1

## 7. Guards (NestJS)

| Guard | Responsibility |
|-------|----------------|
| `JwtAuthGuard` | Require valid access JWT from cookie or Bearer |
| `RolesGuard` | Require `@Roles('ADMIN')` etc. |
| `CsrfGuard` | Validate CSRF on unsafe methods for cookie sessions |
| `OptionalJwtGuard` | Attach user if present |
| Throttler | Rate limits |

Apply at controller/method level. Admin routes under `/admin/*` always require `ADMIN`.

**JWT extraction order:** `Authorization: Bearer` if present; else `access_token` cookie.

## 8. Authorization Model

### RBAC

| Role | Capabilities |
|------|--------------|
| USER | Learner APIs; own resources |
| ADMIN | All USER + management + dashboard |

### Ownership (IDOR prevention)

- Bookmarks, profile, analytics sessions: `resource.userId === req.user.id` or ADMIN
- Never accept client-supplied userId to escalate

### Entitlements (beyond RBAC)

Handled by `AccessControlService` (see `08-subscription-and-access-control.md`): trial, subscription, publication status.

Admins always receive answer/explanation fields when using admin endpoints; learner endpoints still evaluate entitlements unless product decides admins bypass (proposed: admin bypass on learner routes too for support — DEC-014).

## 9. Session Management

- List sessions (optional v1): id, userAgent, createdAt, lastUsed
- Revoke by id (own only)
- Suspended users: reject login and refresh

## 10. Account Deletion

See DEC-005. Minimum: set `DELETED`, revoke sessions, anonymize WhatsApp/email to free unique constraints, schedule avatar deletion job.

## 11. Admin Authentication

Same login endpoints; role claim drives UI and API. Seed first admin via secure env bootstrap script — never hardcode password in repo.

## 12. Frontend obligations (summary)

- All API calls: `credentials: 'include'`
- Mutating calls: attach `X-CSRF-Token` from `csrf_token` cookie
- Never persist JWTs in `localStorage`
- On `401`, call refresh once, then retry; if refresh fails, redirect to login
