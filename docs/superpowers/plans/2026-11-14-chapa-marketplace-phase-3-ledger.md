# Chapa Marketplace Phase 3 — Immutable Financial Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a transaction-safe, double-entry financial ledger for Linket marketplace payments, isolating platform-collected funds from historical creator-collected sales (FIN-01), enforcing balanced currency-scoped integer entries, and preventing concurrent overdraws.

**Architecture:** 
1. Append-only double-entry relational ledger tables (`storefront_journal_entries` and `storefront_journal_lines`) with strict idempotency keys (`['source_type', 'source_id', 'event_type']`) and zero-sum balance validation (`sum(debits) === sum(credits)`).
2. Explicit `collection_owner` column on `storefront_orders` (`platform_chapa`, `creator_chapa`, `verify_et_creator`) with historical backfill ensuring legacy seller-collected transactions never generate Linket platform liabilities.
3. Domain services (`JournalPostingService`, `CreatorLedgerService`) providing balance tracking (`held`, `available`, `reserved`, `deficit`), reservation locking, and full integration with existing `DigitalProductFinance` and `PayoutRequestService` workflows.

**Tech Stack:** Laravel 13, PHP 8.4, MySQL 8.0, Pest / PHPUnit.

**Spec:** `docs/payments/2026-11-14-chapa-marketplace-sdk-adr.md`

## Global Constraints

- All financial calculations must strictly use non-negative integer cents (minor units). No floats or `round()` for money.
- Currency-scoped accounting: all balances and journal entries must operate within a single explicit currency (e.g. `ETB`). No cross-currency mixing.
- Append-only immutability: financial journal entries and lines cannot be updated or deleted. Corrections must be compensating journal entries.
- Custody isolation (FIN-01): Only orders with `collection_owner === 'platform_chapa'` may create platform payable liabilities (`2010_CREATOR_HELD` or `2020_CREATOR_AVAILABLE`). Historical seller-collected orders (`creator_chapa`, `verify_et_creator`) are isolated from Linket liabilities.
- Single-Profile UI: User and creator experiences must remain single-profile without workspace switchers.

## Review Focus

1. Duplicate webhook delivery or concurrent fulfillment: second fulfillment attempt must be idempotent and cannot create duplicate journal entries or double-credit creator balances.
2. Concurrent withdrawal overdraw race condition: two simultaneous payout requests for the full available balance must not both succeed; one must pass and the second must be rejected with insufficient funds.
3. Historical order refund/adjustment attempt: historical orders without `platform_chapa` ownership must not debit platform clearing accounts or create spurious platform liabilities.
4. Deficit handling on full refund: if a refund occurs after a creator has already withdrawn available funds, the ledger must debit `1030_CREATOR_DEFICIT_RECEIVABLE` rather than driving `2020_CREATOR_AVAILABLE` below zero.
5. Mixed-currency isolation: posting lines with mismatched currencies or querying balances without currency filters must fail fast.

---

### Task 1: Schema Migrations and Models

**Files:**
- Create: `database/migrations/2026_11_14_200000_create_storefront_journal_tables.php`
- Create: `database/migrations/2026_11_14_200001_add_collection_owner_to_storefront_orders.php`
- Create: `app/Storefront/Models/StorefrontJournalEntry.php`
- Create: `app/Storefront/Models/StorefrontJournalLine.php`
- Modify: `app/Storefront/Models/StorefrontOrder.php`
- Test: `tests/Unit/StorefrontJournalSchemaTest.php`

**Interfaces:**
- Consumes: `storefront_orders`, `users`, `workspaces` tables
- Produces: 
  - `StorefrontJournalEntry` model (relations: `lines()`, `order()`, `creator()`, `reversalOf()`, `reversals()`)
  - `StorefrontJournalLine` model (relations: `entry()`, `creator()`)
  - `StorefrontOrder::$collection_owner` attribute and constants (`COLLECTION_OWNER_PLATFORM_CHAPA`, `COLLECTION_OWNER_CREATOR_CHAPA`, `COLLECTION_OWNER_VERIFY_ET_CREATOR`)

