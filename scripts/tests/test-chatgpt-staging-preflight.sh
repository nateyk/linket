#!/usr/bin/env bash
# Network-free staging preflight safety regressions. Run before any real connection.
set -euo pipefail
script="scripts/staging/check-chatgpt-oauth.sh"
[[ -f "$script" ]] || { echo 'Missing staging preflight script' >&2; exit 1; }
bash -n "$script"

assert_fails_with() {
  local expected="$1" expected_host="$2" url="$3" actual output
  output="$(LINKET_STAGING_HOST="$expected_host" bash "$script" "$url" 2>&1)" && {
    echo "Expected the staging preflight to fail: $expected" >&2
    exit 1
  }
  [[ "$output" == *"$expected"* ]] || {
    printf 'Wrong failure: expected [%s], got [%s]\n' "$expected" "$output" >&2
    exit 1
  }
}

# These paths must fail before attempting curl or requiring jq.
assert_fails_with 'Set LINKET_STAGING_HOST' '' 'https://staging.example.com/mcp'
assert_fails_with 'Production and loopback hosts are forbidden' 'linket.agrigebeya.com' 'https://linket.agrigebeya.com/mcp'
assert_fails_with 'Production and loopback hosts are forbidden' 'www.linket.agrigebeya.com' 'https://www.linket.agrigebeya.com/mcp'
assert_fails_with 'Production and loopback hosts are forbidden' 'localhost' 'https://localhost/mcp'
assert_fails_with 'hostname must match LINKET_STAGING_HOST' 'staging.example.com' 'https://foreign.example.com/mcp'
assert_fails_with 'Resource must be an HTTPS origin followed by /mcp' 'staging.example.com' 'http://staging.example.com/mcp'
assert_fails_with 'Resource must be an HTTPS origin followed by /mcp' 'staging.example.com' 'https://staging.example.com/other'
printf 'PASS: staging preflight refuses missing host, production/loopback, foreign host, HTTP and wrong paths before any network call.\n'
