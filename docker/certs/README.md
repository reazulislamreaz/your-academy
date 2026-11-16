# TLS certificates (production)

Mount origin TLS material here on the VPS — **do not commit private keys**.

Expected filenames (see `nginx.prod.conf`):

- `fullchain.pem`
- `privkey.pem`

On production the live mount is `TLS_CERTS_DIR=/etc/your-academy/certs` (Compose bind-mount), not this repo folder.

## Recommended: Cloudflare Full (strict) + ZeroSSL (Sectigo chain)

Let’s Encrypt’s newer **YE1/YR1 → Root YE/YR** chains caused intermittent Cloudflare **Error 525** from Bangladesh edges (DAC/CGP) while Full (strict) was on. ZeroSSL DV (issuer ZeroSSL RSA DV SSL CA 2, chain through Sectigo / USERTrust) is accepted under Full (strict) on those edges.

Alternative (preferred when API allows): **Cloudflare Origin CA** — requires API token permission **SSL and Certificates:Edit**. The DNS-only token cannot create Origin CA certificates.

### Issue / renew with acme.sh

```bash
export CF_Token="$(grep dns_cloudflare_api_token /root/.secrets-cloudflare.ini | cut -d= -f2 | tr -d ' ')"

~/.acme.sh/acme.sh --issue --dns dns_cf \
  -d youracademy.com.bd -d www.youracademy.com.bd \
  --keylength 2048 --server zerossl

~/.acme.sh/acme.sh --install-cert -d youracademy.com.bd \
  --fullchain-file /etc/your-academy/certs/fullchain.pem \
  --key-file /etc/your-academy/certs/privkey.pem \
  --reloadcmd "docker exec your-academy-nginx-1 nginx -s reload"
```

`acme.sh` cron handles renewal. Keep the Let’s Encrypt `certbot` deploy hook **disabled** while ZeroSSL is the active origin cert so renewals do not overwrite `/etc/your-academy/certs` with a YE/YR chain.

Guard file (required on the VPS):

```bash
echo zerossl | sudo tee /etc/your-academy/certs/.origin-provider
```

`scripts/renew-tls-certs.sh` refuses to install Let’s Encrypt material when that marker is present.

### Cloudflare edge settings

Run `./scripts/cloudflare-prod-ssl.sh` (Full **strict**, origin HTTP/1.1, IPv6/HTTP3/0-RTT/opportunistic encryption off as documented in `docs/22-operations-runbook.md`).

Temporary HTTP-only origin (`docker-compose.prod-http.yml`) is only for bootstrap before certs exist.
