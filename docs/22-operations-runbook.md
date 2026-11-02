# 22 — Operations Runbook (Production)

**Product:** Your Academy  
**Phase:** 13 — Production deployment  
**Stack:** Docker Compose (`web`, `api`, `worker`, `postgres`, `redis`, `nginx`) on Ubuntu VPS

---

## 1. First-time VPS setup

1. Provision Ubuntu 22.04+ with Docker Engine + Compose plugin.
2. Create deploy user; add SSH key used by GitHub Actions (`DEPLOY_SSH_KEY`).
3. Clone repo to `DEPLOY_PATH` (e.g. `/home/deploy/your-academy`).
4. Point DNS `A`/`AAAA` for your domain at the VPS.
5. Issue TLS certs (Let’s Encrypt recommended):

```bash
sudo apt install certbot
sudo certbot certonly --webroot -w /var/www/certbot -d your.domain
# or standalone before nginx is up, then switch to webroot renewals
```

6. Link certs for Compose:

```bash
sudo mkdir -p /etc/your-academy/certs
sudo ln -sf /etc/letsencrypt/live/your.domain/fullchain.pem /etc/your-academy/certs/fullchain.pem
sudo ln -sf /etc/letsencrypt/live/your.domain/privkey.pem /etc/your-academy/certs/privkey.pem
```

7. Create `.env.production` from `.env.example` (chmod `600`). Set at minimum:

| Variable | Production value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `COOKIE_SECURE` | `true` |
| `SWAGGER_ENABLED` | `false` |
| `WEB_ORIGIN` | `https://your.domain` |
| `API_PUBLIC_URL` | `https://your.domain` |
| `PASSWORD_RESET_URL_BASE` | `https://your.domain/reset-password` |
| `JWT_ACCESS_SECRET` | ≥32 char random (not the example) |
| `POSTGRES_PASSWORD` | strong unique password |
| `TLS_CERTS_DIR` | `/etc/your-academy/certs` |
| Cloudinary / SMTP | real credentials |

8. First boot:

```bash
pnpm docker:prod
# or: ./scripts/deploy.sh
```

9. Seed bootstrap admin once (if empty DB), then **change** `BOOTSTRAP_ADMIN_*` password.
10. Verify:

```bash
curl -fsS https://your.domain/health
curl -fsS https://your.domain/ready
```

**Acceptance checks:** HTTPS serves app; `/ready` shows `database` + `redis` up; `docker compose ps` shows **no** published `5432`/`6379`.

---

## 2. Routine redeploy

Triggered by GitHub Actions `Deploy` workflow after successful CI on `main`, or manually (`workflow_dispatch`).

On the host, equivalent:

```bash
cd "$DEPLOY_PATH"
git pull --ff-only
./scripts/deploy.sh
```

Migrations run via the one-shot `migrate` Compose service **before** `api`/`worker` start.

---

## 3. Health & monitoring

| Check | Command / URL |
|-------|----------------|
| Liveness | `GET /health` |
| Readiness | `GET /ready` (Postgres + Redis) |
| Containers | `docker compose … ps` |
| Logs | `docker compose … logs -f api worker nginx` |

Compose uses `json-file` logging with `max-size=10m`, `max-file=5`.

Suggested external uptime (optional): Uptime Kuma / Better Stack probing `https://domain/health` every 1–5 minutes. Alert on non-200.

Host logrotate (optional snippet — install under `/etc/logrotate.d/your-academy` if you also log to files):

```text
/var/lib/docker/containers/*/*.log {
  weekly
  rotate 4
  compress
  delaycompress
  missingok
  copytruncate
}
```

---

## 4. Backups

```bash
# On VPS (Compose stack running)
pnpm db:backup
# → backups/*.sql.gz (mode 600) — copy off-box immediately
```

Restore (destructive):

```bash
pnpm db:restore backups/backup_your_academy_YYYY-MM-DD_HHMMSS.sql.gz
```

See `docs/15-docker-and-deployment.md` §10 for RPO/RTO and last drill note.

---

## 5. Secret rotation

1. Generate new `JWT_ACCESS_SECRET` / DB password / Cloudinary / SMTP as needed.
2. Update `.env.production` on VPS (`chmod 600`).
3. `./scripts/deploy.sh` (recreates containers with new env).
4. Changing `JWT_ACCESS_SECRET` invalidates existing sessions (users re-login).
5. Never bake secrets into images or commit `.env.production`.

---

## 6. Rollback

1. `git log -5 --oneline` → note previous good SHA.
2. `git checkout <sha>`
3. `./scripts/deploy.sh`
4. If migration caused failure, restore DB from last backup **before** re-deploying older code that expects prior schema.

Prefer image/git tags for releases once you add tagged deploys.

---

## 7. Incident quick checks

| Symptom | Likely cause |
|---------|----------------|
| `/ready` 503 database | Postgres down / bad `DATABASE_URL` |
| `/ready` 503 Redis | Redis down / bad `REDIS_URL` |
| 502 via Nginx | `api`/`web` unhealthy — check logs |
| Cookies fail on HTTPS | `COOKIE_SECURE` not `true` or wrong `WEB_ORIGIN` |
| TLS error | Missing/expired files in `TLS_CERTS_DIR` |
| Migrate failed | Check `migrate` container logs; fix SQL/env; re-run deploy |

---

## 8. GitHub Actions secrets

| Secret | Purpose |
|--------|---------|
| `DEPLOY_HOST` | VPS IP/hostname |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private key |
| `DEPLOY_PATH` | Absolute path to repo on VPS |
| `DEPLOY_DOMAIN` | Public hostname for post-deploy HTTPS health gate |

Configure environment **production** protection rules as needed.
