# Production Release and Merge Control — Security Design

Date: 2026-10-31

## Intent
Ensure a Linket production deployment only occurs after a deliberate human release action and after the exact source commit has passed the complete `main` CI suite. Proposed for the owner of nateyk/linket in response to the October 31 security audit.

## Existing behavior
- `ci.yml` verifies PHP/MySQL, frontend tests, audits and builds artifacts on `main` pushes.
- `deploy-production.yml` deploys automatically after successful CI, permits `workflow_dispatch` to build a new release without the full tests, and can rebuild a missing CI artifact.
- `main` reports `protected:false`; GitHub's ruleset endpoint returned an account plan restriction and branch protection details are inaccessible to this GitHub integration.
- The deploy script currently logs but does not verify the artifact checksum and only records `RELEASE_SHA` as audit metadata.

## Chosen safe default (implementation proposal)
- Production deployment is **manual-only** via `workflow_dispatch` from `main`. It requires typing `DEPLOY` and the exact 40-character current `main` SHA.
- The workflow must find a completed, successful `CI` push run on `main` for the **exact SHA**, and must download the artifact from **that run ID only**. A missing artifact stops the release.
- The workflow checks the artifact checksum, the included `RELEASE_SHA` and `CI_META` before any SSH action. The server checks the transferred checksum and embedded release SHA again before extraction.
- Human production approval is intended to be supplied by required reviewers on the GitHub `production` environment. The environment remains referenced in workflow code; it is not represented as configured until verified by a repository administrator.
- `main` must be protected through GitHub Settings: PR required, 1 independent review, dismiss stale approvals, all conversations resolved, successful `Verify (PHP 8.4 + Node 24 + MySQL 8.0)` required, restrict bypass/force pushes. If the private-repo plan cannot support this, changing subscription/organization settings is the admin action; don't claim code alone protects direct pushes.
- All changes occur on a separate proposal branch and draft PR. Neither existing PR #45 nor the governance PR is merged or deployed in this task.

## Alternatives considered
1. Continue CI-triggered automatic deployment after main merges: fastest, but an unprotected main push or bypassed merge could reach production immediately.
2. Allow manual deployment to rebuild arbitrary SHAs: flexible for recovery, but full CI provenance can be bypassed.
3. **Manual, exact-commit, CI-artifact-only release (recommended):** extra human step, but clear approval boundary, deterministic artifact provenance and fail-closed verification.

## Scope
- Modify `.github/workflows/ci.yml` to require artifact upload success for main push and add a workflow contract test.
- Replace permissive production workflow branches with a single manual release path, CI run lookup, environment gate, pinned artifact download and transfer.
- Add `deploy/verify-release-artifact.sh` and synthetic offline tests; update `deploy/deploy.sh` to refuse archives without valid sidecar SHA-256 and expected source SHA.
- Document GitHub Settings and expected team review/deploy operating procedures.

## Non-goals and safety
- Do not change live GitHub repository rules, secrets, environment settings, production data or infrastructure in this branch.
- Do not merge, enable auto-merge, trigger `workflow_dispatch`, rerun production workflows or deploy.
- No production secrets, passwords, keys or host addresses in test fixtures.
- No automated rollback to arbitrary SHA; future rollback requires a separately reviewed procedure.

## Success criteria
- Static workflow security checks reject old automatic, dispatch-build and fallback code paths.
- Synthetic tarball tests demonstrate valid archive acceptance and rejection for tampered data, missing checksum, wrong SHA and unsafe entries.
- PR CI demonstrates no introduced test or frontend regressions; link to exact run and mark unverified conditions explicitly.
- Repository administrator can follow documented settings to enforce branch and environment controls, with limitations stated.