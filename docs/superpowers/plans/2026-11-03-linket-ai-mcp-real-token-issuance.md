# Linket MCP OAuth2 actual token exchange, refresh and signed resource claims

> **For agentic workers:** Use superpowers:executing-plans and strict RED→GREEN, full CI and independent AppSec review.

**Goal:** Implement INTERNAL real Passport authorization_code+S256 token exchange and refresh rotation, bound to one approved creator/workspace grant, with signature/issuer/resource-audience bearer verification.

**Architecture:** Prevalidate authenticated League-encrypted auth code or refresh payload against trusted Passport DB rows, exact grant/creator/client/redirect/resource, and active verified-Pro workspace. Use Passport AuthorizationServer for actual token grant and refresh. A scoped issuance context and custom Passport AccessTokenRepository atomically link every minted access token to the consent grant; any error rolls back token issuance. JWT uses a compatible client-first audience plus explicit resource audience and configured HTTPS issuer. Bearer verification uses Passport ResourceServer first, then issuer/resource/client/scope and Linket grant checks.

**Stack:** PHP 8.4, Laravel 13, Passport 13.7.6, League OAuth2 Server 9.4.1, MySQL 8, Pest 4, Lcobucci JWT.

**Spec:** docs/superpowers/specs/2026-11-03-linket-ai-mcp-oauth-code-design.md

## Constraints
- No public authorize, token, registration, discovery or MCP HTTP route.
- No plaintext credential persistence or production keys.
- No modified Sanctum, Verify.et, creator billing or fulfillment invariants.
- No merge/deploy. WIP PR #94 still conflicts with main.
- Configured issuer must be HTTPS and same-origin with configured HTTPS resource. Defaults NULL. Fail closed if either is absent.

## TDD
- [ ] RED tests for real code+S256 exchange, wrong verifier, authorization-code replay, refresh rotation/replay, grant revocation, wrong issuer/resource and tampered bearer.
- [ ] CI RED expected missing TokenExchange and BearerAccess classes, no unrelated regressions.
- [ ] GREEN: add scoped token issuance context and custom Passport AccessTokenRepository; link created token ID to approved grant before returning token. Keep old tokens revoked, refresh rotated. Use real League AuthorizationServer and Passport ResourceServer.
- [ ] Add compatible JWT issuer/resource audience to signed tokens, and cryptographic bearer verification plus live workspace permission. Maintain client ID as aud[0], because Passport TokenGuard extracts oauth_client_id from the first audience.
- [ ] Full CI same SHA: PHP, TS, Vitest, audits, caches and build. Record exact evidence in Issue #88 and Notion PR-06.
- [ ] Before any HTTP route: add session locking and real client allowlist, endpoint error/CSRF/state security, key management/trusted proxy and cPanel, resource discovery and independent review.

Potential future security issues: default Passport code/refresh grants must never be exposed outside strict Linket wrappers; no grant-type switch or client_credentials route. The refresh transaction must lock the original refresh token and grant so replay cannot mint two token families. Fail-closed on Pro loss, changed redirect, wrong audience or missing signing keys.