- [ ] **Step 1: Write the failing test**

```php
// tests/Unit/StorefrontJournalSchemaTest.php
namespace Tests\Unit;

use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontJournalLine;
use App\Storefront\Models\StorefrontOrder;
use Tests\TestCase;

class StorefrontJournalSchemaTest extends TestCase
{
    public function testStorefrontOrderHasCollectionOwnerConstants(): void
    {
        $this->assertSame('platform_chapa', StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA);
        $this->assertSame('creator_chapa', StorefrontOrder::COLLECTION_OWNER_CREATOR_CHAPA);
        $this->assertSame('verify_et_creator', StorefrontOrder::COLLECTION_OWNER_VERIFY_ET_CREATOR);
    }

    public function testJournalModelsExistAndHaveExpectedCasts(): void
    {
        $entry = new StorefrontJournalEntry([
            'metadata' => ['order_id' => 123],
            'occurred_at' => '2026-11-14 12:00:00',
        ]);
        $line = new StorefrontJournalLine([
            'debit_cents' => 5000,
            'credit_cents' => 0,
        ]);

        $this->assertIsArray($entry->metadata);
        $this->assertInstanceOf(\Carbon\CarbonInterface::class, $entry->occurred_at);
        $this->assertSame(5000, $line->debit_cents);
        $this->assertSame(0, $line->credit_cents);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Unit/StorefrontJournalSchemaTest.php`
Expected: FAIL (constants and models not defined).

- [ ] **Step 3: Implement migrations and models**

1. Create migration `database/migrations/2026_11_14_200000_create_storefront_journal_tables.php`:
   - `storefront_journal_entries`: `id`, `uuid` (unique), `entry_number` (unsignedBigInteger, indexed), `source_type` (string), `source_id` (unsignedBigInteger), `event_type` (string), `creator_id` (unsignedInteger, nullable, indexed), `workspace_id` (unsignedBigInteger, nullable, indexed), `currency` (string 12), `description` (string, nullable), `occurred_at` (timestamp), `reversal_of_id` (foreignId nullable constrained to self), `metadata` (json nullable), timestamps. Unique: `['source_type', 'source_id', 'event_type']`.
   - `storefront_journal_lines`: `id`, `journal_entry_id` (foreignId constrained cascade), `account_code` (string 64, indexed), `creator_id` (unsignedInteger, nullable, indexed), `workspace_id` (unsignedBigInteger, nullable, indexed), `currency` (string 12), `debit_cents` (unsignedBigInteger, default 0), `credit_cents` (unsignedBigInteger, default 0), timestamps. Index on `['creator_id', 'currency', 'account_code']`.
2. Create migration `database/migrations/2026_11_14_200001_add_collection_owner_to_storefront_orders.php`:
   - Add `collection_owner` (string 32, nullable, indexed).
   - Backfill existing rows:
     - If `payment_gateway = 'chapa'` -> `creator_chapa`
     - If `payment_gateway = 'verify_et'` or `payment_account_snapshot IS NOT NULL` -> `verify_et_creator`
     - Otherwise -> `creator_chapa` (safe default: historical orders are never platform-collected)
3. Implement `StorefrontJournalEntry.php` and `StorefrontJournalLine.php`.
4. Update `StorefrontOrder.php` with `COLLECTION_OWNER_*` constants and cast.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Unit/StorefrontJournalSchemaTest.php`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add database/migrations/2026_11_14_200000_create_storefront_journal_tables.php database/migrations/2026_11_14_200001_add_collection_owner_to_storefront_orders.php app/Storefront/Models/StorefrontJournalEntry.php app/Storefront/Models/StorefrontJournalLine.php app/Storefront/Models/StorefrontOrder.php tests/Unit/StorefrontJournalSchemaTest.php
git commit -m "feat(payments): add journal schema and collection owner column (LKP-003)"
```

---

