# Payout State Machine & Hardening (Phase 6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace premature, synchronous payout liability extinction with a resilient, asynchronous, verified payout lifecycle (FIN-02, FIN-03, FIN-06) utilizing `nateyk/chapa-laravel`'s typed payout initiation and verification interfaces with durable intents, stable idempotency keys, and explicit audit logging.

**Architecture:** Create `storefront_payout_intents` table and `StorefrontPayoutIntent` model to track external transfer lifecycle independently of internal withdrawal records. Decouple network calls from open DB transactions. Keep creator funds reserved in `CREATOR_RESERVED` while transfer status is `provider_pending`. Only extinguish creator liabilities (`disbursePayout`) after independent typed verification (`matchesPayout`) or signature-valid webhook confirmation. Remove destructive deletion from admin controllers and require transfer evidence for manual approvals.

**Tech Stack:** PHP 8.4, Laravel 11, `nateyk/chapa-laravel` API v2 SDK, PHPUnit / Pest.

**Spec:** `docs/payments/2026-11-14-chapa-marketplace-sdk-adr.md` (ADR PR #244), LKP-003, FIN-02, FIN-03, FIN-06.

---

## Global Constraints

- **FIN-02 (Verified Payout Settlement):** Chapa payout initiation returns `pending` or `queued`. A pending payout MUST NOT extinguish creator liabilities or transition `PayoutRequest` to `paid`. Held liability remains in `CREATOR_RESERVED`.
- **FIN-03 (Network Boundary & Idempotency):** External HTTP calls to Chapa payout endpoints MUST NEVER occur inside an open database transaction. A durable `StorefrontPayoutIntent` with a stable UUID idempotency key and unique `lk-po-...` merchant reference (<= 20 chars) must be persisted prior to network execution.
- **FIN-06 (Immutable Audit Trail):** Withdrawal requests and transfer attempts must never be destructively deleted (`destroy` endpoint removed/forbidden). Manual transfers require valid proof references.
- **CodeScene Code Health:** Methods <= 9 cyclomatic complexity, functions <= 4 arguments, constructors <= 5 arguments, zero primitive obsession, zero duplicated test blocks.
- **Strict Integer Minor Units:** All financial fields must use integer cents (`amount_cents`). Zero float arithmetic.

---

## Tasks

### Task 1: `storefront_payout_intents` Migration & Model

**Files:**
- Create: `database/migrations/2026_11_14_220000_create_storefront_payout_intents_table.php`
- Create: `app/Storefront/Models/StorefrontPayoutIntent.php`
- Test: `tests/Unit/StorefrontPayoutIntentModelTest.php`

- [ ] **Step 1: Write failing unit test in `tests/Unit/StorefrontPayoutIntentModelTest.php`**
  - Verify status constants (`STATUS_PREPARED`, `STATUS_SUBMITTED`, `STATUS_PROVIDER_PENDING`, `STATUS_SUCCESSFUL`, `STATUS_FAILED`, `STATUS_REQUIRES_ACTION`).
  - Verify casts: `amount_cents` (int), `destination_snapshot` (encrypted), `verified_at` (datetime), `verification_data` (array).
  - Verify relationship to `PayoutRequest`.

- [ ] **Step 2: Create migration `2026_11_14_220000_create_storefront_payout_intents_table.php`**
  - Columns: `id`, `payout_request_id`, `merchant_reference` (varchar(20) unique), `idempotency_key` (uuid unique), `amount_cents`, `currency`, `provider`, `withdrawal_code`, `destination_snapshot` (text), `status`, `chapa_reference`, `attempts`, `last_error`, `verified_at`, `verification_data`, `timestamps`.

- [ ] **Step 3: Implement `StorefrontPayoutIntent` model**
  - Match casts, fillable/guarded (`protected $guarded = []`), and relationships.

- [ ] **Step 4: Run unit tests and ensure all pass**

---

### Task 2: `StorefrontPayoutProcessingService` (FIN-02 & FIN-03)

**Files:**
- Create: `app/Storefront/Services/StorefrontPayoutProcessingService.php`
- Modify: `app/Storefront/PayoutRequestService.php`
- Test: `tests/Unit/StorefrontPayoutProcessingServiceTest.php`

- [ ] **Step 1: Write failing test in `tests/Unit/StorefrontPayoutProcessingServiceTest.php`**
  - Test intent creation and external Chapa call happens outside open DB transaction.
  - Test pending response keeps payout in `provider_pending` with funds in `CREATOR_RESERVED`.
  - Test successful verification transitions payout to `paid` and calls `CreatorLedgerService::disbursePayout`.
  - Test failed verification transitions payout to `failed` and calls `CreatorLedgerService::releasePayoutReservation`.
  - Test retry with same intent reuses existing `merchant_reference` and `idempotency_key`.

- [ ] **Step 2: Implement `StorefrontPayoutProcessingService`**
  - `prepareIntent(PayoutRequest $payout): StorefrontPayoutIntent`
  - `submitPayout(StorefrontPayoutIntent $intent): StorefrontPayoutIntent`
  - `verifyPayout(StorefrontPayoutIntent $intent): StorefrontPayoutIntent`

- [ ] **Step 3: Update `PayoutRequestService`**
  - Prevent inline `mark_paid` from calling `ChapaPayoutService` inside DB transaction.
  - Wire automated transfers through `StorefrontPayoutProcessingService`.

- [ ] **Step 4: Run unit tests and ensure all pass**

---

### Task 3: Admin Hardening & Audit Trail (FIN-06)

**Files:**
- Modify: `app/Storefront/Controllers/AdminPayoutRequestsController.php`
- Test: `tests/Unit/AdminPayoutRequestsHardeningTest.php`

- [ ] **Step 1: Write failing test in `tests/Unit/AdminPayoutRequestsHardeningTest.php`**
  - Test `destroy` endpoint rejects deletion with 403 Forbidden.
  - Test `mark_paid` requires transfer reference.

- [ ] **Step 2: Update `AdminPayoutRequestsController`**
  - Forbid or remove destructive deletion.
  - Validate manual transfer details.

- [ ] **Step 3: Run unit tests and ensure all pass**

---

### Task 4: Local Verification, CodeScene Audit & PR Creation

- [ ] **Step 1: Run complete test suite locally**
- [ ] **Step 2: Verify CodeScene biomarkers (cyclomatic <= 9, args <= 4, params <= 5)**
- [ ] **Step 3: Push branch `work/lkp-003-payout-hardening` and open PR**
