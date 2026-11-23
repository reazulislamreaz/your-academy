# 13 — Security and Threat Model

Security is a set of mitigations and residual risks — **not** absolute protection.

## 1. Assets

| Asset | Sensitivity |
|-------|-------------|
| User passwords / refresh tokens | Critical |
| WhatsApp numbers / PII | High |
| JWT signing secrets / Cloudinary secret | Critical |
| MCQ answers/explanations (premium) | Medium-High (business) |
| Admin privileges | Critical |
| PDFs / documents | Medium–High per visibility |
| Analytics data | Medium |

## 2. Threat Actors

- Anonymous attackers (credential stuffing, scraping)
- Registered users bypassing trial limits
- Malicious insiders with stolen admin tokens
- Abusive uploaders (malware PDFs)

## 3. STRIDE-Style Analysis (Selected)

| Threat | Example | Mitigation | Residual risk |
|--------|---------|------------|---------------|
| Spoofing | Stolen password | Argon2id, rate limits, future OTP | Phished credentials |
| Tampering | Change option correctness via API | Admin RBAC, no learner write | Compromised admin |
| Repudiation | Admin deletes content | AuditLog | Incomplete logging |
| Info disclosure | Answers after trial | AccessControlService field omit | Screenshots during trial |
| DoS | Login flood / heartbeat flood | Rate limits, clamp heartbeats | Large volumetric DDoS on VPS |
| Elevation | User → admin | Role only in DB; ignore client role claims except signed JWT from server | JWT secret leak |

## 4. Control Catalog

### Authentication

- Argon2id passwords
- Short-lived JWT + rotating refresh; hashed at rest
- Web: HTTP-only access/refresh cookies (DEC-012); never `localStorage`
- Session revocation; reuse detection
- Generic messages on login failure

### Authorization

- RBAC guards
- Ownership checks (IDOR)
- Answer privacy server-side
- Admin routes separated

### Injection

- Prisma parameterized queries (SQL injection prevention)
- Strict DTO validation
- Avoid `dangerouslySetInnerHTML` for user content; sanitize if Markdown introduced

### XSS

- React default escaping
- CSP headers via Nginx/Helmet where feasible
- Prefer HTTP-only access/refresh cookies (DEC-012)

### CSRF

- **Required** for cookie-authenticated mutating requests: double-submit CSRF cookie + `X-CSRF-Token` header; SameSite=`Lax`; CORS credentials with explicit origin allowlist (DEC-012)

### SSRF

- No user-supplied URL fetchers in v1
- Cloudinary SDK only to known endpoints

### File upload

- MIME/size allowlists
- Signed uploads
- Private delivery for restricted docs
- Do not serve uploaded HTML as trusted

### Cloudinary credentials

- Server env only
- Signed upload params short-lived
- No unrestricted unsigned presets in production

### Brute force / rate limit

- Login/register/forgot-password throttles
- Per-IP and per-account where possible

### Secrets management

- `.env` not committed
- VPS secrets via env files with restricted permissions or secret manager later
- Rotate JWT and Cloudinary secrets on leak

### Backups

- Encrypted backup storage recommended
- Restrict who can download dumps (contain PII)

### Dependencies

- Lockfiles; CI audit when available
- Prefer well-maintained libraries

## 5. Answer Leakage Specific Tests

Attack: call `GET /questions/:id` as expired trial user and inspect JSON for `isCorrect` / `explanation` / `correctOptionId`.

**Pass criteria:** fields absent; timing broadly similar; admin endpoints still 403 for non-admin.

### Content protection deterrents

Learner-facing question content (question detail, practice/exam players, Preli/Written/Topic sets, attempt results — public and in-app) is wrapped in `ProtectedContent` (`frontend/src/components/content-protection/`), applied via route-segment `layout.tsx` files. Never used under `/admin`.

**Deterred (casual copying only):** text selection, copy/cut/context menu inside the content, image drag, Ctrl/Cmd + C/X/S/P/U/A while not typing in a field, printing (print CSS replaces the content with a notice), and a low-opacity watermark (masked WhatsApp + short user id + date for signed-in users; site name for guests) so leaked screenshots are attributable. Exam players optionally blur while the tab is hidden or the window loses focus. Learner app routes and attempt result URLs are `Disallow`ed in `robots.ts`; result segments also send `noindex, nofollow`.

**Not prevented:** screenshots / screen recording, phone cameras, browser devtools / view-source via menus, disabling JavaScript or CSS, reader modes, extensions, scraping the public API, or retyping. These are UX friction, not security. The real boundary remains server-side answer gating (§5, `08-subscription-and-access-control.md`). Blocking OS-level screenshots (Android `FLAG_SECURE`) requires a native app — future option, not planned for v1.

## 6. Trial Abuse

Unique WhatsApp is necessary but insufficient. Future options (document only until approved):

- WhatsApp OTP verification at register
- Device fingerprint heuristics
- Cap trials per IP/day
- Manual admin review queues

See DEC-016.

## 7. Verification Methods

- Automated authz/privacy tests
- Periodic manual penetration checklist before production
- Dependency scanning in CI
- Backup restore drill

## 8. Incident Response (Minimal)

1. Rotate secrets (JWT, Cloudinary, DB)
2. Revoke all AuthSessions
3. Review AuditLog
4. Patch and redeploy
