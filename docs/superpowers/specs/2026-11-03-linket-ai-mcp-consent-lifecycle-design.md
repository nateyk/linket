# Creator MCP OAuth: mandatory browser consent and token lifecycle design

Status: incrementally implementing the approved Linket AI Q1-Q10 architecture on WIP PR #94. Live OAuth and MCP remain disabled. No merge, deploy, signing keys, external provider calls, or production feature enablement without separate explicit approval.

Intent: Linket Pro creators explicitly select ONE authorized workspace per MCP connection using their authenticated Linket web session. Passport's existing-token scope reuse must NEVER replace a fresh Linket workspace approval.

Architecture alternatives considered:
1. Use default Passport OAuth authorization controller: rejected; prior-token consent reuse can bypass workspace-specific approval.
2. Create a parallel, custom OAuth server: rejected; security-sensitive duplication.
3. Chosen: keep Passport as issuer and token verifier, but place a strict Linket web-session consent service/controller in front of code issuance. Consume a short-lived single-use CSRF-protected pending request to create a creator/workspace/client grant. Future authorization endpoint must call it and never invoke Passport's auto-approval shortcut. Keep all live routes unregistered in this slice.

Current consent slice: CreatorMcpOAuthConsentFlow validates a previously preflighted client request, authenticates from the web guard (NOT a supplied ID or Sanctum API token), binds the pending request/nonce to the web session and creator, expires it in 10 minutes, requires a fresh CSRF token and nonce on approval/denial, rechecks the registered client, feature flags, current Verify.et-backed Pro entitlement and selected workspace membership, and consumes the session grant attempt before any grant can be created. Denial creates no grant. Existing Passport tokens can never satisfy pending consent.

The browser's OAuth state is supplied/validated by the OAuth client. Linket only verifies its format and echoes it later; this is distinct from Linket's own browser CSRF and consent nonce.

Next separate token slice: token family and consent-grant mapping must record non-secret token IDs, client, creator, workspace-bound connection and resource, only from verified Passport issuance. Every MCP tool must verify Passport bearer signature, issuer, audience/resource, scope and token/grant/Pro live state; revocation must affect access and refresh token families. Explicit public routes, certificate/trusted proxy tests, cPanel validation, and independent audit are release prerequisites.

No public /oauth routes, client registration or MCP HTTP transport are registered by this session-consent service. Changing CREATOR_AI_MCP_OAUTH_ENABLED alone must not create a bypassable remote endpoint. Release: NO-GO.
