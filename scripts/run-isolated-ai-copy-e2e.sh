#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# WSL's non-login shell omits the user's Node 24 installation.
export PATH="$HOME/.local/bin:$PATH"
if [[ -n "${ASOUND_LIB_DIR:-}" && -e "${ASOUND_LIB_DIR}/libasound.so.2" ]]; then
  export LD_LIBRARY_PATH="${ASOUND_LIB_DIR}:${LD_LIBRARY_PATH:-}"
fi
DOCKER_ROOT="/var/www/html/.worktrees/ai-continuation-20261106"
TEST_DB="db_test_ai_continue_20261106"
BASE_URL="http://127.0.0.1:18085"
PROXY_PID=""
READY=0

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ -n "$PROXY_PID" ]]; then kill "$PROXY_PID" 2>/dev/null || true; fi
  if [[ "$READY" == "1" ]]; then
    ddev exec -d "$DOCKER_ROOT" bash scripts/ai-copy-e2e-server.sh stop || true
    ddev exec -d "$DOCKER_ROOT" env LINKET_ISOLATED_E2E=1 LINKET_AI_COPY_E2E_DB="$TEST_DB" APP_ENV=testing DB_DATABASE="$TEST_DB" APP_URL="$BASE_URL" php artisan linket:prepare-ai-copy-e2e --cleanup --no-interaction || true
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

echo "Verifying no production database can be reached..."
DB_NAME="$(ddev exec -d "$DOCKER_ROOT" env APP_ENV=testing DB_DATABASE="$TEST_DB" php artisan --env=testing config:show database.connections.mysql.database | awk 'NF{print $NF}' | tail -1)"
if [[ "$DB_NAME" != "$TEST_DB" ]]; then
  echo "Refusing E2E: DB mismatch" >&2
  exit 1
fi

READY=1
if [[ -f storage/app/e2e/ai-copy-fixture.json ]]; then
  ddev exec -d "$DOCKER_ROOT" env LINKET_ISOLATED_E2E=1 LINKET_AI_COPY_E2E_DB="$TEST_DB" APP_ENV=testing DB_DATABASE="$TEST_DB" APP_URL="$BASE_URL" php artisan linket:prepare-ai-copy-e2e --cleanup --no-interaction
fi
ddev exec -d "$DOCKER_ROOT" env LINKET_ISOLATED_E2E=1 LINKET_AI_COPY_E2E_DB="$TEST_DB" APP_ENV=testing DB_DATABASE="$TEST_DB" APP_URL="$BASE_URL" php artisan linket:prepare-ai-copy-e2e --no-interaction

echo "Starting isolated Laravel backend within DDEV..."
ddev exec -d "$DOCKER_ROOT" bash scripts/ai-copy-e2e-server.sh start

WEB_IP="$(docker inspect ddev-linket-web --format '{{range $k,$v := .NetworkSettings.Networks}}{{if eq $k "ddev-linket_default"}}{{$v.IPAddress}}{{end}}{{end}}')"
if [[ -z "$WEB_IP" ]]; then
  echo "Cannot discover local DDEV web container IP" >&2
  exit 1
fi
LINKET_ISOLATED_E2E=1 LINKET_AI_COPY_UPSTREAM_IP="$WEB_IP" node scripts/ai-copy-e2e-proxy.mjs >/tmp/linket-ai-copy-e2e-proxy.log 2>&1 &
PROXY_PID=$!

for i in {1..30}; do
  if curl -fsS -o /dev/null "$BASE_URL/login"; then break; fi
  sleep 1
done
curl -fsS -o /dev/null "$BASE_URL/login" || { echo "Isolated login unavailable" >&2; exit 1; }

echo "Running real authenticated product-copy browser suite..."
LINKET_ISOLATED_E2E=1 LINKET_AI_COPY_E2E_DB="$TEST_DB" APP_ENV=testing DB_DATABASE="$TEST_DB" E2E_NO_SERVER=1 E2E_BASE_URL="$BASE_URL" \
npx playwright test tests/e2e/product-copy-drafts-authenticated.spec.ts --project=chromium --workers=1 --reporter=line
