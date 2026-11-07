#!/usr/bin/env bash
# Package only application code/assets. Runtime state is provisioned on the server.
set -euo pipefail
export LC_ALL=C
unset TAR_OPTIONS GZIP
fail() { printf 'PACKAGING GATE: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 3 ]] || fail 'Usage: build-release-artifact.sh <source-dir> <output.tar.gz> <approved-sha>'
source_dir="$(realpath -- "$1")"
output="$(realpath -m -- "$2")"
sha="$3"
[[ -d "$source_dir" && "$output" != "$source_dir/"* ]] || fail 'output must be outside the source directory'
[[ ! -e "$output" && ! -e "$output.sha256" ]] || fail 'refusing to overwrite an existing release'
root="$(cd "$(dirname "$0")/../.." && pwd)"
php_bin="${PHP_BINARY:-php}"
umask 0077
temporary="$(mktemp -d "$(dirname "$output")/.linket-package.XXXXXX")"
trap 'rm -rf -- "$temporary"' EXIT
name="$(basename -- "$output")"
"$php_bin" "$root/deploy/release-artifact-secrets.php" --exclusions "$source_dir" > "$temporary/key-exclusions"
tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner --format=gnu \
  -czf "$temporary/$name" -C "$source_dir" \
  --exclude='.git' --exclude='.gitignore' --exclude='node_modules' \
  --exclude='./storage' --exclude='./shared' --exclude='./keys' --exclude='./secrets' \
  --exclude='./public/storage' --exclude='./public/hot' --exclude='./bootstrap/cache/*' \
  --ignore-case \
  --exclude='oauth-private.key' --exclude='oauth-public.key' --exclude='*.key' \
  --exclude='*private*.pem' --exclude='*public*.pem' \
  --exclude='*.p12' --exclude='*.pfx' --exclude='*.jks' --exclude='*.keystore' \
  --exclude='.env*' --exclude='.ssh' --exclude='.aws' --exclude='.gnupg' \
  --exclude='.docker' --exclude='.kube' --exclude='.npmrc' --exclude='.netrc' --exclude='.git-credentials' \
  --exclude='auth.json' --exclude='credentials.json' --exclude='id_rsa' --exclude='id_ed25519' \
  --exclude='.bootstrap-admin.json' --exclude='*.sql' --exclude='*.sql.gz' \
  --exclude='*.tar.gz' --exclude='.phpunit.cache' --exclude='coverage' \
  --exclude='.ddev' --exclude='.agents' --exclude='.superpowers' --exclude='.cursor' \
  --exclude='linket codex.md' --exclude='NUL' \
  --no-ignore-case --no-wildcards --exclude-from="$temporary/key-exclusions" .
(cd "$temporary"; sha256sum -- "$name" > "$name.sha256")
# No archive is published to the upload path until the independent consumer gate passes.
bash "$root/deploy/verify-release-artifact.sh" "$temporary/$name" "$sha"
mv -- "$temporary/$name" "$output"
mv -- "$temporary/$name.sha256" "$output.sha256"
