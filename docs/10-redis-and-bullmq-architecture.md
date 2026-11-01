# 10 — Redis and BullMQ Architecture

## 1. Role of Redis

- **Primary:** BullMQ broker/backend
- **Secondary (optional):** ephemeral cache (category tree, dashboard KPI short TTL), rate-limit backing store if used

Redis is **not** the system of record. Do not put user passwords or refresh tokens solely in Redis (sessions live in Postgres).

## 2. When to Use Jobs

Use BullMQ for asynchronous / long-running work:

- PDF processing / metadata extraction
- Image post-processing workflows
- Email notifications
- User activity aggregation
- Analytics aggregation
- Scheduled subscription checks (future)
- Content maintenance
- Cleanup of expired temporary resources / orphaned Cloudinary files

**Do not** use BullMQ for ordinary synchronous CRUD.

## 3. Queues

| Queue name | Responsibility | Suggested concurrency |
|------------|----------------|------------------------|
| `email-queue` | Transactional email | 5 |
| `document-processing-queue` | PDF metadata, validation | 2 |
| `image-processing-queue` | Extra image ops if needed | 3 |
| `analytics-queue` | Aggregations | 2 |
| `maintenance-queue` | Orphan cleanup, temp purge | 2 |

Register queues in `BullMQModule`; producers in backend services; consumers in `worker/`.

## 4. Producer Architecture

- API injects queue handles
- Enqueue after successful DB commit when possible
- Include `jobId` derived from business key for idempotency (e.g. `delete-asset:{mediaAssetId}`)
- Pass minimal payloads (IDs), not large blobs

## 5. Worker Architecture

- Separate NestJS (or lean Node) process: `worker/`
- Same Prisma schema and StorageService
- Processors per queue
- Graceful shutdown: stop taking jobs, wait in-flight with timeout

## 6. Retry, Backoff, Failures

| Setting | Initial value |
|---------|----------------|
| Attempts | 5 |
| Backoff | Exponential, starting 3s |
| Timeout | Per job type (email 30s; PDF 120s; maintenance 60s) |
| Failed jobs | Retain in Redis failed set; alert on threshold |
| Dead-letter | Logical DLQ via `failed` + periodic admin inspection; optional move to `*-dlq` queue |

## 7. Idempotency

BullMQ is **at-least-once**. Handlers must tolerate duplicates:

- Cloudinary delete: ignore not-found
- Aggregation: upsert by period key
- Email: store `notificationId` sent flag

## 8. Scheduling

Use BullMQ repeatable jobs for:

- Nightly analytics rollup
- Orphan media scan
- Future subscription expiration notifications (not required for trial expiry recognition)

## 9. Monitoring

- Log job completed/failed with jobId, queue, duration
- Expose queue counts on admin metrics or `/ready` extended checks (internal)
- Optional Bull Board behind admin auth (DEC-015)

## 10. Connection Resilience

- Max retries on Redis connect; exponential reconnect
- Distinct connections for Queue vs Worker as recommended by BullMQ
- Redis AOF or RDB persistence for job durability on VPS (see Docker doc)

## 11. Anti-Patterns

- Embedding API request lifecycle in a job when the client needs the result synchronously
- Exactly-once assumptions
- Sharing one giant `default` queue without priorities/timeouts
