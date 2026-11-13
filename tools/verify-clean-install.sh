#!/usr/bin/env bash
# Sprint 8.4 — clean-install verification of the backend.
#
# A fresh database, a fresh install and a real start-up, in the order a new
# machine would do it: install, migrate, seed, start, ask the API for its
# health.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
DATA_DIR="${DATA_DIR:-/tmp/opencode/clean-install-db}"
PG_PORT="${PG_PORT:-55441}"
LOGDIR=/tmp/opencode

export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PG_PORT}/postgres"
export DATABASE_URL_DIRECT="$DATABASE_URL"
export DATABASE_SSL=false
export JWT_SECRET="clean-install-verification-secret-32-characters-min"
export JWT_REFRESH_SECRET="clean-install-refresh-secret-32-characters-min"
export BOOTSTRAP_ADMIN_EMAIL="admin.clean@afiafoodhub.test"
export BOOTSTRAP_ADMIN_PASSWORD="Clean-Install-Admin-2026"
export LOG_LEVEL=error
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
start_service "$LOGDIR/clean-pg.pid" "$LOGDIR/clean-pg.log" \
  node "$BACKEND/scripts/dev-postgres.mjs" --port "$PG_PORT" --data-dir "$DATA_DIR"

for _ in $(seq 1 60); do
  if node -e "const net=require('net');const s=net.connect($PG_PORT,'127.0.0.1');s.on('connect',()=>{s.destroy();process.exit(0)});s.on('error',()=>process.exit(1))" 2>/dev/null; then
    break
  fi
  sleep 1
done
echo "database up on $PG_PORT"

step "migrate"
(cd "$BACKEND" && npm run migrate 2>&1 | tail -3)

step "seed"
(cd "$BACKEND" && npm run seed 2>&1 | tail -3)

step "start"
start_service "$LOGDIR/clean-api.pid" "$LOGDIR/clean-api.log" node "$BACKEND/src/server.js"

for _ in $(seq 1 40); do
  curl -sf -m 3 http://127.0.0.1:5000/api/health > "$LOGDIR/clean-health.json" 2>/dev/null && break
  sleep 1
done

step "health"
cat "$LOGDIR/clean-health.json"
echo
step "menu"
curl -sf -m 5 "http://127.0.0.1:5000/api/menu/items?limit=3" | head -c 300
echo
step "unauthenticated administration route"
curl -s -o /dev/null -w 'status=%{http_code}\n' -m 5 http://127.0.0.1:5000/api/admin/dashboard

step "result"
if grep -q '"status":"ok"' "$LOGDIR/clean-health.json"; then
  echo "CLEAN INSTALL VERIFIED"
  exit 0
fi
echo "CLEAN INSTALL FAILED"
tail -30 "$LOGDIR/clean-api.log"
exit 1
