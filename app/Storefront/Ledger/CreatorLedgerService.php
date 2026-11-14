<?php

namespace App\Storefront\Ledger;

use App\Storefront\Ledger\Exceptions\InsufficientBalanceException;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontJournalLine;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Facades\DB;

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

        $entryData = new JournalEntryData(
            sourceType: 'order',
            sourceId: $order->id,
            eventType: 'sale_settled',
            currency: $currency,
            creatorId: $order->creator_id,
            workspaceId: $order->product?->workspace_id,
            description: "Platform verified marketplace sale #{$order->id}",
            occurredAt: $order->paid_at ?? now(),
            metadata: [
                'order_id' => $order->id,
                'uuid' => $order->uuid,
                'commission_bps' => $order->commission_bps,
            ],
        );

        $lines = [
            new JournalLineData(
                accountCode: AccountCodes::PLATFORM_CHAPA_CLEARING,
                debitCents: $order->gross_amount_cents,
                creditCents: 0,
                currency: $currency,
                creatorId: $order->creator_id,
                workspaceId: $order->product?->workspace_id,
            ),
            new JournalLineData(
                accountCode: AccountCodes::CREATOR_HELD,
                debitCents: 0,
                creditCents: $order->creator_earnings_cents,
                currency: $currency,
                creatorId: $order->creator_id,
                workspaceId: $order->product?->workspace_id,
            ),
            new JournalLineData(
                accountCode: AccountCodes::PLATFORM_COMMISSION,
                debitCents: 0,
                creditCents: $order->platform_fee_cents,
                currency: $currency,
                creatorId: $order->creator_id,
                workspaceId: $order->product?->workspace_id,
            ),
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
        $currency = $order->currency ?: config('storefront.currency', 'ETB');

        $entryData = new JournalEntryData(
            sourceType: 'order',
            sourceId: $order->id,
            eventType: 'funds_available',
            currency: $currency,
            creatorId: $order->creator_id,
            workspaceId: $order->product?->workspace_id,
            description: "Escrow hold released to available balance for order #{$order->id}",
            occurredAt: now(),
        );

        $lines = [
            new JournalLineData(
                accountCode: AccountCodes::CREATOR_HELD,
                debitCents: $order->creator_earnings_cents,
                creditCents: 0,
                currency: $currency,
                creatorId: $order->creator_id,
                workspaceId: $order->product?->workspace_id,
            ),
            new JournalLineData(
                accountCode: AccountCodes::CREATOR_AVAILABLE,
                debitCents: 0,
                creditCents: $order->creator_earnings_cents,
                currency: $currency,
                creatorId: $order->creator_id,
                workspaceId: $order->product?->workspace_id,
            ),
        ];

        return $this->postingService->post($entryData, $lines);
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

        $entryData = new JournalEntryData(
            sourceType: 'payout',
            sourceId: $payout->id,
            eventType: 'withdrawal_reserved',
            currency: $currency,
            creatorId: $payout->creator_id,
            workspaceId: $payout->workspace_id,
            description: "Withdrawal reservation for payout request #{$payout->id}",
            occurredAt: now(),
        );

        $lines = [
            new JournalLineData(
                accountCode: AccountCodes::CREATOR_AVAILABLE,
                debitCents: $payout->amount_cents,
                creditCents: 0,
                currency: $currency,
                creatorId: $payout->creator_id,
                workspaceId: $payout->workspace_id,
            ),
            new JournalLineData(
                accountCode: AccountCodes::CREATOR_RESERVED,
                debitCents: 0,
                creditCents: $payout->amount_cents,
                currency: $currency,
                creatorId: $payout->creator_id,
                workspaceId: $payout->workspace_id,
            ),
        ];

        return $this->postingService->post($entryData, $lines);
    }

    /**
     * Releases a reserved withdrawal balance back to available (e.g. upon rejection or cancellation).
     */
    public function releasePayoutReservation(PayoutRequest $payout): StorefrontJournalEntry
    {
        $currency = $payout->currency ?: config('storefront.currency', 'ETB');

        $entryData = new JournalEntryData(
            sourceType: 'payout',
            sourceId: $payout->id,
            eventType: 'withdrawal_released',
            currency: $currency,
            creatorId: $payout->creator_id,
            workspaceId: $payout->workspace_id,
            description: "Withdrawal reservation released for payout request #{$payout->id}",
            occurredAt: now(),
        );

        $lines = [
            new JournalLineData(
                accountCode: AccountCodes::CREATOR_RESERVED,
                debitCents: $payout->amount_cents,
                creditCents: 0,
                currency: $currency,
                creatorId: $payout->creator_id,
                workspaceId: $payout->workspace_id,
            ),
            new JournalLineData(
                accountCode: AccountCodes::CREATOR_AVAILABLE,
                debitCents: 0,
                creditCents: $payout->amount_cents,
                currency: $currency,
                creatorId: $payout->creator_id,
                workspaceId: $payout->workspace_id,
            ),
        ];

        return $this->postingService->post($entryData, $lines);
    }

    /**
     * Disburses a paid withdrawal, extinguishing reserved creator liability.
     */
    public function disbursePayout(PayoutRequest $payout): StorefrontJournalEntry
    {
        $currency = $payout->currency ?: config('storefront.currency', 'ETB');

        $entryData = new JournalEntryData(
            sourceType: 'payout',
            sourceId: $payout->id,
            eventType: 'withdrawal_disbursed',
            currency: $currency,
            creatorId: $payout->creator_id,
            workspaceId: $payout->workspace_id,
            description: "Withdrawal disbursed for payout request #{$payout->id}",
            occurredAt: now(),
        );

        $lines = [
            new JournalLineData(
                accountCode: AccountCodes::CREATOR_RESERVED,
                debitCents: $payout->amount_cents,
                creditCents: 0,
                currency: $currency,
                creatorId: $payout->creator_id,
                workspaceId: $payout->workspace_id,
            ),
            new JournalLineData(
                accountCode: AccountCodes::PLATFORM_BANK_DISBURSED,
                debitCents: 0,
                creditCents: $payout->amount_cents,
                currency: $currency,
                creatorId: $payout->creator_id,
                workspaceId: $payout->workspace_id,
            ),
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
        int $feeReversalCents,
        ?int $refundId = null,
    ): StorefrontJournalEntry {
        $currency = $order->currency ?: config('storefront.currency', 'ETB');
        $creatorId = $order->creator_id;
        $workspaceId = $order->product?->workspace_id;

        $balances = $this->getBalances($creatorId, $currency, $workspaceId);
        $held = $balances['held'];
        $available = $balances['available'];

        // Determine where to deduct creator reversal from
        $fromHeld = min($creatorReversalCents, $held);
        $remaining = $creatorReversalCents - $fromHeld;

        $fromAvailable = min($remaining, $available);
        $deficit = $remaining - $fromAvailable;

        $entryData = new JournalEntryData(
            sourceType: 'refund',
            sourceId: $refundId ?? $order->id,
            eventType: 'refund_executed',
            currency: $currency,
            creatorId: $creatorId,
            workspaceId: $workspaceId,
            description: "Refund recorded for order #{$order->id}",
            occurredAt: now(),
            metadata: [
                'order_id' => $order->id,
                'refund_id' => $refundId,
                'gross_refund_cents' => $refundAmountCents,
            ],
        );

        $lines = [];

        // Reverse platform commission
        if ($feeReversalCents > 0) {
            $lines[] = new JournalLineData(
                accountCode: AccountCodes::PLATFORM_COMMISSION,
                debitCents: $feeReversalCents,
                creditCents: 0,
                currency: $currency,
                creatorId: $creatorId,
                workspaceId: $workspaceId,
            );
        }

        // Reverse creator share from held
        if ($fromHeld > 0) {
            $lines[] = new JournalLineData(
                accountCode: AccountCodes::CREATOR_HELD,
                debitCents: $fromHeld,
                creditCents: 0,
                currency: $currency,
                creatorId: $creatorId,
                workspaceId: $workspaceId,
            );
        }

        // Reverse creator share from available
        if ($fromAvailable > 0) {
            $lines[] = new JournalLineData(
                accountCode: AccountCodes::CREATOR_AVAILABLE,
                debitCents: $fromAvailable,
                creditCents: 0,
                currency: $currency,
                creatorId: $creatorId,
                workspaceId: $workspaceId,
            );
        }

        // If creator balance cannot cover reversal, record deficit receivable
        if ($deficit > 0) {
            $lines[] = new JournalLineData(
                accountCode: AccountCodes::CREATOR_DEFICIT_RECEIVABLE,
                debitCents: $deficit,
                creditCents: 0,
                currency: $currency,
                creatorId: $creatorId,
                workspaceId: $workspaceId,
            );
        }

        // Credit clearing account for gross refund
        $lines[] = new JournalLineData(
            accountCode: AccountCodes::PLATFORM_CHAPA_CLEARING,
            debitCents: 0,
            creditCents: $refundAmountCents,
            currency: $currency,
            creatorId: $creatorId,
            workspaceId: $workspaceId,
        );

        return $this->postingService->post($entryData, $lines);
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

        $heldCredits = (int) $lines->where('account_code', AccountCodes::CREATOR_HELD)->sum('credit_cents');
        $heldDebits = (int) $lines->where('account_code', AccountCodes::CREATOR_HELD)->sum('debit_cents');
        $held = max(0, $heldCredits - $heldDebits);

        $availableCredits = (int) $lines->where('account_code', AccountCodes::CREATOR_AVAILABLE)->sum('credit_cents');
        $availableDebits = (int) $lines->where('account_code', AccountCodes::CREATOR_AVAILABLE)->sum('debit_cents');
        $available = max(0, $availableCredits - $availableDebits);

        $reservedCredits = (int) $lines->where('account_code', AccountCodes::CREATOR_RESERVED)->sum('credit_cents');
        $reservedDebits = (int) $lines->where('account_code', AccountCodes::CREATOR_RESERVED)->sum('debit_cents');
        $reserved = max(0, $reservedCredits - $reservedDebits);

        $deficitDebits = (int) $lines->where('account_code', AccountCodes::CREATOR_DEFICIT_RECEIVABLE)->sum('debit_cents');
        $deficitCredits = (int) $lines->where('account_code', AccountCodes::CREATOR_DEFICIT_RECEIVABLE)->sum('credit_cents');
        $deficit = max(0, $deficitDebits - $deficitCredits);

        return [
            'held' => $held,
            'available' => $available,
            'reserved' => $reserved,
            'deficit' => $deficit,
            'currency' => $currency,
        ];
    }

    public function getAvailableBalance(int $creatorId, string $currency, ?int $workspaceId = null, bool $lock = false): int
    {
        return $this->getBalances($creatorId, $currency, $workspaceId, $lock)['available'];
    }
}
