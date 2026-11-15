#!/usr/bin/env bash
# First-time Ubuntu VPS bootstrap (run as root on an empty host).
# Installs Docker, clones the repo, expects .env.production already present
# (or pass ENV_SRC=/path/to/.env.production).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/reazulislamreaz/your-academy.git}"
APP_DIR="${APP_DIR:-/root/your-academy}"
BRANCH="${BRANCH:-main}"
ENV_SRC="${ENV_SRC:-}"

export DEBIAN_FRONTEND=noninteractive

echo "==> Installing Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl git gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

echo "==> Cloning ${REPO_URL} → ${APP_DIR}"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch --prune origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only
fi

if [[ -n "$ENV_SRC" ]]; then
  install -m 600 "$ENV_SRC" "$APP_DIR/.env.production"
fi

if [[ ! -f "$APP_DIR/.env.production" ]]; then
  echo "Missing $APP_DIR/.env.production — copy secrets before deploy." >&2
  exit 1
fi
chmod 600 "$APP_DIR/.env.production"

cd "$APP_DIR"
chmod +x scripts/deploy.sh scripts/backup-db.sh scripts/restore-db.sh scripts/vps-first-boot.sh
./scripts/deploy.sh

echo "==> Seeding bootstrap admin (idempotent)"
COMPOSE=(docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml)
if grep -qE '^COOKIE_SECURE=false|^TLS_ENABLED=false' .env.production; then
  COMPOSE+=(-f docker/docker-compose.prod-http.yml)
fi
COMPOSE+=(--env-file .env.production)
# Seed runs from host Node if available; otherwise via a one-shot container with tsx.
if command -v pnpm >/dev/null 2>&1 && [[ -d node_modules ]]; then
  pnpm --filter @your-academy/backend prisma:seed
elif "${COMPOSE[@]}" run --rm --entrypoint '' api sh -c \
  'cd /app/backend && (./node_modules/.bin/tsx prisma/seed.ts || npx --yes tsx prisma/seed.ts)'; then
  echo "Seed OK"
else
  echo "WARN: seed failed — after deploy: compose exec/run tsx prisma/seed.ts" >&2
fi

echo "==> First boot complete"
"${COMPOSE[@]}" ps
