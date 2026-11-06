# Passport consent-bound authorization-code implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task, test-first, and verify before claiming success.

**Goal:** Persist an actual Passport-issued authorization code with an exact one-creator, one-workspace consent grant association.

**Architecture:** CreatorMcpPassportCodeIssuer validates and completes Passport/League authorization AFTER Linket single-use browser consent. A scoped issuance context allows a custom AuthCodeRepository to save both code and its grant metadata in one database transaction. No public OAuth endpoint is registered in this slice.

**Tech Stack:** Laravel 13, PHP 8.4, Passport 13.7.6, league/oauth2-server 9.4.1, Pest 4, MySQL 8.

**Spec:** docs/superpowers/specs/2026-11-03-linket-ai-mcp-oauth-code-design.md

## Global Constraints
- All feature gates remain default OFF, including CREATOR_AI_MCP_OAUTH_ENABLED.
- Passport::ignoreRoutes() remains unconditional. No public authorization or token route.
- Existing Sanctum and Verify.et payment/fulfillment logic unchanged.
- Do not commit keys, create production keys, merge, rebase or deploy.

## Task: Real auth code and correlation
- [ ] Write tests/Feature/CreatorMcpPassportCodeIssuerTest.php for actual code + state redirect and persisted binding, no old-token reuse, foreign workspace, nonce replay, absent public OAuth routes.
- [ ] RED CI: expected missing CreatorMcpPassportCodeIssuer, no unrelated test failures.
- [ ] Implement CreatorMcpPassportCodeIssuer, request-scoped issue context, custom Passport AuthCodeRepository, mapping migration, and provider binding with mcp:use scope.
- [ ] GREEN full push+PR CI same latest SHA (or disclose PR merge conflicts). Validate PHP, TypeScript, Vitest, dependency audits, caches, build and regression suites.
- [ ] Record evidence in Issue #88 and Notion PR-06. Keep release NO-GO.

Review focus: code issuance must fail atomically if context or grant invalid; no timestamp-only code correlation; CSRF/session replay; another workspace/creator; wrong PKCE method or redirect; missing signing keys; original Passport routes remain off.
