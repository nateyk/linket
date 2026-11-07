# Creator MCP OAuth browser-consent implementation plan

> For developers: use test-driven development and a complete PR CI gate before calling this work verified. Feature remains default-off and must not be merged/deployed yet.

Goal: implement a standalone creator-authenticated, single-use, workspace-selecting OAuth consent core that cannot be satisfied by Passport's old OAuth tokens or prior grants.

Spec: docs/superpowers/specs/2026-11-03-linket-ai-mcp-consent-lifecycle-design.md; Linket AI Q1-Q10 architecture; GitHub Issue #88.

Architecture: reuse CreatorMcpOAuthAuthorizationPolicy to validate trusted OAuth client parameters; use a browser session pending request, short random nonce, server-side expiry and CSRF validation; on approval call the existing CreatorAiAccess/CreatorMcpConnectionRegistry. No public routes and no token issuance in this task. A separately reviewed follow-up binds real Passport auth code/issued token IDs to the grant.

Task 1 — Consent flow:
Files:
- Create app/CreatorAi/Auth/CreatorMcpOAuthConsentFlow.php
- Create tests/Feature/CreatorMcpOAuthConsentFlowTest.php

Interfaces:
- begin(Illuminate\Http\Request $request, array $oauthParameters): array with client_id, nonce, expiry metadata
- approve(Illuminate\Http\Request $request, string $nonce, int $workspaceId): array with connection and validated authorization payload
- deny(Illuminate\Http\Request $request, string $nonce): void

Test sequence:
1. RED tests for unauthenticated or non-web-auth browser, no auto-consent from existing Passport tokens, explicit valid approval and single-use, deny, CSRF failure, account switch, other-creator workspace, expired pending, revoked client, Pro expiry, default-off gates, and no public Passport bypass.
2. Verify RED with php artisan test --compact on disposable MySQL CI: new missing class failures and no unrelated regressions.
3. Implement session-only class. Abort on missing web identity/session, invalid csrf, expired nonce, revoked client, failed Pro/workspace, and stale flags. Consume before write. Never return or persist passwords, access/refresh tokens, provider secrets, buyer financial data.
4. Verify GREEN via full PHP, TS, Vitest, Composer/npm audit, Laravel route/config caches and Vite build for SAME pushed SHA. Fix errors before claiming green.
5. Record exact hashes, CI evidence, blocker status in Issue #88 and Notion PR-06.

Review focus: concurrent tabs and nonce rotation, session fixation / web user switch, CSRF token rotation, stale Pro, client revoke after begin, attempt to approve foreign workspace, audit/log privacy. A passed test does NOT mean live OAuth is ready.

Next independently scoped task (not in this consent test cycle): access/refresh token-to-connection binding and immediate revocation, Passport authorization-code approval integration without scope reuse, resource/audience validation and 401 challenges, HTTPS MCP integration.
