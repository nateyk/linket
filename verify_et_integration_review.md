# Verify.et Payment Verification Integration — Implementation Status

> **Document Type:** Technical Integration Status Review
> **Target Provider:** Verify.et API (`https://verify.et`)
> **Status:** Implemented — server-side verification, webhooks, reconciliation, disputes and production preflight are in place.
> **Primary References:** Linket repository (`app/Payments/VerifyEt/`, `app/Storefront/`, `common/foundation/`)

---

## 1. Existing Verify.et Code & Configuration in Linket

Verify.et is implemented as a **server-side verification service** that inspects off-platform transfers after buyers complete them in their banking or mobile wallet apps. It is not a redirect-based checkout gateway like Chapa.

Key implementation locations:

- `app/Payments/VerifyEt/` — `VerifyEtClient`, `VerifyEtGateway`, `VerifyEtHttp`, `VerifyEtMoney`, `VerifyEtJson`, `VerifyEtException`, `EncryptedProviderEvidence`, `ReceiptReference`, `EthiopianNameNormalizer`.
- `app/Payments/Controllers/VerifyEtWebhookController.php` — signed webhook receiver.
- `app/Jobs/ProcessVerifyEtWebhook.php` — queued webhook processing.
- `app/Payments/Models/VerifyEtWebhookDelivery.php`, `DirectPaymentVerification.php` — persistence and idempotency.
- `app/Storefront/Controllers/StorefrontCheckoutController.php`, `OrderPaymentController.php` — buyer reference submission.
- `app/Console/Commands/ReconcilePendingVerifications.php` — reconciliation for missed/delayed events.
- `app/Console/Commands/ProductionPreflightCommand.php` — preflight checks for API key and webhook signing (presence only, never outputs secrets).

Configuration lives in `common/foundation/config/services.php` and environment variables (`VERIFY_ET_*`). Chapa remains present for historical payments, refunds and subscription records only.

---

## 2. Current Checkout and Subscription Payment Flows

### 2.1 Storefront Product Checkout (Direct-to-Creator Model)

1. Buyer initiates checkout on `/{storeSlug}/products/{id}`.
2. System creates a `StorefrontOrder` (`status = 'pending_payment'`) with gross amount, currency and recipient snapshot.
3. Checkout displays the creator's verified receiving account and exact amount.
4. Buyer transfers funds directly to the creator's account, then submits the transaction reference.
5. Linket calls Verify.et with the reference, expected amount, bank/wallet code and `settlement_account = creator.account_number`.
6. On `settlementAccount.status === 'matched'` and amount match, the order is marked `paid`, download entitlements are issued and the buyer receipt is queued.
7. On queued/processing responses, the order transitions to `verifying` and awaits webhook or polling.
8. On mismatch, underpayment or ambiguous match, the order is held for manual review and never auto-fulfilled.

### 2.2 Linket Pro Subscription Checkout

1. Creator initiates Pro upgrade or renewal at the configured monthly price (default ETB 500).
2. Subscription invoice is created with a unique reference.
3. Creator transfers to Linket's corporate account and submits the reference.
4. Linket calls Verify.et with `settlement_account = LINKET_CORPORATE_ACCOUNT`.
5. On match, subscription activates (`gateway_status = 'active'`, `renews_at` set) and the invoice is marked paid.
6. A creator cannot use a payment to themselves to settle a Linket invoice.

---

## 3. Webhook, Idempotency, Reconciliation & Audit Mechanisms

- **HMAC signature verification:** incoming payloads are verified with `hash_equals(hash_hmac('sha256', rawBody, secret), signature)`, consistent with existing gateway patterns.
- **Timestamp replay protection:** `X-Verify-Timestamp` is checked against a 5-minute tolerance window.
- **Idempotency:** `storefront_orders.payment_reference` and `commission_invoices.payment_reference` enforce uniqueness; webhook deliveries are deduplicated by event id in `verify_et_webhook_deliveries`.
- **Concurrency:** verification submissions run inside `DB::transaction()` with `lockForUpdate()`; already-paid orders short-circuit.
- **Reconciliation:** `ReconcilePendingVerifications` recovers missed, delayed or interrupted verifications without duplicate fulfillment.
- **Audit trails:** every status transition is recorded with actor, timestamp and note.

---

## 4. Security, Concurrency, Duplicate-Payment & Operational Controls

- **Replay / cross-order reuse:** unique database index on payment references; row locking; strict amount equality down to the exact cent.
- **Settlement account spoofing:** zero trust on ambiguity — `mismatched`, `pending`, `unavailable` or `partial` never auto-fulfill; order drops to `manual_review`.
- **Test-event leakage:** in production, webhooks with `is_test === true` are acknowledged with HTTP 200, logged as a test audit event and discarded without fulfilling orders.
- **Credit exhaustion (HTTP 402):** orders are never marked failed; they remain in `verifying` / `manual_review`, and an admin alert is dispatched.
- **Idempotency keys:** deterministic `linket_order_{uuid}_{attempt}` keys prevent duplicate verification costs on network retries.

---

## 5. Provider Limitations To Confirm With Verify.et

Before production rollout, confirm directly with Verify.et technical support:

1. Zemen Bank compatibility (manual statement upload vs automated API).
2. Which banks reliably return `settlementAccount.matched = true` with full account number matching.
3. Exact rate limits on `POST /verifications` and `GET /verifications/{id}`.
4. Webhook retry cadence for non-200 responses.
5. Whether a balance/credits API or low-credit webhook exists for proactive monitoring.

---

## 6. Test Coverage

Integration coverage lives in `tests/Feature/` (payment, dispute, authorization, journey tests) and `tests/e2e/` (isolated buyer, platform, free-to-pro, help-center specs). Mock only external services; never submit real Verify.et requests in tests.

---

## 7. Notes

- Historical Chapa payments, refunds, commission invoices and Chapa subscription records are preserved and remain readable.
- New-policy orders (`monetization_policy` set) carry 0% commission and never generate commission accruals or invoices.
- Linket approval of a receiving account is not proof of Verify.et registration; checkout eligibility requires approval, registration and creator activation.
