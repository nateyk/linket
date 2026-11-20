<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Models\StorefrontPayoutIntent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class MarketplaceIndependentAudit
{
    private const REQUIRED_TABLES = [
        'storefront_orders',
        'storefront_payment_attempts',
        'digital_product_payment_refunds',
        'payout_requests',
        'storefront_payout_intents',
        'storefront_journal_entries',
        'storefront_journal_lines',
    ];

    /** @var array<string, mixed> */
    private array $report = [];

    public function __construct(
        private readonly MarketplaceEvidenceJournal $journal,
        private readonly MarketplaceReconciliationService $reconciliation,
    ) {}

    /** @return array<string, mixed> */
    public function audit(?MarketplaceProviderEvidence $evidence = null): array
    {
        $this->report = [
            'read_only' => true,
            'provider_evidence_supplied' => $evidence !== null,
            'candidate_for_manual_review' => false,
            'retirement_authorized' => false,
            'live_payouts_authorized' => false,
            'counts' => ['payments' => 0, 'refunds' => 0, 'payouts' => 0],
            'issue_count' => 0,
            'issues' => [],
        ];

        $missing = array_values(array_filter(self::REQUIRED_TABLES,
            static fn (string $table): bool => !Schema::hasTable($table)));
        if ($missing !== []) {
            $this->issue('required_tables_missing', ['record_type' => 'schema', 'record_id' => 0, 'count' => count($missing)]);
            $this->report['missing_tables'] = $missing;
            return $this->report;
        }

        $audit = $this->reconciliation->auditLedgerIntegrity();
        $this->report['journal_balanced'] = $audit->isBalanced;
        if ($audit->hasAnomalies()) {
            $this->issue('journal_integrity_anomaly', ['record_type' => 'journal', 'record_id' => 0, 'count' => max(1, count($audit->issues))]);
        }

        $this->signedLiabilities();
        $this->orders($evidence);
        $this->refunds($evidence);
        $this->payouts($evidence);
        $this->orphanSaleJournals();

        if ($evidence === null) {
            $this->issue('independent_provider_export_missing', ['record_type' => 'provider', 'record_id' => 0]);
        } else {
            foreach ($evidence->unmatchedCounts() as $group => $count) {
                if ($count > 0) {
                    $this->issue('provider_records_without_local_match', ['record_type' => $group, 'record_id' => 0, 'count' => $count]);
                }
            }
        }

        $this->report['candidate_for_manual_review'] = $evidence !== null
            && $this->report['issue_count'] === 0;
        return $this->report;
    }

    private function signedLiabilities(): void
    {
        $accounts = [
            AccountCodes::CREATOR_HELD,
            AccountCodes::CREATOR_AVAILABLE,
            AccountCodes::CREATOR_RESERVED,
        ];
        $balances = DB::table('storefront_journal_lines')
            ->whereNotNull('creator_id')
            ->whereIn('account_code', $accounts)
            // MySQL stores debit/credit as UNSIGNED; cast before subtraction.
            ->selectRaw('creator_id, workspace_id, currency, account_code, CAST(SUM(credit_cents) AS SIGNED) - CAST(SUM(debit_cents) AS SIGNED) AS signed_balance')
            ->groupBy('creator_id', 'workspace_id', 'currency', 'account_code')
            ->cursor();

        foreach ($balances as $balance) {
            if ((int) $balance->signed_balance < 0) {
                $this->issue('negative_creator_liability', [
                    'record_type' => 'creator_liability',
                    'record_id' => (int) $balance->creator_id,
                    'workspace_id' => $balance->workspace_id,
                    'currency' => $balance->currency,
                    'account_code' => $balance->account_code,
                ]);
            }
        }
    }

    private function orders(?MarketplaceProviderEvidence $evidence): void
    {
        StorefrontOrder::query()->with('product')
            ->where('collection_owner', StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA)
            ->whereIn('status', ['paid', 'completed', 'fulfilled', 'refunded'])
            ->chunkById(200, function ($orders) use ($evidence): void {
                foreach ($orders as $order) {
                    $this->count('payments');
                    $this->recordJournalError($this->journal->sale($order), ['record_type' => 'order', 'record_id' => $order->id]);
                    $attempt = $order->paymentAttempts()
                        ->where('status', StorefrontPaymentAttempt::STATUS_SUCCESSFUL)
                        ->latest('id')->first();
                    if (!$attempt) {
                        $this->issue('settled_payment_attempt_missing', ['record_type' => 'order', 'record_id' => $order->id]);
                        continue;
                    }
                    if ((int) $attempt->amount_cents !== (int) $order->gross_amount_cents
                        || strtoupper((string) $attempt->currency) !== strtoupper((string) $order->currency)) {
                        $this->issue('payment_amount_or_currency_mismatch', ['record_type' => 'order', 'record_id' => $order->id]);
                    }
                    $this->compare($evidence, [
                        'group' => 'chapa_payments',
                        'reference' => $attempt->merchant_reference,
                        'amount_cents' => (int) $order->gross_amount_cents,
                        'currency' => (string) $order->currency,
                        'statuses' => ['success', 'successful', 'paid'],
                    ], ['record_type' => 'order', 'record_id' => $order->id]);
                }
            });
    }

    private function refunds(?MarketplaceProviderEvidence $evidence): void
    {
        DigitalProductPaymentRefund::query()->with('order.product')
            ->where('status', DigitalProductPaymentRefund::STATUS_COMPLETED)
            ->chunkById(200, function ($refunds) use ($evidence): void {
                foreach ($refunds as $refund) {
                    $order = $refund->order;
                    if (!$order || !$order->isPlatformCollected()) {
                        if (StorefrontJournalEntry::query()->where('source_type', 'refund')
                            ->where('source_id', $refund->id)->exists()) {
                            $this->issue('historical_refund_has_platform_journal', ['record_type' => 'refund', 'record_id' => $refund->id]);
                        }
                        continue;
                    }
                    $this->count('refunds');
                    $this->recordJournalError($this->journal->refund($refund), ['record_type' => 'refund', 'record_id' => $refund->id]);
                    $reference = $refund->external_reference ?: $refund->chapa_refund_reference;
                    $this->compare($evidence, [
                        'group' => 'chapa_refunds',
                        'reference' => $reference,
                        'amount_cents' => (int) $refund->amount_cents,
                        'currency' => (string) $refund->currency,
                        'statuses' => ['success', 'successful', 'completed', 'refunded'],
                    ], ['record_type' => 'refund', 'record_id' => $refund->id]);
                }
            });
    }

    private function payouts(?MarketplaceProviderEvidence $evidence): void
    {
        PayoutRequest::query()->with('payoutIntents')->chunkById(200,
            function ($payouts) use ($evidence): void {
                foreach ($payouts as $payout) {
                    $this->count('payouts');
                    $this->recordJournalError($this->journal->payout($payout, 'withdrawal_reserved'), ['record_type' => 'payout', 'record_id' => $payout->id]);
                    $this->payoutLifecycle($payout);
                    foreach ($payout->payoutIntents as $intent) {
                        $this->payoutIntent($payout, $intent, $evidence);
                    }
                }
            });
    }

    private function payoutLifecycle(PayoutRequest $payout): void
    {
        if ($payout->status === 'paid') {
            $this->recordJournalError($this->journal->payout($payout, 'withdrawal_disbursed'), ['record_type' => 'payout', 'record_id' => $payout->id]);
            if ($payout->payoutIntents->isEmpty()) {
                $this->issue('manual_payout_needs_independent_settlement_review', ['record_type' => 'payout', 'record_id' => $payout->id]);
            }
        } elseif (in_array($payout->status, ['rejected', 'cancelled'], true)) {
            $this->recordJournalError($this->journal->payout($payout, 'withdrawal_released'), ['record_type' => 'payout', 'record_id' => $payout->id]);
        } elseif (in_array($payout->status, ['requested', 'pending', 'processing'], true)) {
            $this->issue('unsettled_withdrawal', ['record_type' => 'payout', 'record_id' => $payout->id]);
        } else {
            $this->issue('unknown_withdrawal_status', ['record_type' => 'payout', 'record_id' => $payout->id]);
        }
    }

    private function payoutIntent(PayoutRequest $payout, StorefrontPayoutIntent $intent,
        ?MarketplaceProviderEvidence $evidence): void
    {
        if ($intent->amount_cents !== $payout->amount_cents
            || strtoupper((string) $intent->currency) !== strtoupper((string) $payout->currency)) {
            $this->issue('payout_intent_amount_or_currency_mismatch', ['record_type' => 'payout', 'record_id' => $payout->id]);
        }
        if ($intent->status === StorefrontPayoutIntent::STATUS_PREPARED) {
            $this->issue('transfer_prepared_not_settled', ['record_type' => 'payout', 'record_id' => $payout->id]);
            return;
        }
        $statuses = match ($intent->status) {
            StorefrontPayoutIntent::STATUS_SUCCESSFUL => ['success', 'successful', 'completed', 'paid'],
            StorefrontPayoutIntent::STATUS_FAILED => ['failed', 'failed/cancelled', 'reversed', 'rejected'],
            default => ['pending', 'queued', 'processing'],
        };
        if ($payout->status === 'paid' && $intent->status !== StorefrontPayoutIntent::STATUS_SUCCESSFUL) {
            $this->issue('paid_payout_without_verified_success', ['record_type' => 'payout', 'record_id' => $payout->id]);
        }
        $this->compare($evidence, [
            'group' => 'chapa_payouts',
            'reference' => $intent->merchant_reference,
            'amount_cents' => (int) $intent->amount_cents,
            'currency' => (string) $intent->currency,
            'statuses' => $statuses,
        ], ['record_type' => 'payout', 'record_id' => $payout->id]);
    }

    private function orphanSaleJournals(): void
    {
        StorefrontJournalEntry::query()->where('source_type', 'order')
            ->where('event_type', 'sale_settled')->chunkById(200, function ($entries): void {
                foreach ($entries as $entry) {
                    $order = StorefrontOrder::query()->find($entry->source_id);
                    if (!$this->validSettledOrder($order)) {
                        $this->issue('orphan_or_nonplatform_sale_journal', ['record_type' => 'journal', 'record_id' => $entry->id]);
                    }
                }
            });
    }

    private function validSettledOrder(?StorefrontOrder $order): bool
    {
        if ($order === null) {
            return false;
        }
        if (!$order->isPlatformCollected()) {
            return false;
        }
        return in_array($order->status, ['paid', 'completed', 'fulfilled', 'refunded'], true);
    }

    private function compare(?MarketplaceProviderEvidence $evidence, array $subject, array $record): void
    {
        if ($evidence === null) {
            return;
        }
        $result = $evidence->compare($subject['group'], $subject);
        if ($result !== 'matched') {
            $this->issue('provider_'.$result, $record);
        }
    }

    private function count(string $key): void
    {
        $this->report['counts'][$key]++;
    }

    private function recordJournalError(?string $error, array $record): void
    {
        if ($error !== null) {
            $this->issue($error, $record);
        }
    }

    private function issue(string $code, array $record): void
    {
        $occurrences = $record['count'] ?? 1;
        $this->report['issue_count'] += $occurrences;
        if (count($this->report['issues']) < 100) {
            $this->report['issues'][] = ['code' => $code, ...$record, 'count' => $occurrences];
        }
    }
}
