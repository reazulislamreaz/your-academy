#!/usr/bin/env bash
# Zero-downtime production deploy for Your Academy (run on the VPS from the repo root).
#
#   scripts/deploy.sh                 deploy the checked-out commit (default)
#   scripts/deploy.sh rollback [TAG]  switch back to a kept version (default: the previous one)
#   scripts/deploy.sh status          show the running / kept versions and free disk
#
# How a deploy stays safe:
#   1. Disk check + cleanup that never touches volumes, database data or kept versions.
#   2. New images are built (or pulled from GHCR) and tagged with the commit SHA while the
#      current version keeps serving traffic.
#   3. Pending migrations must be backward-compatible (scripts/check-migrations.mjs); a DB
#      backup is taken before any migration runs.
#   4. Each service is rolled out blue/green: a new container starts next to the old one,
#      must become healthy, then nginx re-resolves and the old container is stopped.
#   5. Any failure after the first switch rolls every switched service back automatically.
#
# Environment (all optional):
#   ENV_FILE=.env.production   IMAGE_SOURCE=build|pull|local   IMAGE_PREFIX=your-academy
#   (local = the images for DEPLOY_TAG are already on this server, e.g. loaded by hand)
#   DEPLOY_TAG=<git sha>       MIN_FREE_GB=5             KEEP_VERSIONS=3
#   HEALTH_TIMEOUT=240         DEPLOY_STATE_DIR=.deploy  BACKUP_KEEP=5
#   EDGE_HTTP_PORT=80          EDGE_HTTPS_PORT=443       (host ports nginx publishes)
#   DEPLOY_CLEANUP=true        (false skips the host-wide Docker prune; version retention still runs)
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ACTION="${1:-deploy}"
ENV_FILE="${ENV_FILE:-.env.production}"
IMAGE_SOURCE="${IMAGE_SOURCE:-build}"
IMAGE_PREFIX="${IMAGE_PREFIX:-your-academy}"
MIN_FREE_GB="${MIN_FREE_GB:-5}"
KEEP_VERSIONS="${KEEP_VERSIONS:-3}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-240}"
BACKUP_KEEP="${BACKUP_KEEP:-5}"
EDGE_HTTP_PORT="${EDGE_HTTP_PORT:-80}"
EDGE_HTTPS_PORT="${EDGE_HTTPS_PORT:-443}"
DEPLOY_CLEANUP="${DEPLOY_CLEANUP:-true}"
DRAIN_SECONDS="${DRAIN_SECONDS:-10}"
STATE_DIR="${DEPLOY_STATE_DIR:-$ROOT/.deploy}"
HISTORY="$STATE_DIR/history"
APP_SERVICES=(api web worker)
APP_LABEL="com.your-academy.app=true"

