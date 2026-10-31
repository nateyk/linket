# Linket controlled production release

## Security model

Production releases require an explicitly typed `DEPLOY`, a full 40-character SHA matching the current `main` HEAD, a **completed successful push CI run** for that exact SHA, an unexpired CI artifact from that run, optional GitHub environment reviewers if configured, and identical SHA-256 checked before upload and before extraction. No fallback build is permitted.

A successful PR CI run is not a production release authorization. The `security/sec-002-upload-hardening` PR is independent and must pass security review before merge.

## Mandatory GitHub Settings (administrator action)

1. Enable protection for `main`: require a PR, at least one independent reviewer, dismiss stale approvals, require conversation resolution, and require CI check **Verify (PHP 8.4 + Node 24 + MySQL 8.0)**. Prevent force pushes and bypass where supported.
2. Configure **Settings → Environments → production** with required reviewers and restrict deployment branches to `main`. Verify reviewers really work with a controlled dry run before relying on them.
3. Check GitHub private repository plan eligibility. On October 31, 2026 the Rulesets endpoint reported a GitHub plan restriction, and branch `main` reported `protected:false`. Until settings are enforced, maintainers can bypass review via direct pushes; workflow code alone is not branch protection.
4. Preserve existing pinned `CPANEL_SSH_KNOWN_HOSTS` and SSH private key secrets. Never enable `ALLOW_INSECURE_HOSTKEY` as a substitute.
5. Ensure CI uploads `linket-ci-<full-main-SHA>` including tarball, checksum, RELEASE_SHA, CI_META. Missing artifacts stop deployment.

## Operator release procedure

1. Merge a reviewed, CI-green PR to `main` only after the administrator controls above are active.
2. Wait for the **push** CI run for that commit to finish successfully, including its mandatory artifact upload.
3. In **Actions → Deploy Production → Run workflow**, select `main`, enter the exact current main SHA and type `DEPLOY`.
4. A configured production environment reviewer approves the request. After approval the workflow rechecks main HEAD and the same CI run.
5. GitHub downloads that single CI artifact, verifies archive contents, its SHA-256 sidecar, RELEASE_SHA, and CI_META, copies it and the verifier to cPanel, and re-verifies on host before extracting. Health checks and existing rollback logic then run.
6. Record workflow run ID, SHA, approval actor, artifact digest, deployment health and backup evidence.

## Stop / rollback

Any changed SHA, missing/expired artifact, failed CI, bad checksum, missing SSH pin, missing APP_URL, failed backup (to be hardened separately), or failed health check requires **no deploy** and investigation. Do not rerun with an arbitrary SHA or permit a fallback build. Existing atomic rollback can restore code but does not revert database migrations; coordinate database restore based on a tested off-host backup.

## Verification evidence and limitations

Synthetic local tests include successful and failed SHA matching, failed/incomplete CI, PR-only CI, missing artifacts, corrupt tarballs and missing metadata. GitHub Actions CI on the PR must pass before the code is merged. These tests do **not** prove that GitHub production reviewers are configured, that branch protection is enabled, or that the real production deployment ran.

**No merge, manual workflow dispatch, or production deployment was authorized by this design-implementation task.**
