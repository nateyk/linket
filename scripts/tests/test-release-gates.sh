#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
d=.github/workflows/deploy-production.yml
ci=.github/workflows/ci.yml
f=deploy/deploy.sh
grep -Fq 'workflow_dispatch:' "$d"
! grep -Eq '^[[:space:]]*workflow_run:' "$d"
! grep -Fq 'dispatch_build' "$d"
! grep -Fq 'Fallback build when CI artifact missing' "$d"
grep -Fq 'confirm_production:' "$d"
grep -Fq 'resolve-verified-ci.sh' "$d"
grep -Fq 'name: production' "$d"
grep -Fq 'actions/download-artifact@v4' "$d"
grep -Fq 'run-id:' "$d"
grep -Fq 'verify-release-artifact.sh' "$d"
grep -Eq '^ +scp .*deploy/secure-storage.php ' "$d"
grep -Eq '^ +scp .*deploy/release-artifact-secrets.php ' "$d"
grep -Fq -- '--expected-sha=' "$d"
grep -Fq 'verify-release-artifact.sh' "$f"
grep -Fq 'mysqldump is required before production migration' "$f"
grep -Fq 'Backup failure blocks deployment' "$f"
grep -Fq 'gzip -t' "$f"
! grep -Fq 'continuing deploy (manual backup recommended' "$f"
grep -Fq 'test-release-gates.sh' "$ci"
# Cancellation must skip the final join, rather than leaving an obsolete
# queued verification job blocking the next PR run.
grep -Fq 'if: ${{ always() && !cancelled() }}' "$ci"
# CI PR checks must run without requiring an optional third-party runner fleet.
test "$(grep -cF 'runs-on: ${{ github.event_name == ' "$ci")" -eq 5
grep -Fq 'group: ci-v2-${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}' "$ci"
grep -Fq 'test-release-artifact.sh' "$ci"
grep -Fq 'test-resolve-verified-ci.sh' "$ci"
grep -Fq 'bash scripts/release/build-release-artifact.sh' "$ci"
grep -Fq 'bash deploy/verify-release-artifact.sh "${ARTIFACT_NAME}.tar.gz" "$SHA"' "$ci"
! grep -Fq 'tar -czf' "$ci"
grep -Fq '${{ env.ARTIFACT_NAME }}.tar.gz' "$ci"
! grep -Fq '            linket-*.tar.gz' "$ci"
! grep -Fq 'continue-on-error: true' "$ci"
echo "PASS: fail-closed release controls static contract"
