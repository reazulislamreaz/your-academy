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
- Prefer HTTP-only refresh cookies

### CSRF

- Required if cookie-based session for mutations; SameSite + CSRF token pattern (DEC-012)

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
