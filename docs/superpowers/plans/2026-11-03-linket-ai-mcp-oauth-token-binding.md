# Creator MCP OAuth token binding and revocation — implementation plan

Goal: bind only Passport-issued access token database records to an explicitly approved creator/workspace/client/resource grant and revoke associated refresh credentials when a creator disconnects.

Branch: feat/linket-ai-v1, PR #94 WIP, Issue #88. No merge/deploy/production keys; public OAuth/MCP endpoints stay absent.

Assumptions: Passport v13.7.6 stores access tokens in oauth_access_tokens (char(80) ID, user_id, UUID client_id, revoked, scopes, expires_at) and refresh credentials in oauth_refresh_tokens (access_token_id, revoked, expires_at). Existing CreatorMcpConnectionRegistry is the authoritative workspace grant and verified-Pro boundary.

## Tasks (test-first)
1. RED: add tests/Feature/CreatorMcpPassportTokenBindingsTest.php for correct binding, unbound/foreign refusal, invalid revoked/expired/scope/client records, idempotency and misbinding, disconnect revocation for both access+refresh, and live Pro/client/feature denial. Run full PHP CI and record expected missing-class failures.
2. GREEN: add migration 2026_11_03_130000_create_creator_ai_mcp_oauth_token_bindings_table.php (access_token_id unique, connection ID, creator ID, OAuth client ID, canonical resource, timestamps; NO bearer or refresh text) and class app/CreatorAi/Auth/CreatorMcpPassportTokenBindings.php. Require explicit enabled flags, trusted caller (no public API), real non-revoked existing OAuth token/client, exact scope, subject and grant. For each read resolve stored mapping, verify token expiry/revoke, exact resource/client, Pro/workspace and client status. Bind cannot reassign a token.
3. Modify CreatorMcpConnectionRegistry::revoke() transaction to revoke *only* bound Passport access tokens and their associated refresh tokens. Preserve creator-only idempotent disconnect and historical grant metadata.
4. Run full PHP/TypeScript/Vitest/audits/build CI on commit; investigate failures, fix with tests first; update GitHub Issue #88 and Notion PR-06 only with proven results.

Review focus and release blockers:
- Trust boundary: real bearer signature and token issuer/audience are NOT validated by this internal service; future guarded MCP middleware must first authenticate via Passport, then use this binding. Never expose a public method that lets a model bind token IDs from arguments.
- Refresh rotation: Passport refresh can issue replacement access tokens, and there is NO reviewed rebind callback in this slice. New refreshed token remains unbound and denied until an authenticated, atomic token-issuance integration is implemented. Do not allow refresh without that integration.
- Production concurrency: token binding/consent/session locks and transaction consistency need security review. Continuous Pro/workspace checks remain mandatory.
- PR #94 currently conflicts with main; keep open/unmerged and NO-GO.
