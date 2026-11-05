# Linket AI — OpenAI independently sourced aggregate cost audit (stage 1)

Source: https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs

## Why per-request settlement remains gated

The OpenAI organization Costs API reports **daily aggregate costs** scoped by project/API key and line item, not a native per-request paid invoice. A token checkpoint or model pricing estimate alone is not a provider charge. It must not release global reserve or mark a request complete.

## Implemented read-only preflight

- Separate admin-level credential, dedicated project ID and explicit default-OFF config. Never reuse the ordinary Creator AI inference API key or expose either credential in an API response.
- Requires UTC day closed for at least 72 hours. Fetches the official costs and completions usage APIs over HTTPS, validates bucket dates, project IDs, statuses, currency, positive/zero numbers and bounded pagination.
- Compares provider daily request and token totals against private, tenant-bound local request IDs/checkpoints, then returns `aggregate_matches_pending_invoice_review` or `reconciliation_gap`, with SHA-256 digests of the retrieved JSON pages.
- The `CreatorAiOpenAiCostWindowAudit` class has **no HTTP route, no job, no command, no mutation and no automatic settlement**; tests fake the provider. Aggregated matches are only evidence suitable for additional review.

## Required before settlement or feature activation

1. Independently administer a dedicated OpenAI project containing only Linket AI generation and a separate privileged admin key. Confirm API project filters, grouping and source completeness in staging; never bundle key in repository.
2. Review immutable model price/rate versions (including cached input, cache writes, service tier, Batch, tool costs), processing horizon and any adjustments; compare a closed invoice with the daily aggregate.
3. Add a separately approved, externally retained, operator-authorized evidence manifest and atomically settle only complete exact request records, with overage and rounding safeguards. No fallback to estimated cost.
4. Keep reservations for missing/uncertain provider responses; block on mismatched request counts, tokens, project IDs or missing provider pages. Review operator access and immutable audit export.
5. Require independent AppSec signoff, concurrency tests, exact-head CI and an explicit GO decision before enabling generation.

Configuration defaults OFF: `CREATOR_AI_OPENAI_COST_AUDIT_ENABLED`, `CREATOR_AI_OPENAI_COST_AUDIT_ADMIN_KEY`, and `CREATOR_AI_OPENAI_COST_AUDIT_PROJECT_ID`. Nothing is configured on live hosting.