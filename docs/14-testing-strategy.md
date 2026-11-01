# 14 — Testing Strategy

## 1. Principles

- Test business-critical paths first: auth, RBAC, answer privacy, publish validation
- Prefer fast unit tests for pure logic; integration tests for Prisma + HTTP
- Deterministic tests; no dependency on production Cloudinary/Redis data
- Do not mark access-control features done without automated coverage

## 2. Backend

### Tools

- **Jest** — unit/integration
- **Supertest** — HTTP API
- PostgreSQL test database or Testcontainers
- Redis for queue integration tests (or mocked BullMQ)

### Layers

| Type | Scope | Examples |
|------|-------|----------|
| Unit | Services, AccessControlService, password hashing wrappers | Trial active math; filterQuestionForUser |
| Integration | Prisma repositories + constraints | Unique bookmark; one correct option index |
| API | Full Nest module | Register/login/refresh; question detail gating |
| AuthN/AuthZ | Guards + roles | User cannot publish; admin can |
| Subscription-access | Entitlements | Expired trial omits answers |
| Privacy | Serializers | No `isCorrect` key present |
| Storage | Mock StorageService | Sign-upload purpose checks |
| Worker | Processor idempotency | Double delete asset |

### Critical test cases

1. Register sets `trialEndsAt ≈ now+7d`
2. Login rejects SUSPENDED
3. Refresh rotation + reuse detection
4. Expired trial question detail excludes explanation and isCorrect
5. Active trial includes them
6. Publish fails with 0 or 2 correct options
7. Bookmark duplicate → 409
8. Heartbeat hidden tab does not accrue (per policy)
9. Non-owner cannot delete another user’s bookmark
10. Non-admin 403 on `/admin/*`

## 3. Frontend

| Type | Tools (proposed) | Focus |
|------|------------------|-------|
| Component | Vitest/Jest + Testing Library | Question options without isCorrect |
| Form validation | Testing Library | Register/login Zod errors |
| Page interaction | Testing Library | Bookmark toggle optimistic UI |
| Auth flow | Integration/MSW | Redirect on 401 |
| Admin permission | Router tests | Admin nav hidden for USER |

Mock API via MSW or Query client fixtures.

## 4. System

| Type | Purpose |
|------|---------|
| E2E (Playwright/Cypress) | Register → browse → trial gate smoke |
| Docker smoke | `compose up` + health + migrate |
| Load | k6 on question list + heartbeat |
| Security | Checklist + automated privacy tests |
| Backup/restore | Restore dump to empty Postgres; app boots |

## 5. CI Recommendations

```text
lint → unit → integration (api) → build
e2e on main / nightly
```

Fail CI on answer-privacy test failure.

## 6. Test Data

- Seed factory helpers: `createUser({ trialEndsAt })`, `createPublishedQuestion()`
- Never use real WhatsApp numbers of people; use reserved fake E.164 patterns

## 7. Coverage Goals (Guidance)

- AccessControlService: high coverage
- Auth services: high coverage
- UI chrome: pragmatic, not vanity 100%
