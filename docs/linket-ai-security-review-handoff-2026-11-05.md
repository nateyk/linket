# Linket AI V1 — independent AppSec and staging verification handoff

**Prepared 2026-11-05. Internal engineering evidence, NOT an independent security review or release approval.**
Branch: `feat/linket-ai-v1`, integrated WIP PR #94. Latest PR-09 reviewed implementation head: `7ead6555`. No merge, production deployment, provider key extraction, or AI activation authorized.

## Release posture

**NO-GO.** Latest complete GitHub green CI #42005498103 belongs to earlier SHA `0861b168` and must not be represented as exact-head PR-09 CI. All PR-09 provider and storefront feature gates remain OFF. Local WSL isolated-checkout TypeScript and 6 Vitest tests passed; PHP lint and route registration pass. New Pest tests remain unverified because a guarded sandbox database migration step was blocked by remote-execution safety controls. The original `main` worktree was not changed.

## Independent reviewer: mandatory verification

1. **Authentication and tenant isolation:** prove user/workspace ID is never derived from attacker-controlled request; Free/expired/unverified Pro cannot access storefront preview; cross-owner stores return 404 with no title/config leakage. Test via genuinely authenticated HTTP, including missing same-origin headers, revoked/expired Pro and simultaneous workspace changes.
2. **PR-09 trust boundary:** inspect `StorefrontAppearanceProposalService` and `CreatorStorefrontAppearancePreviewController`. Only three allowed presets and existing button variant/radius/shadow values can be returned. No executable text/HTML/CSS/JS, image URL, arbitrary color, hideBranding or layout mutation. No provider call, billing reservation, storefront save or direct publication from this slice.
3. **Critical unresolved atomicity:** `StoreAppearanceController::update` still accepts flexible config; the PR-09 UI therefore intentionally has **no Apply**. Any future creator Apply must validate a strict schema and compare the originally observed revision atomically with the real save transaction, not merely call a separate revision-check endpoint before an unguarded update. Include concurrent writers and stale revisions.
4. **PR-05 provider isolation:** on PHP-FPM and any enabled worker/Octane runtime, verify the Laravel AI SDK v1.3 on-demand provider does not expose admin credentials across creator requests, survive beyond its intended scope, or change the existing helpdesk AI provider. Use synthetic keys, two simultaneous creators and asserted no secret values in logs, traces, responses, queue payloads or audit rows. No live key in source or tests.
5. **PR-04 financial ledger:** confirm Free 10 / Pro 100 generated requests/month and global provider budget are transactionally enforced under two concurrent MySQL sessions. A reserved request must not be retried with a conflicting owner/amount, silently refunded after an uncertain timeout, or settled with cost above the hold.
6. **Actual provider billing:** project-scoped OpenAI daily aggregate Costs and Usage are independent evidence but NOT per-request paid receipts. Require a dedicated project, complete closed 72-hour window, immutable project/account verification, approved timestamped price tariff (input/output/cached/tool charges), independent invoice reconciliation, reconciliation rounding/overage policy, and recorded operator approval before enabling settlement.
7. **OAuth/MCP separation:** no new write-capable MCP tool; no payment, receiving-account, paid-content, Verify.et or subscription permission changes. Validate revocation and HTTPS audience/issuer on every MCP call.
8. **User-facing WCAG and browser QA:** authenticated desktop/tablet/mobile at 360, 375, 768, 1024 and 1440px; 200% zoom/reflow, keyboard tab order and Escape/dismiss, visible focus, labels/ARIA status, contrast in light/dark, no horizontal overflow, quota/503/stale errors and no silent changes. Static DOM tests do not substitute for real browser evidence.

## Test artifacts required for signoff

- Immutable exact-head PR SHA; PHP 8.4/MySQL 8.0 guarded `db_test` test results and CI link; TypeScript, Vitest, real browser screenshots at 200%, reviewer identity/date and reproducible steps.
- Production-like staging (separate from production) with feature flags initially OFF, separate nonproduction admin/project key provisioned privately, provider invoice/cost evidence with identifiers redacted, server runtime identity/isolation proof.
- Negative scenarios: foreign creator/store, unverified or expired Pro, injection, arbitrary CSS, stale optimistic revision, conflicting request IDs, mismatched billing rates, provider/DB outages, replay, race, and rollback.
- Residual risks with owner, remediation, tests, independent reviewer acceptance and explicit operator GO/NO-GO. No automatic CI success, application UI or model text may independently approve a release.

## Immediate engineering evidence and limitations

- [Commit 7ead6555](https://github.com/nateyk/linket/commit/7ead6555cf5b950f7d911173cef81c42985f9e08) protects current creator-profile layout by limiting presets to button tokens.
- The latest pre-PR-09 green CI is [#42005498103](https://github.com/nateyk/linket/actions/runs/42005498103), not an approval for new code.
- Read-only local WSL QA: `tsc --noEmit` and 6 focused Vitest tests passed; PHP lint passed for three PR-09 files. The `db_test` guard and explicit database privilege isolation worked. No successful PR-09 Pest run or authenticated browser evaluation exists yet.
- Git push to trigger exact-head CI failed because the isolated workstation lacks GitHub HTTPS credentials. Never put credentials in PR comments or logs; an authorized maintainer can push using their own secure GitHub credentials.
