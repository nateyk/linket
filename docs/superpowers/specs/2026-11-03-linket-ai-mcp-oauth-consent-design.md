# Linket AI MCP — OAuth Authorization Boundary Design

**Status:** approved Linket AI Q1–Q10 architecture is the baseline; incremental development only. The live integration remains blocked pending complete Passport/PKCE/consent/HTTPS verification. **Owner constraint:** no merge, deploy, production key or feature toggle change without explicit separate approval.

## Intent
Allow a verified Linket Pro creator to grant ChatGPT read-only MCP access to ONE selected workspace without exposing buyer financial secrets or weakening Sanctum/Fortify, existing payment verification, subscriptions or fulfillment.

## Existing implementation
- Passport v13.7.6 and patched phpseclib 3.0.58 installed; an isolated PassportCreatorIdentity uses the existing users table but does not add Passport tokens to App\\Models\\User.
- CreatorMcpConnectionRegistry tracks a revocable creator/workspace/client grant, but does not issue OAuth tokens. Its authorize check revalidates active Pro and workspace access.
- Passport routes are unconditionally disabled with Passport::ignoreRoutes(). OAuth table migrations are present as of commit 9011f914.
- The public authorization and token flow, signing keys, session-bound consent, token-to-workspace mapping, protected-resource discovery and MCP HTTPS server are NOT implemented.

## Approaches
1. **Publish default Passport routes and add UI checks after the fact — rejected.** Default authorization may reuse previously granted scopes, lacks Linket workspace selection and does not force S256/resource binding; this creates a tenant-consent risk.
2. **Build a separate custom OAuth2 server — rejected.** Duplicates security-sensitive protocol behavior already implemented and maintained by Passport.
3. **Use Passport's OAuth server underneath a separate Linket authorization boundary — chosen.** Validate registered clients, exact redirect, S256 challenge, constrained scope/state and canonical resource *before* Passport; later add creator-specific session consent and explicit gated routes. Do not claim that prevalidation alone implements PKCE or OAuth.

## Current slice — authorization request preflight only
- Add CreatorMcpOAuthAuthorizationPolicy::validate(array $parameters): array, using trusted server-side Passport client rows. It must refuse all requests unless creator AI, MCP, and MCP OAuth flags are enabled; it NEVER issues tokens or grants.
- Allow only active, public OAuth clients registered for provider creator_mcp_users with the authorization_code grant; reject confidential and other-grant clients.
- Require code/S256, an unpadded 43-character base64url challenge, an opaque state of 32-128 URL-safe bytes, EXACT registered HTTPS redirect URI (no wildcard, query normalization, case folding or localhost fallback), scope mcp:use, and resource exactly equal to an explicitly configured HTTPS Linket MCP resource on the same origin as app.url.
- Return only validated, bounded fields for the eventual consent controller. The resource URL has no default; incomplete deployment configuration fails closed.
- Do not accept prompt=none, and never skip workspace-aware consent on the strength of prior OAuth tokens.
- Use Passport's own authorization server for actual PKCE verifier and code/token checks in the later HTTP integration. The issuer cannot prove a third-party client's CSRF-state session equality; the client must verify echoed state, while Linket must validate its own web consent session and anti-CSRF token.
- In this slice, Passport::ignoreRoutes(), public endpoint absence and default-OFF flags MUST remain unchanged.

## Full Issue #88 still required
Separate reviewed slices implement a guarded Passport authorize/approve/token flow with non-skippable workspace consent, token-to-grant linkage and refresh/access revocation, issuer/audience/scope enforcement, explicit registration, resource discovery/401, HTTPS streaming MCP, two-creator negative tests, cPanel readiness and independent security review. Until then: **NO-GO**.

## Security and verification
Real disposable guarded MySQL database, no live AI/Verify.et calls, test-first RED→GREEN, full PHP/TS/Vitest/audit/build checks for each pushed slice. Run a whole-branch security review before any release.
