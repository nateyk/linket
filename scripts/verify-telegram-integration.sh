#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Telegram integration — synthetic automated verification"

if command -v ddev >/dev/null 2>&1 && [[ -f .ddev/config.yaml ]] && ddev describe >/dev/null 2>&1; then
  ddev artisan linket:verify-telegram
  ddev artisan test --compact --filter=Telegram
else
  php artisan linket:verify-telegram
  php artisan test --compact --filter=Telegram
fi

echo "==> Telegram integration — frontend DOM tests"
npm run test:telegram

echo "==> Telegram automated verification finished successfully"
