#!/usr/bin/env bash
set -euo pipefail

API_JSON="${1:-resources/client/api.json}"

if [[ ! -f "$API_JSON" ]]; then
  echo "Missing $API_JSON"
  exit 1
fi

if grep -qE 'AdminHelp|"/admin/help/' "$API_JSON"; then
  echo "api.json still documents legacy AdminHelp /admin/help paths."
  echo "Run: composer api-docs (or ddev artisan scramble:export …)"
  exit 1
fi

if ! grep -qE 'hc/articles|/hc/' "$API_JSON"; then
  echo "api.json is missing Help Center (hc/) paths."
  exit 1
fi

if ! grep -qE 'helpdesk/' "$API_JSON"; then
  echo "api.json is missing helpdesk/ paths."
  exit 1
fi

echo "api.json OpenAPI hygiene OK (no AdminHelp; hc + helpdesk present)."
