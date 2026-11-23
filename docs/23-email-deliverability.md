# 23 — Email Deliverability (Resend + Cloudflare)

**Decision:** DEC-050. Transactional email (password reset, email verification) is sent by
the worker over SMTP through **Resend**, from `Your Academy <support@youracademy.com.bd>`,
with replies to the same address. `support@youracademy.com.bd` is received by **Cloudflare Email Routing**, which forwards it to the team Gmail inbox.

## Why emails went to spam (before)

1. Sent from a personal Gmail account (`youracademy04@gmail.com`) while the email is branded as "Your Academy" and links to `youracademy.com.bd`. That mismatch looks like phishing.
2. `youracademy.com.bd` had **no SPF, DKIM, DMARC, or MX** records, so nothing proved the domain sends mail.
3. A bare template whose button text was the raw URL, plus vague copy ("expires soon").
4. No real Reply-To or support address on the domain.

## What the code does now

- `From` = `EMAIL_FROM` on our domain; `Reply-To` = `EMAIL_REPLY_TO`; `Message-ID` = `<uuid@youracademy.com.bd>`.
- Every email is multipart (HTML + plain text) and uses the shared template (`worker/src/email/layout.ts`): table layout, inline CSS, no scripts, one 4 KB logo at `https://youracademy.com.bd/images/email-logo.png`.
- All links use `https://youracademy.com.bd/...`. Production `PASSWORD_RESET_URL_BASE` / `WEB_ORIGIN` must stay on https.
- Plain subjects: "Reset your Your Academy password", "Confirm your email for Your Academy".
- Every send logs `messageId`, the SMTP response, and a masked recipient (`so***@gmail.com`). Failures are logged and retried by BullMQ. Links are never logged in production.
- At startup the worker warns if `EMAIL_FROM` is a free-mail domain or the site URL isn't https.

## Step 1 — Resend account and domain

1. Sign up at <https://resend.com> and go to **Domains → Add domain** → `youracademy.com.bd` (region: the default, `us-east-1`).
2. Resend shows the DNS records. Either click **"Auto configure" (Cloudflare)** or add them by hand (Step 3).
3. Go to **API Keys → Create** → permission **Sending access**, restricted to `youracademy.com.bd`. Copy the key (`re_…`).

## Step 2 — Server environment (`.env.production` on the VPS)

```dotenv
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_your_api_key_here
EMAIL_FROM="Your Academy <support@youracademy.com.bd>"
EMAIL_REPLY_TO=support@youracademy.com.bd
APP_PUBLIC_URL=https://youracademy.com.bd
PASSWORD_RESET_URL_BASE=https://youracademy.com.bd/reset-password
```

Remove the old Gmail values (the `smtp.gmail.com` host, the Gmail app password, and `EMAIL_FROM` with `@gmail.com`). Then redeploy, or restart the worker: `docker compose -f docker/docker-compose.prod.yml up -d worker`.

## Step 3 — DNS records in Cloudflare

Cloudflare dashboard → `youracademy.com.bd` → **DNS → Records → Add record**. For every record below, set **Proxy status: DNS only** (grey cloud). Email records can't be proxied.

### Resend (sending)

Copy the exact values from Resend → Domains → `youracademy.com.bd`. Their shape is:

| Type | Name | Content | Priority | Purpose |
|------|------|---------|----------|---------|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3…` (long key from Resend) | — | **DKIM**: signs mail as `youracademy.com.bd` |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 | Bounce/return path for `send.youracademy.com.bd` |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — | **SPF** for the return-path subdomain |

### Cloudflare Email Routing (receiving `support@`)

1. Cloudflare → **Email → Email Routing → Get started**. Cloudflare adds the records itself:
   - MX `@` → `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`, `route3.mx.cloudflare.net` (Cloudflare picks the priorities)
   - TXT `@` → `v=spf1 include:_spf.mx.cloudflare.net ~all`
2. **Destination addresses → Add** `youracademy04@gmail.com`, then click the verification link Cloudflare emails you.
3. **Routing rules → Create address**: `support` → forward to `youracademy04@gmail.com`. Add `dmarc` → the same inbox, for DMARC reports.

> There should be only **one** SPF TXT record at the root (`@`). Cloudflare's covers the root domain; Resend's SPF sits on the `send` subdomain, so the two don't conflict.

### DMARC (policy and reports)

| Type | Name | Content |
|------|------|---------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@youracademy.com.bd; adkim=r; aspf=r; fo=1` |

- `p=none` only monitors; nothing is blocked while you check that everything passes.
- After **2–4 weeks** of daily reports showing only Resend and Cloudflare passing, change it to `p=quarantine; pct=100`. A few weeks later you can move to `p=reject`.

## Step 4 — Verify

1. **Resend → Domains** shows all records as **Verified**. This can take a few minutes to a few hours.
2. Check DNS from a terminal:
   ```bash
   dig +short TXT resend._domainkey.youracademy.com.bd
   dig +short TXT send.youracademy.com.bd
   dig +short TXT _dmarc.youracademy.com.bd
   dig +short MX youracademy.com.bd
   ```
3. Send samples from the server:
   ```bash
   docker compose -f docker/docker-compose.prod.yml exec worker node dist/email/send-test.js you@gmail.com both
   docker compose -f docker/docker-compose.prod.yml exec worker node dist/email/send-test.js you@outlook.com
   ```
   Locally: `pnpm --filter @your-academy/worker email:test you@gmail.com both`.
4. **Gmail:** open the email → ⋮ → **Show original**. You want **SPF: PASS**, **DKIM: PASS** (`youracademy.com.bd`), **DMARC: PASS**.
5. **Spam score:** open <https://www.mail-tester.com>, copy the address it shows, run `send-test.js <that address>`, then click "Then check your score". Aim for **9/10 or higher**.
6. **End-to-end:** request a reset at `/forgot-password` for an account whose email you own, click the button, and set a new password.

## Tips

- **Warm up:** a new sending domain has no reputation yet. Volume is naturally low (password resets), so that's fine. Avoid bulk sends from this domain in the first few weeks.
- Ask early users who find a reset email in spam to click **"Not spam"**. This teaches Gmail and Outlook quickly.
- Keep transactional mail on this domain only. Send any future marketing email from a separate subdomain (e.g. `news.youracademy.com.bd`) so it can't hurt reset-email delivery.
- **Bounces and complaints:** see Resend → **Emails** / **Logs**. Worker logs show `[email] … sent messageId=…` or `FAILED: …`.
- To reply *as* `support@` from Gmail: Gmail → Settings → Accounts → **Send mail as** → `support@youracademy.com.bd`, SMTP `smtp.resend.com:465`, user `resend`, password = an API key.
