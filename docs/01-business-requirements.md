# 01 — Business Requirements

Status legend: **CONFIRMED** decisions must not change without explicit approval. **PROPOSED** / **NEEDS APPROVAL** items live in `19-decisions-and-assumptions.md`.

## 1. Product Scope

Confiro provides MCQ-centric learning with categorized questions, educational news, PDF/document resources, bookmarks, profiles, browsing-time tracking, and an admin console. The initial release supports a seven-day full-access trial and a limited free post-trial experience. Paid subscriptions are architected but not monetized in v1.

## 2. Confirmed Rules

### BR-001 — Free Trial (CONFIRMED)

- Every newly registered user receives a **seven-day** full-access trial automatically.
- Trial starts at successful registration completion.
- Duration is exactly seven days (server-side timestamps).
- Users cannot manually extend the trial.
- Trial status is calculated **dynamically** (`now < trialEndsAt`).
- No scheduled job is required merely to recognize expiration.

### BR-002 — Post-Trial Access (CONFIRMED)

**Allowed after expiry:**

- Login; homepage; browse all **published** questions; search; filter; view titles; view full question content; view MCQ options; navigate between questions; save MCQs; profile; bookmarks; browsing activity; browse educational news.

**Denied after expiry:**

- View correct answers; view answer indicators; view explanations.

**Enforcement:** Backend must exclude restricted answer-related fields from API responses. Frontend hiding alone is insufficient.

### BR-003 — Future Subscriptions (CONFIRMED)

- Design for future paid plans that restore premium permissions.
- Do **not** require payment integration in the initial release.
- Keep plans, subscriptions, payments, and permissions modular.

### BR-004 — MCQ Upload Permissions (CONFIRMED)

Only administrators may create, edit, delete, publish, archive questions and manage categories/subcategories. Regular users never receive question-management permissions.

### BR-005 — Trial Eligibility & Abuse (CONFIRMED)

- Every new account receives a trial.
- WhatsApp number must be unique.
- Unique phone number alone does **not** guarantee one trial per human.
- Document future OTP and stronger abuse prevention (see decision register).

### BR-006 — Registration Fields (CONFIRMED)

Required: name, WhatsApp number, password.  
Optional: profile picture.  
Email: optional future-compatible field; **not** mandatory without business approval.

### BR-007 — Publishing Integrity (CONFIRMED)

Publishing a question must validate option count and ensure **exactly one** correct option. Question previous/next navigation must be deterministic.

### BR-008 — Bookmarks (CONFIRMED)

Users may bookmark MCQs, news PDFs, and educational documents. Bookmarks reference original records (no content duplication). Duplicates prevented; listings paginated; organizable by category where applicable.

### BR-009 — Analytics (CONFIRMED)

Track per-user browsing time with session start, ~30s heartbeat, termination, visibility/idle handling, multi-tab awareness, and anti-inflation controls. Provide user reports and admin analytics.

### BR-010 — Admin Dashboard (CONFIRMED)

Admins see platform KPIs (users, trials, questions, categories, news, PDFs, browsing stats, recent activity) and manage users/content. All admin operations protected by backend RBAC.

## 3. Access Matrix (Summary)

| Capability | Guest | Trial user | Free post-trial | Admin |
|------------|-------|------------|-----------------|-------|
| Register / login | ✓ / ✓ | — / ✓ | — / ✓ | — / ✓ |
| Browse published questions | ✗¹ | ✓ | ✓ | ✓ |
| View options | ✗¹ | ✓ | ✓ | ✓ |
| View correct answer / explanation | ✗ | ✓ | ✗ | ✓ |
| View published PDFs/documents | ✗ | ✓ | ✓² | ✓ |
| Manage questions/categories | ✗ | ✗ | ✗ | ✓ |
| Manage news/PDFs | ✗ | ✗ | ✗ | ✓ |
| Bookmarks | ✗ | ✓ | ✓ | ✓ |
| Admin dashboard | ✗ | ✗ | ✗ | ✓ |

¹ DEC-003 **CONFIRMED:** question bank requires authentication. Guests see marketing + published news only.  
² DEC-001 **CONFIRMED:** published documents remain accessible after trial; only MCQ answers/explanations are gated.

## 4. PDF Access After Trial

**CONFIRMED (DEC-001):** After trial expiry, authenticated users may still open/download published PDFs and educational documents. The confirmed content restriction remains MCQ answers, answer indicators, and explanations only.

## 4b. Password Reset Delivery

**CONFIRMED (DEC-004):** Password reset tokens are delivered by **email**. Registration email stays optional, but reset requires an email on the account.

## 5. Out of Scope for v1 Business

- Charging cards or local payment rails
- Affiliate / referral trial farming products
- Multi-tenant white-label
- Teacher/classroom management
