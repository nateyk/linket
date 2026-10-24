#!/usr/bin/env bash
# Run Laravel Boost MCP inside the DDEV web container.
# Host `php` is a Windows shim and cannot serve Boost (no app env, no stdin-safe MCP).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT="${DDEV_PROJECT:-linket}"
CONTAINER="ddev-${PROJECT}-web"

if command -v docker >/dev/null 2>&1; then
  if docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -qx true; then
    exec docker exec -i -w /var/www/html "$CONTAINER" php artisan boost:mcp
  fi
fi

if command -v ddev >/dev/null 2>&1; then
  exec ddev artisan boost:mcp
fi

echo "Laravel Boost MCP needs DDEV running. From the project root: ddev start" >&2
exit 1
