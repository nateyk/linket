# Controlled Production Releases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require explicit authorization, successful full CI on the exact main commit, immutable tested artifact and cryptographic integrity before deploying Linket.

**Architecture:** GitHub Actions CI produces the only deployable artifact for main. Manual release workflow resolves a green main CI run and downloads its artifact by run ID, with a `production` environment review boundary. Reusable POSIX shell verification validates both GitHub runner and cPanel copies.

**Tech Stack:** GitHub Actions YAML, GitHub CLI REST API, Bash, sha256sum, tar, existing Laravel CI.

**Spec:** `docs/superpowers/specs/2026-10-31-controlled-releases-design.md`

## Global Constraints
- Work on `security/controlled-production-releases`; do not merge or deploy.
- Preserve existing cPanel SSH pinning, release directory model, health checks and rollback mechanics.
- A missing CI run, missing artifact, stale SHA, mismatched checksum or invalid release SHA must prevent SSH deployment.
- GitHub branch and environment settings require administrator setup outside this PR; code must not claim to set them.

## Review Focus
- Manual dispatch from non-main branch: reject before any production credential access.
- CI successful for the wrong SHA: reject.
- CI artifact deleted/expired or upload quota exceeded: reject rather than rebuild.
- Checksum mismatch between approved CI artifact and transferred tarball: reject locally and remotely.
- A branch update between approval and artifact transfer: reject on recheck.

---
### Task 1: Artifact verifier and synthetic regression
**Files:** Create `deploy/verify-release-artifact.sh`; create `scripts/tests/test-release-artifact.sh`.
**Interfaces:** verifier consumes archive path and exact 40-hex expected SHA; checksum sidecar must be adjacent, embedded `RELEASE_SHA` and `CI_META` must agree.
- [ ] Write negative and positive tests with synthetic tarballs, run and observe failing baseline.
- [ ] Implement minimal verifier; rerun tests to zero failures; check syntax with `bash -n`.
- [ ] Commit verifier and tests.

### Task 2: Fail-closed release workflow
**Files:** Modify `.github/workflows/deploy-production.yml`; create `scripts/tests/test-release-gates.sh`.
**Interfaces:** only workflow_dispatch on main with `confirm_production=DEPLOY` and full `deploy_sha`; `resolve` produces `sha`, `ci_run_id`, `artifact_name`, `release_id`; deploy job consumes these after environment approval.
- [ ] Add contract tests that fail on the existing auto-deploy, dispatch-build and fallback paths.
- [ ] Require exact SHA equal to main HEAD and completed successful CI push run for that SHA; recheck after production environment approval.
- [ ] Fetch the CI artifact from the selected run only; verify it before SSH; upload archive with re-keyed checksum sidecar.
- [ ] Remove build and fallback jobs; preserve verified SSH and deploy mechanics.
- [ ] Verify static tests and YAML syntax, then commit.

### Task 3: Remote verification and CI artifact gate
**Files:** Modify `deploy/deploy.sh` and `.github/workflows/ci.yml`.
**Interfaces:** deploy script accepts `--expected-sha=<40 lowercase hex>` and calls verifier before extraction. CI main artifact upload cannot be optional.
- [ ] Write fixture or shell test that fails for missing SHA / checksum and original unguarded script.
- [ ] Insert remote validation before any extraction/migrations and remove unverified fallback behavior.
- [ ] Require upload-artifact success, run static release contract checks in CI.
- [ ] Verify tests and shell syntax, then commit.

### Task 4: Operator documentation and PR review
**Files:** Create `docs/release-control.md`; optionally PR template updates if needed.
- [ ] Document branch and production environment protection requirements and plan limitation.
- [ ] Document manual release, approved SHA provenance, emergency rollback and failure handling.
- [ ] Verify PR diff, CI outcome, current main head and absence of production dispatch, then open draft PR.

## Handoff
- Actual deployment requires separate explicit authorization after both CI and human review.
- Production environment reviewers and branch protections remain admin-owned configuration tasks.