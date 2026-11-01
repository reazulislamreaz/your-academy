# 08 — Subscription and Access Control

## 1. Principle

All premium content gating is decided **server-side** by a single `AccessControlService`. Modules must not duplicate trial/subscription date math.

Frontend may hide UI affordances for UX, but API responses are the security boundary.

## 2. Inputs to Access Decisions

| Input | Source |
|-------|--------|
| User role | JWT / DB |
| Account status | DB (`ACTIVE` required) |
| Trial window | `User.trialStartedAt`, `User.trialEndsAt` |
| Subscription | Active `UserSubscription` overlapping `now` |
| Resource state | e.g. Question `PUBLISHED` |
| Entitlement requested | Enum flag |

## 3. Trial Calculation

```text
isTrialActive = user.status == ACTIVE
  && now < user.trialEndsAt
  && now >= user.trialStartedAt
```

- Set once at registration; not extended by client
- No cron required to “expire” trials
- Optional maintenance job may annotate analytics only

## 4. Entitlements

| Entitlement | Trial | Free post-trial | Active paid (future) | Admin |
|-------------|-------|-----------------|----------------------|-------|
| `BROWSE_QUESTIONS` | ✓ | ✓ | ✓ | ✓ |
| `VIEW_QUESTION_CONTENT` | ✓ | ✓ | ✓ | ✓ |
| `VIEW_OPTIONS` | ✓ | ✓ | ✓ | ✓ |
| `VIEW_ANSWERS` | ✓ | ✗ | ✓ | ✓ |
| `VIEW_EXPLANATIONS` | ✓ | ✗ | ✓ | ✓ |
| `BOOKMARK` | ✓ | ✓ | ✓ | ✓ |
| `VIEW_NEWS` | ✓ | ✓ | ✓ | ✓ |
| `VIEW_DOCUMENTS` | ✓ | ✓ | ✓ | ✓ |
| `MANAGE_CONTENT` | ✗ | ✗ | ✗ | ✓ |
| `VIEW_ADMIN_DASHBOARD` | ✗ | ✗ | ✗ | ✓ |

Document access (DEC-001): published documents with visibility `AUTHENTICATED` or `PUBLIC` remain available after trial. `PREMIUM` visibility requires active trial or paid subscription (future). Guests do not receive document downloads unless visibility is `PUBLIC` (default for educational PDFs is `AUTHENTICATED`).

## 5. AccessControlService API (Logical)

```typescript
can(user, entitlement): boolean
assertCan(user, entitlement): void // throws 403
canViewQuestionAnswers(user): boolean
filterQuestionForUser(user, question): PublicQuestionDto
getAccessSnapshot(user): { trialEndsAt, isTrialActive, subscription, entitlements[] }
```

`filterQuestionForUser`:

- Always include title, content, options **without** `isCorrect`
- If `VIEW_ANSWERS`: include `isCorrect` on options
- If `VIEW_EXPLANATIONS`: include `explanation`
- Never include raw fields then “hide” in frontend only

## 6. Subscription Module (Future-Ready)

### Plans

Stored in `SubscriptionPlan` with JSON entitlements list. Seed a `PREMIUM` plan in later phase without payment.

### UserSubscription

`ACTIVE` when `startsAt <= now < endsAt` and status ACTIVE. Paid access restores `VIEW_ANSWERS` and `VIEW_EXPLANATIONS`.

### Payments

`Payment` entity reserved. No provider webhooks in v1. When added, webhook handler updates subscription status; access service unchanged.

## 7. Publication Gate

Learner list/detail queries constrain `status=PUBLISHED` and `deletedAt IS NULL` (and category active rules as product requires). Draft/archived only via admin routes.

## 8. Combining Rules

```text
premiumAnswers =
  role==ADMIN (per DEC-014)
  OR isTrialActive
  OR hasActiveSubscriptionWith(VIEW_ANSWERS)
```

Same for explanations.

## 9. Testing Obligations

- Trial user receives `isCorrect` + `explanation`
- User with `trialEndsAt` in the past does **not**
- Subscription active user does
- Admin manage routes still RBAC-protected
- Suspended user cannot refresh/login

## 10. Anti-Patterns

- Storing `isTrialExpired` boolean updated by cron as sole source of truth
- Returning `isCorrect: false` for all options to “hide” the answer
- Trusting a client header like `X-Has-Subscription`
