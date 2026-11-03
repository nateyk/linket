# Linket AI V1 Issue #83 Readiness Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obtain the evidence required to sign off Linket AI/MCP architecture and deployment readiness while preserving production and financial security boundaries.

**Architecture:** This is a **readiness and safety** plan, not permission to implement the Linket AI product. First correct false-positive preflight checks and stale version requirements; next run isolated Passport + Sanctum OAuth proof, validate cPanel host requirements and data-retention configuration, and then record an explicit GO/NO-GO. All changes must be reviewed and nonproduction until separately approved.

**Tech Stack:** Laravel 13.38, PHP >=8.3 (CI PHP 8.4), Laravel MCP 1.1.1, Laravel AI SDK 1.3, Sanctum 4, proposed Passport 13, MySQL 8.0, cPanel, GitHub Actions.

**Spec:** [Linket AI Q1-Q10 decisions](https://app.notion.com/p/40dbae7367ac814c8113f936f729c6ad), [Issue #83 readiness audit](../specs/2026-11-03-linket-ai-issue83-readiness-audit.md), [GitHub #83](https://github.com/nateyk/linket/issues/83).

## Global Constraints

- Creator ChatGPT MCP has six **read-only** reporting tools; no payments, receiving accounts, user secrets, fulfillment or arbitrary SQL.
- Free 10/Pro 100 monthly AI generations and separate MCP infrastructure rate limits; all limits server-side and administrator-configurable.
- No production server commands or migrations, no live provider requests, no created OpenAI API keys in this work.
- Preserve Sanctum/Fortify, existing helpdesk AI, Verify.et, direct creator payment, Pro activation and private paid-content download invariants.
- Always use isolated guarded `db_test` or synthetic CI databases and fake model/payment providers.
- Branch/PR review and user-approved production changes only; never merge or deploy automatically.
- Historical old docs are not authority over `composer.json`/`composer.lock` main HEAD.

## Review Focus

1. PHP 8.2 on cPanel: version check must fail as unsupported by current Laravel 13; test in standalone shell/script test where feasible.
2. DocumentRoot pointing to repo root: preflight must report UNKNOWN/FAIL, not PASS from hardcoded `true`.
3. Existing user session or Sanctum token with new Passport installed: login and API access remain functional; add regression tests for each.
4. OAuth public client with wrong `resource`, PKCE verifier or workspace: access refused and no order metadata returned.
5. OpenAI response storage inadvertently enabled or unchecked: no live creator request permitted; test `store=false` transport with fake model.

---

### Task 1: Verify and freeze the baseline evidence

**Files:**
- Read: `composer.json`, `composer.lock`, `.github/workflows/ci.yml`, `config/ai.php`, `app/Models/User.php`.
- Modify: `docs/superpowers/specs/2026-11-03-linket-ai-issue83-readiness-audit.md` only if evidence changes.

**Interfaces:**
- Consumes: locked package versions, current main SHA, observable CI run metadata.
- Produces: evidence matrix and risk register in the audit.

- [ ] **Step 1:** Record HEAD SHA and locked `laravel/framework`, `laravel/ai`, `laravel/mcp`, `laravel/passport` versions, without installing anything.
- [ ] **Step 2:** Check most recent completed main-push CI Verify workflow for the same SHA; record run URL, result and whether any security/lint gates are nonblocking.
- [ ] **Step 3:** Check branch protection and operational release-gate status without modifying branch settings.
- [ ] **Step 4:** Annotate evidence, limitations and release blockers in the audit; link to Issue #83.

**Verification:** Re-read the audit and source files; every claim traces to a path/official document or is marked unverified.

### Task 2: Make cPanel discovery genuinely safe and current (separate reviewed PR)

**Files:**
- Modify: `deploy/cpanel-discovery.sh`
- Modify: `docs/deployment-architecture.md`
- Test: `scripts/tests/test-cpanel-discovery.sh` (proposed; inspect existing tests before naming)

**Interfaces:**
- Consumes: current PHP minimum `>=8.3`, cPanel operator constraints.
- Produces: nonmutating capability inventory with explicit PASS/FAIL/UNKNOWN and no false positive DocumentRoot status.

- [ ] **Step 1: Write failing shell tests** using fake `php` output for PHP 8.2 and 8.3; assert 8.2 fails; test DocumentRoot missing evidence becomes UNKNOWN/FAIL.
- [ ] **Step 2:** Run tests and confirm they fail on existing script behavior. Use a disposable mock filesystem, not production.
- [ ] **Step 3:** Remove automatic writes/deletes in `/tmp/linket-*` and `~/linket/shared`; replace with non-mutating observations or operator-attested manual capability probes.
- [ ] **Step 4:** Update all readme/version/preflight references in deployment docs to Laravel 13, PHP >=8.3, CI PHP 8.4. Do not rewrite unrelated old sections.
- [ ] **Step 5:** Run shell tests, `bash -n deploy/cpanel-discovery.sh` and `git diff --check`; confirm zero failing tests.
- [ ] **Step 6:** Commit in isolated branch and open separate draft PR with a precise security-review checklist. **Do not merge or deploy.**

### Task 3: Test Passport 13 + MCP OAuth coexistence (isolated spike; subsequent PR #88)

**Files:**
- Modify (on separate sandbox branch only): `composer.json`, `composer.lock`
- Candidate new: `app/Mcp/Auth/CreatorMcpAuthorization.php` (actual path after repository convention review)
- Test: `tests/Feature/CreatorMcpOAuthCompatibilityTest.php` (proposed)
- Reference: `app/Models/User.php`, `routes/api.php`, `common/foundation/src/Core/Application.php`.

**Interfaces:**
- Consumes: current Sanctum `HasApiTokens`, Passport public-client PKCE and Laravel MCP OAuth discovery.
- Produces: documented answer to whether Passport coexists safely with Linket API and web sessions; prototype OAuth service only for review.

- [ ] **Step 1:** In isolated disposable environment, resolve `laravel/passport:^13` with `composer update` limited to necessary packages; record conflicts, do not edit main.
- [ ] **Step 2:** Write failing tests for existing Sanctum token/session behavior plus public client PKCE S256 and resource audience/workspace/Pro assertions.
- [ ] **Step 3:** Run tests against `db_test` and confirm failing cases before minimal isolated implementation; avoid replacing the user trait without compatibility evidence.
- [ ] **Step 4:** Implement minimal authorization adapter for explicitly linked MCP clients, with bounded read scopes and revoke behavior, then rerun tests.
- [ ] **Step 5:** Run full auth, payment, webhook, fulfilled-content and Pro regression suites with mocked providers, and record exact results.
- [ ] **Step 6:** Link a draft PR and evidence to Issue #88, not production. Record unresolved incompatibilities as blockers for #83.

### Task 4: Review actual cPanel capabilities without mutation

**Files:**
- Read: `docs/deployment-architecture.md`, corrected `deploy/cpanel-discovery.sh`, cPanel operator-provided redacted reports.
- Create: A dated, sanitized cPanel readiness evidence note linked from Issue #83 and Notion.

**Interfaces:**
- Consumes: non-secret host/operator evidence.
- Produces: PASS/FAIL/UNKNOWN table for HTTPS, PHP, worker, docroot, OAuth discovery routing, session persistence and backup.

- [ ] **Step 1:** Request non-secret web + CLI PHP versions, enabled extensions, current secure DocumentRoot, HTTPS reverse proxy, cron/Horizon or queue alternative, TLS routing and host clock evidence.
- [ ] **Step 2:** From authorized **staging only**, test well-known discovery paths, HTTP POST route and OAuth redirect/consent/session storage. Avoid unrelated paid endpoints.
- [ ] **Step 3:** Verify feature flag OFF does not affect Verify.et webhook requests, checkout or authorized downloads.
- [ ] **Step 4:** Record failures and unknowns; do not mark a missing server check PASS.

### Task 5: Provider storage, privacy and quota controls

**Files:**
- Read: `config/ai.php` and provider SDK request code for actual locked version.
- Candidate follow-on: `tests/Feature/CreatorAiProviderPrivacyTest.php`.
- Update: Issue #83 risk register / Notion; application changes only under separate PR #86.

**Interfaces:**
- Consumes: Q3 central admin provider policy, Q4 sanitized business DTOs, Q5 10/100 generation quota.
- Produces: explicit testable retention/storage policy and a list of prohibited source fields.

- [ ] **Step 1:** Confirm on provider and locked SDK whether `store=false` reaches OpenAI Responses endpoint, and whether other providers have equivalent policy controls.
- [ ] **Step 2:** Add fake transport test proving no raw buyer, bank, transaction, Verify.et webhook, private file or token fields appear in requests.
- [ ] **Step 3:** Specify log redaction, retention, data subject removal, budget cap and fallback behavior, not real credentials.
- [ ] **Step 4:** Record admin decisions and evidence; keep real provider traffic disabled until approval.

### Task 6: Final gate and handoff

**Files:** Issue #83, Notion project tracker and progress log; audit and plan documents.

- [ ] **Step 1:** Compare all five review-focus inputs against test evidence.
- [ ] **Step 2:** Confirm CI, protected/reviewed branch governance, OAuth/staging host proof, privacy controls and payment regressions.
- [ ] **Step 3:** Produce an explicit GO / NO-GO / INSUFFICIENT EVIDENCE decision per subsystem with source links.
- [ ] **Step 4:** Mark Issue #83 Done only when its **scope** is evidenced and reviewed. Do not confuse architecture approval with launch authorization.
- [ ] **Step 5:** Prepare next independently gated PR without merging or deploying; link Notion and GitHub evidence.

## Known blockers at plan creation (2026-11-03)

- Passport absent from locked dependencies; compatibility not executed.
- cPanel host not accessible via connected tools; live readiness cannot be certified.
- `deploy/cpanel-discovery.sh` contains mutating scratch checks, version floor PHP 8.2 and DocumentRoot unconditional pass.
- `docs/deployment-architecture.md` still documents Laravel 12/PHP 8.2.
- `OPENAI_STORE` default true; need explicit privacy decision and transport verification.
- `main` reports unprotected, `oxlint` is a nonblocking CI step.
- No fresh tests were run for this issue; existing same-SHA CI green is only baseline evidence.

**Final gate:** Until all relevant P0 blockers are resolved in separate reviewed PRs and actual operational evidence is collected, **release decision remains NO-GO**.
