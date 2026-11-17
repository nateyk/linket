<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Payments\VerifyEt\VerifyEtRetirementAudit;
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
        private readonly VerifyEtRetirementAudit $legacy,
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
            'counts' => ['payments' => 0, 'refunds' => 0, 'payouts' => 0, 'legacy_orders' => 0, 'legacy_verifications' => 0],
            'issue_count' => 0,
            'issues' => [],
        ];

        $missing = array_values(array_filter(self::REQUIRED_TABLES,
            static fn (string $table): bool => !Schema::hasTable($table)));
        if ($missing !== []) {
            $this->issue('required_tables_missing', 'schema', 0, count($missing));
            $this->report['missing_tables'] = $missing;
            return $this->report;
        }

        $audit = $this->reconciliation->auditLedgerIntegrity();
        $this->report['journal_balanced'] = $audit->isBalanced;
        if ($audit->hasAnomalies()) {
            $this->issue('journal_integrity_anomaly', 'journal', 0, max(1, count($audit->issues)));
        }

        $this->orders($evidence);
        $this->refunds($evidence);
        $this->payouts($evidence);
        $this->historical($evidence);
        $this->orphanSaleJournals();

        if ($evidence === null) {
            $this->issue('independent_provider_export_missing', 'provider', 0);
        } else {
            foreach ($evidence->unmatchedCounts() as $group => $count) {
                if ($count > 0) {
                    $this->issue('provider_records_without_local_match', $group, 0, $count);
                }
            }
        }

        $this->report['candidate_for_manual_review'] = $evidence !== null
            && $this->report['issue_count'] === 0;
        return $this->report;
    }

    private function orders(?MarketplaceProviderEvidence $evidence): void
    {
        StorefrontOrder::query()->with('product')
            ->where('collection_owner', StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA)
            ->whereIn('status', ['paid', 'completed', 'fulfilled', 'refunded'])
            ->chunkById(200, function ($orders) use ($evidence): void {
                foreach ($orders as $order) {
                    $this->count('payments');
                    $this->recordJournalError($this->journal->sale($order), 'order', $order->id);
                    $attempt = $order->paymentAttempts()
                        ->where('status', StorefrontPaymentAttempt::STATUS_SUCCESSFUL)
                        ->latest('id')->first();
                    if (!$attempt) {
                        $this->issue('settled_payment_attempt_missing', 'order', $order->id);
                        continue;
                    }
                    if ((int) $attempt->amount_cents !== (int) $order->gross_amount_cents
                        || strtoupper((string) $attempt->currency) !== strtoupper((string) $order->currency)) {
                        $this->issue('payment_amount_or_currency_mismatch', 'order', $order->id);
                    }
                    $this->compare($evidence, 'chapa_payments', $attempt->merchant_reference,
                        $order->gross_amount_cents, $order->currency, ['success', 'successful', 'paid'], 'order', $order->id);
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
                            $this->issue('historical_refund_has_platform_journal', 'refund', $refund->id);
                        }
                        continue;
                    }
                    $this->count('refunds');
                    $this->recordJournalError($this->journal->refund($refund), 'refund', $refund->id);
                    $reference = $refund->external_reference ?: $refund->chapa_refund_reference;
                    $this->compare($evidence, 'chapa_refunds', $reference,
                        $refund->amount_cents, $refund->currency,
                        ['success', 'successful', 'completed', 'refunded'], 'refund', $refund->id);
                }
            });
    }

    private function payouts(?MarketplaceProviderEvidence $evidence): void
    {
        PayoutRequest::query()->with('payoutIntents')->chunkById(200,
            function ($payouts) use ($evidence): void {
                foreach ($payouts as $payout) {
                    $this->count('payouts');
                    $this->recordJournalError($this->journal->payout($payout, 'withdrawal_reserved'), 'payout', $payout->id);
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
            $this->recordJournalError($this->journal->payout($payout, 'withdrawal_disbursed'), 'payout', $payout->id);
            if ($payout->payoutIntents->isEmpty()) {
                $this->issue('manual_payout_needs_independent_settlement_review', 'payout', $payout->id);
            }
        } elseif (in_array($payout->status, ['rejected', 'cancelled'], true)) {
            $this->recordJournalError($this->journal->payout($payout, 'withdrawal_released'), 'payout', $payout->id);
        } elseif (in_array($payout->status, ['requested', 'pending', 'processing'], true)) {
            $this->issue('unsettled_withdrawal', 'payout', $payout->id);
        } else {
            $this->issue('unknown_withdrawal_status', 'payout', $payout->id);
        }
    }

    private function payoutIntent(PayoutRequest $payout, StorefrontPayoutIntent $intent,
        ?MarketplaceProviderEvidence $evidence): void
    {
        if ($intent->amount_cents !== $payout->amount_cents
            || strtoupper((string) $intent->currency) !== strtoupper((string) $payout->currency)) {
            $this->issue('payout_intent_amount_or_currency_mismatch', 'payout', $payout->id);
        }
        if ($intent->status === StorefrontPayoutIntent::STATUS_PREPARED) {
            $this->issue('transfer_prepared_not_settled', 'payout', $payout->id);
            return;
        }
        $statuses = match ($intent->status) {
            StorefrontPayoutIntent::STATUS_SUCCESSFUL => ['success', 'successful', 'completed', 'paid'],
            StorefrontPayoutIntent::STATUS_FAILED => ['failed', 'reversed', 'rejected'],
            default => ['pending', 'queued', 'processing'],
        };
        if ($payout->status === 'paid' && $intent->status !== StorefrontPayoutIntent::STATUS_SUCCESSFUL) {
            $this->issue('paid_payout_without_verified_success', 'payout', $payout->id);
        }
        $this->compare($evidence, 'chapa_payouts', $intent->merchant_reference,
            $intent->amount_cents, $intent->currency, $statuses, 'payout', $payout->id);
    }

    private function historical(?MarketplaceProviderEvidence $evidence): void
    {
        $snapshot = $this->legacy->snapshot();
        $this->report['verify_et_retirement'] = $snapshot;
        if (!($snapshot['candidate_for_manual_signoff'] ?? false)) {
            $this->issue('verify_et_retirement_blocked', 'legacy', 0);
        }

        StorefrontOrder::query()->where(function ($query): void {
            $query->where('payment_gateway', 'verify_et')
                ->orWhereIn('collection_owner', ['verify_et_creator', 'creator_chapa']);
        })->chunkById(200, function ($orders): void {
            foreach ($orders as $order) {
                $this->count('legacy_orders');
                if ($this->journal->hasOrderSale((int) $order->id)) {
                    $this->issue('seller_collected_order_created_platform_liability', 'order', $order->id);
                }
            }
        });

        if (!Schema::hasTable('direct_payment_verifications')) {
            return;
        }
        DB::table('direct_payment_verifications')->orderBy('id')->chunkById(200,
            function ($verifications) use ($evidence): void {
                foreach ($verifications as $verification) {
                    $this->count('legacy_verifications');
                    $this->compare($evidence, 'verify_et_verifications', $verification->reference,
                        (int) $verification->amount_cents, (string) $verification->currency,
                        [strtolower((string) $verification->status)], 'verification', $verification->id);
                }
            });
    }

    private function orphanSaleJournals(): void
    {
        StorefrontJournalEntry::query()->where('source_type', 'order')
            ->where('event_type', 'sale_settled')->chunkById(200, function ($entries): void {
                foreach ($entries as $entry) {
                    $order = StorefrontOrder::query()->find($entry->source_id);
                    if (!$order || !$order->isPlatformCollected()
                        || !in_array($order->status, ['paid', 'completed', 'fulfilled', 'refunded'], true)) {
                        $this->issue('orphan_or_nonplatform_sale_journal', 'journal', $entry->id);
                    }
                }
            });
    }

    private function compare(?MarketplaceProviderEvidence $evidence, string $group, ?string $reference,
        int $amountCents, string $currency, array $statuses, string $entity, int $id): void
    {
        if ($evidence === null) {
            return;
        }
        $result = $evidence->compare($group, $reference, $amountCents, $currency, $statuses);
        if ($result !== 'matched') {
            $this->issue('provider_'.$result, $entity, $id);
        }
    }

    private function count(string $key): void
    {
        $this->report['counts'][$key]++;
    }

    private function recordJournalError(?string $error, string $entity, int $id): void
    {
        if ($error !== null) {
            $this->issue($error, $entity, $id);
        }
    }

    private function issue(string $code, string $entity, int $id, int $occurrences = 1): void
    {
        $this->report['issue_count'] += $occurrences;
        if (count($this->report['issues']) < 100) {
            $this->report['issues'][] = ['code' => $code, 'record_type' => $entity, 'record_id' => $id, 'count' => $occurrences];
        }
    }
}
