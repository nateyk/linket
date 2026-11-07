#!/usr/bin/env bash
set -euo pipefail

# Run only inside the dedicated DDEV web container, never on a remote server.
cd /var/www/html/.worktrees/ai-continuation-20261106
mkdir -p storage/app/e2e
pidfile=storage/app/e2e/ai-copy-server.pid

if [[ "${1:-}" == "stop" ]]; then
  if [[ -f "$pidfile" ]]; then
    pid="$(cat "$pidfile")"
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
    rm -f "$pidfile"
  fi
  exit 0
fi

[[ "${1:-}" == "start" ]] || { echo 'Expected start or stop' >&2; exit 1; }
[[ "$PWD" == '/var/www/html/.worktrees/ai-continuation-20261106' ]] || exit 1
export APP_ENV=testing
export DB_DATABASE=db_test_ai_continue_20261106
export APP_URL=http://127.0.0.1:18085
export ASSET_URL=http://127.0.0.1:18085
export SESSION_DRIVER=file
export CACHE_STORE=array
export CREATOR_AI_ENABLED=true
export CREATOR_AI_WRITING_BASIC_ENABLED=true
export CREATOR_AI_PRODUCT_COPY_PROVIDER_ENABLED=true
export LINKET_ISOLATED_E2E=1
export LINKET_AI_COPY_E2E_DB=db_test_ai_continue_20261106

if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
  echo 'AI copy test server already running; refusing to start another'
  exit 1
fi
# Launch PHP's built-in server directly, not Artisan serve's child process:
# the latter can reload .env.testing and replace the explicit loopback APP_URL,
# causing Vite asset URLs to point to http://localhost and fail in Chromium.
cd public
nohup php -S 0.0.0.0:18087 -t . ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php > ../storage/app/e2e/ai-copy-serve.log 2>&1 &
echo "$!" > "../$pidfile"
echo 'Isolated Laravel test server launched'
