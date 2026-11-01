# 15 — Docker and Deployment

## 1. Services

| Service | Image/build | Notes |
|---------|-------------|-------|
| `web` | `apps/web` multi-stage | Next.js standalone output preferred |
| `api` | `apps/api` multi-stage | NestJS prod build |
| `worker` | `apps/worker` multi-stage | Same codebase family |
| `postgres` | Official Postgres | Named volume; not published in prod |
| `redis` | Official Redis | Persistence config; not published in prod |
| `nginx` | Official Nginx | TLS, reverse proxy |

Cloudinary is external — **not** containerized.

## 2. Networks

- `frontend` / public edge via Nginx ports 80/443 only
- `internal` bridge: api, worker, postgres, redis, web (as needed)
- Postgres/Redis bind to internal network only in production

## 3. Compose Layout

```text
docker/
  docker-compose.yml           # base
  docker-compose.dev.yml       # hot reload, published DB ports optional
  docker-compose.prod.yml      # restart policies, no DB ports
  nginx/
    nginx.conf
  api.Dockerfile
  web.Dockerfile
  worker.Dockerfile
```

Root scripts: `docker compose -f … up`.

## 4. Dockerfile Standards

- Multi-stage: deps → build → runtime
- Non-root user
- `NODE_ENV=production` in runtime
- Healthcheck CMD hitting `/health` (api) or HTTP on web
- Copy lockfiles for reproducible installs
- No secrets baked into layers

## 5. Configuration

- Env files: `.env.development`, `.env.production` (gitignored)
- Inject via Compose `env_file` / host environment
- Validate required vars at process start

## 6. Persistence

| Volume | Purpose |
|--------|---------|
| `postgres_data` | Database files |
| `redis_data` | AOF/RDB |
| `nginx_certs` | TLS material (or host mount) |

## 7. Nginx Responsibilities

- Terminate TLS
- Route `/` → web; `/api` → api
- Security headers (CSP baseline, HSTS in prod)
- Upload body size aligned with PDF limits
- Rate limiting at edge optional complement to app throttles

## 8. Restarts & Shutdown

- `restart: unless-stopped` in prod
- API/worker handle SIGTERM; BullMQ workers close gracefully
- stop_grace_period sufficient for in-flight jobs

## 9. CI/CD (GitHub Actions)

Proposed pipeline:

1. Lint + test on PR
2. Build Docker images
3. On main: SSH/deploy to Ubuntu VPS **or** push images + compose pull
4. `prisma migrate deploy` before/at api start (init container or deploy script)
5. Health gate

Exact host provisioning is Phase 13.

## 10. Database Backup & Restore

**Backup:**

```bash
docker compose exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup_$(date +%F).sql.gz
```

Store off-box; restrict permissions; encrypt at rest if possible.

**Restore:**

```bash
gunzip -c backup.sql.gz | docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

Test restores periodically. Document RPO/RTO targets when production launches (proposed RPO 24h initial).

## 11. Logging

- JSON logs to stdout; Docker log driver / host collection
- Do not log secrets

## 12. Resource Defaults (VPS-conscious)

| Service | Proposed limits (tune later) |
|---------|------------------------------|
| api | 512MB–1GB RAM |
| worker | 512MB |
| web | 512MB |
| postgres | 1GB+ |
| redis | 256–512MB |

## 13. Dev vs Prod Differences

| Concern | Dev | Prod |
|---------|-----|------|
| DB/Redis ports | May publish localhost | Internal only |
| TLS | Optional | Required |
| Bind mounts | Source hot reload | No source mounts |
| Replicas | 1 | 1 initially |
| Swagger | On | Off or admin-protected |
