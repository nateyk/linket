# Linket AI PR-09: token-only storefront proposals — first reviewable slice

Status: WIP draft; child branch from PR #94. DO NOT MERGE or enable provider flag.

## Actual implementation

- Private Pro-only, creator-owned workspace `Store` endpoints for availability, suggestions and optimistic revision verification; use only authenticated dashboard routes.
- A structured Laravel AI agent chooses from three **existing** button style tokens; plain-text rationale is validated. The server maps every preset into exact `btnConfig.variant`, `radius` and `shadow` values supported by the existing Linket store-editor. No arbitrary CSS, HTML, JavaScript, external links, image URLs, color codes or branding overrides.
- The prompt sees only requested design mood and existing button variant. No creator private biography, product/order details, buyer identifiers, payment/receiving account data or provider credentials.
- The result is a draft with a source fingerprint and `requires_review: true`. No controller or service writes `Store` / `StoreAppearance`, invokes normal Save, changes product status, or publishes a storefront.
- `storefront_drafts` Pro feature flag, separate provider flag and administrator provider key/budget must all be enabled. Provider calls are faked in tests and accounting retains uncertain charges reserved.

## Remaining before rollout

- Build accessible inline before/after preview and explicit local Apply / Discard in the existing appearance editor; normal builder Save remains mandatory.
- Add browser/mobile/200% zoom, keyboard, focus, local stale-change, XSS, admin role and workspace-change regressions.
- Independently verify cost reconciliation, staging credentials, AppSec, model rate policy and release approval. Generated section/text/hero suggestions remain out of scope for this first button-token slice.

New default-off flag: `CREATOR_AI_STOREFRONT_PROPOSAL_ENABLED`. Disable it to immediately hide the feature. No production changes.