STEP=0
log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
step() { STEP=$((STEP + 1)); printf '\n[%s] ==> Step %d: %s\n' "$(date -u +%H:%M:%S)" "$STEP" "$*"; }
warn() { printf '[%s] WARNING: %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }
die() { printf '\n[%s] ERROR: %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; exit 1; }

env_get() { # KEY [default] — read a value from the env file without sourcing it
  local v
  v="$(grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
  printf '%s' "${v:-${2:-}}"
}

# ─── Setup ──────────────────────────────────────────────────────────────────────────

[[ -f "$ENV_FILE" ]] || die "Missing $ENV_FILE — copy .env.example and fill production secrets."
command -v docker >/dev/null || die "docker is not installed"
docker compose version >/dev/null 2>&1 || die "docker compose v2 is required"

mkdir -p "$STATE_DIR"
touch "$HISTORY"
exec 9>"$STATE_DIR/deploy.lock"
flock -n 9 || die "Another deploy is already running on this server (lock: $STATE_DIR/deploy.lock)."

TLS_ENABLED="$(env_get TLS_ENABLED)"
POSTGRES_USER="$(env_get POSTGRES_USER your_academy)"
POSTGRES_DB="$(env_get POSTGRES_DB your_academy)"

COMPOSE_FILES=(-f docker/docker-compose.yml -f docker/docker-compose.prod.yml)
NGINX_CONF=docker/nginx/nginx.prod.conf
if [[ "$TLS_ENABLED" == "false" ]]; then
  COMPOSE_FILES+=(-f docker/docker-compose.prod-http.yml)
  NGINX_CONF=docker/nginx/nginx.prod-http.conf
fi
# Base compose references ../.env; keep it pointing at the production env file.
if [[ "$ENV_FILE" != ".env" && (! -e .env || -L .env) ]]; then
  ln -sfn "$ENV_FILE" .env
fi
export IMAGE_PREFIX
compose() { docker compose "${COMPOSE_FILES[@]}" --env-file "$ENV_FILE" "$@"; }
compose_tag() { local tag="$1"; shift; IMAGE_TAG="$tag" compose "$@"; }

current_tag() { awk 'NF { t = $1 } END { print t }' "$HISTORY"; }
kept_tags() { awk 'NF { print $1 }' "$HISTORY" | tac | awk '!seen[$0]++' | head -n "$KEEP_VERSIONS"; }
image_of() { printf '%s-%s:%s' "$IMAGE_PREFIX" "$1" "$2"; }
images_exist() { local s; for s in "${APP_SERVICES[@]}"; do docker image inspect "$(image_of "$s" "$1")" >/dev/null 2>&1 || return 1; done; }
running_ids() { compose ps -q --status running "$1" 2>/dev/null || true; }

free_gb() {
  local root
  root="$(docker info -f '{{.DockerRootDir}}' 2>/dev/null || echo /var/lib/docker)"
  df -Pk "$root" | awk 'NR == 2 { printf "%d", $4 / 1048576 }'
}

nginx_reload() {
  if [[ -n "$(running_ids nginx)" ]]; then
    # HUP to the master (PID 1): re-reads the mounted config and re-resolves upstreams;
    # in-flight requests finish on the old workers (no dropped connections).
    compose exec -T nginx sh -c 'kill -HUP 1' >/dev/null 2>&1 || warn "nginx reload failed (it keeps the previous config)"
  fi
}

container_state() {
  docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null || echo missing
}

# wait_ready <container-id> <service>: healthy (or, without a healthcheck, running 15 s).
wait_ready() {
  local cid="$1" svc="$2" deadline=$((SECONDS + HEALTH_TIMEOUT)) state stable=0
  while ((SECONDS < deadline)); do
    state="$(container_state "$cid")"
    case "$state" in
      healthy) return 0 ;;
      running)
        stable=$((stable + 3))
        if [[ "$(docker inspect -f '{{if .State.Health}}y{{end}}' "$cid")" != "y" ]] && ((stable >= 15)); then return 0; fi
        ;;
      exited | dead | missing | unhealthy)
        warn "$svc container ${cid:0:12} is $state"
        docker logs --tail 60 "$cid" 2>&1 | sed 's/^/    /' || true
        return 1
        ;;
    esac
    sleep 3
  done
  warn "$svc container ${cid:0:12} not healthy after ${HEALTH_TIMEOUT}s (state: $(container_state "$cid"))"
  docker logs --tail 60 "$cid" 2>&1 | sed 's/^/    /' || true
  return 1
}

# Extra probes on the new containers before traffic moves to them.
probe() {
  local svc="$1" cid="$2"
  case "$svc" in
    api)
      docker exec "$cid" node -e "fetch('http://127.0.0.1:5000/health').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))" &&
        docker exec "$cid" node -e "fetch('http://127.0.0.1:5000/ready').then(async r=>{const j=await r.json();process.exit(r.ok&&j.success?0:1)}).catch(()=>process.exit(1))"
      ;;
    web)
      docker exec "$cid" node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
      ;;
    *) return 0 ;;
  esac
}