### Task 2: Core Double-Entry Posting Service & Invariants

**Files:**
- Create: `app/Storefront/Ledger/AccountCodes.php`
- Create: `app/Storefront/Ledger/JournalEntryData.php`
- Create: `app/Storefront/Ledger/JournalLineData.php`
- Create: `app/Storefront/Ledger/Exceptions/UnbalancedJournalEntryException.php`
- Create: `app/Storefront/Ledger/Exceptions/InvalidJournalLineException.php`
- Create: `app/Storefront/Ledger/JournalPostingService.php`
- Test: `tests/Unit/JournalPostingServiceTest.php`

**Interfaces:**
- Consumes: `AccountCodes`, `StorefrontJournalEntry`, `StorefrontJournalLine`
- Produces: `JournalPostingService::post(JournalEntryData $entryData, array $lines): StorefrontJournalEntry`

- [ ] **Step 1: Write the failing test**

```php
// tests/Unit/JournalPostingServiceTest.php
namespace Tests\Unit;

use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\JournalEntryData;
use App\Storefront\Ledger\JournalLineData;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Ledger\Exceptions\UnbalancedJournalEntryException;
use App\Storefront\Ledger\Exceptions\InvalidJournalLineException;
use Tests\TestCase;

class JournalPostingServiceTest extends TestCase
{
    public function testRejectsUnbalancedJournalEntry(): void
    {
        $this->expectException(UnbalancedJournalEntryException::class);

        $service = new JournalPostingService();
        $entryData = new JournalEntryData(
            sourceType: 'order',
            sourceId: 1,
            eventType: 'sale_settled',
            currency: 'ETB',
            creatorId: 10,
            workspaceId: 2,
            description: 'Test sale',
        );

        $lines = [
            new JournalLineData(accountCode: AccountCodes::PLATFORM_CHAPA_CLEARING, debitCents: 10000, creditCents: 0, currency: 'ETB'),
            new JournalLineData(accountCode: AccountCodes::CREATOR_HELD, debitCents: 0, creditCents: 8000, currency: 'ETB'), // Missing 2000 commission!
        ];

        $service->validateBalanced($entryData, $lines);
    }

    public function testRejectsNegativeCentsOrSimultaneousDebitCredit(): void
    {
        $this->expectException(InvalidJournalLineException::class);

        $line = new JournalLineData(
            accountCode: AccountCodes::CREATOR_HELD,
            debitCents: 1000,
            creditCents: 1000,
            currency: 'ETB',
        );
        $line->validate();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Unit/JournalPostingServiceTest.php`
Expected: FAIL (classes not defined).

- [ ] **Step 3: Implement Ledger DTOs, Exceptions, and JournalPostingService**

1. Create `AccountCodes.php` defining standard chart of accounts:
   - `PLATFORM_CHAPA_CLEARING = '1010_PLATFORM_CHAPA_CLEARING'` (Asset)
   - `PLATFORM_BANK_DISBURSED = '1020_PLATFORM_BANK_DISBURSED'` (Asset/Contra)
   - `CREATOR_DEFICIT_RECEIVABLE = '1030_CREATOR_DEFICIT_RECEIVABLE'` (Asset)
   - `CREATOR_HELD = '2010_CREATOR_HELD'` (Liability)
   - `CREATOR_AVAILABLE = '2020_CREATOR_AVAILABLE'` (Liability)
   - `CREATOR_RESERVED = '2030_CREATOR_RESERVED'` (Liability)
   - `PLATFORM_COMMISSION = '4010_PLATFORM_COMMISSION'` (Revenue)
   - `GATEWAY_PROCESSING_FEES = '5010_GATEWAY_PROCESSING_FEES'` (Expense)
