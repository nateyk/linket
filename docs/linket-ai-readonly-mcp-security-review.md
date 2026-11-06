# Linket AI V1 — Read-only MCP boundary review (source inspection)

**Date:** 2026-11-04. **Branch:** `feat/linket-ai-v1`. **Status:** Engineering source review, **not** independent AppSec signoff or production verification. Production release **NO-GO**.

## Checked security boundaries

| Control | Source evidence | Assessment |
| --- | --- | --- |
| HTTP/transport | `CreatorMcpOAuthEarlyTransportGate`, `CreatorMcpOAuthRemoteSecurity`, `routes/creator-ai-mcp-oauth.php` | Default-off flags, canonical HTTPS host/resource, no session/cookie/query bearer, length limit, bearer-only, no unsupported method on /mcp. Reinspect trusted proxies in actual deployment. |
| Cryptographic bearer | `CreatorMcpPassportBearerAccess` | Passport/League `ResourceServer` signature, expiry and revocation verification, followed by strict signed issuer/audience/scope/sub/jti and configured resource checks. |
| Live access | `CreatorMcpPassportTokenBindings`, `CreatorMcpConnectionRegistry`, `CreatorAiAccess` | Bound token ID/client/grant/resource and unrevoked Passport records, current owner and workspace membership plus verified Verify.et-backed Pro entitlement checked for each request/invocation. |
| Consent and refresh | `CreatorMcpOAuthAuthorizationPolicy`, `CreatorMcpOAuthConsentFlow`, HTTP consent/token controllers | Registered public client, restricted grant types, exact HTTPS redirect, PKCE S256, one-use browser CSRF/nonce consent; real grant and client rechecked at token exchange/refresh. |
| Read-only tools | `CreatorMcpReadOnlyServer`, `CreatorMcpReadOnlyTool`, `CreatorMcpToolGateway`, `CreatorMcpReportFacade` | Only five read-only reports registered; no model-driven identity/workspace or write operation, bounded date/pagination, sanitized output. Forecast intentionally gated. |
| Creator management | `CreatorMcpConnectionsController`, `ChatGptIntegrationPanel` | Only creator-owned active/history grants listed; individual DELETE revokes grant and bound OAuth access/refresh; no creator-issued OAuth credentials. Readiness URL shown only after verified Pro, owned workspace, all flags, canonical resource and approved client. |

## Existing security regression evidence

Refer to `tests/Feature/CreatorMcpOAuthEndToEndTest.php`, `CreatorMcpOAuthConcurrencyTest.php`, `CreatorMcpToolGatewayTest.php`, `CreatorAiMcpConnectionsTest.php`, `CreatorMcpOAuthAuthorizationPolicyTest.php` and HTTP/Passport tests. Prior GitHub CI on commit `57899f27` passed; **new eligibility changes are not verified until CI on their exact commit completes**. Tests should cover two creators/clients, invalid bearer and foreign workspace, revocation/expiry, PKCE/refresh rotation concurrency, buyer/settlement privacy, tool bounds, disabled flags and startup failure.

## Open findings and review gates

1. **Operator environment UNKNOWN:** cPanel CLI/FPM/queue UID/ACL compatibility, key placement, issuer TLS/trusted proxies, media serving and real rollback require approved read-only evidence.
2. **Historical artifact exposure UNDETERMINED:** vulnerable recursive permissions previously existed; no proof of key theft or of historical archives containing real keys. A separately authorized confidential inventory/review and a rotation decision are required.
3. **OAuth client integration unproven end to end with ChatGPT:** confirm current ChatGPT workspace permissions, pre-registered approved OAuth client, redirect URI and refresh semantics in staging. Do not enable dynamic registration, broader OAuth scope or production flags for a smoke test.
4. **Independent AppSec still required:** a separate reviewer must check origin/header/trusted-proxy handling, PKCE/client/consent/token binding, privacy allowlists, rate limits, refresh races and revocation, dependency versions and feature gates, and record findings with remediation and dated signoff.
5. **Release control:** require fresh green CI on exact candidate SHA, clean PR mergeability, verified operator evidence and explicit owner GO. Passing tests alone is not permission to merge or deploy.

**Decision: NO-GO.** This document is a traceable engineering review, not certification.
