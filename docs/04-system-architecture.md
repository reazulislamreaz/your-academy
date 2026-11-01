# 04 — System Architecture

## 1. Style

**Modular monolith** deployed as multiple processes/containers from one codebase:

| Process / folder | Responsibility |
|------------------|----------------|
| `frontend/` (`web`) | Next.js UI (SSR/RSC + client islands) |
| `backend/` (`api`) | NestJS REST API, auth, sync business logic, enqueue jobs |
| `worker/` | BullMQ processors |
| `shared/` | Browser-safe types, enums, contracts |
| `postgres` | System of record |
| `redis` | BullMQ broker (+ optional cache) |
| `nginx` | TLS termination, reverse proxy |

Cloudinary is an **external** managed service.

## 2. Context Diagram

```mermaid
C4Context
title Confiro system context
Person(learner, "Learner")
Person(admin, "Administrator")
System(confiro, "Confiro Platform")
System_Ext(cloudinary, "Cloudinary")
System_Ext(email, "Email Provider (future)")
Rel(learner, confiro, "HTTPS")
Rel(admin, confiro, "HTTPS")
Rel(confiro, cloudinary, "Signed upload/delivery")
Rel(confiro, email, "Transactional email")
```

## 3. Container Diagram

```mermaid
flowchart TB
  subgraph public [Public network]
    Browser
  end
  subgraph edge [Edge]
    Nginx
  end
  subgraph app [Docker network]
    Web[frontend - Next.js]
    Api[backend - NestJS]
    Worker[worker - BullMQ]
  end
  subgraph data [Data]
    PG[(PostgreSQL)]
    Redis[(Redis)]
  end
  Cloudinary[[Cloudinary]]
  Browser --> Nginx
  Nginx --> Web
  Nginx --> Api
  Web --> Api
  Api --> PG
  Api --> Redis
  Api --> Cloudinary
  Worker --> Redis
  Worker --> PG
  Worker --> Cloudinary
```

## 4. Backend Module Map

```mermaid
flowchart TB
  Auth --> Users
  Auth --> Subscriptions
  Questions --> Categories
  Questions --> Subscriptions
  Bookmarks --> Questions
  Bookmarks --> Documents
  Bookmarks --> News
  News --> Documents
  Admin --> Users
  Admin --> Questions
  Admin --> News
  Admin --> Analytics
  Analytics --> Users
  Questions --> Cloudinary
  Documents --> Cloudinary
  Users --> Cloudinary
  Documents --> BullMQ
  Analytics --> BullMQ
  Auth --> Redis
  BullMQ --> Redis
```

Logical NestJS modules: Auth, Users, Categories, Questions, Bookmarks, News, Documents, Subscriptions, Analytics, Admin, Cloudinary (Storage), BullMQ, Redis, Database, Health.

## 5. Request Path (Typical Authenticated Read)

1. Browser → Nginx → `api`
2. Helmet/CORS/rate-limit middleware
3. JWT guard → RBAC guard
4. Controller validates DTO
5. Service applies business rules + `AccessControlService`
6. Repository/Prisma query with selective fields
7. Response envelope; restricted fields already omitted

## 6. Write Path with File Upload

1. Client requests signed upload params **or** uploads multipart to API
2. API validates auth, MIME, size
3. StorageService uploads to Cloudinary
4. DB transaction stores metadata + domain row
5. On DB failure after upload: enqueue compensating delete job

## 7. Frontend Architecture Snapshot

Route groups:

- `(public)` — marketing, news listing
- `(auth)` — login/register
- `(app)` — user dashboard, questions, bookmarks, profile
- `(admin)` — admin console

Server Components fetch where cookie/session allows; mutations and heartbeats via Client Components + TanStack Query.

## 8. Shared Package

`shared/` exports:

- Enums (`UserRole`, `QuestionStatus`, `Difficulty`, …)
- Zod schemas for shared validation
- API DTO types / response envelopes
- Entitlement constants

Must remain browser-safe (no Prisma, no Node fs, no secrets).

## 9. Why Not Microservices

Single product, shared data model, small team/AI-assisted delivery, VPS deployment. Module boundaries + separate worker process provide isolation where needed without distributed transaction complexity.

## 10. Evolution

When justified later: extract worker-heavy document processing, add read replicas, introduce payment provider adapter behind `SubscriptionsModule`. Payment webhooks would land in API and update `UserSubscription` without rewriting access checks.
