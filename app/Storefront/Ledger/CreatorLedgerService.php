<?php

namespace App\Storefront\Ledger;

use App\Storefront\Ledger\Exceptions\InsufficientBalanceException;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontJournalLine;
use App\Storefront\Models\StorefrontOrder;

class CreatorLedgerService
{
    public function __construct(
        protected JournalPostingService $postingService,
    ) {
    }

    /**
     * Records platform-collected order settlement in the financial ledger.
     * Guard: Only platform-collected orders may create platform liabilities (FIN-01).
     */
    public function recordPlatformSale(StorefrontOrder $order): ?StorefrontJournalEntry
    {
        if (!$order->isPlatformCollected()) {
            return null;
        }

        $order->loadMissing('product');
        $currency = $order->currency ?: config('storefront.currency', 'ETB');
        $context = ['creator_id' => $order->creator_id, 'workspace_id' => $order->product?->workspace_id];

        $entryData = new JournalEntryData(
            sourceType: 'order',
            sourceId: $order->id,
            eventType: 'sale_settled',
            currency: $currency,
            attributes: [
                'creator_id' => $order->creator_id,
                'workspace_id' => $order->product?->workspace_id,
                'description' => "Platform verified marketplace sale #{$order->id}",
                'occurred_at' => $order->paid_at ?? now(),
                'metadata' => [
                    'order_id' => $order->id,
                    'uuid' => $order->uuid,
                    'commission_bps' => $order->commission_bps,
                ],
            ],
        );

        $lines = [
            new JournalLineData(AccountCodes::PLATFORM_CHAPA_CLEARING, $order->gross_amount_cents, 0, $currency, $context),
            new JournalLineData(AccountCodes::CREATOR_HELD, 0, $order->creator_earnings_cents, $currency, $context),
            new JournalLineData(AccountCodes::PLATFORM_COMMISSION, 0, $order->platform_fee_cents, $currency, $context),
        ];

        return $this->postingService->post($entryData, $lines);
    }

    /**
     * Releases held creator earnings into available withdrawable balance.
     */
    public function releaseHeldToAvailable(StorefrontOrder $order): ?StorefrontJournalEntry
    {
        if (!$order->isPlatformCollected()) {
            return null;
        }

        $order->loadMissing('product');
        return $this->postTwoLegTransfer(
            'order',
            $order->id,
            'funds_available',
            [
                'from' => AccountCodes::CREATOR_HELD,
                'to' => AccountCodes::CREATOR_AVAILABLE,
                'amount_cents' => $order->creator_earnings_cents,
                'currency' => $order->currency ?: config('storefront.currency', 'ETB'),
                'context' => ['creator_id' => $order->creator_id, 'workspace_id' => $order->product?->workspace_id],
                'description' => "Escrow hold released to available balance for order #{$order->id}",
            ],
        );
    }

    /**
     * Reserves available funds for a pending withdrawal request.
     */
    public function reserveForPayout(PayoutRequest $payout, ?int $availableBalance = null): StorefrontJournalEntry
    {
        $currency = $payout->currency ?: config('storefront.currency', 'ETB');
        $available = $availableBalance ?? $this->getAvailableBalance($payout->creator_id, $currency, $payout->workspace_id);

        if ($payout->amount_cents > $available) {
            throw new InsufficientBalanceException(
                "Requested payout of {$payout->amount_cents} exceeds available balance of {$available} {$currency}."
            );
        }

        return $this->postTwoLegTransfer(
            'payout',
            $payout->id,
            'withdrawal_reserved',
            [
                'from' => AccountCodes::CREATOR_AVAILABLE,
                'to' => AccountCodes::CREATOR_RESERVED,
                'amount_cents' => $payout->amount_cents,
                'currency' => $currency,
                'context' => ['creator_id' => $payout->creator_id, 'workspace_id' => $payout->workspace_id],
                'description' => "Withdrawal reservation for payout request #{$payout->id}",
            ],
        );
    }

    /**
     * Releases a reserved withdrawal balance back to available (e.g. upon rejection or cancellation).
     */
    public function releasePayoutReservation(PayoutRequest $payout): StorefrontJournalEntry
    {
        return $this->postTwoLegTransfer(
            'payout',
            $payout->id,
            'withdrawal_released',
            [
                'from' => AccountCodes::CREATOR_RESERVED,
                'to' => AccountCodes::CREATOR_AVAILABLE,
                'amount_cents' => $payout->amount_cents,
                'currency' => $payout->currency ?: config('storefront.currency', 'ETB'),
                'context' => ['creator_id' => $payout->creator_id, 'workspace_id' => $payout->workspace_id],
                'description' => "Withdrawal reservation released for payout request #{$payout->id}",
            ],
        );
    }

    /**
     * Disburses a paid withdrawal, extinguishing reserved creator liability.
     */
    public function disbursePayout(PayoutRequest $payout): StorefrontJournalEntry
    {
        return $this->postTwoLegTransfer(
            'payout',
            $payout->id,
            'withdrawal_disbursed',
            [
                'from' => AccountCodes::CREATOR_RESERVED,
                'to' => AccountCodes::PLATFORM_BANK_DISBURSED,
                'amount_cents' => $payout->amount_cents,
                'currency' => $payout->currency ?: config('storefront.currency', 'ETB'),
                'context' => ['creator_id' => $payout->creator_id, 'workspace_id' => $payout->workspace_id],
                'description' => "Withdrawal disbursed for payout request #{$payout->id}",
            ],
        );
    }

