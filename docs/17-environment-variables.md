# 17 — Environment Variables

Never commit real secrets. Use `.env.example` → `.env`. Prisma also reads `backend/.env` (synced by `pnpm setup`).

## Database (canonical local values)

| Variable | Value |
|----------|-------|
| `POSTGRES_USER` | `your_academy` |
| `POSTGRES_PASSWORD` | `your_academy_dev_password` |
| `POSTGRES_DB` | `your_academy` |
| `POSTGRES_PORT` | `5432` |
| `DATABASE_URL` (host) | `postgresql://your_academy:your_academy_dev_password@localhost:5432/your_academy?schema=public` |

Docker Compose overrides `DATABASE_URL` host to `postgres` for `api` / `worker` containers.

**Do not leave `POSTGRES_USER` empty** — an empty value overrides Compose defaults and breaks Postgres.

## Redis

| Variable | Host apps | Inside Compose |
|----------|-----------|----------------|
| `REDIS_URL` | `redis://localhost:6379` | `redis://redis:6379` (set on services) |

## Cross-cutting

| Variable | Used by | Description |
|----------|---------|-------------|
| `NODE_ENV` | all | Prefer **unset** in `.env`. Next `build`/`start` force `production`. Nest defaults to development when unset. Do not leave `NODE_ENV=development` in `.env` if `pnpm build` inherits it. |
| `APP_NAME` | all | `your-academy` |
| `LOG_LEVEL` | api, worker | `debug` \| `info` \| `warn` \| `error` |

## API

| Variable | Required | Description |
|----------|----------|-------------|
| `API_PORT` | yes | Default `5000` |
| `API_PUBLIC_URL` | yes | e.g. `http://localhost:5000` |
| `WEB_ORIGIN` | yes | CORS origin (`http://localhost:3000`). Comma-separated multi-origin also accepted via `WEB_ORIGINS` or `WEB_ORIGIN`. Also used for Socket.IO `/support` CORS (DEC-029). |
| `WEB_ORIGINS` | no | Optional alias for multi-origin allowlist |
| `JWT_ACCESS_SECRET` | yes | Strong random secret (≥32 chars) |
| `JWT_ACCESS_TTL_SECONDS` | yes | Default `900` |
| `JWT_REFRESH_TTL_SECONDS` | yes | Default `2592000` |
| `COOKIE_SECURE` | yes | `false` local, `true` production |
| `COOKIE_SAME_SITE` | no | Default `lax` |
| `ACCESS_COOKIE_NAME` | no | Default `access_token` |
| `REFRESH_COOKIE_NAME` | no | Default `refresh_token` |
| `CSRF_COOKIE_NAME` | no | Default `csrf_token` |
| `SSLCZ_STORE_ID` | for payments | SSLCommerz store id. Empty → online payment disabled (`PAYMENT_NOT_CONFIGURED`), DEC-060 |
| `SSLCZ_STORE_PASSWORD` | for payments | SSLCommerz store password (API secret — never logged) |
| `SSLCZ_IS_LIVE` | no | `true` = securepay.sslcommerz.com, `false`/unset = sandbox |
| `SSLCZ_TIMEOUT_MS` | no | Gateway HTTP timeout (default 30000) |
| `PAYMENT_RECHECK_ENABLED` | no | `false` turns off the lost-IPN re-check loop (default on) |
| `PAYMENT_RECHECK_INTERVAL_MINUTES` | no | Re-check loop interval (default 10) |
| `PAYMENT_RECHECK_MIN_AGE_MINUTES` | no | Only PENDING orders older than this are re-checked (default 15) |
| `SUBSCRIPTION_REMINDERS_ENABLED` | no | `false` turns off the 7- / 3-day plan-expiry reminder emails (DEC-062, default on) |
| `SUBSCRIPTION_REMINDER_INTERVAL_MINUTES` | no | How often the reminder pass runs (default 60, min 5); each reminder is still sent once per period |
| `PAYMENT_PENDING_EXPIRE_MINUTES` | no | PENDING with no gateway transaction after this → FAILED (default 120, min 30) |
| `APP_PUBLIC_URL` | no | Web origin for payment result redirects + email links (default: first `WEB_ORIGIN`) |
| `SWAGGER_ENABLED` | no | Default true in dev |
| `THROTTLE_TTL_SECONDS` | no | Rate limit window |
| `THROTTLE_LIMIT` | no | Requests per window |
| `CONTENT_RATE_LIMIT_PER_10_MIN` | no | Question/exam content requests per user or guest IP per 10 min (default 300, DEC-055) |
| `TRUST_PROXY` | no | Express `trust proxy` (default `loopback, linklocal, uniquelocal`) |
| `TRUSTED_CLIENT_IP_HEADER` | no | e.g. `cf-connecting-ip`; only when the origin accepts Cloudflare traffic only |
| `SINGLE_SESSION_STAFF` | no | `true` = one device at a time also for Admin/Moderator (default `false`, DEC-053) |
| `SINGLE_SESSION_ENABLED` | no | `false` disables the one-device rule entirely (default on) |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | web (build) | Support WhatsApp digits with country code for the forgot-password "no email" button |