# Blue/green swap of one service to <tag>. On failure the new container is removed and the
# old one keeps serving, so the site is never without a healthy instance.
rollout() {
  local svc="$1" tag="$2" old new cid count
  old="$(running_ids "$svc" | tr '\n' ' ')"
  count="$(wc -w <<<"$old")"
  log "$svc: starting $(image_of "$svc" "$tag") next to ${count} running container(s)"
  # --no-recreate keeps the old container(s) untouched; only the extra replica uses <tag>.
  if ! compose_tag "$tag" up -d --no-deps --no-recreate --scale "$svc=$((count + 1))" "$svc" 2>&1 | sed 's/^/    /'; then
    warn "$svc: could not start a new container"
  fi
  new=""
  for cid in $(compose ps -q "$svc"); do
    [[ " $old " == *" $cid "* ]] || new+="$cid "
  done
  [[ -n "${new// /}" ]] || { warn "$svc: no new container was created"; return 1; }
  for cid in $new; do
    if ! wait_ready "$cid" "$svc" || ! probe "$svc" "$cid"; then
      warn "$svc: new container failed its health check — removing it, old version keeps serving"
      docker rm -f $new >/dev/null 2>&1 || true
      return 1
    fi
  done
  log "$svc: new container healthy"
  if [[ "$svc" != worker ]]; then
    nginx_reload # nginx now resolves both old and new
    # Old nginx workers finish their in-flight requests to the old container first.
    sleep "$DRAIN_SECONDS"
  fi
  if [[ -n "${old// /}" ]]; then
    log "$svc: draining old container(s)"
    docker stop $old >/dev/null 2>&1 || true
    # Drop the old address from nginx right away, before the container is removed.
    [[ "$svc" == worker ]] || nginx_reload
    docker rm $old >/dev/null 2>&1 || true
  fi
  log "$svc: now on $tag"
}

edge_check() {
  local i code
  for i in $(seq 1 15); do
    if [[ "$TLS_ENABLED" == "false" ]]; then
      code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:${EDGE_HTTP_PORT}/health" || true)"
    else
      code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "https://127.0.0.1:${EDGE_HTTPS_PORT}/health" || true)"
    fi
    [[ "$code" == 200 ]] && { log "Edge /health → 200"; return 0; }
    sleep 2
  done
  warn "Edge /health through nginx did not return 200 (last: ${code:-none})"
  return 1
}

# ─── Cleanup (never volumes, never database data, never kept versions) ─────────────

prune_old_versions() {
  local keep svc ref tag
  keep=" $(kept_tags | tr '\n' ' ') ${CURRENT:-} ${NEW_TAG:-} "
  for svc in "${APP_SERVICES[@]}"; do
    while read -r ref; do
      [[ -n "$ref" ]] || continue
      tag="${ref##*:}"
      [[ "$tag" == "<none>" || "$keep" == *" $tag "* ]] && continue
      docker rmi "$ref" >/dev/null 2>&1 && log "Removed old image $ref" || true
    done < <(docker image ls --format '{{.Repository}}:{{.Tag}}' "$IMAGE_PREFIX-$svc")
  done
}

cleanup() {
  if [[ "$DEPLOY_CLEANUP" == false ]]; then
    log "Host-wide cleanup disabled (DEPLOY_CLEANUP=false) — only old app versions are pruned"
    prune_old_versions
    return 0
  fi
  log "Removing stopped containers"
  docker container prune -f >/dev/null
  # App images carry $APP_LABEL and are handled by version retention instead, so the last
  # KEEP_VERSIONS deploys always remain available for rollback.
  log "Removing unused images older than 72h"
  docker image prune -af --filter "until=72h" --filter "label!=$APP_LABEL" >/dev/null
  log "Removing build cache older than 72h"
  docker builder prune -af --filter "until=72h" >/dev/null 2>&1 || true
  prune_old_versions
}

ensure_disk() {
  local free
  free="$(free_gb)"
  log "Free disk for Docker: ${free} GB (minimum ${MIN_FREE_GB} GB)"
  ((free >= MIN_FREE_GB)) && return 0
  warn "Low disk space — running safe cleanup"
  cleanup
  free="$(free_gb)"
  if ((free < MIN_FREE_GB)) && [[ "$DEPLOY_CLEANUP" != false ]]; then
    log "Still low (${free} GB) — removing all build cache and dangling images"
    docker builder prune -af >/dev/null 2>&1 || true
    docker image prune -f >/dev/null
    free="$(free_gb)"
  fi
  log "Free disk after cleanup: ${free} GB"
  ((free >= MIN_FREE_GB)) ||
    die "Only ${free} GB free (need ${MIN_FREE_GB} GB) after cleanup. Deploy stopped; the running site was not touched. Free space on the server (e.g. old files in backups/) and re-run."
}

