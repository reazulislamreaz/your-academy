# 17 — Environment Variables

Never commit real secrets. Provide `.env.example` files during Phase 1 with placeholders only.

## 1. Cross-Cutting

| Variable | Used by | Description |
|----------|---------|-------------|
| `NODE_ENV` | all | `development` \| `production` \| `test` |
| `APP_NAME` | all | `confiro` |
| `LOG_LEVEL` | api, worker | `debug` \| `info` \| `warn` \| `error` |

## 2. API

| Variable | Required | Description |
|----------|----------|-------------|
| `API_PORT` | yes | Default `3001` |
| `API_PUBLIC_URL` | yes | e.g. `https://api.example.com` |
| `WEB_ORIGIN` | yes | CORS origin |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | yes | Redis connection string |
| `JWT_ACCESS_SECRET` | yes | Strong random secret |
| `JWT_ACCESS_TTL_SECONDS` | yes | Default `900` |
| `JWT_REFRESH_TTL_SECONDS` | yes | Default `2592000` |
| `COOKIE_DOMAIN` | no | Shared cookie domain |
| `COOKIE_SECURE` | yes | `true` in production |
| `THROTTLE_TTL_SECONDS` | no | Rate limit window |
| `THROTTLE_LIMIT` | no | Requests per window |
| `ARGON2_MEMORY_COST` | no | Tunable |
| `ARGON2_TIME_COST` | no | Tunable |
| `ARGON2_PARALLELISM` | no | Tunable |
| `TRIAL_DAYS` | yes | Must be `7` unless approved change |
| `SWAGGER_ENABLED` | no | Default true in dev |

## 3. Worker

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | Same DB |
| `REDIS_URL` | yes | Same Redis |
| `CLOUDINARY_*` | yes | Same as API |
| `EMAIL_*` | no | When email enabled |

## 4. Web

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | yes | Browser-visible API base (`/api/v1` via Nginx or absolute) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | yes | Public cloud name only |
| `PORT` | no | Next listen port |

No `CLOUDINARY_API_SECRET` on web.

## 5. Cloudinary

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | yes | |
| `CLOUDINARY_API_KEY` | yes | Server only |
| `CLOUDINARY_API_SECRET` | yes | Server only |
| `CLOUDINARY_FOLDER_PREFIX` | no | Default `confiro` |

## 6. PostgreSQL / Redis (Compose)

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | DB user |
| `POSTGRES_PASSWORD` | DB password |
| `POSTGRES_DB` | DB name |
| `POSTGRES_PORT` | Dev published port only |

## 7. Email (Required for password reset — DEC-004)

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | yes (prod) | SMTP host |
| `SMTP_PORT` | yes (prod) | SMTP port |
| `SMTP_USER` | no | Auth user if required |
| `SMTP_PASS` | no | Auth password if required |
| `EMAIL_FROM` | yes (prod) | From address |
| `PASSWORD_RESET_URL_BASE` | yes | e.g. `https://app.example.com/reset-password` |
| `PASSWORD_RESET_TTL_SECONDS` | no | Default `3600` |

Dev may use Ethereal/Mailhog; document in Phase 3.

## 8. Admin Bootstrap

| Variable | Description |
|----------|-------------|
| `BOOTSTRAP_ADMIN_WHATSAPP` | Seed only |
| `BOOTSTRAP_ADMIN_PASSWORD` | Seed only — change after first login |

## 9. Validation Rules

- Fail fast if required vars missing
- Refuse to boot production if `JWT_ACCESS_SECRET` length insufficient
- `TRIAL_DAYS` should warn if not `7`
