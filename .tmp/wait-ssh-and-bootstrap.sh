#!/usr/bin/env bash
set -euo pipefail
KEY="$HOME/.ssh/your_academy_deploy"
HOST="202.168.151.3"
USER="root"
REPO="/home/reaz/Documents/files/test/confiro"
LOG="$REPO/.tmp/bootstrap.log"
PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEdEe8BC/Nc1Hsiqv/zz2xpZpTGvYgB9qsywd6lbAw6U your-academy-deploy@github-actions'

exec >>"$LOG" 2>&1
echo "==== $(date -Is) waiting for SSH to $HOST ===="

for i in $(seq 1 240); do
  if ssh -o BatchMode=yes -o ConnectTimeout=8 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new \
      -i "$KEY" "$USER@$HOST" 'echo SSH_OK' >/dev/null 2>&1; then
    echo "$(date -Is) SSH ready"
    break
  fi
  if [[ "$i" -eq 240 ]]; then
    echo "$(date -Is) timed out waiting for SSH"
    exit 1
  fi
  sleep 30
done

ssh -i "$KEY" -o IdentitiesOnly=yes "$USER@$HOST" bash -s <<'REMOTE'
set -euo pipefail
mkdir -p /root/.ssh
chmod 700 /root/.ssh
PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEdEe8BC/Nc1Hsiqv/zz2xpZpTGvYgB9qsywd6lbAw6U your-academy-deploy@github-actions'
grep -qxF "$PUB" /root/.ssh/authorized_keys 2>/dev/null || echo "$PUB" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
REMOTE

scp -i "$KEY" -o IdentitiesOnly=yes "$REPO/.env.production" "$USER@$HOST:/root/.env.production.incoming"
scp -i "$KEY" -o IdentitiesOnly=yes "$REPO/scripts/vps-first-boot.sh" "$USER@$HOST:/root/vps-first-boot.sh"

ssh -i "$KEY" -o IdentitiesOnly=yes "$USER@$HOST" bash -s <<'REMOTE'
set -euo pipefail
chmod +x /root/vps-first-boot.sh
export APP_DIR=/root/your-academy
export ENV_SRC=/root/.env.production.incoming
export BRANCH=main
/root/vps-first-boot.sh
# Seed via compose if first-boot seed failed
cd /root/your-academy
COMPOSE=(docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml -f docker/docker-compose.prod-http.yml --env-file .env.production)
"${COMPOSE[@]}" run --rm --entrypoint '' api sh -c 'cd /app/backend && ./node_modules/.bin/tsx prisma/seed.ts' || true
curl -fsS http://127.0.0.1/health || curl -fsS http://127.0.0.1:80/health || true
"${COMPOSE[@]}" ps
REMOTE

echo "$(date -Is) BOOTSTRAP_DONE"
