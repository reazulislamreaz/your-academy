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
| `API_PORT` | yes | Default `3001` |
| `API_PUBLIC_URL` | yes | e.g. `http://localhost:3001` |
| `WEB_ORIGIN` | yes | CORS origin (`http://localhost:3000`) |
| `JWT_ACCESS_SECRET` | yes | Strong random secret (≥32 chars) |
| `JWT_ACCESS_TTL_SECONDS` | yes | Default `900` |
| `JWT_REFRESH_TTL_SECONDS` | yes | Default `2592000` |
| `COOKIE_SECURE` | yes | `false` local, `true` production |
| `COOKIE_SAME_SITE` | no | Default `lax` |
| `ACCESS_COOKIE_NAME` | no | Default `access_token` |
| `REFRESH_COOKIE_NAME` | no | Default `refresh_token` |
| `CSRF_COOKIE_NAME` | no | Default `csrf_token` |
| `TRIAL_DAYS` | yes | Must be `7` unless approved |
| `SWAGGER_ENABLED` | no | Default true in dev |
| `THROTTLE_TTL_SECONDS` | no | Rate limit window |
| `THROTTLE_LIMIT` | no | Requests per window |

## Web

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | yes | Prefer `/api/v1` (Next rewrite) |
| `API_INTERNAL_URL` | yes | Backend origin for rewrite (`http://localhost:3001` or `http://api:3001` in Docker) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | yes | Public cloud name only |
| `PORT` | no | Next listen port |

No `CLOUDINARY_API_SECRET` on web.

## Cloudinary (API + worker host)

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | for uploads | Cloud name |
| `CLOUDINARY_API_KEY` | for uploads | API key |
| `CLOUDINARY_API_SECRET` | for uploads | Secret — **API only**, never on web |
| `CLOUDINARY_FOLDER_PREFIX` | no | Default `your-academy` |

Placeholder values (`demo` / `demo_secret_change_me`) are treated as **not configured**. `GET /api/v1/storage/status` returns `{ configured: false }` until real credentials are set. Admin PDF upload and profile avatar then stay in metadata/placeholder mode.

## Email / password reset (API enqueue → worker SMTP)

| Variable | Used by | Description |
|----------|---------|-------------|
| `SMTP_HOST` | worker | If unset, worker logs the reset URL |
| `SMTP_PORT` | worker | Default `1025` (Mailhog) |
| `SMTP_USER` / `SMTP_PASS` | worker | Optional auth |
| `EMAIL_FROM` | worker | From address |
| `PASSWORD_RESET_URL_BASE` | api | e.g. `http://localhost:3000/reset-password` |
| `PASSWORD_RESET_TTL_SECONDS` | api | Default `3600` |

Forgot-password enqueues a BullMQ `password-reset` job on `email-queue`. The worker sends via SMTP when reachable; in non-production it logs the reset URL if SMTP fails (e.g. Mailhog not running). The API also logs the link when `NODE_ENV !== production`.

Local scripts use `dotenv -e .env -o` so `.env` wins over inherited Docker hostnames (e.g. `REDIS_URL=redis://redis:6379`). Turbo runs with `envMode: "loose"` so worker/API receive those vars.

## Bootstrap admin

See `.env.example` for `BOOTSTRAP_ADMIN_*` (seed).

## Ready-to-run

```bash
cp .env.example .env   # if needed
pnpm setup             # install, docker postgres/redis, migrate, seed
pnpm dev:backend
pnpm dev:frontend
pnpm dev:worker        # required for password-reset email jobs
```

