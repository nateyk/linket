# ADR (proposed): Linket platform Chapa v2 and SDK migration

- **Tasks:** LKP-003 (financial architecture), LKP-004 (historical cutover), LKP-029 (SDK migration)
- **Date:** 2026-11-14
- **Status:** Proposed for engineering, finance, security and Chapa merchant review; **not approved for production**
- **Codebase reviewed:** `nateyk/linket` on `main` (original audit baseline `20f6bdda504e2e4b0738e20be8fc64c37a0d4cba`; revalidate paths before implementation)
- **SDK source:** [nateyk/chapa-laravel](https://github.com/nateyk/chapa-laravel) (community-maintained, **not** an official Chapa release)
- **Scope of this PR:** Documentation only. No Composer, controllers, runtime behavior, database schema, secrets, transfers or deployment changed.

## Decision summary

**Proposed:** For **new** storefront orders, Linket's own Chapa merchant collects buyer payments, independently verifies them, records an auditable platform-held creator payable, and later disburses approved creator withdrawals. Free and Pro creators should not supply personal Chapa or Verify.et merchant credentials for new checkout. Platform Pro subscription billing remains a separate purpose and remains functional.

Prefer `nateyk/chapa-laravel` for *provider API transport, DTOs and signature verification*, behind an application-owned adapter; retain Linket's business state machines, permissions, merchant-credential resolution, commission policy, funds ledger, fulfillment and reconciliation. This selection is **conditional on package release, real Chapa Test Mode acceptance and compliance review**.

Do not install an unreviewed mutable `dev-main` in production or assume `^0.1.0` resolves: the SDK's release notes currently say Packagist publication and a stable release are outstanding. Pin a reviewed immutable version when available. Its Test Mode and callback interoperability still require external validation.

### Decisions still open (not implied approved)

1. **LKP-001:** Chapa contractual authorization for Linket to collect on behalf of creators, hold funds and pay third parties, plus KYC/AML/tax/refund responsibilities. This is **not** waived because creators avoid personal merchant keys.
2. **LKP-002:** Free/Pro commission rates (10%/3% appear in examples only), free-tier 10-sale cap, settlement availability/hold days, payout thresholds, reserves, provider fee allocation and disputes.
3. Chapa v2 test-mode webhook, payout, refund and reversal schemas; do not assume v1 Transfer Approval URL applies to v2.

## Verified existing Linket seams

| File | Existing responsibility | Migration boundary |
| --- | --- | --- |
| `composer.json` | Requires `chapa/chapa-laravel:dev-main`, embeds a custom package source | Remove only in separately validated SDK adapter PR |
| `app/Providers/AppServiceProvider.php` | Explicitly registers `Chapa\\Chapa\\ChapaServiceProvider` | Remove old registration; resolve SDK's new provider/facade alias |
| `app/Payments/Chapa/ChapaV2Client.php` | v2 hosted, verify, banks, payouts, decimal conversion | Eventually replace provider-facing transport, not business orchestration |
| `app/Payments/ChapaGateway.php` | Platform secret via `billing.chapa.secret_key` then `services.chapa.secret`; subscriptions; verification normalization | Retain contract, adapt underlying provider client |
| `common/foundation/src/Billing/Gateways/Chapa/Chapa.php` | Linket subscription gateway (not old SDK facade) | Retain and regression-test |
| `app/Payments/Controllers/ChapaWebhookController.php` | Existing platform payment webhook and transaction fulfillment | Maintain route and legacy purpose guards while adding disjoint marketplace processing |
| `app/Payments/ChapaWebhookDeliveryLogger.php` | Sanitized append-only delivery audit rows | Keep history; not itself a durable deduplication/queue implementation |
| `app/Storefront/StorefrontCheckout.php` | Seller-Chapa/Verify.et new-sale selection | Platform route for new eligible orders, historical route compatibility |
| `app/Storefront/StorefrontWebhookHandler.php` | Can credit creator-collected seller Chapa sale to financial ledger | FIN-01: segregate collector, prevent platform withdrawable credit |
| `app/Storefront/DigitalProductFinance.php` | Existing creator earnings and payout accounting | Enforce collector classification, currency and balanced postings |
| `app/Storefront/PayoutRequestService.php` | Request/transition/payout, marks paid after initiation | FIN-02: explicit async verified transitions |
| `app/Storefront/ChapaPayoutService.php` | Provider payout creation with new per-call identifiers | FIN-03: durable transfer attempt + stable retry identifiers |
| `app/Storefront/Controllers/AdminPayoutRequestsController.php` | Admin manual/automatic status actions and destructive delete | FIN-06: audited immutable withdrawal history |

Do not confuse `Common\\Billing\\Gateways\\Chapa\\Chapa` with the third-party global facade. Use type-hinted SDK client; ensure only one auto-discovered `Chapa` facade alias exists.

## Actual SDK API map (confirmed from repository source)

The supplied LKP-029 blueprint included nonexistent SDK names, including `ClientConfig`, `hostedPayments()->create()`, `listBanks()`, `verifySignature()`, `PaymentVerificationResult`, `PayoutVerificationResult`, and `payments()->validateCredentials()`. **Do not copy those calls.**

| Linket requirement | Real SDK method/type | Important contract |
| --- | --- | --- |
| Construct client | `new Nateyk\\Chapa\\ChapaClient(privateKey: $secret, webhookSecret: $webhookSecret, baseUrl: 'https://api.chapa.global', timeout: 15)` | Constructor accepts scalar config, **not** a `ClientConfig` object; base URL is an HTTPS **origin without `/v2` path** |
| Hosted payment | `$client->payments()->hostedTyped($payload, $persistedKey)` | Returns `Dto\\HostedCheckoutSession`; validate trusted HTTPS checkout URL; initiation is not payment proof |
| Payment verification | `$client->payments()->verifyTyped($merchantReference)` | Returns `Dto\\VerifiedTransaction`; call `matchesPayment($amountCents, $currency, $reference)` before fulfillment |
| Banks | `$client->payouts()->banks('ET')` | Returns `Http\\ApiResponse`; read `->data()`, validate/cache bank data at Linket layer |
| Payout creation | `$client->payouts()->createTyped($payload, $persistedKey)` | Returns `Dto\\PayoutInitiation`; PENDING does **not** mean delivered |
| Payout verification | `$client->payouts()->verifyTyped($reference)` | `Dto\\VerifiedTransaction` with `matchesPayout`, `payoutStatus`, `payoutRequiresAction` |
| Refund | `$client->refunds()->create($payload, $persistedKey)` | Explicit idempotency and independent refund verification/reconciliation |
| Webhook signature | `$client->webhooks()->verify($rawBody, $signature)` | Exact raw bytes; distinct configured webhook secret, **never** fallback to API secret |
| Auth health check | `$client->payments()->methods()` | Request success/authentication check, **not** a nonexistent `validateCredentials` helper |
| Exceptions | `Exceptions\\ApiException`, `Exceptions\\TransportException` | HTTP/provider errors distinct from transport ambiguity; preserve safe generic errors to buyer |
| Event deserialization | `$client->webhooks()->event($rawBody, $signature)` | Validates signature and decodes `Webhooks\\WebhookEvent` |
| Durable inbox | SDK's optional `Laravel\\Webhooks\\WebhookInbox` and processor | Choose one owner for incoming events and replay handling; opt-in, not automatic |

SDK reference: [src/ChapaClient.php](https://github.com/nateyk/chapa-laravel/blob/main/src/ChapaClient.php), [src/Resources/Payments.php](https://github.com/nateyk/chapa-laravel/blob/main/src/Resources/Payments.php), [src/Resources/Payouts.php](https://github.com/nateyk/chapa-laravel/blob/main/src/Resources/Payouts.php), [src/Support/WebhookVerifier.php](https://github.com/nateyk/chapa-laravel/blob/main/src/Support/WebhookVerifier.php).

### Proposed credential-aware application adapter

`App\\Payments\\Chapa\\LinketChapaManager` should reuse **exactly** Linket's existing platform merchant secret precedence from `ChapaGateway::platformSecret()` (admin setting `billing.chapa.secret_key`, fallback `config('services.chapa.secret')`); do not invent a new `settings('services.chapa.secret')` key. Resolve the webhook signature secret *independently* through `ChapaGateway::webhookSecret()` or reviewed equivalent; reject if absent. Do not expose secret configuration to the client, browser, logs or exceptions.

Design sketch only (do not paste into production without tests):

```php
use Nateyk\Chapa\ChapaClient;

// Resolve from existing Linket settings, validated and not blank.
return new ChapaClient(
    privateKey: $platformSecret,
    webhookSecret: $distinctWebhookSecret,
    baseUrl: 'https://api.chapa.global',
    timeout: 15,
);
```

The SDK auto-discovered singleton reads `config('chapa')`, and may not reflect admin-edited database credentials. Avoid using that singleton unmodified for platform billing. The app adapter explicitly creates a client from current effective settings. Rotate secrets safely; never cache old secrets in long-lived workers.

## Accounting and merchant-custody invariants

1. **Collector source is immutable:** `platform_chapa`, `creator_chapa` or `verify_et_creator` on each new order/payment attempt; historical rows classified conservatively, `unknown` until proven, with **no inferred platform credit**.
2. **No withdrawable money without evidence:** a successful Chapa payment verification authorizes only the *appropriate* order fulfillment and initial **held** payable; withdrawal eligibility additionally requires platform cash settlement reconciliation, holds/reserves and refund exposure checks.
3. Every posting is currency-scoped, integer minor units, immutable, balanced (`SUM(debit_minor)=SUM(credit_minor)`), with unique source event/type and enforced ownership/permission.
4. Sale rate and money allocation are immutable per-order snapshots. Repricing, Pro upgrade, renewal or downgrade never retroactively changes a paid order's share.
5. Never create more than one journal sale posting, entitlement or notification side effect from duplicate/out-of-order callbacks; external side effects require their own idempotency.
6. A request/approval/transfer initiation is **not** a payment. Do not release reserved creator liabilities until a transfer is conclusively delivered or reversed in the books.
7. No hard deletion of financial requests, source links or journal entries. Corrections are compensating postings.
8. New marketplace purpose must coexist with historical seller-Chapa, Verify.et and subscription payment routes; no backfill of seller-collected revenue into Linket-held balances.
9. **No mixed-currency totals:** summaries and payouts always filter/store currency explicitly.

### Proposed minimal schema (not yet migrations)

- `storefront_payment_attempts`: order FK, merchant/collector owner, purpose, amount_minor, currency, snapshot version, unique merchant_reference <=20 ASCII bytes, encrypted/opaque provider reference, idempotency key unique per operation, state, verified_at, settled_at, created/updated timestamps.
- `storefront_journal_entries`: unique source_type/source_id/event_type, immutable creation, occurred_at, currency, creator_id (where applicable), reversal_of_id.
- `storefront_journal_lines`: entry FK, account code, creator_id, debit_minor **or** credit_minor positive, currency, optional correlation ID; balance checked transactionally; no mutation/delete.
- `storefront_payout_intents`: withdrawal request FK, immutable destination snapshot encrypted, amount_minor, currency, **stable** transfer merchant reference and idempotency key, provider reference, attempt index, state and event audit; unique active submitted attempt per withdrawal. Retries after ambiguous failures reuse **same** intent; a definitively failed transfer may require a distinct new intent after reconciliation and explicit approval.
- `storefront_webhook_receipts` **only if choosing a dedicated durable application inbox**; otherwise adopt SDK's opt-in inbox under the existing *single* Linket webhook route. Existing `chapa_webhook_deliveries` may remain a lightweight audit table but is not sufficient by itself for reliable replay.

Indexes/constraints to decide in A1: unique idempotency/merchant keys, source event uniqueness, append-only authorization, FK delete restriction, per-currency account ownership, transactional posting, concurrent withdrawal reservation on locked creator/currency balance, safe unsigned/nonnegative integer bounds and append-only audit.

### Posting examples (ETB cents, ignoring PSP fees until separate reconciliation)

**Verified platform-collected sale, 1,000 ETB gross, 10% example rate only:** Dr Chapa clearing 100000; Cr creator **held** payable 90000; Cr commission revenue 10000. This is a *clearing/receivable* balance before bank settlement, not verified available cash.

**Processor settlement:** Dr cash at actual net settlement; Dr processor-fee expense (if applicable); Cr Chapa clearing at gross settled, reconcile batch to Chapa statement. Only then and after approved hold/reserve policy can the creator held payable be reclassified Dr held / Cr available.

**Withdrawal reservation, 900 ETB available:** Dr creator available payable 90000; Cr creator reserved payable 90000.

**Chapa payout POST returns PENDING:** No `paid` transition, no creator-liability extinction. Intent status `provider_pending`; reserved funds remain reserved pending final evidence. Handle cash in transit separately if Chapa debits before final success.

**Verified paid payout:** Dr reserved creator liability 90000; Cr bank cash/payout clearing 90000, matched to Chapa settlement movement. Duplicate statuses cannot post twice.

**Failed payout:** Terminal failure after independent verification releases hold Dr reserved / Cr available *once*, subject to chargeback/negative-balance rules; ambiguous or action-required state retains reservation.

**Full refund:** Dr commission revenue 10000; Dr creator payable 90000 (where still recoverable); Cr platform cash/clearing 100000, consistent with actual refund event. If the creator has already withdrawn, record an enforceable creator recovery receivable rather than silently allowing negative available funds. Partial refunds and Chapa processor fees need separately specified proportional/contract rules.

## State transitions

### New marketplace payment
```text
created -> initializing -> provider_pending -> verified_success -> fulfilled
            |                  |                    |
            +-> uncertain -----+                    +-> settlement_pending -> settled -> funds_held -> available
                               +-> failed/expired (only after supported verification)
```
A browser return is only a verification trigger, never settlement proof; load the user's authorized order/attempt, verify exact merchant reference, amount, currency, environment and merchant ownership. External Chapa HTTP happens outside open row-lock transactions. When checkout POST times out, reconcile the *existing* attempt rather than creating a fresh payment.

### Payout
```text
requested -> approved -> intent_prepared -> submitted -> provider_pending -> verified_paid
    |           |                             |                 |
    +-> cancelled/rejected                    +-> uncertain      +-> failed/reversed/blocked/action_required
```
The provider's `PENDING` creation receipt never marks the withdrawal `paid`. `AUTH_NEEDED` / `OTP_NEEDED` are blocked/action-required pending confirmed Chapa v2 guidance; do not fabricate an authorization URL. `REVERSED` can occur after apparent success and requires a fresh accounting adjustment/exception and admin reconciliation, **not** simply assuming balances return safely.

## Webhook ingestion decision (proposed, not yet approved)

Preserve the existing externally configured Linket callback URL and historical delivery log, but choose **one** authoritative event inbox/dispatcher for v2 payments, payouts and refunds. A signature-valid delivery is still not proof of successful payment. Options:

A. Adapt SDK's optional encrypted and deduplicating Laravel inbox to the **existing Linket route**, with a single owner for durable receipts and worker retry; retain `ChapaWebhookDeliveryLogger` for sanitized audit metrics.

B. Build equivalent application-owned encrypted durable receipts, unique fingerprint, after-commit dispatch, backoff, re-verification and manual replay at the existing URL, using SDK `WebhookVerifier`.

**Do not** silently install an additional public endpoint or assume existing append-only delivery log already provides deduplication. Keep platform legacy subscription routing and marketplace payment-purpose routing disjoint. For refund webhook events, locate the application refund intent and verify its provider reference separately. Invalid signatures must fail closed without logging raw payload or PII.

## SDK change sequence and rollback contract

**PR A0 (this PR):** Record approved/unapproved choices, SDK source-accurate API map, journal/state machine/schema proposal, safety invariants, migration/release acceptance. No runtime changes.

**LKP-029 SDK adapter PR:** After reviewing SDK code and an immutable version, add contract fixtures/tests and adapter; migrate Composer old package and provider explicitly, avoiding dual `Chapa` facade collisions. Roll back via prior application commit/lock file; keep business data and attempts intact. If temporary dual-transport testing is unavoidable, use separate namespaces/feature routing *only in nonproduction*, without duplicate live event handlers.

**A1 ledger PR:** Additive journal schema + backend, conservative custody backfill, duplicate financial-credit correction mechanism and isolated financial tests; do not rewrite paid historical orders.

**A2 marketplace checkout PR:** Launch feature-flagged **new** Linket-collected checkout only after A1 and Chapa merchant policy approval; preserve pending legacy orders.

**A3 monetization PR:** Quote snapshots and configurable rates, subscription/expiry regression.

**A4 payout PRs:** Approvals, auditable manual proof, stable intents, asynchronous verified automated payouts, reconciliation/refunds, protected finance history.

**A5/A6:** Single-profile creator/admin/buyer UX, complete provider and CI/security/regression acceptance; no production enablement until GO decision.

## Test matrix to require of the *implementation* PRs (not run by this docs PR)

| Flow | Required proof |
| --- | --- |
| SDK compatibility | Laravel 13 + PHP runtime; Composer install with immutable ref; adapter exceptions/credentials, no alias conflict |
| FIN-13 | Exact decimal-string conversion without `bcmath`, overflow rejection, no float money arithmetic |
| Hosted checkout | Free/Pro use platform credential, unique persisted attempt/key and <=20-byte reference, timeout recovery |
| Verification | Signed and unsigned webhook handling; exact cents/currency/reference/merchant; no double grant |
| Receipt intake | Duplicate event, tampering, out-of-order event, worker crash after side effect, retry and reconciliation |
| Subscription | Existing platform Pro renewal, expiry and checkout callback stay correct |
| Custody isolation | Seller-Chapa/Verify.et historical and pending orders never fund platform payout |
| Ledger | Balanced/currency-scoped immutable postings; duplicate refund/chargeback; parallel withdraw reserve |
| Payout | PENDING not paid; timeout uses same key; SUCCESS after server verify, FAILED/REVERSED audit and reservation safety |
| Manual payout | Authorization, required transfer evidence, reference uniqueness, immutable review history |
| SDK release | Current SDK test suite, consumer Laravel installation, genuine Chapa **Test Mode** payment/payout/webhook/refund acceptance |
| Rollout | Full PHP/MySQL, browser, security and deployment configuration checks; measured reconciliation; no regressions |

### Notes on FIN-13 and monetary conversion

Current `ChapaV2Client::centsFromMajor` uses `bcmul()` and `majorFromCents` uses `bcdiv()`; absent `ext-bcmath` causes a runtime failure. The target SDK itself declares only `ext-json` as a mandatory extension and uses minor-unit integers on its v2 requests. This **does not** automatically fix other Linket decimal parsing. An integer-only converter must check decimal-string syntax and numeric range **before casting**, reject integer overflow and avoid returning user input in error messages. No `float` cast or `round` for money values.

### Release and sign-off register

- [ ] Chapa explicitly confirms merchant-of-record/marketplace collection and third-party payout authorization, bank/wallet destination support, KYC, refunds and hold policy.
- [ ] Finance approves funds ownership, creator deficits, immutable journal postings, processor fee handling and daily reconciliation.
- [ ] Product approves commission rates, tier quotas, subscription behavior and payout minimums.
- [ ] Engineering approves exact SDK API surface, active installation/version, Linket adapter, event intake and migration plan.
- [ ] Security approves signature secret isolation, idempotency/transaction boundaries, payout admin controls, immutable sensitive destination handling and operational logging.
- [ ] Genuine Chapa test-mode checkout, webhook, payout, refund and reversal evidence attached.
- [ ] Tests run and pass on the actual implementation branch; then latest-main PR CI green, separately.
- [ ] Explicit production GO decision; not inferred from this ADR.

**This ADR is a review proposal, not an assertion that provider approvals, real-money verification, implementation tests, PR merge or deployment occurred.**
