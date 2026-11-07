# Linket AI — Safe HTTP OAuth and remote MCP rollout plan

For agentic workers: use Superpowers executing-plans and test-driven-development. This is the NEXT implementation plan, not approval to expose endpoints or deploy.

Goal: Expose the existing internal Passport OAuth code/refresh foundation through creator-authenticated, workspace-specific, HTTPS-only remote integration without consent bypass, token confusion or cross-workspace reads.

Spec: Linket AI Q1-Q10 architecture; docs/superpowers/specs/2026-11-03-linket-ai-mcp-oauth-code-design.md; Issue #88 / PR #94.

Architecture: Use Linket-specific authorize, approve, deny and token controllers. Keep Passport::ignoreRoutes() and never use Passport's built-in prior-token auto-consent controller. Use Passport/League AuthorizationServer and Linket's grant-bound token exchange internally. All public routes require a separate default-OFF deploy gate and independent AppSec approval.

Global constraints:
- No production settings, secret/key generation, main merges or deployments.
- Exact HTTPS issuer, resource, registered client redirect and PKCE S256; forbid plain.
- Creator authenticated via Linket web guard, never model/user-provided IDs.
- Consent selects ONE authorized workspace, requires current Verify.et-backed Pro.
- CSRF, nonce, state, expiry and client checks. No plaintext bearer/refresh records.
- No dynamic client registration; controlled, explicit OAuth public client allowlist.
- No remote MCP tools without cryptographic bearer validation and live grant checks per request.
- Guarded MySQL tests and faked external providers only.

### Task 1: Session-bound browser OAuth consent
Files: Linket CreatorMcpOAuthConsentController, feature-gated routes/web.php, accessible consent UI, PHP feature tests.
- [ ] RED: no OAuth HTTP routes registered under default settings, even when only internal OAuth is enabled.
- [ ] Guarded GET authorize and POST approve/deny behind separately default-OFF HTTP flag, using web+auth+verified middleware.
- [ ] Route-level session locking: Route::post(...)->block(30, 10); enforce lock-capable shared session/cache, reject cookie sessions.
- [ ] Require Laravel 13 CSRF middleware; never approve on GET or from old Passport scopes. Render clear workspace selection and trusted client identity.
- [ ] RED->GREEN: unauthenticated, expired-Pro, foreign workspace, missing CSRF, nonce replay, parallel tabs, revoked client.

### Task 2: Stateless narrowed OAuth token endpoint
Files: CreatorMcpOAuthTokenController, API rate limit, HTTP feature tests.
- [ ] POST token only accepts authorization_code with S256 or refresh_token, never client_credentials/password/implicit.
- [ ] Typed, bounded code/verifier/client/redirect/resource fields. Exact allowlisted client and resource. No web session or Sanctum cookie for token endpoint.
- [ ] Standard safe OAuth errors, no secret logging, Cache-Control no-store, route throttling.
- [ ] Code/refresh replay, wrong verifier, client ID swap, expired access vs revoked family, lost Pro and wrong resource negative tests.

### Task 3: HTTPS MCP discovery and read-only gateway
- [ ] RFC 9728 protected-resource and RFC 8414 authorization-server metadata with exact canonical HTTPS endpoints; no dynamic registration.
- [ ] On EVERY MCP call verify Passport JWT signature, issuer, client/resource audience, scope, access ID, consent grant, membership and current Pro.
- [ ] Never trust workspace IDs from MCP arguments or expose buyer payment secrets or receiving account numbers.
- [ ] 401 + WWW-Authenticate with proper resource metadata; reject invalid forwarding/origin and leaking errors.

### Task 4: Full E2E, concurrent revocation and release
- [ ] Two creator HTTP consent/code/refresh/MCP tests; cross-workspace and cross-client attacks.
- [ ] Real concurrent separate-connection MySQL refresh/disconnect/approval: at most one successor family, no orphan tokens.
- [ ] Verify lock-capable session driver, cPanel HTTPS/proxy/key storage/rotation, route cache, audit logging privacy and rollback.
- [ ] Resolve PR #94 merge conflicts without changing main; rerun push and PR merge-ref checks on same SHA.
- [ ] Independent OAuth/AppSec review and explicit owner release approval.

Current state: internal code/refresh and signed bearer foundation; public OAuth/MCP routes remain disabled. Release NO-GO.
