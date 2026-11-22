#!/usr/bin/env bash
# Send one sample of every React Email template.
# Safe for cPanel Terminal from the app root, e.g.:
#   bash scripts/send-email-template-samples.sh
#   bash scripts/send-email-template-samples.sh natenaelny@gmail.com
#   bash scripts/send-email-template-samples.sh natenaelny@gmail.com --dry-run
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EMAIL="${1:-natenaelny@gmail.com}"
shift || true

php artisan mail:send-template-samples "$EMAIL" "$@"