    /**
     * Helper to execute balanced two-leg transfers between liability/asset accounts.
     */
    private function postTwoLegTransfer(
        string $sourceType,
        int $sourceId,
        string $eventType,
        array $config,
    ): StorefrontJournalEntry {
        $currency = $config['currency'];
        $context = $config['context'] ?? [];
        $amountCents = $config['amount_cents'];

        $entryData = new JournalEntryData(
            sourceType: $sourceType,
            sourceId: $sourceId,
            eventType: $eventType,
            currency: $currency,
            attributes: [
                'creator_id' => $context['creator_id'] ?? null,
                'workspace_id' => $context['workspace_id'] ?? null,
                'description' => $config['description'] ?? '',
                'occurred_at' => now(),
            ],
        );

        $lines = [
            new JournalLineData($config['from'], $amountCents, 0, $currency, $context),
            new JournalLineData($config['to'], 0, $amountCents, $currency, $context),
        ];

        return $this->postingService->post($entryData, $lines);
    }

    /**
     * Records a refund on a platform-collected order.
     * Prevents negative balances: if creator available balance is insufficient,
     * routes the shortage to CREATOR_DEFICIT_RECEIVABLE.
     */
    public function recordRefund(
        StorefrontOrder $order,
        int $refundAmountCents,
        int $creatorReversalCents,
        array $options = [],
    ): StorefrontJournalEntry {
        $currency = $order->currency ?: config('storefront.currency', 'ETB');
        $feeReversalCents = (int) ($options['fee_reversal_cents'] ?? 0);
        $refundId = $options['refund_id'] ?? null;
        $creatorId = $order->creator_id;
        $workspaceId = $order->product?->workspace_id;

        $entryData = new JournalEntryData(
            sourceType: 'refund',
            sourceId: $refundId ?? $order->id,
            eventType: 'refund_executed',
            currency: $currency,
            attributes: [
                'creator_id' => $creatorId,
                'workspace_id' => $workspaceId,
                'description' => "Refund recorded for order #{$order->id}",
                'occurred_at' => now(),
                'metadata' => [
                    'order_id' => $order->id,
                    'refund_id' => $refundId,
                    'gross_refund_cents' => $refundAmountCents,
                ],
            ],
        );

        $lines = $this->buildRefundLines(
            $order,
            $refundAmountCents,
            $creatorReversalCents,
            $feeReversalCents
        );

        return $this->postingService->post($entryData, $lines);
    }

    private function buildRefundLines(
        StorefrontOrder $order,
        int $refundAmountCents,
        int $creatorReversalCents,
        int $feeReversalCents,
    ): array {
        $currency = $order->currency ?: config('storefront.currency', 'ETB');
        $creatorId = $order->creator_id;
        $workspaceId = $order->product?->workspace_id;
        $context = ['creator_id' => $creatorId, 'workspace_id' => $workspaceId];

        $balances = $this->getBalances($creatorId, $currency, $workspaceId);
        $fromHeld = min($creatorReversalCents, $balances['held']);
        $remaining = $creatorReversalCents - $fromHeld;
        $fromAvailable = min($remaining, $balances['available']);
        $deficit = $remaining - $fromAvailable;

        $lines = [];
        if ($feeReversalCents > 0) {
            $lines[] = new JournalLineData(AccountCodes::PLATFORM_COMMISSION, $feeReversalCents, 0, $currency, $context);
        }
        if ($fromHeld > 0) {
            $lines[] = new JournalLineData(AccountCodes::CREATOR_HELD, $fromHeld, 0, $currency, $context);
        }
        if ($fromAvailable > 0) {
            $lines[] = new JournalLineData(AccountCodes::CREATOR_AVAILABLE, $fromAvailable, 0, $currency, $context);
        }
        if ($deficit > 0) {
            $lines[] = new JournalLineData(AccountCodes::CREATOR_DEFICIT_RECEIVABLE, $deficit, 0, $currency, $context);
        }
        $lines[] = new JournalLineData(AccountCodes::PLATFORM_CHAPA_CLEARING, 0, $refundAmountCents, $currency, $context);

        return $lines;
    }

    /**
     * Returns balances for a creator and currency strictly from double-entry journal lines.
     */
    public function getBalances(int $creatorId, string $currency, ?int $workspaceId = null, bool $lock = false): array
    {
        $query = StorefrontJournalLine::query()
            ->where('creator_id', $creatorId)
            ->where('currency', $currency);

        if ($workspaceId !== null) {
            $query->where('workspace_id', $workspaceId);
        }

        if ($lock) {
            $query->lockForUpdate();
        }

        $lines = $query->get(['account_code', 'debit_cents', 'credit_cents']);

        return [
            'held' => $this->calculateBalance($lines, AccountCodes::CREATOR_HELD),
            'available' => $this->calculateBalance($lines, AccountCodes::CREATOR_AVAILABLE),
            'reserved' => $this->calculateBalance($lines, AccountCodes::CREATOR_RESERVED),
            'deficit' => $this->calculateAssetBalance($lines, AccountCodes::CREATOR_DEFICIT_RECEIVABLE),
            'currency' => $currency,
        ];
    }

    private function calculateBalance($lines, string $accountCode): int
    {
        $credits = (int) $lines->where('account_code', $accountCode)->sum('credit_cents');
        $debits = (int) $lines->where('account_code', $accountCode)->sum('debit_cents');
        return max(0, $credits - $debits);
    }

    private function calculateAssetBalance($lines, string $accountCode): int
    {
        $debits = (int) $lines->where('account_code', $accountCode)->sum('debit_cents');
        $credits = (int) $lines->where('account_code', $accountCode)->sum('credit_cents');
        return max(0, $debits - $credits);
    }

    public function getAvailableBalance(int $creatorId, string $currency, ?int $workspaceId = null, bool $lock = false): int
    {
        return $this->getBalances($creatorId, $currency, $workspaceId, $lock)['available'];
    }
}
