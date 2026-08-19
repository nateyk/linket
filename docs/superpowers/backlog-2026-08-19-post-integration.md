# Linket — Post-Integration Baseline Backlog (2026-08-19)

Source: inspection of merged `main` (f71fcdb8 + bfbfd68d). Entitlement work is complete and integrated; this is the NEXT wave of work, not a repeat.

## P0 — Critical

| # | Item | Evidence / notes |
|---|---|---|
| P0-1 | **Manual browser smoke of the full creator-commerce loop** | Never performed (no browser tooling). Covers: register → Free entitlement → dashboard → create product → upload file → publish → sell link → public product page → checkout → fee math on order → download entitlement → upgrade Free→Pro (entitlements activate) → tracking pixels denied on Free / enabled on Pro → downgrade (data preserved, limits enforced). See directive §10 checklist. |
| P0-2 | **Chapa sandbox integration test** | `ChapaWebhookController` (signatureIsValid) + `StorefrontWebhookHandler::fulfill` are unit-tested but never exercised against the real gateway. Verify webhook signature flow + `ChapaPaymentFulfillment` in a Chapa sandbox. |
| P0-3 | **Settlement immutability regression test** | §12 invariant: plan/config changes must never mutate recorded order fees (`gross_amount_cents`, `commission_bps`, `platform_fee_percent`, `platform_fee_cents`, `creator_earnings_cents` — StorefrontCheckout::create writes them at creation). Add a regression test: change `storefront.demo_benefits` after an order exists → order fields unchanged. |
| P0-4 | **KYC-gates-payouts verification** | `KycVerificationTest` exists; verify `PayoutRequestService::create` actually refuses payout requests for creators without approved KYC in production config (not just in tests). |

## P1 — Creator-commerce blockers

| # | Item | Evidence / notes |
|---|---|---|
| P1-1 | **`demo:seed` unusable on fresh installs** | `SeedDemoData` requires `user@user.com` demo user (SeedDemoData.php:37); no seeder creates it. Dev onboarding for the commerce demo is broken. |
| P1-2 | **`Subscription::factory()` latent-broken** | `SubscriptionFactory::definition()` calls `$this->faker` but Faker is not installed — every subscription factory use fatals. Tests bypass via direct create. Fix: drop Faker or install it. |
| P1-3 | **Upgrade path vs Chapa subscriptions** | Entitlement e2e tests cover plan switching via direct Subscription writes; the real Chapa subscription checkout (`billing/chapa/checkout`) upgrade→entitlement-activation flow has no end-to-end coverage. |
| P1-4 | **Order recovery + resend-receipt manual verification** | `OrderLookupController` (requestRecovery/resendReceipt) and `SendStorefrontReceipt` queue job exist but only unit-tested; email rendering and recovery UX unverified manually. |

## P2 — Product alignment

| # | Item | Evidence / notes |
|---|---|---|
| P2-1 | **Canonical naming: biolink vs storefront vs digital-products** | Public commerce URLs are `public/biolinks/{id}/digital-products/...`; API has both `storefront/*` aliases and `digital-products/*` (comment: "preferred public interface; storefront aliases remain for compatibility"). Decide canonical naming, migrate, drop aliases. |
| P2-2 | **No standalone storefront page** | Product sell pages live under biolink short URLs (`/products/{id}`); creators have no standalone storefront URL. Discoverability/UX gap. |
| P2-3 | **Commerce analytics depth** | `StorefrontSalesController` summary exists; no per-product revenue charts or creator revenue dashboard beyond tables. |
| P2-4 | **Admin commerce overview** | Admin has product list + approval + payout review, but no aggregate revenue/settlement overview screen. |
| P2-5 | **Shop widget / creator profile verification** | `shop-widget-dialog/renderer` + creator-profile editor exist; verify they render real products and respect Free-tier limits (5 products). |

## P3 — Technical cleanup

| # | Item | Evidence / notes |
|---|---|---|
| P3-1 | **Unsplash gen fragility — permanent fix** | Scramble doesn't document `images/unsplash` routes in this env → every `orval` regen deletes gen files that `unsplash-queries.ts` imports (restored manually 4×). Fix: annotate routes for Scramble or move the query file off the gen module. |
| P3-2 | **69 pre-existing TS errors** | Include `edit-plan-page.tsx:37` (prices gen-type mismatch) and `:60` (HookForm.Root generics). |
| P3-3 | **PHPStan: `ProductResource::$hidden` protected-property error** (line 32) | Pre-existing. |
| P3-4 | **Storefront API alias debt** | Drop `storefront/*` route aliases once consumers migrate to `digital-products/*`. |
| P3-5 | **`billing/chapa/transactions` vs product order status** | Status endpoint is subscription-only; product orders confirm via `order()` + tx_ref. Unify or document. |
| P3-6 | **`LinkeablePublicPolicy` domain-branch unit tests** | Only default-host + non-matching-host branches covered (ProductReviewTest regression). Custom-domain branch and domain_id=0 branch untested. |
| P3-7 | **`public/build` churn** | Committed build artifacts regenerate on every build (manifest/map diffs). Decide: .gitignore or accept. |
| P3-8 | **CRLF warnings** | `resources/defaults/*.php` CRLF→LF warnings on git touch. Normalize line endings. |

## Guardrails (do not regress)

- Plan entitlements stay config-driven (`config/storefront.php` canonical; backend consumes, UI displays — no `$plan->name === 'Pro'`, no hardcoded limits).
- Order settlement fields are immutable after creation.
- Domain gating (`LinkeablePublicPolicy`) is intentional security — tests must use `config('app.url')` hosts, not `127.0.0.1`.