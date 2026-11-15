<?php

namespace App\Storefront\Ledger;

use App\Storefront\Ledger\Exceptions\InsufficientBalanceException;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontJournalLine;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Collection;

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
        ];

        if ($order->platform_fee_cents > 0) {
            $lines[] = new JournalLineData(AccountCodes::PLATFORM_COMMISSION, 0, $order->platform_fee_cents, $currency, $context);
        }

        return $this->postingService->post($entryData, $lines);
    }

    /**
     * Releases held creator earnings into available withdrawable balance.
     */
    public function releaseHeldToAvailable(StorefrontOrder $order): ?StorefrontJournalEntry
    {
        if (!$order->isPlatformCollected() || (int) $order->creator_earnings_cents <= 0) {
            return null;
        }

        $order->loadMissing('product');
        $currency = $order->currency ?: config('storefront.currency', 'ETB');
        $context = ['creator_id' => $order->creator_id, 'workspace_id' => $order->product?->workspace_id];

        $entryData = new JournalEntryData(
            sourceType: 'order',
            sourceId: $order->id,
            eventType: 'funds_available',
            currency: $currency,
            attributes: [
                'creator_id' => $order->creator_id,
                'workspace_id' => $order->product?->workspace_id,
                'description' => "Escrow hold released to available balance for order #{$order->id}",
                'occurred_at' => now(),
            ],
        );

        return $this->postTwoLegTransfer($entryData, [
            'from' => AccountCodes::CREATOR_HELD,
            'to' => AccountCodes::CREATOR_AVAILABLE,
            'amount_cents' => $order->creator_earnings_cents,
            'currency' => $currency,
            'context' => $context,
        ]);
    }

    /**
     * Reserves available funds for a pending withdrawal request.
     */
    public function reserveForPayout(PayoutRequest $payout, ?int $availableBalance = null): StorefrontJournalEntry
    {
        $currency = $payout->currency ?: config('storefront.currency', 'ETB');
        $available = $availableBalance ?? $this->getWithdrawableBalance(BalanceQuery::for($payout->creator_id, $currency, $payout->workspace_id));

        if ($payout->amount_cents > $available) {
            throw new InsufficientBalanceException(
                "Requested payout of {$payout->amount_cents} exceeds available balance of {$available} {$currency}."
            );
        }

        return $this->postPayoutTransfer(
            $payout,
            'withdrawal_reserved',
            ['from' => AccountCodes::CREATOR_AVAILABLE, 'to' => AccountCodes::CREATOR_RESERVED],
        );
    }

    /**
     * Releases a reserved withdrawal balance back to available (e.g. upon rejection or cancellation).
     */
    public function releasePayoutReservation(PayoutRequest $payout): StorefrontJournalEntry
    {
        return $this->postPayoutTransfer(
            $payout,
            'withdrawal_released',
            ['from' => AccountCodes::CREATOR_RESERVED, 'to' => AccountCodes::CREATOR_AVAILABLE],
        );
    }

    /**
     * Disburses a paid withdrawal, extinguishing reserved creator liability.
     */
    public function disbursePayout(PayoutRequest $payout): StorefrontJournalEntry
    {
        return $this->postPayoutTransfer(
            $payout,
            'withdrawal_disbursed',
            ['from' => AccountCodes::CREATOR_RESERVED, 'to' => AccountCodes::PLATFORM_BANK_DISBURSED],
        );
    }

    private function postPayoutTransfer(
        PayoutRequest $payout,
        string $eventType,
        array $accounts,
    ): StorefrontJournalEntry {
        $currency = $payout->currency ?: config('storefront.currency', 'ETB');
        $context = ['creator_id' => $payout->creator_id, 'workspace_id' => $payout->workspace_id];

        $entryData = new JournalEntryData(
            sourceType: 'payout',
            sourceId: $payout->id,
            eventType: $eventType,
            currency: $currency,
            attributes: [
                'creator_id' => $payout->creator_id,
                'workspace_id' => $payout->workspace_id,
                'description' => "Withdrawal transition {$eventType} for payout #{$payout->id}",
                'occurred_at' => now(),
            ],
        );

        return $this->postTwoLegTransfer($entryData, [
            'from' => $accounts['from'],
            'to' => $accounts['to'],
            'amount_cents' => $payout->amount_cents,
            'currency' => $currency,
            'context' => $context,
        ]);
    }

    /**
     * Helper to execute balanced two-leg transfers between liability/asset accounts.
     */
    private function postTwoLegTransfer(
        JournalEntryData $entryData,
        array $config,
    ): StorefrontJournalEntry {
        $currency = $config['currency'];
        $context = $config['context'] ?? [];
        $amountCents = $config['amount_cents'];

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
        RefundBreakdown $breakdown,
    ): StorefrontJournalEntry {
        $currency = $order->currency ?: config('storefront.currency', 'ETB');
        $creatorId = $order->creator_id;
        $workspaceId = $order->product?->workspace_id;

        $entryData = new JournalEntryData(
            sourceType: 'refund',
            sourceId: $breakdown->refundId ?? $order->id,
            eventType: 'refund_executed',
            currency: $currency,
            attributes: [
                'creator_id' => $creatorId,
                'workspace_id' => $workspaceId,
                'description' => "Refund recorded for order #{$order->id}",
                'occurred_at' => now(),
                'metadata' => [
                    'order_id' => $order->id,
                    'refund_id' => $breakdown->refundId,
                    'gross_refund_cents' => $breakdown->grossCents,
                ],
            ],
        );

        $lines = $this->buildRefundLines($order, $breakdown);

        return $this->postingService->post($entryData, $lines);
    }

    private function buildRefundLines(
        StorefrontOrder $order,
        RefundBreakdown $breakdown,
    ): array {
        $currency = $order->currency ?: config('storefront.currency', 'ETB');
        $creatorId = $order->creator_id;
        $workspaceId = $order->product?->workspace_id;
        $context = ['creator_id' => $creatorId, 'workspace_id' => $workspaceId];

        $balances = $this->getBalances(BalanceQuery::for($creatorId, $currency, $workspaceId));
        $fromHeld = min($breakdown->creatorCents, $balances['held']);
        $remaining = $breakdown->creatorCents - $fromHeld;
        $fromAvailable = min($remaining, $balances['available']);
        $deficit = $remaining - $fromAvailable;

        $lines = [];
        if ($breakdown->feeCents > 0) {
            $lines[] = new JournalLineData(AccountCodes::PLATFORM_COMMISSION, $breakdown->feeCents, 0, $currency, $context);
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
        $lines[] = new JournalLineData(AccountCodes::PLATFORM_CHAPA_CLEARING, 0, $breakdown->grossCents, $currency, $context);

        return $lines;
    }

    /**
     * Returns balances for a creator and currency strictly from double-entry journal lines.
     */
    public function getBalances(BalanceQuery $query): array
    {
        $dbQuery = StorefrontJournalLine::query()
            ->where('creator_id', $query->creatorId)
            ->where('currency', $query->currency);

        if ($query->workspaceId !== null) {
            $dbQuery->where('workspace_id', $query->workspaceId);
        }

        if ($query->lock) {
            $dbQuery->lockForUpdate();
        }

        $lines = $dbQuery->get(['account_code', 'debit_cents', 'credit_cents']);

        return [
            'held' => $this->calculateBalance($lines, AccountCodes::CREATOR_HELD),
            'available' => $this->calculateBalance($lines, AccountCodes::CREATOR_AVAILABLE),
            'reserved' => $this->calculateBalance($lines, AccountCodes::CREATOR_RESERVED),
            'deficit' => $this->calculateAssetBalance($lines, AccountCodes::CREATOR_DEFICIT_RECEIVABLE),
            'currency' => $query->currency,
        ];
    }

    private function calculateBalance(Collection $lines, string $accountCode): int
    {
        $credits = (int) $lines->where('account_code', $accountCode)->sum('credit_cents');
        $debits = (int) $lines->where('account_code', $accountCode)->sum('debit_cents');
        return max(0, $credits - $debits);
    }

    private function calculateAssetBalance(Collection $lines, string $accountCode): int
    {
        $debits = (int) $lines->where('account_code', $accountCode)->sum('debit_cents');
        $credits = (int) $lines->where('account_code', $accountCode)->sum('credit_cents');
        return max(0, $debits - $credits);
    }

    public function getAvailableBalance(BalanceQuery $query): int
    {
        return $this->getBalances($query)['available'];
    }

    public function getWithdrawableBalance(BalanceQuery $query): int
    {
        $balances = $this->getBalances($query);

        return max(0, $balances['available'] - $balances['deficit']);
    }

    /**
     * Offsets outstanding creator deficit receivable using matured available balance.
     */
    public function settleDeficitFromAvailable(BalanceQuery $query): ?StorefrontJournalEntry
    {
        $balances = $this->getBalances($query);
        $recoverable = min($balances['available'], $balances['deficit']);

        if ($recoverable <= 0) {
            return null;
        }

        $context = ['creator_id' => $query->creatorId, 'workspace_id' => $query->workspaceId];
        $entryData = new JournalEntryData(
            sourceType: 'creator_settlement',
            sourceId: $query->creatorId,
            eventType: 'deficit_recovered',
            currency: $query->currency,
            attributes: [
                'creator_id' => $query->creatorId,
                'workspace_id' => $query->workspaceId,
                'description' => "Recovered {$recoverable} {$query->currency} creator deficit from available earnings",
                'occurred_at' => now(),
            ],
        );

        $lines = [
            new JournalLineData(AccountCodes::CREATOR_AVAILABLE, $recoverable, 0, $query->currency, $context),
            new JournalLineData(AccountCodes::CREATOR_DEFICIT_RECEIVABLE, 0, $recoverable, $query->currency, $context),
        ];

        return $this->postingService->post($entryData, $lines);
    }
}
