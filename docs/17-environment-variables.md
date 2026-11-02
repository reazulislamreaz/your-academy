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

## Cloudinary / Email / Bootstrap

See `.env.example` for `CLOUDINARY_*`, `SMTP_*`, `PASSWORD_RESET_*`, and `BOOTSTRAP_ADMIN_*`.

## Ready-to-run

```bash
cp .env.example .env   # if needed
pnpm setup             # install, docker postgres/redis, migrate, seed
pnpm dev:backend
pnpm dev:frontend
```
