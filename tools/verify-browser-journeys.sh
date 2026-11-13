#!/usr/bin/env bash
# Sprint 8 — the browser journeys, against a real build.
#
# Starts a disposable database, the API and a static server for the built
# interface, then runs the customer and administration journeys against them.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
DATA_DIR="${DATA_DIR:-/tmp/opencode/e2e-db}"
PG_PORT="${PG_PORT:-55442}"
WEB_PORT="${WEB_PORT:-3111}"
LOGDIR=/tmp/opencode

export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/postgres"
export DATABASE_URL_DIRECT="$DATABASE_URL"
export DATABASE_SSL=false
export JWT_SECRET="e2e-verification-secret-that-is-32-characters-long"
export JWT_REFRESH_SECRET="e2e-verification-refresh-secret-32-characters"
export BOOTSTRAP_ADMIN_EMAIL="admin@afiafoodhub.com"
export BOOTSTRAP_ADMIN_PASSWORD="ChangeMe-Afia-2026"
export LOG_LEVEL=error
export ADMIN_EMAIL="admin@afiafoodhub.com"
export ADMIN_PASSWORD="ChangeMe-Afia-2026"
export FRONTEND_URL="http://localhost:${WEB_PORT}"
export CORS_ORIGINS="http://localhost:${WEB_PORT}"
export PORT=5000

step() { printf '\n=== %s ===\n' "$1"; }

PIDS=()

# Starts a service in its own session, so the whole process group can be
# stopped afterwards. A service that outlives the test would hold the port
# and make the next run talk to the wrong instance.
start_service() {
  local pidfile="$1"; local logfile="$2"; shift 2
  rm -f "$pidfile"
  setsid bash -c 'echo $$ > "$1"; shift; exec "$@"' _ "$pidfile" "$@" >"$logfile" 2>&1 &
  for _ in $(seq 1 50); do
    [[ -s "$pidfile" ]] && break
    sleep 0.1
  done
  PIDS+=("$(cat "$pidfile" 2>/dev/null || true)")
}

cleanup() {
  for pid in "${PIDS[@]:-}"; do
    [[ -n "$pid" ]] || continue
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null
  done
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

step "database"
rm -rf "$DATA_DIR"
start_service "$LOGDIR/e2e-pg.pid" "$LOGDIR/e2e-pg.log" \
  node "$BACKEND/scripts/dev-postgres.mjs" --port "$PG_PORT" --data-dir "$DATA_DIR"

for _ in $(seq 1 60); do
  if node -e "const net=require('net');const s=net.connect($PG_PORT,'127.0.0.1');s.on('connect',()=>{s.destroy();process.exit(0)});s.on('error',()=>process.exit(1))" 2>/dev/null; then
    break
  fi
  sleep 1
done
echo "database up on $PG_PORT"

step "migrate and seed"
(cd "$BACKEND" && npm run migrate 2>&1 | tail -2 && npm run seed 2>&1 | tail -2)

step "interface build"
(cd "$FRONTEND" && CI=true npm run build 2>&1 | grep -E "Compiled|Failed" | head -3)

step "api"
start_service "$LOGDIR/e2e-api.pid" "$LOGDIR/e2e-api.log" node "$BACKEND/src/server.js"

for _ in $(seq 1 40); do
  curl -sf -m 3 http://127.0.0.1:5000/api/health > /dev/null 2>&1 && break
  sleep 1
done
curl -s -m 5 http://127.0.0.1:5000/api/health
echo

step "interface"
start_service "$LOGDIR/e2e-web.pid" "$LOGDIR/e2e-web.log" \
  node "$FRONTEND/tests/e2e/serve-build.mjs" --port "$WEB_PORT" --root "$FRONTEND/build"

sleep 2
curl -s -o /dev/null -w 'interface status=%{http_code}\n' "http://127.0.0.1:${WEB_PORT}/"

step "customer journey"
(cd "$FRONTEND" && node tests/e2e/customer-journey.mjs 2>&1 | tail -60)
CUSTOMER=${PIPESTATUS[0]}

step "administration journey"
(cd "$FRONTEND" && node tests/e2e/admin-journey.mjs 2>&1 | tail -60)
ADMIN=${PIPESTATUS[0]}

step "result"
echo "customer journey exit: $CUSTOMER"
echo "administration journey exit: $ADMIN"
if [[ "$CUSTOMER" -eq 0 && "$ADMIN" -eq 0 ]]; then
  echo "BROWSER JOURNEYS VERIFIED"
  exit 0
fi
echo "BROWSER JOURNEYS FAILED"
exit 1
