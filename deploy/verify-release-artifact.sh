#!/usr/bin/env bash
# Verify a CI-built Linket archive without extracting it to disk.
set -euo pipefail
export LC_ALL=C
unset TAR_OPTIONS GZIP
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
details="$(mktemp)"
trap 'rm -f "$listing" "$details"' EXIT
# GNU tar resolves PAX/GNU long names. Escaping prevents control characters from
# creating extra listing lines. Read past end markers to inspect concatenated tars.
tar --ignore-zeros --quoting-style=escape -tzf "$archive" > "$listing" 2>/dev/null || fail 'tar archive cannot be listed'
tar --ignore-zeros --quoting-style=escape -tvzf "$archive" > "$details" 2>/dev/null || fail 'tar entry types cannot be inspected'
mapfile -t entries < "$listing"
mapfile -t types < "$details"
[[ ${#entries[@]} -eq ${#types[@]} && ${#entries[@]} -gt 0 && ${#entries[@]} -le 250000 ]] || fail 'invalid archive inventory'
declare -A members=() originals=()
index=0
while IFS= read -r member; do
  kind="${types[$index]:0:1}"
  mode="${types[$index]:0:10}"
  index=$((index + 1))
  [[ "$kind" == '-' || "$kind" == d ]] || fail 'links and special archive entry types are forbidden'
  [[ "$mode" != *[sStT]* ]] || fail 'special file permission bits are forbidden'
  [[ -n "$member" ]] || fail 'empty archive entry name'
  [[ "$member" != /* && "$member" != *\\* ]] || fail 'absolute or backslash-containing tar entry'
  without_dot="${member#./}"
  if [[ "$without_dot" == . || -z "$without_dot" ]]; then
    [[ "$kind" == d && -z "${members[.]:-}" ]] || fail 'invalid or duplicate archive root'
    members[.]=d
    continue
  fi
  if [[ "$kind" == d ]]; then without_dot="${without_dot%/}"; fi
  [[ "$without_dot" != */ && "$without_dot" != *//* && "$without_dot" != *[[:cntrl:]]* ]] || fail 'noncanonical tar member'
  case "/$without_dot/" in
    *"/../"*|*"/./"*) fail 'unsafe relative tar member' ;;
  esac
  [[ -z "${members[$without_dot]:-}" ]] || fail 'duplicate normalized archive member'
  members["$without_dot"]="$kind"
  originals["$without_dot"]="$member"
  case "$without_dot" in
    storage|storage/*|shared|shared/*|keys|keys/*|secrets|secrets/*|public/storage|public/storage/*|bootstrap/cache/*)
      fail 'runtime storage or cached configuration is forbidden in release artifacts' ;;
  esac
  lower="${without_dot,,}"
  case "/$lower/" in
    */.env*/*|*/.ssh/*|*/.aws/*|*/.gnupg/*|*/.docker/*|*/.kube/*|*/.git/*|*/node_modules/*)
      fail 'environment or credential directory is forbidden in release artifacts' ;;
  esac
  case "${lower##*/}" in
    *.key|*private*.pem|*public*.pem|*.p12|*.pfx|*.jks|*.keystore|auth.json|credentials.json|.npmrc|.netrc|.git-credentials|id_rsa|id_ed25519|.bootstrap-admin.json|*.sql|*.sql.gz|*.tar.gz)
      fail 'credential or backup member is forbidden in release artifacts' ;;
  esac
done < "$listing"
# Check ancestors after inventorying every member, regardless of archive order.
for member in "${!members[@]}"; do
  parent="$member"
  while [[ "$parent" == */* ]]; do
    parent="${parent%/*}"
    [[ "${members[$parent]:-d}" == d ]] || fail 'archive file conflicts with a directory path'
  done
done
for required in RELEASE_SHA CI_META artisan public/build/manifest.json vendor/autoload.php; do
  [[ "${members[$required]:-}" == '-' ]] || fail "required regular CI artifact member absent: $required"
done
scanner="$(dirname "$0")/release-artifact-secrets.php"
[[ -f "$scanner" && ! -L "$scanner" ]] || fail 'missing artifact content scanner'
php_bin="${PHP_BINARY:-php}"
# Check raw types as well as the resolved listing: tar displays GNU sparse/dumpdir
# records as ordinary entries. Stream without extraction or executing archived PHP.
gzip -dc -- "$archive" 2>/dev/null | "$php_bin" "$scanner" --check-tar-stream || fail 'artifact type/content scan rejected the archive'
tar --ignore-zeros -xOzf "$archive" -- "${originals[RELEASE_SHA]}" 2>/dev/null | "$php_bin" "$scanner" --release-sha "$expected_sha" || fail 'RELEASE_SHA differs from approved source commit'
tar --ignore-zeros -xOzf "$archive" -- "${originals[CI_META]}" 2>/dev/null | "$php_bin" "$scanner" --ci-meta "$expected_sha" || fail 'CI_META must bind exactly one CI_SHA to approved source commit'
echo "Verified CI archive: $name SHA=$expected_sha SHA256=$actual_digest"
