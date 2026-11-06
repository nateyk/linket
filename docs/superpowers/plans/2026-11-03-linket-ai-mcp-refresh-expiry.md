# Linket MCP OAuth refresh-expiry vs revocation contract

> **For agentic workers:** use superpowers test-driven-development, with RED and GREEN CI on the same WIP branch. No public routes, merges, production keys or deployments.

**Goal:** Let an approved Linket creator renew an expired access token with a still-valid refresh credential, but never renew a deliberately revoked token family.

**Architecture:** Passport/League refresh grant validates encrypted, unexpired, unrevoked refresh credentials separately from short-lived access credentials. Linket additionally requires the source access token row to have an intact, unrevoked family and the current creator/workspace/client/resource grant to remain valid. Requiring the *old access token's* expiry to remain in the future makes refresh unusable once access expires; that expiry predicate must be removed, while revocation and current Pro/workspace checks remain.

**Spec:** docs/superpowers/specs/2026-11-03-linket-ai-mcp-oauth-code-design.md; Issue #88 and Linket AI Q1-Q10 architecture.

## Global constraints
- Default Passport routes stay ignored, independent OAuth feature gate OFF, no token data logged.
- Keep rate-limited HTTP transport, independent security review and GitHub merge conflict separate.
- Do not alter legacy Sanctum or Verify.et verification/fulfillment.

### Task 1: Correct refresh semantics with TDD
**Files:** tests/Feature/CreatorMcpPassportCodeIssuerTest.php, app/CreatorAi/Auth/CreatorMcpPassportTokenExchange.php.

- [ ] Add a failing test: expire only the old \`oauth_access_tokens.expires_at\`, keep the original refresh token unrevoked and unexpired, and verify a new signed token is issued for the same approved workspace while the old access token stays denied.
- [ ] Add a separate rejection test: explicitly revoke the old access row but leave its refresh row unrevoked; renewal must be denied and must not create new binding.
- [ ] Observe RED PHP test output for exactly the missing expiry behavior, not fixture/parsing failures.
- [ ] Remove only the \`expires_at > now()\` predicate for the previous ACCESS token in \`refresh()\`. Retain the \`revoked=false\` access condition, separate refresh credential expiry/revocation, grant/creator/plan/client/resource checks and the transaction.
- [ ] Run full PHP, TypeScript, Vitest, Composer/npm audits and Vite CI; record evidence in Issue #88 and Notion PR-06.

## Review Focus
- Expired access is not valid for MCP bearer reads.
- Expired access *can* be renewed by an unexpired unrevoked refresh token, if current Pro and workspace consent still hold.
- Revoked access or refresh cannot be revived.
- Refreshed token remains bound only to the original client, creator, resource and consent grant.
- Two simultaneous refreshes must not both mint valid token families; future deterministic concurrent-MySQL test required before public HTTP rollout.

**Release:** still NO-GO; only trusted internal token exchange until routed HTTP and independent AppSec review.
