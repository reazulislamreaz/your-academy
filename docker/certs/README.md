# TLS certificates (production)

Mount Let’s Encrypt (or other) material here on the VPS — **do not commit private keys**.

Expected filenames (see `nginx.prod.conf`):

- `fullchain.pem`
- `privkey.pem`

## Recommended: Cloudflare Full (strict) + Let’s Encrypt DNS-01

1. Issue certs on the VPS (Cloudflare API token needs Zone DNS Edit):

```bash
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets-cloudflare.ini \
  -d youracademy.com.bd -d www.youracademy.com.bd
```

2. Install into the certs dir used by Compose:

```bash
sudo mkdir -p /etc/your-academy/certs
sudo install -m 644 /etc/letsencrypt/live/youracademy.com.bd/fullchain.pem /etc/your-academy/certs/fullchain.pem
sudo install -m 600 /etc/letsencrypt/live/youracademy.com.bd/privkey.pem /etc/your-academy/certs/privkey.pem
```

3. In `.env.production`:

```bash
TLS_ENABLED=true
TLS_CERTS_DIR=/etc/your-academy/certs
COOKIE_SECURE=true
WEB_ORIGIN=https://youracademy.com.bd
```

4. Cloudflare SSL/TLS mode: **Full (strict)**; min TLS **1.2**.

5. Renew hook (already used in prod): `scripts/renew-tls-certs.sh` via `/etc/letsencrypt/renewal-hooks/deploy/`.

Temporary HTTP-only origin (`docker-compose.prod-http.yml`) is only for bootstrap before certs exist.
