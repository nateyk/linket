<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Payments\Chapa\ChapaV2Client;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\BalanceQuery;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontJournalLine;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Models\StorefrontPayoutIntent;
use Carbon\Carbon;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;

class MarketplaceReconciliationService
{
    public function __construct(
        private readonly ?LinketChapaManager $chapaManager = null,
        private readonly ?StorefrontPaymentVerificationService $verificationService = null,
        private readonly ?StorefrontPayoutProcessingService $payoutProcessingService = null,
        private readonly ?CreatorLedgerService $creatorLedger = null,
    ) {
    }

    /**
     * Executes an end-to-end reconciliation run.
     */
    public function reconcile(bool $dryRun = false): ReconciliationReport
    {
        $report = new ReconciliationReport();
        $report->executedAt = Carbon::now();

        if ($dryRun) {
            $report->ledgerAudit = $this->auditLedgerIntegrity();
            return $report;
        }

        $report->missingJournalEntriesFixedCount = $this->reconcileMissingJournalEntries();
        $report->maturedOrdersCount = $this->releaseMaturedEscrow();
        $report->reconciledPaymentsCount = $this->reconcilePendingPaymentAttempts();
        $report->reconciledPayoutsCount = $this->reconcilePendingPayoutIntents();
        $report->ledgerAudit = $this->auditLedgerIntegrity();

        return $report;
    }

    /**
     * Matures held escrow funds to available balance once hold window passes.
     */
    public function releaseMaturedEscrow(): int
    {
        $holdDays = (int) config('store.payout_hold_days', 7);
        $threshold = Carbon::now()->subDays($holdDays);

        return $this->processUnjournaledOrders(
            'funds_available',
            function (StorefrontOrder $order): ?StorefrontJournalEntry {
                $entry = $this->creatorLedger()->releaseHeldToAvailable($order);
                if ($entry !== null) {
                    $currency = $order->currency ?: (string) config('storefront.currency', 'ETB');
                    $this->creatorLedger()->settleDeficitFromAvailable(
                        BalanceQuery::for($order->creator_id, $currency, $order->product?->workspace_id)
                    );
                }

                return $entry;
            },
            $threshold,
        );
    }

    /**
     * Finds paid platform orders missing from the ledger and creates journal entries.
     */
    public function reconcileMissingJournalEntries(): int
    {
        return $this->processUnjournaledOrders(
            'sale_settled',
            fn (StorefrontOrder $order): ?StorefrontJournalEntry => $this->creatorLedger()->recordPlatformSale($order),
        );
    }

