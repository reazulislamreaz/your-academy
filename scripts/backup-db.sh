#!/usr/bin/env bash
# Dump Postgres from the local Compose stack into ./backups/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-your_academy}"
POSTGRES_DB="${POSTGRES_DB:-your_academy}"
COMPOSE=(docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --env-file .env)

mkdir -p backups
STAMP="$(date +%F_%H%M%S)"
OUT="backups/backup_${POSTGRES_DB}_${STAMP}.sql.gz"

echo "Writing ${OUT}…"
"${COMPOSE[@]}" exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT"
chmod 600 "$OUT"
echo "Backup complete: ${OUT}"