2. Create `JournalEntryData` and `JournalLineData` readonly DTOs.
3. Create `JournalPostingService.php`:
   - `post(JournalEntryData $entryData, array $lines): StorefrontJournalEntry`
   - Validates that lines are non-empty.
   - Validates line currencies all match entry currency.
   - Validates that `sum(debitCents) === sum(creditCents)`.
   - Uses DB transaction with idempotent handling: if a record with `['source_type' => $entryData->sourceType, 'source_id' => $entryData->sourceId, 'event_type' => $entryData->eventType]` exists, returns existing entry.
   - Saves entry and creates associated lines.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Unit/JournalPostingServiceTest.php`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Ledger/ tests/Unit/JournalPostingServiceTest.php
git commit -m "feat(payments): implement double-entry journal posting service and invariant validation"
```

---

### Task 3: Creator Balance & Lifecycle Ledger Operations

**Files:**
- Create: `app/Storefront/Ledger/Exceptions/InsufficientBalanceException.php`
- Create: `app/Storefront/Ledger/CreatorLedgerService.php`
- Test: `tests/Unit/CreatorLedgerServiceTest.php`

**Interfaces:**
- Consumes: `JournalPostingService`, `AccountCodes`, `StorefrontOrder`, `PayoutRequest`
- Produces:
  - `CreatorLedgerService::recordPlatformSale(StorefrontOrder $order): ?StorefrontJournalEntry`
  - `CreatorLedgerService::releaseHeldToAvailable(StorefrontOrder $order): ?StorefrontJournalEntry`
  - `CreatorLedgerService::reserveForPayout(PayoutRequest $payout): StorefrontJournalEntry`
  - `CreatorLedgerService::releasePayoutReservation(PayoutRequest $payout): StorefrontJournalEntry`
  - `CreatorLedgerService::disbursePayout(PayoutRequest $payout): StorefrontJournalEntry`
  - `CreatorLedgerService::recordRefund(StorefrontOrder $order, int $refundAmountCents, int $creatorReversalCents, int $feeReversalCents, ?int $refundId = null): StorefrontJournalEntry`
  - `CreatorLedgerService::getBalances(int $creatorId, string $currency, ?int $workspaceId = null): array`

- [ ] **Step 1: Write the failing test**

```php
// tests/Unit/CreatorLedgerServiceTest.php
namespace Tests\Unit;

use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\Exceptions\InsufficientBalanceException;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Models\StorefrontOrder;
use Tests\TestCase;

class CreatorLedgerServiceTest extends TestCase
{
    public function testIgnoresNonPlatformChapaOrdersForPlatformLiabilities(): void
    {
        $postingServiceMock = $this->createMock(JournalPostingService::class);
        $postingServiceMock->expects($this->never())->method('post');

        $service = new CreatorLedgerService($postingServiceMock);

        $creatorChapaOrder = new StorefrontOrder([
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_CREATOR_CHAPA,
            'status' => 'paid',
        ]);

        $result = $service->recordPlatformSale($creatorChapaOrder);
        $this->assertNull($result);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Unit/CreatorLedgerServiceTest.php`
Expected: FAIL (CreatorLedgerService not found).

- [ ] **Step 3: Implement CreatorLedgerService**

