# Linket AI MCP OAuth request-lifecycle isolation — TDD security slice

> **For agentic workers:** Use superpowers:executing-plans + test-driven-development. Keep PR #94 WIP, unmerged, with zero production changes.

**Goal:** Make an already-initialized Passport AuthorizationServer work safely across fresh Linket request/job scopes, without accepting stale consent/issuance context or losing code/token-to-workspace binding.

**Spec:** docs/superpowers/specs/2026-11-03-linket-ai-mcp-oauth-code-design.md; Notion Q1-Q10 architecture; Issue #88.

**Architecture:** Passport 13.7.6 constructs AuthorizationServer as a singleton. Its AuthCodeRepository and AccessTokenRepository are instantiated on first resolution and retained. Linket's CreatorMcpPassportCodeIssuanceContext and CreatorMcpPassportTokenIssuanceContext are correctly scoped per Laravel request. Repository methods must access the CURRENT scoped context at persistence time rather than retain a context object captured inside an old singleton. The trusted code issuer/token exchange still use their request-scoped context and only invoke under explicit approved grants.

## Global constraints
- No default /oauth/token, authorize, registration, discovery or remote MCP routes are enabled. CREATOR_AI_MCP_OAUTH_ENABLED defaults false.
- Never copy bearer/refresh secrets to tables or logs. Never change Sanctum, Verify.et or paid-content flows.
- Never make a request-scoped token grant a long-lived singleton. Per-request recomputation must be explicit.
- TDD RED→GREEN, full existing CI, no merge/rebase/deploy.

### Task 1: Prevent stale authorization-code consent context
**Files:** tests/Feature/CreatorMcpPassportCodeIssuerTest.php; app/CreatorAi/Auth/CreatorMcpAuthCodeRepository.php.
- [ ] Write a real integration test that issues + exchanges an approved code, flushes scoped instances to simulate a new Laravel lifecycle, then issues and exchanges a second code with the same Passport server.
- [ ] RED: CI fails because cached old AuthCodeRepository uses the previous scoped context even after reset; existing tests otherwise green.
- [ ] Make the repository resolve CreatorMcpPassportCodeIssuanceContext from the Laravel container on each persist, not from its constructor. An absent/current-context mismatch MUST abort 403.
- [ ] GREEN: same test passes with two independently recorded auth_code→grant bindings.

### Task 2: Prevent stale access-token issuance context on refresh
**Files:** same tests; app/CreatorAi/Auth/CreatorMcpPassportAccessTokenRepository.php.
- [ ] Write refresh-token rotation test across scoped lifecycle reset, checking new token binding and live signed bearer workspace authorization.
- [ ] RED: same singleton repository retains old token-issuance context so no fresh binding.
- [ ] Resolve current CreatorMcpPassportTokenIssuanceContext from the container on every getNewToken/persistNewAccessToken method. Do not cache any last-used creator/connection/resource across calls.
- [ ] GREEN: refreshed token binds only to original verified workspace, old access and refresh records revoked.

## Review Focus
- An old worker must not apply another request's previously approved grant.
- A refresh after first request cannot mint unbound usable access.
- Existing token exchanges without trusted Linket issuance context cannot create Linket MCP token bindings.
- Client/creator swaps must remain forbidden.
- No HTTP feature toggle exposes new public endpoints.

## Completion
Full branch CI (PHP/MySQL including new tests, TypeScript, Vitest, audits and Vite build) on the exact latest commit; explicit GitHub Issue #88 and Notion PR-06 evidence. Next independent deliverable is audited HTTP authorize/consent/token routing with session locking and true end-to-end negative tests. NO-GO until independent AppSec review.
