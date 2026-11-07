# Linket AI V1 — ChatGPT-to-staging acceptance and independent security handoff

**Status:** Staging execution checklist, **not** evidence that a real ChatGPT connection has occurred. Feature branch only; release NO-GO until a separate reviewer records approval.

## Security isolation prerequisites

- Separate HTTPS staging origin, database, queue/cache, session storage, encryption key and Passport signing keys. Do not use the live Linket domain or any production creator/payment/Verify.et credentials.
- Staging-only synthetic verified-Pro creators, two workspace fixtures and pre-populated synthetic paid sales. Ensure Verify.et mock mode cannot run under a production environment.
- Release flags remain OFF in production. Only the isolated staging owner may turn on the separate `CREATOR_AI_*` read-only/OAuth gates after confirming an HTTPS trusted-proxy configuration and a shared lock-capable session/cache store.
- Record the deployed exact Git SHA and full-green CI URL. Never paste bearer, refresh, authorization codes, private keys, or provider receipts into a ticket.

## Stage 1 — credential-free remote preflight

From an authorized workstation, with an **actual non-production** host:

```bash
LINKET_STAGING_HOST=staging.example.com bash scripts/staging/check-chatgpt-oauth.sh https://staging.example.com/mcp
```

The script validates HTTPS metadata, issuer/resource equality, PKCE S256, exact predefined public-client mode (no DCR/CIMD), and a `401` challenge without sending a token. If there is no deployed staging origin, mark this **BLOCKED**; do not substitute production.

## Stage 2 — actual ChatGPT OAuth UI (human-in-the-loop)

1. Authorized workspace builder uses **ChatGPT Plugins → + → Add custom MCP server** and creates a **private test connection** pointing to `https://<actual-staging-host>/mcp`. Verify current workspace policies permit this.
2. Configure a **predefined / provided** OAuth client using a registered, staging-only UUID client ID and token method `none`. This is intentionally Linket's only client-registration policy; it has no registration endpoint. If the UI only supports CIMD or DCR, capture the incompatibility and stop.
3. Obtain **the exact callback URI shown by ChatGPT** for this test connection and register it verbatim for that UUID client in the staging-only Passport client registry. Without RFC 9207 `iss` response identification, assume a callback-ID-specific URL rather than the stable callback. Do not guess redirect IDs.
4. Start authorization from ChatGPT; sign in as a synthetic creator, ensure the consent page identifies the expected client and single workspace, and grant access. Capture a successful code exchange and OAuth token issuance by **status and timestamps only**.
5. Confirm `tools/list` exposes exactly five `linket.*` report tools, each with `securitySchemes: [{type: "oauth2", scopes: ["mcp:use"]}]`. Confirm there are no write tools, forecast tools, payment instructions, download links or raw buyer/receiving-account fields.
6. Run a synthetic report with one creator, verify no second creator/workspace data appears, allow token refresh, then disconnect the consent in Linket and confirm both the access token and refresh token stop working.
7. Check negative cases: missing/forged bearer, wrong client, altered redirect, incorrect PKCE verifier, foreign workspace, expired verified-Pro entitlement, and disabled OAuth feature gates. Verify the production environment remained unchanged.

## Stage 3 — independent AppSec verdict

A **different reviewer** must examine the PR code and staging evidence for: HTTPS/trusted proxy handling; client callback and OAuth mix-up protection; PKCE/state/CSRF and nonce replay; token issuance/refresh races and revocation; signed issuer/audience/scope and Pro checks; two-tenant isolation; redaction/rate limits; public Git history and historical `APP_KEY`; cPanel private-key permissions, queue/worker access and rollback.

Record for each finding: severity, evidence (redacted), location, exploitation conditions, corrective action, regression test, residual risk and reviewer. Reviewer must explicitly record **GO / NO-GO / INSUFFICIENT EVIDENCE**, date, exact SHA and any unresolved blockers. A green CI run is not AppSec approval.

## Evidence matrix

| Acceptance gate | Required evidence | Starting status |
| --- | --- | --- |
| Synthetic Laravel OAuth/MCP | Exact HEAD green CI | Verified on earlier SHA; recheck latest commit |
| Actual isolated staging deployment | HTTPS endpoint and runtime isolation attestation | Not verified |
| Predefined client + exact ChatGPT callback | Redacted screenshot/config review | Not verified |
| Real ChatGPT link + five sanitized tools | Connected test-plugin and tool receipts | Not performed |
| Refresh, creator isolation and disconnect | Redacted black-box results | Not performed live |
| Independent AppSec and cPanel review | Separate review signed for exact SHA | Awaiting |
| Production merge/deploy | Explicit owner approval after all above | NO-GO |

Official: https://developers.openai.com/plugins/build/auth and https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
