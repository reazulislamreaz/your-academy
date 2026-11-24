#!/usr/bin/env bash
# Install renewed origin TLS into the Nginx certs dir and reload.
#
# Production uses ZeroSSL (Sectigo) for Cloudflare Full (strict) compatibility.
# When /etc/your-academy/certs/.origin-provider contains "zerossl", this hook
# refuses to overwrite with Let's Encrypt YE/YR chains (those caused CF 525).
set -euo pipefail

DOMAIN="${TLS_DOMAIN:-youracademy.com.bd}"
LIVE="/etc/letsencrypt/live/${DOMAIN}"
DEST="${TLS_CERTS_DIR:-/etc/your-academy/certs}"
APP_DIR="${APP_DIR:-/root/your-academy}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env.production}"
PROVIDER_FILE="${DEST}/.origin-provider"

mkdir -p "$DEST"

if [[ -f "$PROVIDER_FILE" ]]; then
  provider="$(tr -d '[:space:]' <"$PROVIDER_FILE" | tr '[:upper:]' '[:lower:]')"
  if [[ "$provider" == "zerossl" ]]; then
    echo "Skipping Let's Encrypt install: origin provider is ZeroSSL (${PROVIDER_FILE})."
    echo "Renew with: ~/.acme.sh/acme.sh --renew -d ${DOMAIN} --server zerossl"
    exit 0
  fi
fi

if [[ ! -f "${LIVE}/fullchain.pem" || ! -f "${LIVE}/privkey.pem" ]]; then
  echo "Missing Let's Encrypt live certs under ${LIVE}" >&2
  exit 1
fi

install -m 644 "${LIVE}/fullchain.pem" "${DEST}/fullchain.pem"
install -m 600 "${LIVE}/privkey.pem" "${DEST}/privkey.pem"

if [[ -f "$ENV_FILE" ]]; then
  cd "$APP_DIR"
  docker compose \
    -f docker/docker-compose.yml \
    -f docker/docker-compose.prod.yml \
    --env-file "$ENV_FILE" \
    exec -T nginx sh -c 'kill -HUP 1'
fi

echo "TLS certs refreshed for ${DOMAIN}"
