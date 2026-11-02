# TLS certificates (production)

Mount Let’s Encrypt (or other) material here on the VPS — **do not commit private keys**.

Expected filenames (see `nginx.prod.conf`):

- `fullchain.pem`
- `privkey.pem`

Example host layout:

```bash
sudo mkdir -p /etc/your-academy/certs
sudo ln -sf /etc/letsencrypt/live/your-domain/fullchain.pem /etc/your-academy/certs/fullchain.pem
sudo ln -sf /etc/letsencrypt/live/your-domain/privkey.pem /etc/your-academy/certs/privkey.pem
```

Then set in `.env.production`:

```bash
TLS_CERTS_DIR=/etc/your-academy/certs
```