## Web

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | yes | Prefer `/api/v1` (Next rewrite) |
| `API_INTERNAL_URL` | yes | Backend origin for rewrite (`http://localhost:5000` or `http://api:5000` in Docker) |
| `NEXT_PUBLIC_SOCKET_URL` | no | Socket.IO origin for support chat. **Leave empty** so the browser uses same-origin `/socket.io` (Next rewrite / Nginx → API) and sends HttpOnly auth + `support_guest_token` cookies. Set only if you intentionally connect straight to the API origin. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | yes | Public cloud name only |
| `PORT` | no | Next listen port |

Footer social URLs are **not** configured via env (DEC-046). Admins manage them at `/admin/social-links` (Postgres `social_links`).

Support guest cookie reuses `COOKIE_SECURE` / `COOKIE_SAME_SITE` / `COOKIE_DOMAIN` (`support_guest_token`, HttpOnly).

No `CLOUDINARY_API_SECRET` on web.

## Cloudinary (API + worker host)

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | for uploads | Cloud name |
| `CLOUDINARY_API_KEY` | for uploads | API key |
| `CLOUDINARY_API_SECRET` | for uploads | Secret — **API only**, never on web |
| `CLOUDINARY_FOLDER_PREFIX` | no | Default `your-academy` |

Placeholder values (`demo` / `demo_secret_change_me`) are treated as **not configured**. `GET /api/v1/storage/status` returns `{ configured: false }` until real credentials are set. Admin PDF upload and profile avatar then stay in metadata/placeholder mode.