1. Create `CreatorLedgerService.php`:
   - `recordPlatformSale(StorefrontOrder $order)`:
     - Check `$order->collection_owner === StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA`. If false, returns `null` (custody guard!).
     - Posts:
       - Dr `PLATFORM_CHAPA_CLEARING`: `$order->gross_amount_cents`
       - Cr `CREATOR_HELD`: `$order->creator_earnings_cents`
       - Cr `PLATFORM_COMMISSION`: `$order->platform_fee_cents`
   - `releaseHeldToAvailable(StorefrontOrder $order)`:
     - Dr `CREATOR_HELD`: `$order->creator_earnings_cents`
     - Cr `CREATOR_AVAILABLE`: `$order->creator_earnings_cents`
   - `reserveForPayout(PayoutRequest $payout)`:
     - Validates `$payout->amount_cents <= availableBalance`. If exceeds, throws `InsufficientBalanceException`.
     - Dr `CREATOR_AVAILABLE`: `$payout->amount_cents`
     - Cr `CREATOR_RESERVED`: `$payout->amount_cents`
   - `releasePayoutReservation(PayoutRequest $payout)`:
     - Dr `CREATOR_RESERVED`: `$payout->amount_cents`
     - Cr `CREATOR_AVAILABLE`: `$payout->amount_cents`
   - `disbursePayout(PayoutRequest $payout)`:
     - Dr `CREATOR_RESERVED`: `$payout->amount_cents`
     - Cr `PLATFORM_BANK_DISBURSED`: `$payout->amount_cents`
   - `recordRefund(StorefrontOrder $order, int $refundAmountCents, int $creatorReversalCents, int $feeReversalCents, ?int $refundId = null)`:
     - Enforces non-negative creator balance by routing any shortage to `CREATOR_DEFICIT_RECEIVABLE`.
     - Dr `PLATFORM_COMMISSION`: `$feeReversalCents`
     - Dr `CREATOR_HELD` / `CREATOR_AVAILABLE` / `CREATOR_DEFICIT_RECEIVABLE`: totaling `$creatorReversalCents`
     - Cr `PLATFORM_CHAPA_CLEARING`: `$refundAmountCents`

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Unit/CreatorLedgerServiceTest.php`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Ledger/CreatorLedgerService.php app/Storefront/Ledger/Exceptions/InsufficientBalanceException.php tests/Unit/CreatorLedgerServiceTest.php
git commit -m "feat(payments): implement creator ledger lifecycle and balance service"
```

---

### Task 4: Historical Custody Isolation & Integration

**Files:**
- Modify: `app/Storefront/DigitalProductFinance.php`
- Modify: `app/Storefront/StorefrontWebhookHandler.php`
- Modify: `app/Storefront/PayoutRequestService.php`
- Modify: `app/Storefront/DigitalProductRefundService.php`
- Test: `tests/Unit/HistoricalCustodyIsolationTest.php`

**Interfaces:**
- Consumes: `CreatorLedgerService`, `StorefrontOrder`, `DigitalProductFinance`
- Produces: Updated `DigitalProductFinance::creditOrder` and `StorefrontWebhookHandler::fulfill` respecting `collection_owner`.

- [ ] **Step 1: Write the failing test**

```php
// tests/Unit/HistoricalCustodyIsolationTest.php
namespace Tests\Unit;

use App\Storefront\DigitalProductFinance;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\StorefrontOrder;
use Tests\TestCase;

class HistoricalCustodyIsolationTest extends TestCase
{
    public function testHistoricalOrdersWithoutPlatformCollectionDoNotPostPlatformLiabilities(): void
    {
        $creatorLedgerMock = $this->createMock(CreatorLedgerService::class);
        $creatorLedgerMock->expects($this->never())->method('recordPlatformSale');

        $finance = new DigitalProductFinance($creatorLedgerMock);

        $order = new StorefrontOrder([
            'id' => 999,
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_CREATOR_CHAPA,
            'payment_gateway' => 'chapa',
            'status' => 'paid',
            'currency' => 'ETB',
            'creator_earnings_cents' => 50000,
        ]);

        $finance->creditOrder($order);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Unit/HistoricalCustodyIsolationTest.php`
Expected: FAIL (DigitalProductFinance does not inject CreatorLedgerService).

- [ ] **Step 3: Update Finance and Order fulfillment services**

1. Update `DigitalProductFinance.php`:
   - Inject `CreatorLedgerService`.
   - In `creditOrder(StorefrontOrder $order)`:
     - Check `$order->collection_owner === StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA`.
     - Only if true, call `$this->creatorLedger->recordPlatformSale($order)`.
     - If false, log informational notice that order was creator-collected and skip platform liability posting.
2. In `StorefrontWebhookHandler.php`:
   - Ensure `collection_owner` is set/checked during fulfillment.
