#!/usr/bin/env bash
# Restore a gzipped pg_dump into the local Compose Postgres.
# WARNING: overwrites the target database.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 backups/backup_your_academy_YYYY-MM-DD_HHMMSS.sql.gz" >&2
  exit 1
fi
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-your_academy}"
POSTGRES_DB="${POSTGRES_DB:-your_academy}"
COMPOSE=(docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml --env-file .env)

echo "Restoring ${BACKUP_FILE} into ${POSTGRES_DB}…"
gunzip -c "$BACKUP_FILE" | "${COMPOSE[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "Restore complete."
