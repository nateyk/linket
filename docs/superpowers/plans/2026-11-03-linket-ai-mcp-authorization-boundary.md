# MCP OAuth Authorization Preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate Linket MCP OAuth authorization requests against a registered Passport client and fail closed until the explicit consent/token/HTTP integration exists.

**Architecture:** A focused policy class reads the *trusted* Passport client row, validates exact OAuth request boundaries, and returns a minimal validated request descriptor. The class is internal only: public Passport routes stay disabled; future HTTP controllers must invoke this policy before relying on Passport validation and creator workspace consent.

**Tech Stack:** Laravel 13, PHP 8.4, Passport 13.7.6, MySQL 8, Pest 4.

**Spec:** `docs/superpowers/specs/2026-11-03-linket-ai-mcp-oauth-consent-design.md`; canonical Q1–Q10 on Notion and GitHub Issue #88.

## Global Constraints
- All three feature flags (creator AI, MCP, MCP OAuth) default OFF; never publish public OAuth or MCP routes in this task.
- Don't change App\\Models\\User Sanctum trait or trusted Verify.et payment/fulfillment behavior.
- Existing Passport clients are never trusted from query arguments alone; load them from oauth_clients.
- Only public, creator_mcp_users-bound authorization_code clients with S256, explicit redirect, exact resource and mcp:use may proceed.
- Keep PR #94 WIP and unmerged; no production deployments, keys or provider calls.

## Review Focus
1. Redirect differs only by slash, capitalization, query or port: must be refused, not normalized.
2. Legitimate client record revoked or confidential or created for another provider: must be refused.
3. PKCE challenge missing, plain method, encoded padding or non-base64url character: must be refused.
4. Resource points to another origin or HTTP, or lacks explicit configuration: must be refused.
5. Empty/short state, extra scopes, implicit response type or prompt=none: must be refused.

---

### Task 1: OAuth request validation boundary

**Files:**
- Create: `app/CreatorAi/Auth/CreatorMcpOAuthAuthorizationPolicy.php`
- Modify: `config/creator_ai.php`
- Create/Test: `tests/Feature/CreatorMcpOAuthAuthorizationPolicyTest.php`

**Interfaces:**
- Consumes: `Laravel\\Passport\\Client`, `config('creator_ai')`, Passport `oauth_clients` migrated storage.
- Produces: `CreatorMcpOAuthAuthorizationPolicy::validate(array $parameters): array` with validated `client_id, redirect_uri, resource, response_type, scope, state, code_challenge, code_challenge_method`.

- [ ] **Step 1:** Write tests using real oauth_clients rows and config fixtures for valid public client, every invalid boundary from Review Focus, default-off rejection and deliberately malformed input.
- [ ] **Step 2:** Execute the CI PHP test command against test-only commit. **Expected:** RED because `CreatorMcpOAuthAuthorizationPolicy` is absent (existing suites must not be mistaken for passing new code). Record run link and failure cause.
- [ ] **Step 3:** Implement policy and add default-null `CREATOR_AI_MCP_RESOURCE_URL` config; no route registrations. **Expected:** no public OAuth endpoints.
- [ ] **Step 4:** Execute entire PR CI pipeline on implementation SHA. **Expected:** 0 failed PHP/TS/Vitest/audits/build checks, verified push and PR runs on same SHA; confirm route-list guards remain off. If red, debug and repeat before claiming success.
- [ ] **Step 5:** Commit result and update GitHub Issue #88 and Notion PR-06 evidence with exact run IDs and unresolved security work. Keep release NO-GO.

## Review and handoff
This plan concerns one independently verifiable preflight slice, not a completed OAuth feature. No fresh reviewer tool is available in this connector-only session; author self-review cannot substitute for the independent OAuth security review required before merge or public route enablement.
