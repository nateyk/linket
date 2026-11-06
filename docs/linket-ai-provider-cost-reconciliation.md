# Linket AI PR-04 — provider aggregate cost reconciliation

## What this actually settles

This implementation transfers **provider-wide daily aggregate USD spend** into the global Linket AI provider-budget ledger and resolves covered creator generation reservations. It does **not** invent an OpenAI price for any single request. OpenAI's official Organization Costs API currently exposes daily aggregate charges, not request-level billed prices. See:

- https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs
- https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions

The existing read-only audit remains unchanged. The settlement path is strictly opt-in, operator-only, and disabled by default.

## Fail-closed evidence requirements

1. A dedicated OpenAI project, an independently provisioned organization Admin billing key, a known generation API key ID, and explicit operator attestation of exclusive project/key use.
2. A closed UTC day at least 72 hours old. Fetch and paginate the official project-scoped daily Costs and completions Usage results.
3. Fetch both sources again with grouping by project ID and API key ID. Every result must belong to the exclusive generation key; compare the grouped totals to ungrouped project totals. Missing, foreign, unattributed or ungroupable costs fail closed.
4. Independently lock every creator and generation attempt in the window. Every attempt must be reserved in the same UTC month and have immutable local model/token checkpoints. Request and token totals must match the provider exactly. Incomplete/uncertain responses or mixed states block the entire day.
5. Aggregate provider cost must fit inside the sum of those reserved maximums. Never silently overdraw or refund a possibly billable timeout.
6. Record a provider evidence digest and a local attempt manifest digest. At least 24 hours later, require a **second unchanged provider observation** and exact locked local identity. A changed billing snapshot resets the observation window and retains every hold.
7. Only an explicit operator settlement command updates quotas, the provider budget, attempts and the day audit in **one MySQL transaction**. All covered attempts move to aggregate_reconciled and link the day. Their charged_microusd remains zero only as a legacy placeholder: it is **not** a verified zero-dollar per-request charge; the actual cost lives exclusively on the provider-day ledger.
8. Retrying is idempotent. Later provider evidence drift is detected without duplicating or silently rewriting the financial ledger.

## Operator commands (isolated staging only)

The following environment gates must all be configured by an operator. Never enable them in production without independently reviewed finance/security approval:

- CREATOR_AI_OPENAI_COST_AUDIT_ENABLED=true
- CREATOR_AI_OPENAI_COST_AUDIT_ADMIN_KEY=[separate read-only organization Admin key, secret]
- CREATOR_AI_OPENAI_COST_AUDIT_PROJECT_ID=proj_...
- CREATOR_AI_OPENAI_COST_GENERATION_KEY_ID=key_...
- CREATOR_AI_OPENAI_COST_EXCLUSIVE_PROJECT=true
- CREATOR_AI_OPENAI_COST_SETTLEMENT_ENABLED=true

First run an observation of an eligible closed UTC day, without releasing a hold:

    php artisan creator-ai:reconcile-cost-window 2026-10-15

At least 24 hours later, after a stable second independent provider response, an operator may explicitly settle:

    php artisan creator-ai:reconcile-cost-window 2026-10-15 --settle

The command accepts no arbitrary cost or override amount; it prints no credential. A premature settlement exits with failure and retains the hold. There is no HTTP route, cron task or automatic production process.

## Release and residual risks

Provider API daily costs can be revised after a 72h+24h observation period. A subsequent mismatch is rejected without mutating spent history. Post-settlement adjustments require a separately reviewed credit/debit correction workflow; this slice does **not** claim invoice-level finality. An environment with other keys, unknown API usage, unclear provider attribution, or actual costs larger than held budget must remain blocked until evidence is corrected and reviewed.

Full independent MySQL-worker concurrency and isolated staging testing with a dedicated real provider project remain release gates. No AI provider/creator payment credentials or actual financial activity are modified by this development task. Linket direct creator payments, Verify.et-only verification, permissions, paid-content fulfillment and the MCP read-only boundary are unchanged. Production flags remain OFF; release remains NO-GO.
