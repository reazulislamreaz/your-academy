#!/usr/bin/env bash
# Apply permanent Cloudflare SSL/TLS settings for production behind orange-cloud.
# Requires: CLOUDFLARE_API_TOKEN with Zone Settings Edit + Zone DNS Read.
# Usage: CLOUDFLARE_API_TOKEN=… ZONE_NAME=youracademy.com.bd ./scripts/cloudflare-prod-ssl.sh
set -euo pipefail

ZONE_NAME="${ZONE_NAME:-youracademy.com.bd}"
TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"

cf() {
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -fsS -X "$method" "https://api.cloudflare.com/client/v4${path}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$body"
  else
    curl -fsS -X "$method" "https://api.cloudflare.com/client/v4${path}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json"
  fi
}

zid="$(cf GET "/zones?name=${ZONE_NAME}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"][0]["id"])')"
echo "Zone ${ZONE_NAME} id=${zid}"

# Full (strict) requires a valid origin cert on :443 (Let's Encrypt / Origin CA).
# ipv6=off avoids broken client IPv6 paths that surface as SSL handshake errors.
# http3=off avoids QUIC failures that browsers often label as SSL/TLS errors.
# origin_max_http_version=1 avoids intermittent CF↔origin HTTP/2 TLS issues (Error 525).
settings=(
  "ssl:strict"
  "always_use_https:on"
  "min_tls_version:1.2"
  "tls_1_3:on"
  "automatic_https_rewrites:on"
  "browser_check:off"
  "security_level:medium"
  "websockets:on"
  "ipv6:off"
  "http3:off"
  "origin_max_http_version:1"
  "tls_client_auth:off"
  "0rtt:off"
)

for pair in "${settings[@]}"; do
  key="${pair%%:*}"
  val="${pair#*:}"
  # JSON-encode value (strings stay quoted; on/off/strict are strings)
  body="$(python3 -c "import json; print(json.dumps({'value': '''${val}'''}))")"
  res="$(cf PATCH "/zones/${zid}/settings/${key}" "$body")"
  ok="$(echo "$res" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("success"))')"
  got="$(echo "$res" | python3 -c 'import json,sys; r=json.load(sys.stdin); print((r.get("result") or {}).get("value"))')"
  echo "  ${key}=${got} success=${ok}"
  if [[ "$ok" != "True" && "$ok" != "true" ]]; then
    echo "$res" >&2
    exit 1
  fi
done

echo "Done. Confirm origin nginx serves a valid cert on :443 (TLS_ENABLED=true)."
