# Linket AI OAuth browser consent HTTP slice (default OFF)

**RED→GREEN engineering slice.** No public rollout is approved. This slice adds browser-facing *consent only*, behind an independently disabled HTTP flag. No public token, discovery, dynamic-registration or MCP resource endpoints are introduced.

- The API client cannot impersonate a creator: web-session auth only.
- GET authorization can only begin fresh, explicit consent after strict policy preflight and verified Pro.
- Display trusted client name and eligible workspace selection using escaped server-rendered content. Never auto-approve prior Passport scopes.
- POST approve/deny use normal Laravel 13 CSRF plus a session nonce and route session blocking; POST approve delegates to the already tested real Passport code issuer.
- HTTPS-only, no-store, no-referrer and restrictive content security policy.
- Independently default OFF `CREATOR_AI_MCP_HTTP_ENABLED` and no routes registered unless feature is enabled before app boot. Do not configure this in production yet.
- Cookie sessions or non-lock-capable cache backends must fail closed before nonce issuance.
- Tests remain limited to synthetic, verified-Pro fixtures with ephemeral in-memory RSA keys; no real client registration, provider calls or production settings.
- Remote OAuth token endpoint, resource metadata, MCP tools and secure HTTPS deployment remain blocked by separate E2E and independent AppSec review. PR #94 still conflicted with main.
