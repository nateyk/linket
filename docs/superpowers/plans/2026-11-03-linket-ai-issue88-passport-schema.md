# Issue #88 — Passport 13.7.6 OAuth storage foundation (development only)

**Branch:** `feat/linket-ai-v1` — WIP integration PR #94. **Release:** NO-GO. Do not merge, deploy, enable OAuth, or provision production keys without an independent security review and explicit approval.

## Scope and implementation

1. Commit the five unchanged upstream Laravel Passport **v13.7.6** migration definitions from `laravel/passport/database/migrations`, including device codes. This version is the branch's pinned, audited version. Do not copy migration schemas from a newer Passport release without confirming compatibility.
2. Test that MySQL migrations create auth codes, access tokens, refresh tokens, clients (including the `provider` field), and device codes with the required revocation/expiry columns.
3. Preserve `CreatorMcpOAuthServiceProvider::register()` with `Passport::ignoreRoutes()`. The separate `CREATOR_AI_MCP_OAUTH_ENABLED` deployment flag remains OFF by default, and no OAuth authorization, token, client registration, discovery, or MCP HTTP routes are published.
4. Keep `App\\Models\\User` on Sanctum; `PassportCreatorIdentity` is exclusively the OAuth provider. Existing creator grant registry remains metadata-only and cannot issue credentials.

## Validation

CI must pass `php artisan migrate --force` against a disposable MySQL test database followed by `php artisan test --compact`, including `CreatorMcpPassportSchemaTest` and `CreatorMcpPassportIsolationTest`. Full suite, route cache, Composer audit, TypeScript, Vitest and build gates must remain green. Use the job logs for numerical evidence; do not assume green until both push and PR checks finish on the *same* new head SHA.

## Outstanding work (NOT implemented by this commit)

- Secure creation and rotation of Passport signing keys in a non-public server path (never commit keys, generate them in CI, or silently create keys at runtime). Validate cPanel permissions, HTTPS and trusted-proxy behavior.
- A restricted, audited public OAuth client registration process; exact redirect URI and state checks; authorization-code **PKCE S256** enforcement (no `plain` fallback); workspace-specific consent for a verified Pro creator.
- Issuer/resource audience and scope validation, resource-specific discovery, 401 challenges, access/refresh rotation and revocation tied to creator grants, and connection lifecycle tests with two creators.
- Remote HTTPS MCP integration, read-only gateway authorization on *every* request, ChatGPT setup UI, provider fakes and independent security review.

## Operational safety

Installing the migrations does not issue tokens. No production migration or key-generation action is authorized by this WIP commit. Production migration would require a separate approved deployment plan, backup and rollback procedure. Do not drop OAuth token tables after tokens have been issued; first disable the feature and revoke active credentials under a reviewed migration/incident plan.

**References:** [Passport 13.x documentation](https://laravel.com/docs/13.x/passport), [Issue #88](https://github.com/nateyk/linket/issues/88), [PR #94](https://github.com/nateyk/linket/pull/94).
