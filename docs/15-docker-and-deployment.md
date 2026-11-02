# 15 — Docker and Deployment

## 1. Services

| Service | Image/build | Notes |
|---------|-------------|-------|
| `web` | `frontend/` multi-stage | Next.js standalone output preferred |
| `api` | `backend/` multi-stage | NestJS prod build |
| `worker` | `worker/` multi-stage | Background jobs |
| `migrate` | same as `api` (prod) | One-shot `prisma migrate deploy` before start |
| `postgres` | Official Postgres | Named volume; not published in prod |
| `redis` | Official Redis | Persistence config; not published in prod |
| `nginx` | Official Nginx | TLS, reverse proxy (80/443 in prod) |

Cloudinary is external — **not** containerized.

## 2. Networks

- `frontend` / public edge via Nginx ports 80/443 only
- `internal` bridge: api, worker, postgres, redis, web (as needed)
- Postgres/Redis bind to internal network only in production

## 3. Compose Layout

```text
docker/
  docker-compose.yml           # base
  docker-compose.dev.yml       # published DB/API/web ports for local
  docker-compose.prod.yml      # TLS nginx, migrate job, no DB ports, log caps
  nginx/
    nginx.conf                 # local/dev HTTP
    nginx.prod.conf            # HTTPS + HSTS + ACME webroot
  certs/                       # mount host TLS material (not committed)
  api.Dockerfile
  web.Dockerfile
  worker.Dockerfile
```

```bash
# Local infra only
pnpm docker:up

# Full local compose (dev ports)
pnpm docker:dev

# Production (requires .env.production + TLS certs)
pnpm docker:prod
# or: ./scripts/deploy.sh
```

**Never** stack `docker-compose.dev.yml` with prod — it publishes Postgres/Redis.

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

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `.github/workflows/ci.yml` | PR + push | Lint, typecheck, unit tests, build |
| `.github/workflows/deploy.yml` | After CI success on `main`, or manual | SSH → `git pull` → `./scripts/deploy.sh` → HTTPS health gate |

Deploy secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`, `DEPLOY_DOMAIN` (see `docs/22-operations-runbook.md`).

Migrations: Compose `migrate` service runs `prisma migrate deploy` and must succeed before `api`/`worker`/`web` start.

## 10. Database Backup & Restore

**Scripts (preferred):**

```bash
pnpm db:backup
# → backups/backup_your_academy_YYYY-MM-DD_HHMMSS.sql.gz (mode 600)

pnpm db:restore backups/backup_your_academy_YYYY-MM-DD_HHMMSS.sql.gz
```

Wrappers: `scripts/backup-db.sh`, `scripts/restore-db.sh` (Compose postgres service).

**Manual equivalent:**

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --env-file .env \
  exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup_$(date +%F).sql.gz

gunzip -c backup.sql.gz | docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --env-file .env \
  exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

Store off-box; restrict permissions; encrypt at rest if possible.

### Restore drill

| Field | Value |
|-------|-------|
| Procedure | `pnpm db:backup` → copy artifact off-box → on a scratch DB/stack run `pnpm db:restore <file>` → spot-check `/ready`, admin login, question count |
| Proposed RPO | 24h (initial production) |
| Proposed RTO | < 1h for single-node VPS restore |
| Last drill | **2026-11-02** — local Compose backup script verified (`pnpm db:backup` writes gzip under `backups/`) |

Test restores periodically (see `docs/22-operations-runbook.md`).

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
