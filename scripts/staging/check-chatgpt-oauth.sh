#!/usr/bin/env bash
# Credential-free, read-only Linket OAuth/MCP preflight for a SEPARATE HTTPS staging deployment.
# Never run with production URL, credentials, or user data.
set -euo pipefail

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
[[ "$#" -eq 1 ]] || fail 'Usage: LINKET_STAGING_HOST=staging.example.com bash scripts/staging/check-chatgpt-oauth.sh https://staging.example.com/mcp'
[[ -n "${LINKET_STAGING_HOST:-}" ]] || fail 'Set LINKET_STAGING_HOST to the separate staging host (without scheme)'
resource="$1"
[[ "$resource" =~ ^(https://([A-Za-z0-9.-]+)(:[0-9]+)?)/mcp$ ]] || fail 'Resource must be an HTTPS origin followed by /mcp'
issuer="${BASH_REMATCH[1]}"
host="${BASH_REMATCH[2]}"
[[ "$host" == "$LINKET_STAGING_HOST" ]] || fail 'The staging URL hostname must match LINKET_STAGING_HOST exactly'
case "$host" in
  linket.agrigebeya.com|www.linket.agrigebeya.com|localhost|127.0.0.1) fail 'Production and loopback hosts are forbidden' ;;
esac

# Reject invalid/production hosts before checking optional tooling or making requests.
command -v curl >/dev/null 2>&1 || fail 'curl is required'
command -v jq >/dev/null 2>&1 || fail 'jq is required'

curl_opts=(--silent --show-error --max-time 12 --max-redirs 0 --proto '=https')
meta_url="$issuer/.well-known/oauth-protected-resource/mcp"
auth_url="$issuer/.well-known/oauth-authorization-server"
resource_json="$(curl "${curl_opts[@]}" --fail "$meta_url")" || fail 'Protected-resource discovery failed'
jq -e --arg resource "$resource" --arg issuer "$issuer" '
  .resource == $resource
  and (.authorization_servers == [$issuer])
  and (.scopes_supported == ["mcp:use"])
' >/dev/null <<< "$resource_json" || fail 'Incorrect protected-resource metadata'

auth_json="$(curl "${curl_opts[@]}" --fail "$auth_url")" || fail 'Authorization-server discovery failed'
jq -e --arg issuer "$issuer" '
  .issuer == $issuer
  and .authorization_endpoint == ($issuer + "/oauth/linket/authorize")
  and .token_endpoint == ($issuer + "/oauth/linket/token")
  and (.code_challenge_methods_supported | index("S256") != null)
  and .token_endpoint_auth_methods_supported == ["none"]
  and .grant_types_supported == ["authorization_code", "refresh_token"]
  and (.registration_endpoint == null)
  and (.client_id_metadata_document_supported == null or .client_id_metadata_document_supported == false)
' >/dev/null <<< "$auth_json" || fail 'OAuth metadata does not match Linket restricted public-client policy'

header_file="$(mktemp)"
trap 'rm -f "$header_file"' EXIT
status="$(curl "${curl_opts[@]}" -D "$header_file" -o /dev/null -w '%{http_code}' \
  -X POST -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2026-07-28' -H 'Mcp-Method: tools/list' \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' "$resource")" \
  || fail 'Unauthenticated MCP request failed'
[[ "$status" == "401" ]] || fail "Unauthenticated MCP must return HTTP 401, got $status"
grep -Eqi '^WWW-Authenticate:[[:space:]]*Bearer ' "$header_file" || fail 'Missing bearer challenge'
grep -Fq "resource_metadata=\"$meta_url\"" "$header_file" || fail 'Challenge does not advertise canonical protected-resource metadata'
grep -Fq 'scope="mcp:use"' "$header_file" || fail 'Challenge does not advertise mcp:use'
grep -Fq 'error="invalid_token"' "$header_file" || fail 'Challenge does not advertise an OAuth error'
printf 'PASS: isolated staging discovery, PKCE, predefined public-client policy, and 401 bearer challenge.\n'
printf 'NOTE: This sends NO credentials and does NOT establish a live ChatGPT OAuth connection.\n'
