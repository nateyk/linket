#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROXY_PORT="${E2E_PROXY_PORT:-18081}"
PROXY_PID_FILE="${TMPDIR:-/tmp}/linket-e2e-proxy.pid"

cleanup() {
  if [[ -f "$PROXY_PID_FILE" ]]; then
    kill "$(cat "$PROXY_PID_FILE")" 2>/dev/null || true
    rm -f "$PROXY_PID_FILE"
  fi
}
trap cleanup EXIT

echo "==> Clearing config cache for testing resolution"
ddev exec php artisan config:clear --no-interaction >/dev/null

echo "==> Confirming disposable test database"
DB_NAME="$(ddev exec bash -c 'APP_ENV=testing VERIFY_ET_ENABLED=true VERIFY_ET_MOCK=true VERIFY_ET_API_KEY=synthetic-e2e-key php artisan --env=testing config:show database.connections.mysql.database' | awk 'NF{print $NF}' | tail -1)"
echo "Resolved database: ${DB_NAME}"
case "${DB_NAME}" in
  *test*) ;;
  *) echo "REFUSING: database '${DB_NAME}' is not disposable."; exit 1 ;;
esac

echo "==> Preparing synthetic fixtures + mocked Verify.et"
ddev exec bash -c 'APP_ENV=testing VERIFY_ET_ENABLED=true VERIFY_ET_MOCK=true VERIFY_ET_API_KEY=synthetic-e2e-key php artisan linket:prepare-buyer-e2e --no-interaction'

WEB_IP="$(docker inspect ddev-linket-web --format '{{range $k,$v := .NetworkSettings.Networks}}{{if eq $k "ddev-linket_default"}}{{$v.IPAddress}}{{end}}{{end}}')"
UPSTREAM="http://${WEB_IP}:8081"
echo "==> Isolated upstream: ${UPSTREAM}"

ddev exec bash -c 'E2E_APP_URL=https://linket.ddev.site bash storage/app/e2e/start-serve.sh'

echo "==> Starting local Host-header proxy on :${PROXY_PORT}"
cleanup
E2E_PROXY_PORT="${PROXY_PORT}" E2E_UPSTREAM="${UPSTREAM}" E2E_HOST_HEADER=linket.ddev.site \
  node storage/app/e2e/host-proxy.mjs >/tmp/linket-e2e-proxy.log 2>&1 &
echo $! >"$PROXY_PID_FILE"
sleep 1
PRODUCT_PATH="$(node -e 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync("storage/app/e2e/buyer-fixture.json","utf8")); process.stdout.write(data.product_url || "/e2e-buyer-store/products/1929");')"
curl -fsS -o /dev/null -w "proxy-product:%{http_code}\n" "http://127.0.0.1:${PROXY_PORT}${PRODUCT_PATH}"

if [[ -n "${ASOUND_LIB_DIR:-}" && -e "${ASOUND_LIB_DIR}/libasound.so.2" ]]; then
  export LD_LIBRARY_PATH="${ASOUND_LIB_DIR}:${LD_LIBRARY_PATH:-}"
fi

echo "==> Running Playwright against http://127.0.0.1:${PROXY_PORT}"
set +e
LINKET_ISOLATED_E2E=1 \
E2E_NO_SERVER=1 \
E2E_BASE_URL="http://127.0.0.1:${PROXY_PORT}" \
npx playwright test tests/e2e/buyer-journey.spec.ts --project=chromium --workers=1
status=$?
set -e
exit "$status"
