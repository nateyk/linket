# SF-09 — Guest free-checkout recovery and My Portal handoff

Date: 2026-11-11

## Baseline and reconciliation

- Fresh current-`main` baseline: `6565fe303b1847099c340e3bb9fad9472ad8b2c1` (SF-05 Appearance merged).
- SF-10 [draft PR #162](https://github.com/nateyk/linket/pull/162) is green in CI but not merged. Its public service files do not overlap this branch.
- SF-09 [draft PR #161](https://github.com/nateyk/linket/pull/161) addresses product detail readability/FAQ and remains separate. Do not cherry-pick it or overwrite SF-05.
- Reconcile just the free-order pieces from older [draft #114](https://github.com/nateyk/linket/pull/114) and integration [#116](https://github.com/nateyk/linket/pull/116), preserving current public-page styles and paid checkout.

## Verified server contract

1. `PublicDigitalProductsController::checkout` and `StorefrontCheckoutController::store` return a top-level `order_id`, `status` and potentially legacy `access_token`, `reference_endpoint`, etc.
2. `StorefrontCheckout` fulfills zero-price purchases synchronously when Verify.et is off. `DirectStorefrontCheckout` fulfills zero-price purchases synchronously when Verify.et is on, but can return a stale `pending_payment` response attribute. Both paths must be treated as free by the public UI when `payment_mode === 'free'` and the successful HTTP response contains a valid nonblank `order_id`.
3. `/my-portal` is the buyer's email-code account recovery flow. Entitlements/access checks remain server-side. Never include `access_token`, download token, or order IDs in a newly constructed public URL.

## Implemented

- Add typed `isSuccessfulFreeCheckoutResponse` classifier; invalid/empty responses show failure rather than false success. Paid and unavailable modes can never be classified as free.
- On successful free order, bypass paid payment instructions even if legacy response fields are present. Show a translated accessible status and token-free My Portal link, close buyer dialog, suppress sticky duplicate button and disable further claims.
- Free product price, buyer dialog and benefit text describe zero-cost access. Existing paid/direct payment form and checkout flow remain in place.
- `ProductPricingCard` gains optional completed state; suppress stale canceled/failed retry alerts after successful free claim.
- No payment verification, authorization, backend, API, order, entitlement, database schema, or publishing logic changes.
- Use existing real server guest checkout/OTP recovery fixture from prior integration work: fake HTTP/queue, assert free paid + entitlements, unverified library forbidden, email-code verification grants portal library/download.

## Tests

- `free-checkout-response.test.ts`: four scenarios for free legacy status, non-Verify response, paid/unavailable mode isolation and malformed bodies.
- `product-pricing-card.dom.test.tsx`: six interaction/DOM cases, including completed state and stale alert suppression.
- `free-checkout-flow-sf09.test.ts`: four route/copy/paid-flow/token-safety source contracts.
- `FreeCheckoutPortalJourneyTest.php`: guest checkout through authorized email recovery, no real provider calls.

## Mandatory QA/release holds

- [ ] Exact-head PHP+MySQL integration test, all frontend TypeScript/Vitest/Storybook, Vite build and final Verify.
- [ ] Authenticated browser manual: free course/download, guest email recovery, quota, unavailable paid checkout, direct paid checkout, repeated click and page reload.
- [ ] Explicit 360/375/430/768/1024/1440px, 200% toolbar zoom, dark/light Appearance, Amharic/English, keyboard/VoiceOver/NVDA.
- [ ] Code/UX/security human review and **explicit owner permission** before merge. Deployment requires separate approval.
- [ ] Cross-check against #161 if it merges before this branch to avoid overwriting detail readability/FAQ.

**Status: draft / HOLD.** CI pass alone is not production authorization.
