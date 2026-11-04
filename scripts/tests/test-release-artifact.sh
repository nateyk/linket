#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
verifier="deploy/verify-release-artifact.sh"
sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/payload/public/build" "$tmp/payload/vendor"
printf '%s\n' "$sha" > "$tmp/payload/RELEASE_SHA"
printf 'CI_SHA=%s\n' "$sha" > "$tmp/payload/CI_META"
touch "$tmp/payload/artisan" "$tmp/payload/public/build/manifest.json" "$tmp/payload/vendor/autoload.php"
name=linket-aaaaaaa-20261031-150000.tar.gz
tar -czf "$tmp/$name" -C "$tmp/payload" .
(cd "$tmp"; sha256sum "$name" > "$name.sha256")
bash "$verifier" "$tmp/$name" "$sha"
if bash "$verifier" "$tmp/$name" bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb >/dev/null 2>&1; then exit 1; fi
printf tamper >> "$tmp/$name"
if bash "$verifier" "$tmp/$name" "$sha" >/dev/null 2>&1; then exit 1; fi
echo 'PASS: correct archive accepted; wrong SHA and tampering rejected'
python3 scripts/tests/release-artifact-security.py
