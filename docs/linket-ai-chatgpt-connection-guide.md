# Linket AI V1 — ChatGPT connection setup

**Status:** Development documentation only. Remote OAuth and MCP are disabled by default; this guide does not authorize production activation.

## Requirements

- A Linket creator account with a current **Verify.et-backed, verified Pro** subscription and an accessible Linket workspace.
- The Linket deployment owner must enable *all* approved read-only MCP and OAuth feature gates, configure the exact canonical HTTPS issuer/resource, and register an approved public OAuth client using authorization-code/PKCE S256 and refresh grants. Generic Passport routes and dynamic client registration stay disabled.
- A compatible ChatGPT workspace. Creating and publishing custom MCP server connections is governed by ChatGPT workspace roles and permissions. For Business workspaces, an admin/owner manages creation; Enterprise/Edu may authorize other developers. Verify your workspace's current eligibility and policy first. Full MCP setup is supported on ChatGPT web.

## How to connect (only after Linket release approval)

1. In Linket, open **Account Settings → Integrations → ChatGPT**. The panel shows which requirement is missing. Existing consent grants remain manageable when new connections are disabled.
2. When your account is eligible and an approved client is registered, copy the exact HTTPS MCP endpoint displayed in Linket. Do **not** invent an endpoint, use an IP address, or share access/refresh tokens.
3. An authorized ChatGPT workspace administrator/developer opens **Plugins → + → Add custom MCP server**, creates a Linket connection with the approved HTTPS endpoint and configures OAuth. Their workspace's UI may use a legacy Apps creation flow.
4. In the Linket authorization prompt, sign in as the intended creator and **explicitly approve exactly one workspace**. The client must use authorization-code OAuth with PKCE S256. Consent is not reused silently.
5. In ChatGPT, verify the approved app lists only Linket's read-only reporting tools. Use sales summaries, trends, sanitized order insights/list and product performance. **No write tools or forecast tool** are enabled in V1.
6. In Linket, review authorized connections and choose **Disconnect → Disconnect connection** to revoke one grant and its bound access/refresh tokens. You can do so after a Pro expiry or a global feature shutdown.

## Messages shown in Linket

- **New ChatGPT connections are not available yet:** the public feature gates or canonical HTTPS configuration are not ready.
- **Verified Linket Pro is required:** no currently verified Pro payment/term qualifies. Merely claiming a Pro tier does not grant access.
- **Create or join a Linket workspace:** the authenticated creator does not belong to an accessible workspace.
- **Linket administrator must approve client:** no approved, public, restricted creator MCP OAuth client is registered.
- **Connect from ChatGPT:** eligible creator, workspace, canonical HTTPS configuration and approved OAuth client were found. Actual server operation and ChatGPT workspace permissions still require verification.

## Isolated staging acceptance — requires an actual ChatGPT connection

**Not a production release instruction.** Never use the production URL, database, users, signing keys, APP_KEY, Verify.et credentials, webhook endpoints, or creator receiving accounts for this test. Stage on a separate HTTPS origin with a guarded synthetic database and generated staging-only OAuth keys. Keep production AI/OAuth flags OFF.

1. The staging operator verifies the HTTPS issuer and exact `/mcp` resource, OAuth discovery, PKCE S256, `token_endpoint_auth_methods_supported: ["none"]`, and an unauthenticated `401` bearer challenge. Run the **credential-free** preflight from `docs/linket-ai-chatgpt-staging-acceptance.md`. Do not send staging secrets into GitHub or chat.
2. In the staging-only Passport client registry, create **one** approved public UUID-based `creator_mcp_users` OAuth client, with only authorization-code and refresh-token grants, no client secret, and **exactly** the callback URI shown in ChatGPT's connection management page. Linket does **not** support CIMD or dynamic client registration. Because Linket does not currently advertise RFC 9207 callback issuer identification, **do not assume the stable ChatGPT callback URI**; use the displayed callback-ID-specific URI.
3. An authorized ChatGPT tester creates a **private draft** custom MCP plugin, configures a **predefined/registered public OAuth client** with that staging client ID and `none` token authentication, and starts linking. If the setup UI cannot accept that client registration mode or the required callback, record the exact blocker; do not widen Linket's client registration policy as a workaround.
4. Sign in as a **synthetic verified-Pro creator**, approve precisely one synthetic workspace, discover exactly five read-only tools, exercise a sanitized report, verify refresh behavior, revoke the grant in Linket, and confirm subsequent access fails. Never connect real buyers or production payment data.
5. Capture only nonsecret evidence: UTC time, staging origin, test client identifier, redacted request/response status, tool names, retry/revocation outcomes, Git SHA and test-run links. An independent AppSec reviewer must examine the results and sign off separately before any release proposal.

Detailed checklist: [Staging ChatGPT acceptance and AppSec handoff](linket-ai-chatgpt-staging-acceptance.md).

## Safety and troubleshooting

- Linket sends **aggregated, sanitized, read-only** reporting results: no buyer email/name, receiving-account number, payment receipt/reference, download URL or fulfillment action.
- Every MCP request is expected to use cryptographically validated bearer authentication and recheck the exact consent, creator, OAuth client, workspace membership, Verify.et-backed Pro term and revocation.
- A connection's stored *active* label describes historical consent, not proof that Pro entitlement or server access remains active today.
- If a prompt fails, refresh the Linket panel; check client registration, active Pro, workspace membership and operator-managed HTTPS/keys without pasting tokens or private-key material into support messages.
- Rotation or disconnect can require ChatGPT users to sign in and consent again. A code rollback does not restore prior signing keys.

Official ChatGPT guidance (reviewed November 4, 2026): https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
