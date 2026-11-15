#!/usr/bin/env bash
# Copy renewed Let's Encrypt material into the Nginx certs dir and reload.
set -euo pipefail

DOMAIN="${TLS_DOMAIN:-youracademy.com.bd}"
LIVE="/etc/letsencrypt/live/${DOMAIN}"
DEST="${TLS_CERTS_DIR:-/etc/your-academy/certs}"
APP_DIR="${APP_DIR:-/root/your-academy}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env.production}"

mkdir -p "$DEST"
install -m 644 "${LIVE}/fullchain.pem" "${DEST}/fullchain.pem"
install -m 600 "${LIVE}/privkey.pem" "${DEST}/privkey.pem"

if [[ -f "$ENV_FILE" ]]; then
  cd "$APP_DIR"
  docker compose \
    -f docker/docker-compose.yml \
    -f docker/docker-compose.prod.yml \
    --env-file "$ENV_FILE" \
    exec -T nginx nginx -s reload
fi

echo "TLS certs refreshed for ${DOMAIN}"
