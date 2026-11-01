# 07 — Authentication and Authorization

## 1. Goals

- Secure registration/login with WhatsApp number + password
- Short-lived access tokens + rotating refresh tokens
- Server-side session revocation
- RBAC for `USER` and `ADMIN`
- No privilege escalation paths via client manipulation

## 2. Identity

| Field | Rule |
|-------|------|
| WhatsApp number | Required, unique, stored E.164-normalized |
| Password | Min length policy (proposed ≥8 with complexity DEC-013); Argon2id |
| Email | Optional; unique if present |
| Role | `USER` default; `ADMIN` assigned out-of-band / seed |

## 3. Password Hashing

- Algorithm: **Argon2id**
- Parameters: tune for ~50–100ms on target hardware; document chosen memory/time/parallelism in env
- Never log plaintext or hashes in application logs

## 4. Token Model

### Access token (JWT)

| Claim | Purpose |
|-------|---------|
| `sub` | userId |
| `role` | USER/ADMIN |
| `sid` | sessionId |
| `iat` / `exp` | Issued / expiry |

- Lifetime: **15 minutes** (configurable)
- Signed with strong secret or asymmetric key (HS256 acceptable for v1 single service; document rotation)
- Sent as `Authorization: Bearer` and/or non-HttpOnly cookie if chosen — prefer Bearer from memory for XSS reduction with BFF patterns; final choice DEC-012

### Refresh token

- Opaque random credential (≥256 bits)
- Stored **hashed** (SHA-256) in `AuthSession`
- Lifetime: **30 days** (configurable)
- HTTP-only, Secure, SameSite=`Lax` or `Strict` cookie for web
- **Rotation:** each refresh issues new token, marks old revoked, links `replacedBySessionId`
- **Reuse detection:** presenting revoked token in family → revoke entire family

## 5. Flows

### Register

1. Validate DTO; normalize WhatsApp
2. Reject if number exists
3. Hash password; create User with `trialStartedAt=now`, `trialEndsAt=now+7d`
4. Create AuthSession; return access + set refresh cookie
5. Optional: enqueue welcome email (future)

### Login

1. Rate-limit by IP + WhatsApp
2. Lookup user; reject if not ACTIVE
3. Verify Argon2id
4. Create session; return tokens + profile summary

### Logout

1. Auth required
2. Revoke current session (and optionally all)

### Refresh

1. Read refresh cookie/body
2. Lookup hash; validate expiry/revocation
3. Rotate; return new access (+ refresh)

### Change password

1. Verify current password
2. Update hash
3. Revoke all sessions except optional current
4. Audit log

### Password reset (DEC-004 CONFIRMED — email)

1. `forgot-password`: always return generic success (no account enumeration)
2. If user exists, is ACTIVE, and has an email: store hashed reset token with TTL; enqueue `email-queue` job with one-time link
3. If user has no email: do nothing beyond generic success (UI may advise adding email while logged in, or contacting support)
4. `reset-password`: validate token; set password; revoke sessions
5. WhatsApp OTP reset is out of scope for v1

## 6. Guards (NestJS)

| Guard | Responsibility |
|-------|----------------|
| `JwtAuthGuard` | Require valid access token |
| `RolesGuard` | Require `@Roles('ADMIN')` etc. |
| `OptionalJwtGuard` | Attach user if present |
| Throttler | Rate limits |

Apply at controller/method level. Admin routes under `/admin/*` always require `ADMIN`.

## 7. Authorization Model

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

## 8. Session Management

- List sessions (optional v1): id, userAgent, createdAt, lastUsed
- Revoke by id (own only)
- Suspended users: reject login and refresh

## 9. Account Deletion

See DEC-005. Minimum: set `DELETED`, revoke sessions, anonymize WhatsApp/email to free unique constraints, schedule avatar deletion job.

## 10. Admin Authentication

Same login endpoints; role claim drives UI and API. Seed first admin via secure env bootstrap script — never hardcode password in repo.

## 11. CSRF

If access/refresh cookies are used for browser auth on mutating requests, implement CSRF tokens or SameSite-strict + custom header requirement. Document chosen pattern with DEC-012.
