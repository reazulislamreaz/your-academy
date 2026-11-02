#!/usr/bin/env bash
# Production deploy helper (run on the VPS from the repo root).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml --env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.example and fill production secrets." >&2
  exit 1
fi

echo "==> Building and starting production stack"
"${COMPOSE[@]}" up -d --build --remove-orphans

echo "==> Waiting for API health (in-container; API is not published to the host)"
for i in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T api node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
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

echo "==> Ready check"
"${COMPOSE[@]}" exec -T api node -e "fetch('http://127.0.0.1:3001/ready').then(async r=>{const j=await r.json(); if(!r.ok||!j.success) process.exit(1); console.log(JSON.stringify(j.data.checks));}).catch(e=>{console.error(e); process.exit(1);})"

echo "==> Deploy complete"
"${COMPOSE[@]}" ps
