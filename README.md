# Your Academy

MCQ-based EdTech platform with category browsing, bookmarks, news, analytics, and an admin dashboard.

Modular monolith: **Next.js frontend** + **NestJS backend** + **BullMQ worker** + **PostgreSQL/Redis**.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js App Router, TypeScript, Tailwind, TanStack Query |
| Backend | NestJS, Prisma, PostgreSQL, JWT cookies + CSRF, Argon2id, RBAC |
| Jobs | Redis + BullMQ |
| Ops | Docker Compose, Nginx, GitHub Actions |

## Layout

```text
frontend/   Next.js UI
backend/    NestJS API + Prisma
worker/     BullMQ workers
shared/     Shared types/enums
docker/     Compose + Nginx
docs/       Architecture & requirements
```

## Features

- Auth (register/login/refresh/logout, CSRF cookies, password reset tokens)
- Free vs Paid plans (admin switch, free set counts, Free/Paid Model Tests) enforced by the API, with **SSLCommerz** payments (DEC-060)
- Categories + MCQ create/publish (admin)
- Bookmarks, profile stats, browsing heartbeats
- News publish/browse
- Admin KPI dashboard
- Storage signed-upload stub (Cloudinary-ready)

## Quick start

```bash
cp .env.example .env   # database: your_academy / your_academy_dev_password
pnpm setup             # install, start Postgres+Redis, migrate, seed

# Run (loads root .env via dotenv-cli)
pnpm dev:backend    # :5000
pnpm dev:frontend   # :3000 (proxies /api/v1 → backend)
pnpm dev:worker     # BullMQ
```

Do not leave `POSTGRES_USER` empty — it overrides Compose defaults and breaks Postgres.

Seeded admin: WhatsApp from `BOOTSTRAP_ADMIN_WHATSAPP` / password `BOOTSTRAP_ADMIN_PASSWORD`.

| URL | What |
|-----|------|
| http://localhost:3000 | App UI |
| http://localhost:5000/health | API health |
| http://localhost:5000/ready | API + DB readiness |

## Payments (SSLCommerz)

Payments and subscriptions work as soon as the store credentials are set — no code changes.

**1. Environment** (`.env` locally, `.env.production` on the VPS, then restart the API):

```bash
SSLCZ_STORE_ID=your_store_id
SSLCZ_STORE_PASSWORD=your_store_password   # the API password, not your panel login
SSLCZ_IS_LIVE=false                        # true = live gateway
API_PUBLIC_URL=https://youracademy.com.bd  # public origin the gateway posts back to
```

Without `SSLCZ_STORE_ID` / `SSLCZ_STORE_PASSWORD` the site keeps working and the Packages
page says online payment is not configured. Sandbox store: <https://developer.sslcommerz.com/registration/>.

**2. SSLCommerz merchant panel** — set the **IPN URL** (IPN Settings → enable HTTP listener):

| Setting | Value |
|---------|-------|
| IPN URL | `https://youracademy.com.bd/api/v1/payments/sslcommerz/ipn` |

Success / fail / cancel URLs are sent with every payment by the API
(`…/api/v1/payments/sslcommerz/success|fail|cancel`) — nothing to enter for those.
SSLCommerz must be able to reach these URLs over **HTTPS** from the internet (not `localhost`;
use a tunnel such as `cloudflared` to test callbacks locally).

**3. Dashboard** (Admin): create packages in **Packages**, then switch **Paid system** ON and
set how many Preli / Written sets are free. Mark Model Tests Free / Paid on their create / edit
form. **Subscribers** grants / extends / disables plans by hand; **Payments** lists every
transaction with **Re-check** (asks SSLCommerz again) and **Approve** for risk-held payments.

How it works and what is validated: `docs/19-decisions-and-assumptions.md` (DEC-060).

## Docs

Start with [`AGENTS.md`](AGENTS.md) and [`docs/00-project-overview.md`](docs/00-project-overview.md).

## License

Proprietary — all rights reserved unless otherwise stated.
