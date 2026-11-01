# 12 — Backend Architecture

## 1. Applications

| Folder | Role |
|--------|------|
| `backend/` | HTTP REST, auth, domain services, job producers |
| `worker/` | BullMQ consumers |

Both use TypeScript, NestJS patterns, Prisma client, shared package.

## 2. Layering

```text
Controller  →  validates HTTP, maps DTOs, status codes
Service      →  business rules, access control, orchestration
Repository   →  Prisma queries (optional class per aggregate)
Prisma       →  PostgreSQL
```

Controllers must not contain business logic. Services must not depend on Express/Fastify request objects beyond what is needed (prefer explicit params).

## 3. Module Responsibilities

| Module | Owns |
|--------|------|
| AuthModule | Register/login/refresh/logout/password; Jwt strategy; sessions |
| UsersModule | Profile, avatar, admin user admin |
| CategoriesModule | Hierarchy CRUD + public list |
| QuestionsModule | Learner + admin question flows; publish validation; prev/next |
| BookmarksModule | Question/document bookmarks |
| NewsModule | Articles + publish |
| DocumentsModule | PDFs/docs metadata + eligibility |
| SubscriptionsModule | Plans, user subscriptions, access snapshot helpers |
| AnalyticsModule | Sessions, heartbeats, summaries |
| AdminModule | Dashboard aggregation endpoints (may facade other modules) |
| CloudinaryModule | `StorageService` provider |
| BullMQModule | Queue registration |
| RedisModule | Redis connection |
| DatabaseModule | PrismaService |
| HealthModule | health/ready |

`AccessControlService` lives in SubscriptionsModule (or shared Authz module) and is imported wherever response shaping needs it.

## 4. Dependency Rules

- Domain modules may import Database, Redis, Storage, AccessControl
- Domain modules should not import AdminModule
- Worker imports domain services carefully to avoid HTTP-only providers

## 5. Prisma Usage

- `PrismaService` injectable
- Prefer `select` to avoid over-fetching (especially never select explanation when not entitled — or select then strip in one place)
- Transactions via `prisma.$transaction`
- Middleware/extensions optional for soft-delete filters

## 6. Validation

- DTO classes + class-validator **or** Zod pipes — pick one primary approach and stay consistent (proposed: Zod with shared schemas where possible)
- Global ValidationPipe: whitelist, forbid non-whitelisted, transform

## 7. Cross-Cutting

| Concern | Implementation |
|---------|----------------|
| Logging | Nest logger / Pino with requestId |
| Errors | Domain exceptions → filter → error envelope |
| Auth | Passport JWT + guards |
| Throttle | `@nestjs/throttler` |
| Helmet | Enabled in main.ts |
| CORS | Allow web origin only |
| Swagger | Bearer auth scheme documented |

## 8. Question Publish Algorithm

1. Load question + options in transaction
2. Assert ≥2 options (configurable min; default 4 recommended for UX but min 2 enforced)
3. Assert exactly one `isCorrect=true`
4. Assert category/subcategory relationship valid
5. Set `status=PUBLISHED`, `publishedAt=now` if null
6. Audit log

## 9. Previous / Next

Given filter scope F and order `publishedAt DESC, id DESC`:

- Find current rank key `(publishedAt, id)`
- Next (newer): first row “greater” in sort order within F
- Prev (older): first row “lesser” within F

Return `{ prevId, nextId }` nullable.

## 10. Worker Bootstrap

- Connect Redis queues
- Register processors
- SIGTERM → `worker.close()`
- Share env validation with API

## 11. Testing Seam

- Replace Prisma with testcontainer DB for integration
- Replace StorageService with in-memory fake
- Replace queues with BullMQ test mocks / fake producers