## Cloudflare (optional / ops)

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | no | Account API token for Wrangler / Cloudflare API |
| `CLOUDFLARE_ACCOUNT_ID` | no | Cloudflare account id |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | no | R2 S3-compatible access key id |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | no | R2 S3-compatible secret access key |
| `CLOUDFLARE_R2_S3_ENDPOINT` | no | e.g. `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `DEPLOY_HOST` | no | VPS IP/hostname for SSH / GitHub Actions deploy |

Store only in gitignored `.env` — never commit. Product file storage remains Cloudinary unless a future decision migrates to R2.

## Email / password reset (API enqueue → worker SMTP)

| Variable | Used by | Description |
|----------|---------|-------------|
| `SMTP_HOST` | worker | Production: `smtp.resend.com`. If unset, the worker logs links (dev only; refuses in production) |
| `SMTP_PORT` | worker | Production `465` (SSL); default `1025` (Mailhog) |
| `SMTP_SECURE` | worker | Optional; defaults to `true` on port 465 |
| `SMTP_USER` / `SMTP_PASS` | worker | Resend: user `resend`, password = API key (`re_…`) |
| `EMAIL_FROM` | worker | Must be on our domain: `Your Academy <support@youracademy.com.bd>` (worker warns on gmail.com etc.) |
| `EMAIL_REPLY_TO` | worker | `support@youracademy.com.bd` (Cloudflare Email Routing → Gmail) |
| `EMAIL_SUPPORT_ADDRESS` | worker | Footer contact; defaults to `EMAIL_REPLY_TO` |
| `APP_PUBLIC_URL` | worker | Site for logo + footer links; defaults to `WEB_ORIGIN` |
| `PASSWORD_RESET_URL_BASE` | api | e.g. `http://localhost:3000/reset-password` |
| `PASSWORD_RESET_TTL_SECONDS` | api | Default `1800` (30 min, DEC-048); also admin-assisted links |
| `ADMIN_RESET_LIMIT_PER_USER` | api | Admin-assisted resets per user per 15 min (default 5, DEC-054) |
| `EMAIL_VERIFICATION_URL_BASE` | api | Confirmation link base; defaults to `${WEB_ORIGIN}/verify-email` |
| `EMAIL_VERIFICATION_TTL_SECONDS` | api | Default `86400` (24 h) |

Adding or changing an email in Account Settings enqueues an `email-verification` job on the same queue. Admins and Moderators only receive reset links at a **verified** email; learners keep the legacy rule (any email on the account).

All emails share one branded template (`worker/src/email/`), are multipart (HTML + text), carry a Message-ID on the From domain, and log a masked recipient + SMTP response. DNS (SPF/DKIM/DMARC) and testing: `docs/23-email-deliverability.md`.

Forgot-password enqueues a BullMQ `password-reset` job on `email-queue`. The worker sends via SMTP when reachable; in non-production it logs the reset URL if SMTP fails (e.g. Mailhog not running). The API also logs the link when `NODE_ENV !== production`.

Local scripts use `dotenv -e .env -o` so `.env` wins over inherited Docker hostnames (e.g. `REDIS_URL=redis://redis:6379`). Turbo runs with `envMode: "loose"` so worker/API receive those vars.

## Bootstrap admin

`BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_WHATSAPP`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_EMAIL` feed both `pnpm admin:create` (first admin only, idempotent, `--reset-password` to rotate) and the demo `pnpm db:seed`. The bootstrap email is marked verified (operator-provisioned).

## Production (`.env.production` on VPS)

Never commit. `chmod 600`. Used by `pnpm docker:prod` / `./scripts/deploy.sh`.

| Variable | Notes |
|----------|-------|
| `NODE_ENV` | `production` |
| `COOKIE_SECURE` | `true` |
| `SWAGGER_ENABLED` | `false` |
| `WEB_ORIGIN` / `API_PUBLIC_URL` | `https://your.domain` |
| `PASSWORD_RESET_URL_BASE` | `https://your.domain/reset-password` |
| `NEXT_PUBLIC_API_BASE_URL` | `/api/v1` (nginx proxies `/api/`) |
| `NGINX_HTTP_PORT` / `NGINX_HTTPS_PORT` | `80` / `443` |
| `TLS_CERTS_DIR` | Host dir with `fullchain.pem` + `privkey.pem` (default `./docker/certs`) |
| `CERTBOT_WWW_DIR` | ACME webroot (default `./docker/certbot-www`) |
| JWT / Postgres / Cloudinary / SMTP | Real secrets — no example defaults |

Compose overrides `DATABASE_URL` / `REDIS_URL` to service hostnames. Postgres and Redis stay internal-only (no host ports). See `docs/22-operations-runbook.md`.

## Ready-to-run

```bash
cp .env.example .env   # if needed
pnpm setup             # install, docker postgres/redis, migrate, seed
pnpm dev:backend
pnpm dev:frontend
pnpm dev:worker        # required for password-reset email jobs
```