3. In `PayoutRequestService.php`:
   - On `create()`, call `CreatorLedgerService::reserveForPayout($payout)`.
   - On `transition(..., 'reject'/'cancel')`, call `CreatorLedgerService::releasePayoutReservation($payout)`.
   - On `transition(..., 'paid')`, call `CreatorLedgerService::disbursePayout($payout)`.
4. In `DigitalProductRefundService.php`:
   - When recording a refund on a platform-collected order, call `CreatorLedgerService::recordRefund(...)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Unit/HistoricalCustodyIsolationTest.php`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/DigitalProductFinance.php app/Storefront/StorefrontWebhookHandler.php app/Storefront/PayoutRequestService.php app/Storefront/DigitalProductRefundService.php tests/Unit/HistoricalCustodyIsolationTest.php
git commit -m "feat(payments): isolate historical seller custody and wire double-entry ledger into finance flows"
```

---

### Task 5: Comprehensive Financial Invariant & Concurrency Verification Test Suite

**Files:**
- Create: `tests/Unit/FinancialLedgerInvariantsTest.php`
- Modify: `tests/Unit/DigitalProductFinanceTest.php`

**Interfaces:**
- Consumes: All ledger models, services, and policies
- Produces: Test suite validating zero-sum balancing, idempotency, currency segregation, and overdraw prevention.

- [ ] **Step 1: Write comprehensive invariant unit tests**

```php
// tests/Unit/FinancialLedgerInvariantsTest.php
namespace Tests\Unit;

use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\JournalEntryData;
use App\Storefront\Ledger\JournalLineData;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Ledger\Exceptions\UnbalancedJournalEntryException;
use App\Storefront\Ledger\Exceptions\InvalidJournalLineException;
use App\Storefront\Ledger\Exceptions\InsufficientBalanceException;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontOrder;
use Tests\TestCase;

class FinancialLedgerInvariantsTest extends TestCase
{
    public function testDoubleEntryZeroSumRuleEnforced(): void
    {
        $service = new JournalPostingService();
        $this->expectException(UnbalancedJournalEntryException::class);
        $entryData = new JournalEntryData('order', 1, 'sale_settled', 'ETB');
        $lines = [
            new JournalLineData(AccountCodes::PLATFORM_CHAPA_CLEARING, 1000, 0, 'ETB'),
            new JournalLineData(AccountCodes::CREATOR_HELD, 0, 900, 'ETB'),
        ];
        $service->validateBalanced($entryData, $lines);
    }

    public function testMixedCurrencyMismatchesRejected(): void
    {
        $service = new JournalPostingService();
        $this->expectException(InvalidJournalLineException::class);
        $entryData = new JournalEntryData('order', 1, 'sale_settled', 'ETB');
        $lines = [
            new JournalLineData(AccountCodes::PLATFORM_CHAPA_CLEARING, 1000, 0, 'USD'),
            new JournalLineData(AccountCodes::CREATOR_HELD, 0, 1000, 'ETB'),
        ];
        $service->validateBalanced($entryData, $lines);
    }

    public function testNegativeBalancePreventedOnPayoutReservation(): void
    {
        $postingMock = $this->createMock(JournalPostingService::class);
        $service = new CreatorLedgerService($postingMock);

        $payout = new PayoutRequest([
            'creator_id' => 42,
            'amount_cents' => 100000,
            'currency' => 'ETB',
        ]);

        $this->expectException(InsufficientBalanceException::class);
        $service->reserveForPayout($payout, availableBalance: 50000);
    }
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `php artisan test tests/Unit/FinancialLedgerInvariantsTest.php`
Expected: PASS.

- [ ] **Step 3: Run existing unit test suite**

Run: `php artisan test tests/Unit/ChapaSdkAdapterTest.php tests/Unit/ChapaV2ClientTest.php tests/Unit/ChapaGatewayTest.php tests/Unit/DigitalProductFinanceTest.php`
Expected: ALL PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/Unit/FinancialLedgerInvariantsTest.php tests/Unit/DigitalProductFinanceTest.php
git commit -m "test(payments): add comprehensive financial ledger invariants and edge-case unit tests"
```
