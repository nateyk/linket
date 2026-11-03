# Linket AI V1 — Issue #83 Readiness Assessment and Threat Model

> **Status:** Documentation review / technical baseline; **implementation and production readiness: NO-GO (insufficient evidence + blockers).**  
> **Repository baseline:** `nateyk/linket`, `main` commit `bd1420b069851c36b1bf3772a8a4c343555bf96f` (2026-11-03 03:40 UTC).  
> **Scope:** Only GitHub repository and public official documentation were inspected. No production server access, DB/test execution, key creation, secrets, application code or settings changes.  
> **Approved architecture:** [Notion Q1–Q10 specification](https://app.notion.com/p/40dbae7367ac814c8113f936f729c6ad) · [Issue #83](https://github.com/nateyk/linket/issues/83) · [Epic #82](https://github.com/nateyk/linket/issues/82).

## Executive decision

**Architecture feasible in principle; deployment NOT approved.** Laravel 13 + the locked Laravel AI SDK and MCP packages can underpin the product, but ChatGPT-compatible OAuth is not installed, live hosting capability is unverified, the current cPanel preflight has unsafe/disputed checks, and OpenAI retention settings need explicit data minimization. The current `main` CI passed; it does **not** prove OAuth readiness or host configuration.

### Evidence and verification status

| Domain | Source / observation | Verdict |
| --- | --- | --- |
| Laravel | `composer.lock`: `laravel/framework v13.38.0`; `composer.json` requires PHP `>=8.3` and Laravel `^13.0` | Confirmed from repository |
| Laravel AI | `composer.lock`: `laravel/ai v1.3.0`; `config/ai.php` has OpenAI and Gemini provider definitions | Dependency available; creator assistant not proven implemented |
| Laravel MCP | `composer.lock`: `laravel/mcp v1.1.1`; no runtime `Mcp::web` registration found in targeted source search (examples exist in skills) | Package present; working remote server unverified |
| OAuth | `laravel/passport` absent from `composer.json` and `composer.lock`; current `User` imports `Laravel\\Sanctum\\HasApiTokens` | **BLOCKER** for package's built-in MCP OAuth |
| CI | [2026-11-03 main push run 41573563141](https://github.com/nateyk/linket/actions/runs/41573563141): Verify (PHP 8.4 + Node 24 + MySQL 8.0) completed **success** on exact baseline SHA | Confirmed historical run, not newly executed tests |
| GitHub main protection | GitHub branch API returned `protected: false` on `main` | **Governance gap**; workflow protections alone can be bypassed |
| CI lint | `.github/workflows/ci.yml` has `oxlint` ending with `|| echo` instead of strict exit | **Nonblocking lint**; harden for AI-related changes |
| OpenAI provider | `config/ai.php` line for OpenAI: `'store' => env('OPENAI_STORE', true)` (Azure same default) | **Privacy risk / requires decision**; does not prove how production env is set |
| Hosting | cPanel deployment docs/scripts present; runtime network or production SSH evidence not supplied | **BLOCKER** to production compatibility signoff |
| Server discovery | `deploy/cpanel-discovery.sh` claims read-only, but its checks write/delete in `/tmp` and `~/linket/shared`, and DocumentRoot probe is `true` | **Preflight test design bug**; do not run unreviewed on production |
| Deployment docs | `docs/deployment-architecture.md` says Laravel 12 / PHP >=8.2; script enforces >=8.2 | **Documentation/preflight stale** against actual Laravel 13 and PHP >=8.3 |
| Test isolation | `tests/bootstrap.php` has a guard to reject unsafe resolved database targets before test execution | Guard present; test suite has not been re-executed in this assessment |
| Existing AI | `modules/ai/src/AiServiceProvider.php` registers helpdesk AI routes, models and ingestion | Isolate creator AI so it cannot disrupt support chat |
| Existing MCP plan | `docs/superpowers/specs/2026-08-15-linket-mcp-server-design.md` specifies standalone TypeScript stdio + Sanctum token | Historical local-client design; **not** ChatGPT HTTPS OAuth integration |

## 1. OAuth and Laravel Passport readiness

### Confirmed design

- Official Laravel MCP package implements web/HTTP MCP and emits OAuth metadata routes when configured; its server-side OAuth uses **Laravel Passport**. `Mcp::oauthRoutes()` registers well-known endpoints and can enable dynamic OAuth client registration, exposing the broad `mcp:use` scope. Without Passport, its registration implementation can error.
- Official Laravel 13 Passport documentation describes authorization-code + PKCE, public OAuth clients, token management and authorization approval UI. The Passport 13 upgrade notes require Laravel >=11.35; Laravel 13 is within that minimum, but **exact composer dependency resolution against this lockfile remains untested**.
- OpenAI ChatGPT Plugins OAuth requirements include HTTPS resource metadata, authorization-server metadata, S256 PKCE, exact redirect URI checks, `resource` parameter propagation, issuer/audience/scope checks, and CIMD/DCR/predefined-client handling. Do **not** assume `mcp:use` alone provides Linket fine-grained read-only permissions.

### Required design before code

1. Install and test compatible Passport on an isolated dev branch and disposable DB in PR-06. Do not replace the existing Laravel Sanctum user trait or default frontend API guard blindly. `App\\Models\\User` already uses Sanctum `HasApiTokens`, whose trait method surface may conflict with Passport. Design a dedicated MCP guard/OAuth subject adapter and test coexistence.
2. Register a separate HTTPS MCP endpoint with Passport protection and explicit per-tool creator/workspace/Pro guards. Never pass an unauthenticated `ActiveWorkspace` fallback through to MCP context.
3. Bind tokens and consent to **one authorized workspace** plus user and known client. Verify user eligibility on every request; revocation and Pro expiration fail closed. Avoid relying solely on OAuth scope or ChatGPT's `readOnlyHint` annotation.
4. Validate `resource` audience/issuer, S256, state and client redirect registration; test DCR abuse limits, client metadata URLs and ID registration without SSRF or unlimited client creation. Confirm metadata paths and HTTP methods from the **installed** MCP version, not a generic snippet.
5. Consent UI must explicitly enumerate read-only capabilities; no write routes, raw SQL, secrets, buyer identifiers or unauthorized product files may be exposed.

**Acceptance evidence:** dependency resolution output, test-only migrated OAuth tables, PKCE positive/negative flow, refresh/revoke tests, dual-creator/workspace access-control matrix, tool-level entitlement failure on Pro expiry, no regression of Sanctum/Fortify/Telegram.

## 2. Existing Laravel AI integration

- Locked package `laravel/ai v1.3.0` has structured-output agents and fakes in its documented API; reuse for creator **suggestion-only** writing. No production API request is required to test schemas and fail-closed behavior.
- Existing `modules/ai` powers support/helpdesk agents; keep namespace, routes, settings, queue jobs, permissions and records separate.
- Never connect creator AI to Verify.et request submission, settlement matching, payment status updates, product fulfillment, receiving account activation, private purchases or entitlement methods.
- Produce bounded schema-validated drafts. On actual creator confirmation, call existing validated editor/mutation flow and preserve pending review snapshots.
- OpenAI API key was neither created nor inspected; central Admin-managed secret management is a **future work package**, not a requirement for Issue #83's read-only audit.

## 3. Privacy and OpenAI provider controls

- The repository defaults OpenAI provider `store` to `true` when `OPENAI_STORE` is not set. This is a *default risk*, not proof that production presently stores responses.
- OpenAI API data is not used for model training by default without opt-in; this does **not** imply zero storage. Official data-controls documentation says Responses API application state is retained for at least 30 days when `store=true` (also the endpoint default), while abuse-monitoring logs have a default retention window. Exact provider/product and account exceptions require review.
- Before first creator AI requests: explicitly set a privacy-minimizing request policy such as `store=false` **where supported**, verify Laravel AI SDK passes it through for the chosen OpenAI route, minimize creator context sent, avoid buyer PII and bank/payment details, and document retention, log redaction and consent. Audit other provider defaults including Azure.
- Build strict field allowlists at the business-service boundary. Never send raw controller Eloquent resources to AI or MCP.
- ChatGPT MCP tools that only query Laravel should **not** call OpenAI API with Linket credentials; separate server infrastructure rate limits from Free 10/Pro 100 monthly in-dashboard AI generation allowances.

Official references:
- [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI Plugins MCP OAuth](https://developers.openai.com/plugins/build/auth)
- [Laravel 13 Passport](https://laravel.com/framework/docs/13.x/passport)
- [Laravel MCP](https://github.com/laravel/mcp)
- [Laravel AI SDK](https://github.com/laravel/ai)

## 4. cPanel compatibility and preflight safety

**Not verified on host.** Confirm with host/operator by an independently reviewed **non-mutating** capability inventory before attempting MCP deployment:

- Web PHP and CLI PHP both >=8.3 (prefer CI's 8.4), required extensions and consistent executable path.
- HTTPS TLS terminates correctly, stable HTTPS URL, proxy trust limited to known IP ranges, public well-known OAuth metadata endpoints and POST MCP route are routable; no Basic Auth/CDN/WAF redirect loop on metadata.
- Valid secure document root to `current/public`, PHP entrypoint and rewrite rules permit `/.well-known/oauth-*` and MCP endpoints.
- Session persistence through OAuth browser redirect, CSRF protection, clock sync, correct request scheme behind reverse proxy.
- Database migrations/backups, disk permissions and rollback with zero impact on Verify.et webhook receipt; isolation of private files.
- Working Redis/Horizon or safe equivalent for optional queued AI work. RPC-style MCP reads should have bounded response/query times and not depend on long-running workers.
- Non-production staging endpoint exposed over HTTPS for testing metadata, PKCE and ChatGPT setup. Never run real payment verification in staging.

**Unsafe discovery-script findings requiring a separate fix:**
- Its header says read-only but the symlink test deletes and creates `/tmp/linket-*`; these names could conflict with another user's files on shared hosts.
- Another check writes to `~/linket/shared` and then deletes a test file.
- Required DocumentRoot check has verification expression `true`, so reports PASS without establishing the property.
- `PHP version >=8.2` gate will falsely PASS PHP 8.2, which is unsupported by current Laravel 13 composer requirements.
- Supervisor test can be satisfied via `flock` even without proving an active worker.
**Action:** do not execute `deploy/cpanel-discovery.sh` on production in its present form. Replace with genuinely non-mutating probes or require explicit operator consent for scratch tests; mark untestable checks UNKNOWN/manual rather than PASS. Update version floor to PHP >=8.3.

**Access limitations:** no cPanel credentials, authenticated SSH session or actual host runtime provided. One attempt to resolve the public host from the inspection environment returned DNS resolution failure; that is not proof of site outage, host misconfiguration or lack of external reachability.

## 5. CI and release controls

- The main push CI for the exact checked SHA succeeded on 2026-11-03: [workflow run #41573563141](https://github.com/nateyk/linket/actions/runs/41573563141). This is an *existing GitHub run*, not a new test invocation.
- The workflow invokes `php artisan test --compact`, TS typecheck, `npm test`, PHP cache checks, Composer/npm audits and build verification; no dedicated MCP OAuth tests existed at inspection baseline.
- Lint step is nonblocking. Add a strict required CI gate for changed AI/MCP/auth files and negative privacy/security tests before feature releases.
- Branch API currently reports `main protected:false`. [Release control runbook](https://github.com/nateyk/linket/blob/main/docs/release-control.md) warns that GitHub plan restrictions may prevent strict protection. Require an independent operational sign-off and avoid direct-to-main pushes in the meantime.
- Existing production CD workflow requires workflow_dispatch and a typed confirmation. Never trigger it as part of readiness testing.
- Do not claim fresh local tests run from this review; no writable local clone/runtime was available in this GitHub connector workflow.

## 6. Threat model and abuse cases

| Risk | Severity | Scenario | Security acceptance test |
| --- | --- | --- | --- |
| OAuth confused deputy / wrong audience | Critical | Access token minted for another resource accepted by MCP | Reject wrong `aud`, issuer, resource, scope, client |
| Cross-tenant order disclosure | Critical | ChatGPT asks for a different creator's orders via IDs/filters | 403/404, no leaked metadata, explicit workspace binding |
| Free plan / expired Pro bypass | High | Stale token continues read access after billing expiry | Permission rechecked per tool call; immediate revocation effective |
| Legacy Sanctum/Passport clash | High | Changing auth user trait or default guard breaks storefront, user API or Telegram | Regression on first-party tokens and session login |
| Dynamic OAuth registration abuse | High | Unbounded registration, malicious metadata/redirect URI, SSRF | Allowlist/validation, rate limits, audit |
| Prompt injection and data exfiltration | High | Creator product description embeds instructions; model is asked for buyer secrets | Fixed-schema DTOs; deny secret fields; injection-as-data tests |
| AI data retention misconfigured | High | Sensitive creator/business data stored unintentionally in Responses application state | Verified `store=false` transport, field minimization, policy signed off |
| Hosting preflight false positive | High | PHP 8.2 and unchecked DocumentRoot marked ready | Version and docroot checks correct, failing configuration fails closed |
| AI outage impacts checkout | High | Provider hang blocks purchase/webhook workers | Independent timeouts and flags; payment/webhook E2E unaffected |
| Provider cost abuse | Medium | Concurrent long generations bypass quotas | Atomic reservations, per-model limits, kill switch and budget tests |
| Release bypass | High | Unprotected main merged/deployed without review | Human review/CI/release approval evidence required |

## 7. Release checklist and decision

- [x] Locked composer version and packages inspected.
- [x] Existing AI module, account auth and historical MCP spec inspected.
- [x] Current main CI result checked.
- [x] Current branch protection status checked.
- [x] API privacy default and OpenAI documentation reviewed.
- [x] cPanel readiness evidence gaps and unsafe preflight calls identified.
- [ ] Passport dependency resolves and OAuth flow passes isolated integration tests.
- [ ] Compatible dual Sanctum + Passport guard and token lifecycle designed/tested.
- [ ] Remote OAuth/MCP metadata, S256, resource binding, audience/issuer, dynamic registration and revocation exercised.
- [ ] cPanel **actual** PHP, TLS, DocumentRoot, rewrite, sessions, queue and staging integration proven.
- [ ] Deployment/preflight script corrected (safe to inspect, version floor corrected, unknown != PASS).
- [ ] Provider retention configuration and minimization policy implemented/verified.
- [ ] Strict AI/MCP security CI and Verify.et/fulfillment regression tests green.
- [ ] GitHub branch protection or equivalent reviewed enforcement signed off.
- [ ] Explicit owner GO/NO-GO and production approval after evidence.

**Decision:** **NO-GO for implementation rollout and any production MCP/AI enablement.** This does not block safe, independently reviewed development of PR-02–PR-09 in isolated worktrees after architecture dependencies are reconciled. Issue #83 documentation can be reviewed now, but its *operational readiness gate* remains open.

## 8. Immediate next work

1. Review this report and the documentation-only draft PR; do not merge without approval.
2. Create/track separate correction task for `deploy/cpanel-discovery.sh` and stale deployment docs, or include safely in the next governed infrastructure PR.
3. Perform a **test-only** dependency resolution and API auth compatibility spike using Passport 13 with existing Sanctum auth, under disposable database and mock users.
4. Request operator-provided **non-secret** cPanel readiness evidence (PHP CLI+web version, HTTPS metadata routing, safe DocumentRoot and worker capacity).
5. Confirm account-level OpenAI retention and model/SDK behavior before sending business data; no key setup required until AI writing implementation.
6. Only after these checks should Issue #83 become Done and downstream OAuth implementation proceed.

## 9. Documentation and validation provenance

This is a repository/static-documentation audit with an externally observed successful existing CI run. It does not certify live cPanel security, runtime compatibility, OAuth implementation, production privacy posture or end-to-end ChatGPT connection. All unknowns remain unknown rather than inferred.