    /**
     * @param Closure(StorefrontOrder): ?StorefrontJournalEntry $action
     */
    private function processUnjournaledOrders(string $eventType, Closure $action, ?Carbon $paidBefore = null): int
    {
        $query = StorefrontOrder::query()
            ->where('collection_owner', StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA)
            ->where('status', 'paid')
            ->whereDoesntHave('journalEntries', fn ($q) => $q->where('event_type', $eventType));

        if ($paidBefore !== null) {
            $query->where('paid_at', '<=', $paidBefore)->where('creator_earnings_cents', '>', 0);
        }

        $count = 0;
        foreach ($query->get() as $order) {
            if ($action($order) !== null) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Reconciles pending payment attempts via Chapa API.
     */
    public function reconcilePendingPaymentAttempts(int $staleMinutes = 15): int
    {
        $attempts = StorefrontPaymentAttempt::query()->where(function (Builder $query): void {
            $query->where('status', StorefrontPaymentAttempt::STATUS_PENDING)
                ->orWhere(function (Builder $query): void {
                    // Older verification code wrote provider PENDING responses as failures.
                    $query->where('status', StorefrontPaymentAttempt::STATUS_FAILED)
                        ->where('verification_data->status', 'PENDING');
                });
        });

        return $this->reconcileStaleRecords(
            $attempts,
            $staleMinutes,
            fn (StorefrontPaymentAttempt $attempt): bool => $this->reconcileSinglePaymentAttempt($attempt),
        );
    }

    /**
     * Reconciles pending payout intents via Chapa API.
     */
    public function reconcilePendingPayoutIntents(int $staleMinutes = 5): int
    {
        return $this->reconcileStaleRecords(
            StorefrontPayoutIntent::query()->whereIn('status', [
                StorefrontPayoutIntent::STATUS_SUBMITTED,
                StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
            ]),
            $staleMinutes,
            fn (StorefrontPayoutIntent $intent): bool => $this->reconcileSinglePayoutIntent($intent),
        );
    }

    /**
     * @param Builder $query
     * @param Closure(mixed): bool $processor
     */
    private function reconcileStaleRecords(Builder $query, int $staleMinutes, Closure $processor): int
    {
        $threshold = Carbon::now()->subMinutes($staleMinutes);
        $count = 0;

        foreach ($query->where('created_at', '<=', $threshold)->get() as $record) {
            if ($processor($record)) {
                $count++;
            }
        }

        return $count;
    }

    private function reconcileSinglePaymentAttempt(StorefrontPaymentAttempt $attempt): bool
    {
        try {
            $verified = app(ChapaV2Client::class)->verifyPayment(
                (string) $this->manager()->platformSecret(),
                $attempt->merchant_reference,
            );
            $status = strtoupper((string) ($verified['status'] ?? ''));
            $amountCents = ChapaV2Client::centsFromMajor((string) ($verified['amount'] ?? '0'));
            $currency = strtoupper((string) ($verified['currency'] ?? ''));
            $reference = (string) ($verified['merchant_reference'] ?? '');
            $matches = $status === 'SUCCESS'
                && $amountCents === (int) $attempt->amount_cents
                && $currency === strtoupper((string) $attempt->currency)
                && $reference !== ''
                && hash_equals($reference, $attempt->merchant_reference);

            if ($matches) {
                $this->verificationService()->verifyAndFulfill($attempt->merchant_reference);
                return true;
            }

            if ($status === 'FAILED') {
                $attempt->update([
                    'status' => StorefrontPaymentAttempt::STATUS_FAILED,
                    'error_message' => 'Payment verification confirmed failed by Chapa API.',
                    'verification_data' => $verified,
                ]);
                return true;
            }
        } catch (\Throwable $e) {
            Log::warning('marketplace.reconciliation.payment_attempt_failed', [
                'attempt_id' => $attempt->id,
                'reference' => $attempt->merchant_reference,
                'error' => $e->getMessage(),
            ]);
        }

        return false;
    }

    private function reconcileSinglePayoutIntent(StorefrontPayoutIntent $intent): bool
    {
        try {
            $fresh = $this->payoutProcessingService()->verifyPayout($intent);
            return $fresh->isSuccessful() || $fresh->isFailed();
        } catch (\Throwable $e) {
            Log::warning('marketplace.reconciliation.payout_intent_failed', [
                'intent_id' => $intent->id,
                'reference' => $intent->merchant_reference,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Audits double-entry ledger invariants across all accounts and creators.
     */
    public function auditLedgerIntegrity(): LedgerAuditResult
    {
        $result = new LedgerAuditResult();
        $result->totalDebitsCents = (int) StorefrontJournalLine::query()->sum('debit_cents');
        $result->totalCreditsCents = (int) StorefrontJournalLine::query()->sum('credit_cents');
        $result->isBalanced = ($result->totalDebitsCents === $result->totalCreditsCents);

        $result->clearingBalanceCents = $this->calculateNetClearing();
        $result->totalCreatorLiabilitiesCents = $this->calculateTotalCreatorLiabilities();
        $result->platformCommissionCents = $this->calculateNetCommission();
        $result->totalDisbursedCents = $this->sumAccount(AccountCodes::PLATFORM_BANK_DISBURSED, 'credit_cents');

        if (!$result->isBalanced) {
            $result->issues[] = "CRITICAL: Global ledger unbalanced. Total debits ({$result->totalDebitsCents}) != total credits ({$result->totalCreditsCents}).";
        }

        $this->auditCreatorBalances($result);

        return $result;
    }

    private function calculateNetClearing(): int
    {
        $debits = $this->sumAccount(AccountCodes::PLATFORM_CHAPA_CLEARING, 'debit_cents');
        $credits = $this->sumAccount(AccountCodes::PLATFORM_CHAPA_CLEARING, 'credit_cents');
        return max(0, $debits - $credits);
    }

    private function calculateTotalCreatorLiabilities(): int
    {
        $held = $this->sumAccount(AccountCodes::CREATOR_HELD, 'credit_cents') - $this->sumAccount(AccountCodes::CREATOR_HELD, 'debit_cents');
        $available = $this->sumAccount(AccountCodes::CREATOR_AVAILABLE, 'credit_cents') - $this->sumAccount(AccountCodes::CREATOR_AVAILABLE, 'debit_cents');
        $reserved = $this->sumAccount(AccountCodes::CREATOR_RESERVED, 'credit_cents') - $this->sumAccount(AccountCodes::CREATOR_RESERVED, 'debit_cents');

        return max(0, $held) + max(0, $available) + max(0, $reserved);
    }

    private function calculateNetCommission(): int
    {
        $credits = $this->sumAccount(AccountCodes::PLATFORM_COMMISSION, 'credit_cents');
        $debits = $this->sumAccount(AccountCodes::PLATFORM_COMMISSION, 'debit_cents');
        return max(0, $credits - $debits);
    }

    private function hasNegativeBalance(array $balances): bool
    {
        if ($balances['held'] < 0) {
            return true;
        }
        if ($balances['available'] < 0) {
            return true;
        }
        return $balances['reserved'] < 0;
    }

    private function auditCreatorBalances(LedgerAuditResult $result): void
    {
        // Withdrawal-facing balances are clamped to zero. Audit the signed
        // journal amounts instead, keeping workspaces and currencies separate.
        $accounts = [
            AccountCodes::CREATOR_HELD => 'held',
            AccountCodes::CREATOR_AVAILABLE => 'available',
            AccountCodes::CREATOR_RESERVED => 'reserved',
        ];
        $rows = StorefrontJournalLine::query()
            ->whereNotNull('creator_id')
            ->whereIn('account_code', array_keys($accounts))
            // Debit and credit columns are UNSIGNED on MySQL; subtract their
            // separately signed sums to avoid an unsigned underflow error.
            ->selectRaw('creator_id, workspace_id, currency, account_code, CAST(SUM(credit_cents) AS SIGNED) - CAST(SUM(debit_cents) AS SIGNED) AS signed_balance')
            ->groupBy('creator_id', 'workspace_id', 'currency', 'account_code')
            ->get();

        foreach ($rows->groupBy(fn ($row) => json_encode([$row->creator_id, $row->workspace_id, $row->currency])) as $group) {
            $first = $group->first();
            $balances = ['held' => 0, 'available' => 0, 'reserved' => 0, 'currency' => $first->currency];
            foreach ($group as $row) {
                $balances[$accounts[$row->account_code]] = (int) $row->signed_balance;
            }
            if (!$this->hasNegativeBalance($balances)) {
                continue;
            }
            $result->negativeBalancesFound[] = [
                'creator_id' => (int) $first->creator_id,
                'workspace_id' => $first->workspace_id === null ? null : (int) $first->workspace_id,
                'balances' => $balances,
            ];
            $result->issues[] = "CRITICAL: Creator #{$first->creator_id} has negative {$first->currency} balance in workspace " . ($first->workspace_id ?? 'unassigned') . ': ' . json_encode($balances);
        }
    }

    private function sumAccount(string $accountCode, string $column): int
    {
        return (int) StorefrontJournalLine::query()->where('account_code', $accountCode)->sum($column);
    }

    private function manager(): LinketChapaManager
    {
        return $this->chapaManager ?? app(LinketChapaManager::class);
    }

    private function verificationService(): StorefrontPaymentVerificationService
    {
        return $this->verificationService ?? app(StorefrontPaymentVerificationService::class);
    }

    private function payoutProcessingService(): StorefrontPayoutProcessingService
    {
        return $this->payoutProcessingService ?? app(StorefrontPayoutProcessingService::class);
    }

    private function creatorLedger(): CreatorLedgerService
    {
        return $this->creatorLedger ?? app(CreatorLedgerService::class);
    }
}
