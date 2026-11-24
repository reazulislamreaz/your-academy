# 22 — Operations Runbook (Production)

**Product:** Your Academy  
**Phase:** 13 — Production deployment  
**Stack:** Docker Compose (`web`, `api`, `worker`, `postgres`, `redis`, `nginx`) on Ubuntu VPS

---

## 1. First-time VPS setup

1. Provision Ubuntu 22.04+ with Docker Engine + Compose plugin.
2. Create deploy user (or use `root`); add SSH key used by GitHub Actions (`DEPLOY_SSH_KEY`).
3. Clone repo to `DEPLOY_PATH` (e.g. `/root/your-academy`).
4. Point DNS `A`/`AAAA` for your domain at the VPS (Cloudflare orange-cloud OK).
5. **Origin TLS behind Cloudflare (recommended, permanent):** install a publicly trusted origin cert that Cloudflare Full (strict) accepts on **all** edges (including DAC/CGP). Production uses **ZeroSSL (Sectigo/USERTrust chain)** via `acme.sh` DNS-01 — **not** Let’s Encrypt YE1/YR1 (“Root YE/YR”), which caused intermittent Cloudflare **525** from Bangladesh edges under Full (strict). Prefer **Cloudflare Origin CA** when the API token has Account/Zone **SSL and Certificates:Edit** (token used for DNS alone cannot create Origin CA). Set `TLS_ENABLED=true`, `TLS_CERTS_DIR=/etc/your-academy/certs`, `COOKIE_SECURE=true`, `WEB_ORIGIN=https://…`. Deploy uses `nginx.prod.conf` (:80 + :443). Apply edge settings with `./scripts/cloudflare-prod-ssl.sh`: SSL/TLS **Full (strict)**, Always Use HTTPS **on**, min TLS **1.2**, **IPv6 Compatibility off**, **HTTP/3 off**, Browser Integrity Check **off**, **Origin max HTTP version = HTTP/1.1**, Authenticated Origin Pulls **off**, Opportunistic Encryption **off**. Origin nginx: `backlog=4096`, **HTTP/2 off** on `:443`. Auto-renew: `acme.sh` cron → `/etc/your-academy/certs` + `nginx -s reload`. Nginx must re-resolve Docker upstreams via `127.0.0.11` (see `nginx.prod.conf`).
6. Issue origin TLS (ZeroSSL via `acme.sh` DNS-01 — current production):

```bash
# CF_Token from /root/.secrets-cloudflare.ini (Zone DNS Edit)
export CF_Token=…
~/.acme.sh/acme.sh --issue --dns dns_cf -d youracademy.com.bd -d www.youracademy.com.bd \
  --keylength 2048 --server zerossl
~/.acme.sh/acme.sh --install-cert -d youracademy.com.bd \
  --fullchain-file /etc/your-academy/certs/fullchain.pem \
  --key-file /etc/your-academy/certs/privkey.pem \
  --reloadcmd "docker exec your-academy-nginx-1 nginx -s reload"
```

7. Cert paths for Compose (files, not LE symlinks, when using ZeroSSL):

```bash
sudo mkdir -p /etc/your-academy/certs
# populated by acme.sh --install-cert (fullchain.pem + privkey.pem)
```

8. Create `.env.production` from `.env.example` (chmod `600`). HTTP-first minimum:

| Variable | HTTP-first value | HTTPS later |
|----------|------------------|-------------|
| `NODE_ENV` | `production` | same |
| `COOKIE_SECURE` | `false` | `true` |
| `TLS_ENABLED` | `false` | omit / `true` |
| `SWAGGER_ENABLED` | `false` | same |
| `WEB_ORIGIN` | `http://your.domain` | `https://…` |
| `API_PUBLIC_URL` | `http://your.domain` | `https://…` |
| `PASSWORD_RESET_URL_BASE` | `http://your.domain/reset-password` | `https://…` |
| `JWT_ACCESS_SECRET` | ≥32 char random | same |
| `POSTGRES_PASSWORD` | strong unique | same |
| `TLS_CERTS_DIR` | n/a until TLS | `/etc/your-academy/certs` |
| Cloudinary / SMTP | real credentials | same |

9. First boot:

```bash
./scripts/deploy.sh
# or: pnpm docker:prod:http
```

10. Seed bootstrap admin once (if empty DB), then **change** `BOOTSTRAP_ADMIN_*` password.
11. Verify:

```bash
curl -fsS http://your.domain/health   # or https:// when TLS is on
curl -fsS http://your.domain/ready
```

**Acceptance checks:** Edge serves app; `/ready` shows `database` + `redis` up; `docker compose ps` shows **no** published `5432`/`6379`.

---

## 2. Routine redeploy

Triggered by GitHub Actions `Deploy` workflow after successful CI on `main`, or manually (`workflow_dispatch`).

The workflow checks out **exactly the commit CI tested** and runs `scripts/deploy.sh`, which:

1. Takes a lock (one deploy at a time; the workflow also has a `production-deploy` concurrency group).
2. Checks free disk (`MIN_FREE_GB`, default 5). Below it, runs the safe cleanup; still below → stops, site untouched.
3. Safe cleanup every deploy: `docker container prune -f`, `docker image prune -af --filter until=72h` (app images excluded — they follow version retention), `docker builder prune -af --filter until=72h`. **Volumes are never pruned.**
4. Validates the nginx config, then builds (or pulls from GHCR) `your-academy-{api,web,worker}:<sha12>` while the current version keeps serving.
5. Pending migrations must pass `scripts/check-migrations.mjs` (backward-compatible only); DB backup to `backups/pre-deploy_<sha>_*.sql.gz` (last 5 kept), then `migrate`.
6. Blue/green per service (api → web → worker): new container starts next to the old one, must be healthy (+ `/health` 200 and `/ready` for api, `/` for web), nginx re-resolves, old container is drained and removed.
7. Final `/health` through nginx. Any failure after a switch → automatic rollback of the switched services to the previous version.
8. Records the version in `.deploy/history`, keeps the last `KEEP_VERSIONS` (3) image sets, prints a summary (deployed / previous / rollback).

On the host, equivalent: `git checkout --detach <sha> && ./scripts/deploy.sh` · state: `./scripts/deploy.sh status`.

**Image source:** set repository variable `DEPLOY_IMAGE_SOURCE=ghcr` to build on GitHub Actions and push to `ghcr.io/<owner>/your-academy-*` — the server then only pulls. Also set repository variables `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (and `NEXT_PUBLIC_API_BASE_URL` if not `/api/v1`), because the web image bakes them in at build time. Default `build` keeps building on the server.

**Migrations must be expand-only** (add tables / nullable or defaulted columns / indexes). Drop, rename or retype in a *later* release once no running version uses the old shape. CI and the deploy block anything else unless it is listed in `backend/prisma/breaking-migrations.txt`; for those, the deploy backs up first and `rollback` refuses to go below that version without `--force` (restore the backup first).

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

Failed deploys roll back by themselves. To go back manually to a kept version (last 3, no rebuild, zero downtime):

- **GitHub:** Actions → **Deploy** → *Run workflow* → action `rollback`, `rollback_to` = version tag (empty = previous one). Use the same image source as the deploy.
- **On the server:**

```bash
cd "$DEPLOY_PATH"
./scripts/deploy.sh status              # running version, history, kept versions
./scripts/deploy.sh rollback            # back to the previous version
./scripts/deploy.sh rollback 26d64d5a1b2c   # back to a specific kept version
```

Rollback switches images only — it does **not** touch the database (expand-only migrations keep older versions working). If a later deploy applied a migration listed in `breaking-migrations.txt`, rollback below it is refused: restore that deploy's `backups/pre-deploy_*.sql.gz` with `scripts/restore-db.sh` first, then `rollback <tag> --force`. The repo checkout stays on the newer commit; the next normal deploy moves forward again.

The first deploy with this script adopts the containers that were already running as version `legacy`, so even that deploy can roll back.

---

## 7. Incident quick checks

| Symptom | Likely cause |
|---------|----------------|
| `/ready` 503 database | Postgres down / bad `DATABASE_URL` |
| `/ready` 503 Redis | Redis down / bad `REDIS_URL` |
| 502 via Nginx | Usually rolling recreate: nginx hit `api`/`web` while the new container was not listening yet (`connect() failed (111)`). Deploy builds images first then `up --wait`; nginx retries `error/timeout/502/503` briefly. Check `docker compose … logs api web nginx`. |
| Next client “Application error” | Often `ChunkLoadError` after deploy (HTML/JS build id mismatch) or mid-deploy 502 on `/_next/static/*`. App auto-reloads once; hard refresh clears stuck tabs. |
| Web `EACCES` on `.next/cache` | Image must chown cache dirs to `youracademy` (see `docker/web.Dockerfile`). |
| Cookies fail on HTTPS | `COOKIE_SECURE` not `true` or wrong `WEB_ORIGIN` |
| TLS error / Cloudflare **525** | Origin cert untrusted by some CF edges (Let’s Encrypt **YE/YR** chains caused DAC/CGP 525 under Full strict — use ZeroSSL/Sectigo or Cloudflare Origin CA); missing/expired files in `TLS_CERTS_DIR`; Origin max HTTP version still HTTP/2; Authenticated Origin Pulls on without client certs; broken client IPv6 (CF IPv6 **off**) |
| Migrate failed | Previous version keeps serving. Check the deploy log; fix SQL/env; re-run deploy |
| Deploy stopped: low disk | `df -h`, `docker system df`; delete old files in `backups/`; never `docker volume prune`. `MIN_FREE_GB` sets the limit |
| Deploy stopped: migration not backward-compatible | Split into expand/contract, or (intended) list it in `backend/prisma/breaking-migrations.txt` |

---

## 8. GitHub Actions secrets

| Secret | Purpose |
|--------|---------|
| `DEPLOY_HOST` | VPS IP/hostname |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private key |
| `DEPLOY_PATH` | Absolute path to repo on VPS |
| `DEPLOY_DOMAIN` | Public hostname for the post-deploy check (`https://<domain>/health`; reports only — the origin checks decide rollback) |

Repository **variables** (optional): `DEPLOY_IMAGE_SOURCE` (`build` default / `ghcr`), `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_API_BASE_URL` (GHCR builds only). GHCR uses the workflow's `GITHUB_TOKEN` (login on the server only for the pull, then logout).

Configure environment **production** protection rules as needed.
