#!/usr/bin/env bash
# Verify a CI-built Linket archive without extracting it to disk.
set -euo pipefail
fail() { printf 'SECURITY GATE: %s\n' "$*" >&2; exit 1; }
if [[ $# -ne 2 ]]; then
  echo 'Usage: verify-release-artifact.sh <linket-*.tar.gz> <40-hex-approved-source-sha>' >&2
  exit 2
fi
archive="$1"
expected_sha="$2"
[[ "$expected_sha" =~ ^[0-9a-f]{40}$ ]] || fail 'expected SHA must be a full lowercase 40-character Git commit hash'
[[ -f "$archive" && ! -L "$archive" ]] || fail 'archive absent or is a symbolic link'
[[ -f "${archive}.sha256" && ! -L "${archive}.sha256" ]] || fail 'checksum sidecar absent or is a symbolic link'
name="$(basename -- "$archive")"
[[ "$name" =~ ^linket-([0-9a-f]{7})-[0-9]{8}-[0-9]{6}\.tar\.gz$ ]] || fail 'archive name is not the CI release format'
[[ "${BASH_REMATCH[1]}" == "${expected_sha:0:7}" ]] || fail 'archive source SHA prefix differs from requested SHA'
checksum_line="$(cat -- "${archive}.sha256")"
[[ "$checksum_line" =~ ^([0-9a-f]{64})\ \ ([a-zA-Z0-9_.-]+)$ ]] || fail 'malformed checksum sidecar'
claimed_digest="${BASH_REMATCH[1]}"
claimed_name="${BASH_REMATCH[2]}"
[[ "$claimed_name" == "$name" ]] || fail 'checksum sidecar does not name this archive'
actual_digest="$(sha256sum -- "$archive" | cut -d' ' -f1)"
[[ "$actual_digest" == "$claimed_digest" ]] || fail 'SHA-256 mismatch; rejecting altered artifact'
listing="$(mktemp)"
trap 'rm -f "$listing"' EXIT
tar -tzf "$archive" > "$listing" || fail 'tar archive cannot be listed'
while IFS= read -r member; do
  [[ -n "$member" ]] || fail 'empty archive entry name'
  [[ "$member" != /* && "$member" != *\\* ]] || fail 'absolute or backslash-containing tar entry'
  without_dot="${member#./}"
  case "/$without_dot/" in
    *"/../"*|*"/./"*) fail "unsafe relative tar member: $member" ;;
  esac
done < "$listing"
for required in ./RELEASE_SHA ./CI_META ./artisan ./public/build/manifest.json ./vendor/autoload.php; do
  grep -Fxq -- "$required" "$listing" || fail "required CI artifact member absent: $required"
done
for meta in ./RELEASE_SHA ./CI_META; do
  detail="$(tar -tvzf "$archive" "$meta")" || fail "cannot inspect $meta"
  [[ "${detail:0:1}" == '-' ]] || fail "metadata must be a regular file: $meta"
done
embedded_sha="$(tar -xOzf "$archive" ./RELEASE_SHA)" || fail 'cannot read RELEASE_SHA'
[[ "$embedded_sha" == "$expected_sha" ]] || fail 'RELEASE_SHA differs from approved source commit'
ci_meta="$(tar -xOzf "$archive" ./CI_META)" || fail 'cannot read CI_META'
[[ "$(printf '%s\n' "$ci_meta" | grep -Fxc -- "CI_SHA=$expected_sha")" == 1 ]] || fail 'CI_META must bind exactly one CI_SHA to approved source commit'
echo "Verified CI archive: $name SHA=$expected_sha SHA256=$actual_digest"
