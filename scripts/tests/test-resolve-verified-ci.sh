#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/bin"
cat > "$tmp/bin/gh" <<'MOCK'
#!/usr/bin/env bash
sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
case "$2" in
  */branches/main) printf '{"commit":{"sha":"%s"}}\n' "$sha";;
  */workflows/ci.yml/runs\?*) printf '{"workflow_runs":[{"id":123,"head_sha":"%s","head_branch":"main","event":"push","status":"completed","conclusion":"success"}]}\n' "$sha";;
  */runs/123/artifacts\?*) printf '{"artifacts":[{"name":"linket-ci-%s","expired":false,"size_in_bytes":123}]}\n' "$sha";;
  *) exit 2;;
esac
MOCK
chmod +x "$tmp/bin/gh"
export PATH="$tmp/bin:$PATH" GITHUB_REF=refs/heads/main GITHUB_REPOSITORY=nateyk/linket GITHUB_OUTPUT="$tmp/out"
sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
bash scripts/release/resolve-verified-ci.sh "$sha"
grep -Fxq "sha=$sha" "$tmp/out"
grep -Fxq 'ci_run_id=123' "$tmp/out"
if bash scripts/release/resolve-verified-ci.sh bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb >/dev/null 2>&1; then exit 1; fi
if GITHUB_REF=refs/heads/feature bash scripts/release/resolve-verified-ci.sh "$sha" >/dev/null 2>&1; then exit 1; fi
echo 'PASS: exact main push CI accepted; wrong SHA and branch rejected'