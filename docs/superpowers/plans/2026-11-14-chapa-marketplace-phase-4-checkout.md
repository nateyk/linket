# Centralized Chapa Marketplace Checkout (Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement platform-owned centralized Chapa v2 hosted checkout and server-to-server webhook fulfillment for Linket Free and Pro creators without requiring creator Chapa merchant keys or Verify.et receiving accounts.

**Architecture:** Route paid storefront checkouts to Linket's platform Chapa merchant account using `LinketChapaManager::platformClient()`. Persist a durable `StorefrontPaymentAttempt` with a unique <=20-char ASCII merchant reference before redirecting the buyer. Verify payments server-to-server with `$client->payments()->verifyTyped()` and exact amount/currency matching before fulfilling the order and posting to the double-entry ledger. Integrate cleanly into Linket's single webhook endpoint with disjoint routing between subscriptions and marketplace orders.

**Tech Stack:** PHP 8.4, Laravel 11, `nateyk/chapa-laravel` SDK v2, MySQL 8.0, PHPUnit.

**Spec:** `docs/payments/2026-11-14-chapa-marketplace-sdk-adr.md` (ADR PR #244), `app/Storefront/Ledger/CreatorLedgerService.php` (PR #246).

## Global Constraints

- All monetary amounts MUST use strict integer cents (`amount_cents`, `debit_cents`, `credit_cents`). Zero float math or `bcmath`.
- Merchant transaction references MUST be <= 20 ASCII characters and unpredictable (generated using `Nateyk\Chapa\Support\MerchantReference::generate('lk')`).
- Hosted checkout URLs MUST be validated against trusted HTTPS Chapa hosts (`checkout.chapa.global`).
- Webhook signature validation MUST use `LinketChapaManager::platformClient()->webhooks()->verify($rawPayload, $signature)`.
- Verification MUST match amount, currency, and reference using `$verified->matchesPayment($amountCents, $currency, $merchantReference)`.
- Disjoint routing: Subscription transactions (`PaymentTransaction`) and marketplace storefront attempts (`StorefrontPaymentAttempt`) MUST remain completely segregated.
- CodeScene Code Health standards: Max 4 function arguments, max 5 constructor parameters, max 9 cyclomatic complexity per method, zero primitive obsession.

## Review Focus

1. **Length and Character Set of Merchant Reference**: References longer than 20 bytes or containing non-ASCII characters will be rejected by Chapa API v2.
2. **Double Fulfillment & Race Conditions**: Concurrent browser returns and webhook callbacks must acquire row locks and be strictly idempotent.
3. **Amount or Currency Manipulation**: Any webhook or return verification with mismatched amount, currency, or status MUST fail and not fulfill the order.
4. **Historical Isolation (FIN-01)**: Orders collected by platform Chapa MUST have `collection_owner = 'platform_chapa'` so the ledger credits them; legacy orders remain isolated.
5. **Subscription & Marketplace Endpoint Conflict**: Webhooks arriving at `POST billing/chapa/webhook` must safely distinguish subscriptions from storefront orders without dropped events.

---

## Tasks

### Task 1: Database Migration & `StorefrontPaymentAttempt` Model

**Files:**
- Create: `database/migrations/2026_11_14_210000_create_storefront_payment_attempts_table.php`
- Create: `app/Storefront/Models/StorefrontPaymentAttempt.php`
- Modify: `app/Storefront/Models/StorefrontOrder.php`
- Test: `tests/Unit/StorefrontPaymentAttemptModelTest.php`

- [ ] **Step 1: Write migration for `storefront_payment_attempts`**
  Table schema:
  - `id` (bigIncrements)
  - `order_id` (unsignedBigInteger, index)
  - `merchant_reference` (string 20, unique)
  - `chapa_reference` (string 64, nullable)
  - `idempotency_key` (string 36, unique)
  - `amount_cents` (unsignedInteger)
  - `currency` (string 12, default 'ETB')
  - `status` (string 32, index)
  - `checkout_url` (text, nullable)
  - `verified_at` (timestamp, nullable)
  - `error_message` (text, nullable)
  - `verification_data` (json, nullable)
  - `timestamps`

- [ ] **Step 2: Create Eloquent Model `StorefrontPaymentAttempt`**
  - Constants: `STATUS_CREATED = 'created'`, `STATUS_INITIALIZING = 'initializing'`, `STATUS_PENDING = 'pending'`, `STATUS_SUCCESSFUL = 'successful'`, `STATUS_FAILED = 'failed'`, `STATUS_EXPIRED = 'expired'`.
  - Properties & Casts: `amount_cents => 'integer'`, `verified_at => 'datetime'`, `verification_data => 'array'`.
  - Helper methods: `isPending(): bool`, `isSuccessful(): bool`, `isFailed(): bool`.
  - Relationship: `order(): BelongsTo` to `StorefrontOrder`.

- [ ] **Step 3: Add Relationships to `StorefrontOrder`**
  - Add `paymentAttempts(): HasMany`
  - Add `latestPaymentAttempt(): HasOne`

- [ ] **Step 4: Write Unit Test `tests/Unit/StorefrontPaymentAttemptModelTest.php`**
  - Verify model creation, constants, status helpers, and relationship definitions.

---

### Task 2: Merchant Reference Generator Service

**Files:**
- Create: `app/Storefront/Services/StorefrontPaymentReferenceGenerator.php`
- Test: `tests/Unit/StorefrontPaymentReferenceGeneratorTest.php`

- [ ] **Step 1: Write failing test in `tests/Unit/StorefrontPaymentReferenceGeneratorTest.php`**
  - Test length <= 20 ASCII characters.
  - Test format begins with `lk-`.
  - Test uniqueness check against `StorefrontPaymentAttempt`.

- [ ] **Step 2: Implement `StorefrontPaymentReferenceGenerator`**
  - Uses `Nateyk\Chapa\Support\MerchantReference::generate('lk')`.
  - Validates <= 20 characters and matches `/^[A-Za-z0-9_-]{1,20}$/`.
  - Checks database for collisions and retries if collision detected (up to 3 times).

- [ ] **Step 3: Run unit tests and ensure all pass**

---

### Task 3: Centralized Marketplace Checkout in `ChapaStorefrontCheckout`

**Files:**
- Modify: `app/Storefront/Services/ChapaStorefrontCheckout.php`
- Test: `tests/Unit/ChapaStorefrontCheckoutTest.php`

- [ ] **Step 1: Write failing test in `tests/Unit/ChapaStorefrontCheckoutTest.php`**
  - Test Free creator can checkout with platform Chapa (no `CreatorChapaGateway` or Pro required).
  - Test Pro creator checkout with platform Chapa.
  - Test `collection_owner` is set to `platform_chapa`.
  - Test `StorefrontPaymentAttempt` is persisted before returning checkout URL.
  - Test reference is <= 20 ASCII chars.
  - Test checkout URL is returned from `hostedTyped()`.

- [ ] **Step 2: Implement centralized checkout in `ChapaStorefrontCheckout`**
  - When `app(LinketChapaManager::class)->isEnabled()`:
    - Lock creator, check `canSell`.
    - Validate currency is ETB, price_cents >= 100.
    - Generate unique merchant reference via generator.
    - Create `StorefrontOrder` with:
      - `collection_owner => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA`
      - `payment_gateway => 'chapa'`
      - `chapa_tx_ref => $reference`
      - `monetization_policy => $allowance->isPro($creator) ? PRO_POLICY : FREE_POLICY`
    - Create `StorefrontPaymentAttempt` with `STATUS_INITIALIZING`.
    - Call Chapa SDK: `$hosted = app(LinketChapaManager::class)->platformClient()->payments()->hostedTyped($payload, $attempt->idempotency_key)`.
    - Update attempt with `STATUS_PENDING`, `chapa_reference`, and `checkout_url`.
    - Set `$order->setAttribute('chapaCheckoutUrl', $hosted->checkoutUrl)`.
  - If platform Chapa is not enabled, fall back to legacy `CreatorChapaGateway` path for backward compatibility.

- [ ] **Step 3: Run unit tests and ensure all pass**

---

### Task 4: Server-Side Payment Verification & Fulfillment Service

**Files:**
- Create: `app/Storefront/Services/StorefrontPaymentVerificationService.php`
- Test: `tests/Unit/StorefrontPaymentVerificationServiceTest.php`

- [ ] **Step 1: Write failing test in `tests/Unit/StorefrontPaymentVerificationServiceTest.php`**
  - Test verification matches amount, currency, and reference.
  - Test successful verification marks attempt `successful`, fulfills order, and posts to ledger.
  - Test mismatched amount throws exception and marks attempt failed.
  - Test mismatched currency throws exception and marks attempt failed.
  - Test idempotent multiple calls return existing paid order without re-posting.

- [ ] **Step 2: Implement `StorefrontPaymentVerificationService`**
  - Method `verifyAndFulfill(string $merchantReference): StorefrontOrder`:
    - Locks `StorefrontPaymentAttempt` row.
    - If already `STATUS_SUCCESSFUL`, returns `$attempt->order`.
    - Calls `$verified = $client->payments()->verifyTyped($merchantReference)`.
    - Verifies `$verified->matchesPayment($attempt->amount_cents, $attempt->currency, $merchantReference)`.
    - If valid, updates attempt to `STATUS_SUCCESSFUL` and calls `StorefrontWebhookHandler::fulfill()`.
    - If invalid or provider status != SUCCESS, marks attempt `STATUS_FAILED` and throws exception.

- [ ] **Step 3: Run unit tests and ensure all pass**

---

### Task 5: Webhook Handling & Route Integration

**Files:**
- Modify: `app/Payments/Controllers/ChapaWebhookController.php`
- Modify: `app/Storefront/Controllers/ChapaStorefrontReturnController.php`
- Test: `tests/Unit/ChapaWebhookMarketplaceRoutingTest.php`

- [ ] **Step 1: Write failing test in `tests/Unit/ChapaWebhookMarketplaceRoutingTest.php`**
  - Test valid webhook signature dispatches marketplace storefront attempt.
  - Test invalid signature is rejected with 403.
  - Test unknown reference is rejected with 404.
  - Test legacy subscription webhooks continue routing to `PaymentTransaction`.
  - Test duplicate webhook returns 200 with 'Already processed'.

- [ ] **Step 2: Update `ChapaWebhookController`**
  - Maintain signature validation using `LinketChapaManager::platformClient()->webhooks()->verify()`.
  - Check `PaymentTransaction::where('tx_ref', $txRef)->first()`. If found, execute legacy subscription path.
  - If not found, check `StorefrontPaymentAttempt::where('merchant_reference', $txRef)->first()`.
    - If found: call `StorefrontPaymentVerificationService::verifyAndFulfill($txRef)`.
    - Log delivery and return `response()->json(['message' => 'Marketplace payment processed.'])`.
  - If neither found, return 404.

- [ ] **Step 3: Update `ChapaStorefrontReturnController`**
  - Check `StorefrontPaymentAttempt::where('merchant_reference', $txRef)->first()`.
  - If found:
    - Attempt `verifyAndFulfill($txRef)` safely.
    - Return redirect to `/find-my-purchase/orders?highlight={$order->uuid}` for web GET requests or 204 for API/tests.
  - If not found, fall back to legacy `CreatorChapaGateway` return handling.

- [ ] **Step 4: Run unit tests and ensure all pass**

---

### Task 6: Code Health Audit, Verification & PR Creation

**Files:**
- All created and modified files
- Run git status and CodeScene health check

- [ ] **Step 1: Check code complexity and biomarkers**
  - Verify zero methods with >9 cyclomatic complexity.
  - Verify zero functions with >4 parameters.
  - Verify zero constructors with >5 parameters.
  - Verify zero primitive obsession in newly created classes.

- [ ] **Step 2: Run all unit test suites locally**
  - `php artisan test tests/Unit/StorefrontPaymentAttemptModelTest.php`
  - `php artisan test tests/Unit/StorefrontPaymentReferenceGeneratorTest.php`
  - `php artisan test tests/Unit/ChapaStorefrontCheckoutTest.php`
  - `php artisan test tests/Unit/StorefrontPaymentVerificationServiceTest.php`
  - `php artisan test tests/Unit/ChapaWebhookMarketplaceRoutingTest.php`
  - Run all prior ledger & adapter unit tests (`tests/Unit/CreatorLedgerServiceTest.php`, etc.).

- [ ] **Step 3: Create GitHub Pull Request**
  - Push branch `work/lkp-003-marketplace-checkout`.
  - Open PR with title and clear description.
  - Monitor CI and CodeScene gates until green.
