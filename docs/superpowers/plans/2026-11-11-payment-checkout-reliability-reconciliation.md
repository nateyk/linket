# Linket payment checkout reliability — evidence reconciliation and implementation plan

**Date:** 2026-11-11  
**Source:** Four buyer mobile screenshots reported by the owner; current `main` inspected on GitHub; [Chapa v2 seller gateway Notion decision](https://app.notion.com/p/411bae7367ac8193b05ccbf7f995e665); [storefront UX project](https://app.notion.com/p/40ebae7367ac81fdbb97cf797bd2482a).

## Product contract / nonnegotiables

- A buyer is charged by the creator directly through one selected collector: bank/Telebirr via Verify.et, or seller Chapa Hosted Checkout (Pro only).
- Verify.et is authoritative for receipt evidence; no access is granted for missing, unmatched, incomplete, duplicate or unresolved evidence.
- Chapa success must be verified server-side against the seller gateway, then fulfill once. No seller webhook, no inline credit-card UI and no automatic collector switching on Pro lapse.
- Storefront product, course and download delivery remain locked until real confirmation. Successful payment cannot be lost merely because email/download generation is delayed.
- Do not log provider secrets, buyer order access tokens, full payment references or account numbers.

## Evidence and observed root causes

1. Screenshot: buyer pasted the **receiving account number into the transaction reference field** and received a duplicate-reference error. CBE reference format alone admits that string. Differentiate destination vs receipt on both client and server *before* any Verify.et attempt or side effects.
2. Screenshot: buyer sees a buyer identity dialog followed by a full second bank-details dialog, then sees the same payment destination again while the status is `verifying`. Introduce clearer two-step wayfinding now; design a single payment state machine and compact checkout shell in the next slice.
3. Screenshot: `verifying` is not completion. Verify.et may return `202` pending; webhook and scheduled reconciliation need to be verified against target-environment infrastructure. A UI spinner is not proof of success.
4. `OrderPaymentController::selectAccount` allowed recipient changes while `verifying` and after verification records existed. Prevent reference/recipient race by serializing changes on the order.
5. The previous payment-instructions failure copy told buyers to create another checkout. Allow retry of instructions for the **same order** instead.

## GitHub implementation baseline

- [PR #137](https://github.com/nateyk/linket/pull/137) merged: seller Chapa v2 hosted checkout, platform client cutover, seller collector settings. Live gateway setup and production paid-return verification **not established by a merge**.
- [PR #148](https://github.com/nateyk/linket/pull/148) merged: verification attempt budget, delivery states and pending flow.
- [PR #155](https://github.com/nateyk/linket/pull/155) merged: false receipts and candidate mismatches result in mismatch, not manual review.
- [PR #156](https://github.com/nateyk/linket/pull/156) merged: active receiving banks limited to CBE, Telebirr and BOA.
- Current code still requires nonproduction full browser and provider integration review. PR #163 free-checkout handling is separate; avoid merging its changes into this branch without reconciliation.

## Slice A — receipt correctness / safe recipient selection (implemented in draft branch; not yet validated)

- [x] Reject receiving-account value used as payment reference on client, with an inline error and no API submission.
- [x] Reject receiving-account value server-side before Verify.et call or buyer attempt usage; preserve validation 422 contract.
- [x] Lock receiving-account selection against verification submission, block switching once a verification record exists, and detect recipient changes during submission.
- [x] Restrict legacy CBE FT suffix UI validation to applicable reference length (long modern FT does not require it).
- [x] Hide redundant receiving-account details while verifying, differentiate current step, and show truthful status guidance.
- [x] Retry payment-instructions retrieval on same checkout rather than instructing creation of a new order.
- [x] Add PHP and DOM regression assertions for mistaken account paste, payment states, and switch lock.
- [ ] Run actual targeted PHP tests, Vitest, TypeScript/ESLint, full GitHub Actions.
- [ ] Test device browser 360/390/430px, enlarged text, keyboard/focus, English/Amharic, screen reader; evidence screenshot and review required.

## Slice B — verification lifecycle and provider recovery (open)

- [ ] Trace `submit → VerifyEtGateway → 200/202 → webhook → reconcile → order → delivery` with synthetic and sandbox evidence; distinguish `pending`, `verifying`, `manual_review`, `failed_verification`, `paid`.
- [ ] Check target environment: API key configured, Verify.et webhook active and signed, queue workers running, scheduler invoking `billing:reconcile-pending-verifications`; inspect safe request-ID/status evidence without secrets.
- [ ] Verify idempotency, mismatch budget, retries and cooldown behavior for 404/429/network/invalid receipts/duplicate claims; avoid buyer-triggered unbounded paid provider requests.
- [ ] Add a bounded, non-destructive status recheck and explicit long-pending recovery path, retaining order and purchaser credentials.
- [ ] Check delivery job failure and My Purchases recovery without falsely marking orders paid.

## Slice C — one coherent buyer checkout (open)

- [ ] Design one accessible step-based checkout shell for buyer identity → collector choice → payment details → status → delivery (rather than repeated independent modal chrome).
- [ ] Retain seller identity, exact amount, bank/wallet destination and copy affordance; make receipt ID and provider-specific suffix unambiguous, with contextual examples and low-friction correction.
- [ ] Ensure a single primary action per state and mobile-first content hierarchy; no behind-dialog interactions.
- [ ] Keep free purchase, direct pay and Chapa Hosted Checkout distinct. Resolve potential conflicts with SF-09 free-order branch before integration.

## Slice D — Chapa v2 seller and platform QA (open)

- [ ] Validate seller Pro key onboarding, encrypted secrets, selected active collector, Pro lapse behavior and platform credential separation.
- [ ] Validate Chapa hosted checkout return, server-side verification, pending/failure/cancel states, amount/currency/tx-ref identity, duplicate callback idempotency and fulfillment.
- [ ] Test with provider sandbox/nonproduction credentials; no seller webhook or unsupported API v1 fallback.

## Acceptance and release gate

- No balance or order is changed merely because the buyer enters a recipient account, refreshes status, or retries UI loading.
- A full matching verified transaction fulfills once; false/mismatched/duplicate/unresolved evidence does not unlock content.
- Correct current seller receiving account and amount remain stable once verification starts; stale or conflicting updates return safe errors.
- At 360/390/430/768 desktop and 200% zoom, all states and controls remain visible, keyboard accessible, and not duplicated.
- CI + test evidence + authorized nonproduction provider walkthrough + review of all dependent branches is mandatory before merge. **No deploy** without separate approval.
