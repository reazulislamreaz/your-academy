# 03 — Non-Functional Requirements

## 1. Quality Attributes

| Attribute | Requirement |
|-----------|-------------|
| Scalability | Support growth via vertical scale + read-friendly indexes; queue offload for heavy work; no premature sharding |
| Reliability | Graceful degradation when Cloudinary/Redis briefly unavailable for non-critical paths; Postgres is critical |
| Performance | See measurable targets below |
| Security | Defense-in-depth per threat model; no claim of absolute security |
| Maintainability | Modular NestJS/Next.js; documented boundaries; shared contracts package |
| DX | Docker Compose up for local; Swagger; typed clients; AGENTS.md |
| Type safety | TypeScript strict mode in apps |
| Testability | DI-friendly services; mocked storage/queues in unit tests |
| Operational simplicity | Single Compose stack on VPS initially; structured logs; health endpoints |

## 2. Measurable Performance Goals (Initial)

| Metric | Target | Validation |
|--------|--------|------------|
| API p95 authenticated question list (cold cache, 50 items) | < 300 ms on staging-sized VPS | k6/Artillery against staging |
| API p95 question detail | < 200 ms | Same |
| Web LCP (question list, 4G simulated) | < 2.5 s | Lighthouse CI |
| Heartbeat endpoint p95 | < 100 ms | Load test |
| Publish question transaction | < 500 ms | Integration timing |
| Background PDF metadata job | Completes within 60 s for ≤20 MB PDF | Worker metrics |

Do not prematurely optimize; meet targets with indexes, lean Prisma selects, and CDN for media first.

## 3. Availability & Resilience

| Concern | Approach |
|---------|----------|
| Process crash | Docker restart policies; health checks |
| Deploy | Rolling/recreate with health gate; run migrations before new API traffic |
| Redis down | API auth refresh may degrade; document fail-closed vs fail-open per path |
| Cloudinary down | Uploads fail gracefully; existing DB metadata still serves signed URL generation when possible |
| Worker down | Jobs accumulate in Redis; alerts via logs/monitoring |

Target availability for v1 single-VPS: best-effort (~99% excluding planned maintenance). Multi-node HA is out of scope initially.

## 4. Capacity Assumptions (Planning)

| Resource | Initial planning assumption |
|----------|----------------------------|
| Users | 10k registered; ~500 DAU |
| Questions | 20k published |
| Heartbeats | 500 DAU × ~60 heartbeats/hour peak ≈ design for ~1k RPM burst headroom |
| Storage | Media on Cloudinary; DB growth dominated by analytics/audit |

Revisit after real metrics.

## 5. Compatibility

- Modern evergreen browsers (last two Chrome/Firefox/Safari/Edge versions)
- Responsive layouts: mobile and desktop
- API JSON over HTTPS

## 6. Observability

- Structured JSON logs from API and worker
- Request correlation IDs
- `/health` and `/ready` style checks (DB + Redis)
- Queue depth and failed job counts

## 7. Compliance / Privacy (Baseline)

- Minimize PII: WhatsApp number, name, optional email, avatar
- Support account deletion workflow (details DEC-005)
- Audit admin access to user PII
- No selling of user data (product policy assumption)

## 8. Internationalization

v1 assumes a single primary locale (content language as uploaded). i18n framework optional later — DEC-011.
