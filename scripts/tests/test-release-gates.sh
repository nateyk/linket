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
grep -Fq -- '--expected-sha=' "$d"
grep -Fq 'verify-release-artifact.sh' "$f"
grep -Fq 'test-release-gates.sh' "$ci"
grep -Fq 'test-release-artifact.sh' "$ci"
grep -Fq 'test-resolve-verified-ci.sh' "$ci"
! grep -Fq 'continue-on-error: true' "$ci"
echo "PASS: fail-closed release controls static contract"