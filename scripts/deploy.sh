#!/usr/bin/env bash
# Production deploy helper (run on the VPS from the repo root).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.example and fill production secrets." >&2
  exit 1
fi

# Read TLS / cookie hints from env file (compose still uses --env-file).
TLS_ENABLED="$(grep -E '^TLS_ENABLED=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
COOKIE_SECURE_HINT="$(grep -E '^COOKIE_SECURE=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"

COMPOSE_FILES=( -f docker/docker-compose.yml -f docker/docker-compose.prod.yml )
# HTTP-only when TLS is deferred (COOKIE_SECURE=false or TLS_ENABLED=false).
if [[ "${TLS_ENABLED:-}" == "false" || "${COOKIE_SECURE_HINT:-}" == "false" ]]; then
  COMPOSE_FILES+=( -f docker/docker-compose.prod-http.yml )
  echo "==> HTTP-only mode (TLS deferred)"
fi

COMPOSE=(docker compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE")

# Base compose references ../.env; keep a same-dir symlink so prod stacks without a second file.
if [[ "$ENV_FILE" != ".env" && -f "$ENV_FILE" && ! -e .env ]]; then
  ln -sfn "$ENV_FILE" .env
elif [[ "$ENV_FILE" != ".env" && -f "$ENV_FILE" && -L .env ]]; then
  ln -sfn "$ENV_FILE" .env
fi

echo "==> Building images (running stack stays up during build)"
"${COMPOSE[@]}" build

echo "==> Applying stack with health wait (reduces 502 window during recreate)"
# --wait blocks until depends_on healthchecks pass; nginx only starts after api+web are healthy.
"${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 240

echo "==> Waiting for API health (in-container; API is not published to the host)"
for i in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T api node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    echo "Health OK"
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "Health check timed out" >&2
    "${COMPOSE[@]}" ps
    "${COMPOSE[@]}" logs --tail=80 api migrate nginx || true
    exit 1
  fi
  sleep 2
done

echo "==> Waiting for web health"
for i in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T web node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    echo "Web OK"
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "Web health check timed out" >&2
    "${COMPOSE[@]}" logs --tail=80 web || true
    exit 1
  fi
  sleep 2
done

echo "==> Ready check"
"${COMPOSE[@]}" exec -T api node -e "fetch('http://127.0.0.1:5000/ready').then(async r=>{const j=await r.json(); if(!r.ok||!j.success) process.exit(1); console.log(JSON.stringify(j.data.checks));}).catch(e=>{console.error(e); process.exit(1);})"

echo "==> Edge smoke"
curl -fsS http://127.0.0.1/health >/dev/null
curl -fsS -o /dev/null -w "home:%{http_code}\n" http://127.0.0.1/

echo "==> Deploy complete"
"${COMPOSE[@]}" ps