# ─── Migrations ────────────────────────────────────────────────────────────────────

pending_migrations() {
  local applied name
  applied="$(compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
    "select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null" 2>/dev/null || true)"
  for name in $(ls -1 backend/prisma/migrations 2>/dev/null | sort); do
    [[ -f "backend/prisma/migrations/$name/migration.sql" ]] || continue
    grep -qxF "$name" <<<"$applied" || echo "$name"
  done
}

backup_db() {
  mkdir -p backups
  local out
  out="backups/pre-deploy_${NEW_TAG}_$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  log "Backing up database to $out"
  compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip >"$out"
  chmod 600 "$out"
  [[ -s "$out" ]] || die "Database backup is empty — deploy stopped before migrating."
  ls -1t backups/pre-deploy_*.sql.gz 2>/dev/null | tail -n +"$((BACKUP_KEEP + 1))" | xargs -r rm -f
}

# ─── Rollback ──────────────────────────────────────────────────────────────────────

ROLLED_BACK="no"
SWITCHED=()
rollback_switched() {
  local reason="$1" svc i
  warn "$reason"
  if ((${#SWITCHED[@]} == 0)); then
    log "Nothing was switched — the previous version (${CURRENT:-none}) is still serving."
    ROLLED_BACK="not needed"
    return
  fi
  if [[ -z "${CURRENT:-}" ]] || ! images_exist "$CURRENT"; then
    ROLLED_BACK="impossible (no previous images)"
    warn "No previous images available to roll back to."
    return
  fi
  step "Automatic rollback to $CURRENT"
  if [[ "${BREAKING_APPLIED:--}" != "-" ]]; then
    warn "This deploy applied breaking migration(s) ($BREAKING_APPLIED): $CURRENT may not work on the new schema. If errors continue, restore backups/pre-deploy_${NEW_TAG}_*.sql.gz with scripts/restore-db.sh, or fix forward."
  fi
  for ((i = ${#SWITCHED[@]} - 1; i >= 0; i--)); do
    svc="${SWITCHED[i]}"
    rollout "$svc" "$CURRENT" || warn "Rollback of $svc failed — check 'docker compose ps' now"
  done
  ROLLED_BACK="yes"
}

summary() {
  local status="$1"
  printf '\n==================== Deploy summary ====================\n'
  printf '  Result            : %s\n' "$status"
  printf '  Attempted version : %s\n' "${NEW_TAG:-none}"
  printf '  Live version now  : %s\n' "${DEPLOYED:-none}"
  printf '  Previous version  : %s\n' "${CURRENT:-none}"
  printf '  Rollback happened : %s\n' "$ROLLED_BACK"
  printf '  Image source      : %s (%s)\n' "$IMAGE_SOURCE" "$IMAGE_PREFIX"
  printf '  Free disk         : %s GB\n' "$(free_gb)"
  printf '  Kept versions     : %s\n' "$(kept_tags | tr '\n' ' ')"
  printf '========================================================\n'
  {
    echo "time=$(date -u +%FT%TZ) result=$status deployed=${DEPLOYED:-none} previous=${CURRENT:-none} rollback=$ROLLED_BACK"
  } >>"$STATE_DIR/deploy.log"
}

# Adopt containers started before this script existed: tag their images as "legacy" so the
# first new deploy can still roll back to them.
adopt_legacy() {
  local svc cid img
  [[ -n "$(current_tag)" ]] && return 0
  [[ -n "$(running_ids api)" ]] || return 0
  for svc in "${APP_SERVICES[@]}"; do
    cid="$(running_ids "$svc" | head -1)"
    [[ -n "$cid" ]] || return 0
    img="$(docker inspect -f '{{.Image}}' "$cid")"
    docker tag "$img" "$(image_of "$svc" legacy)"
  done
  echo "legacy $(date -u +%FT%TZ) adopted" >>"$HISTORY"
  log "Adopted the running pre-existing version as 'legacy' (rollback target)"
}

# ─── Actions ───────────────────────────────────────────────────────────────────────

do_status() {
  echo "Running containers:"
  compose ps --format 'table {{.Service}}\t{{.Image}}\t{{.Status}}'
  echo
  echo "Deploy history (newest last):"
  tail -n 10 "$HISTORY" | sed 's/^/  /'
  echo
  echo "Kept versions: $(kept_tags | tr '\n' ' ')"
  echo "Free disk: $(free_gb) GB"
}

do_rollback() {
  local target="${2:-}" force="${3:-}" hist breaking
  CURRENT="$(current_tag)"
  [[ -n "$CURRENT" ]] || die "No deploy history — nothing to roll back."
  if [[ -z "$target" ]]; then
    target="$(kept_tags | sed -n 2p)"
    [[ -n "$target" ]] || die "No earlier version is kept. Available: $(kept_tags | tr '\n' ' ')"
  fi
  [[ "$target" != "$CURRENT" ]] || die "$target is already the running version."
  # Refuse to cross a deploy that applied an allow-listed breaking migration.
  hist="$(awk -v t="$target" 'found { print } $1 == t { found = 1 }' "$HISTORY")"
  breaking="$(grep -o 'breaking=[^ ]*' <<<"$hist" | grep -v 'breaking=-' || true)"
  if [[ -n "$breaking" && "$force" != "--force" ]]; then
    die "A later deploy applied a breaking migration (${breaking}). Version $target cannot run on the current schema without restoring a database backup from backups/. Re-run with '--force' only after restoring."
  fi
  if ! images_exist "$target"; then
    [[ "$IMAGE_SOURCE" == pull ]] || die "Images for $target are not on this server. Kept: $(kept_tags | tr '\n' ' ')"
    step "Pulling $target"
    compose_tag "$target" pull api web worker
  fi
  NEW_TAG="$target"
  step "Rolling back $CURRENT → $target (no migrations are run)"
  local svc
  for svc in api web worker; do
    if ! rollout "$svc" "$target"; then
      SWITCHED_FAIL="$svc"
      break
    fi
    SWITCHED+=("$svc")
  done
  if [[ -n "${SWITCHED_FAIL:-}" ]] || ! edge_check; then
    rollback_switched "Rollback to $target failed"
    DEPLOYED="$CURRENT"
    summary "FAILED (stayed on $CURRENT)"
    exit 1
  fi
  echo "$target $(date -u +%FT%TZ) breaking=- rollback-from=$CURRENT" >>"$HISTORY"
  DEPLOYED="$target"
  ROLLED_BACK="yes (manual)"
  summary "ROLLED BACK"
}

do_deploy() {
  NEW_TAG="${DEPLOY_TAG:-$(git rev-parse --short=12 HEAD)}"
  step "Preflight (commit $NEW_TAG, image source: $IMAGE_SOURCE)"
  adopt_legacy
  CURRENT="$(current_tag)"
  log "Currently running: ${CURRENT:-nothing (first deploy)}"
  [[ "$NEW_TAG" != "$CURRENT" ]] || log "Same version as running — redeploying it."

  step "Disk space"
  ensure_disk

  step "Safe cleanup (stopped containers, images/cache older than 72h, old versions)"
  cleanup
  log "Free disk: $(free_gb) GB"

  step "Validate nginx config ($NGINX_CONF)"
  if [[ -n "$(running_ids api)" && -n "$(running_ids web)" ]]; then
    # Runs on the stack's networks so upstream host names (api, web) resolve.
    local nginx_test
    if ! nginx_test="$(compose run --rm --no-deps -T --entrypoint nginx nginx -t -c "/etc/nginx/ya/$(basename "$NGINX_CONF")" 2>&1)"; then
      echo "$nginx_test" | tail -5 >&2
      die "nginx config $NGINX_CONF is invalid — deploy stopped; the running site was not touched."
    fi
    log "nginx config OK"
  else
    log "Skipped: api/web are not running yet, so upstream names cannot resolve (first boot)"
  fi

  step "Database and cache are up (never recreated by deploys)"
  compose up -d --no-deps --no-recreate postgres redis
  compose up -d --no-deps --no-recreate --wait --wait-timeout 120 postgres redis >/dev/null

  if [[ "$IMAGE_SOURCE" == local ]]; then
    step "Use local images $IMAGE_PREFIX-{api,web,worker}:$NEW_TAG"
  elif [[ "$IMAGE_SOURCE" == pull ]]; then
    step "Pull images $IMAGE_PREFIX-{api,web,worker}:$NEW_TAG (current version keeps serving)"
    compose_tag "$NEW_TAG" pull api web worker ||
      die "Image pull failed — deploy stopped; the running site was not touched."
  else
    step "Build images $IMAGE_PREFIX-{api,web,worker}:$NEW_TAG (current version keeps serving)"
    compose_tag "$NEW_TAG" build api web worker ||
      die "Image build failed — deploy stopped; the running site was not touched."
  fi
  images_exist "$NEW_TAG" || die "Images for $NEW_TAG are missing after build/pull."

  step "Migrations"
  local pending breaking="-"
  pending="$(pending_migrations | tr '\n' ' ')"
  if [[ -z "${pending// /}" ]]; then
    log "No pending migrations"
  else
    log "Pending: $pending"
    local check
    if ! check="$(docker run --rm -v "$ROOT:/repo:ro" -w /repo "$(image_of api "$NEW_TAG")" \
      node scripts/check-migrations.mjs $pending 2>&1)"; then
      echo "$check" >&2
      die "Pending migrations are not backward-compatible — deploy stopped; the running site was not touched."
    fi
    echo "$check" | sed 's/^/    /'
    breaking="$(sed -n 's/^ALLOWLISTED-BREAKING: //p' <<<"$check" | tr '\n' ',' | sed 's/,$//')"
    breaking="${breaking:--}"
    BREAKING_APPLIED="$breaking"
    backup_db
    if ! compose_tag "$NEW_TAG" run --rm --no-deps -T migrate; then
      die "Migration failed — the previous version keeps serving (migrations are backward-compatible). Backup: backups/pre-deploy_${NEW_TAG}_*.sql.gz"
    fi
    log "Migrations applied"
    [[ "$breaking" == "-" ]] || warn "Applied allow-listed breaking migration(s): $breaking — rolling back below this version needs a DB restore."
  fi

  if [[ -z "$(running_ids api)" ]]; then
    step "Nothing running yet — starting the full stack"
    compose_tag "$NEW_TAG" up -d --remove-orphans --wait --wait-timeout "$HEALTH_TIMEOUT" ||
      die "Initial start failed — see 'docker compose logs'."
    SWITCHED=(api web worker)
  else
    local svc
    for svc in api web worker; do
      step "Zero-downtime rollout: $svc"
      if ! rollout "$svc" "$NEW_TAG"; then
        rollback_switched "Rollout of $svc failed"
        DEPLOYED="$CURRENT"
        summary "FAILED"
        exit 1
      fi
      SWITCHED+=("$svc")
    done
  fi

  step "nginx"
  if [[ -z "$(running_ids nginx)" ]]; then
    compose up -d --no-deps nginx
  elif ! compose exec -T nginx test -d /etc/nginx/ya >/dev/null 2>&1; then
    # One-time migration from the old single-file mount (~1 s blip, this deploy only).
    log "Switching nginx to the directory config mount (one-time recreate)"
    compose up -d --no-deps --force-recreate nginx
  else
    log "Applying nginx config with a zero-downtime reload"
    nginx_reload
  fi

  step "Final health check through nginx"
  if ! edge_check; then
    rollback_switched "Final health check failed"
    nginx_reload
    edge_check || warn "Edge still failing after rollback — check nginx: docker compose logs nginx"
    DEPLOYED="$CURRENT"
    summary "FAILED"
    exit 1
  fi

  echo "$NEW_TAG $(date -u +%FT%TZ) breaking=$breaking" >>"$HISTORY"
  DEPLOYED="$NEW_TAG"
  ROLLED_BACK="no"

  step "Retention (keep the last $KEEP_VERSIONS versions)"
  prune_old_versions
  [[ "$DEPLOY_CLEANUP" == false ]] || docker image prune -f >/dev/null

  summary "SUCCESS"
}

case "$ACTION" in
  deploy) do_deploy ;;
  rollback) do_rollback "$@" ;;
  status) do_status ;;
  *) die "Unknown action '$ACTION' (use: deploy | rollback [TAG] [--force] | status)" ;;
esac
