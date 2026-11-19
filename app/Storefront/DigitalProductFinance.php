<?php

namespace App\Storefront;

use App\Storefront\Ledger\BalanceQuery;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\DigitalProductEarningsLedger;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\MarketplacePayoutPolicy;
use Illuminate\Support\Str;

class DigitalProductFinance
{
    public function __construct(
        protected ?CreatorLedgerService $creatorLedger = null,
    ) {
    }

    protected function creatorLedger(): CreatorLedgerService
    {
        return $this->creatorLedger ??= app(CreatorLedgerService::class);
    }

    public function creditOrder(StorefrontOrder $order): ?DigitalProductEarningsLedger
    {
        // FIN-01: Historical seller-collected orders (creator_chapa, verify_et_creator)
        // were collected into creator-owned accounts and must never create platform liabilities.
        if ($order->isCreatorCollected() || ((int) $order->gross_amount_cents > 0 && !$order->isPlatformCollected())) {
            return null;
        }

        if ($order->isPlatformCollected() && (int) $order->gross_amount_cents > 0) {
            $this->creatorLedger()->recordPlatformSale($order);
        }

        $order->loadMissing('product');
        $workspaceId = $order->product?->workspace_id ?? 0;

        $holdDays = app(MarketplacePayoutPolicy::class)->holdDays();

        $entry = $this->record(
            $workspaceId,
            (int) ($order->creator_id ?? $order->product?->user_id ?? 0),
            "sale:{$order->id}",
            'sale',
            (int) $order->creator_earnings_cents,
            $order->currency ?: config('storefront.currency', 'ETB'),
            [
                'storefront_order_id' => $order->id,
                'available_at' => ($order->paid_at ?? now())->copy()->addDays($holdDays),
                'description' => __('Verified Digital Product sale'),
            ],
        );

        // A verified sale with a zero-day hold should be withdrawable on
        // successful payment verification, even if cron has not run yet.
        if ($holdDays === 0 && $order->status === StorefrontOrder::STATUS_COMPLETED
            && $order->isPlatformCollected() && (int) $order->creator_earnings_cents > 0) {
            $ledger = $this->creatorLedger();
            if ($ledger->releaseHeldToAvailable($order) !== null) {
                $ledger->settleDeficitFromAvailable(BalanceQuery::for(
                    (int) $order->creator_id,
                    strtoupper((string) ($order->currency ?: config('storefront.currency', 'ETB'))),
                    $order->product?->workspace_id,
                ));
            }
        }

        return $entry;
    }

    public function summary(int $creatorId, int $workspaceId, bool $lock = false): array
    {
        $currency = strtoupper((string) config('storefront.currency', 'ETB'));

        $entries = DigitalProductEarningsLedger::query()
            ->where('workspace_id', $workspaceId)
            ->where('creator_id', $creatorId)
            ->where('currency', $currency);

        if ($lock) {
            $entries->lockForUpdate();
        }

        $entries = $entries->get(['entry_type', 'amount_cents', 'available_at', 'storefront_order_id']);
        $policy = app(MarketplacePayoutPolicy::class);
        $saleOrderIds = $entries->where('entry_type', 'sale')->pluck('storefront_order_id')->filter()->unique();
        $saleOrders = StorefrontOrder::query()->whereIn('id', $saleOrderIds->all())
            ->get(['id', 'paid_at', 'collection_owner'])->keyBy('id');

        // Existing sales follow the current hold policy, not a stale stored
        // available_at. The double-entry journal still caps withdrawals.
        $legacyAvailable = (int) $entries->filter(function (DigitalProductEarningsLedger $entry) use ($saleOrders, $policy): bool {
            if ($entry->entry_type === 'sale' && $entry->storefront_order_id) {
                $order = $saleOrders->get($entry->storefront_order_id);
                if ($order?->isPlatformCollected() && $order->paid_at) {
                    return !$order->paid_at->copy()->addDays($policy->holdDays())->isFuture();
                }
            }

            return !$entry->available_at || !$entry->available_at->isFuture();
        })->sum('amount_cents');
        $ledgerBalances = $this->creatorLedger()->getBalances(
            BalanceQuery::for($creatorId, $currency, $workspaceId, $lock)
        );
        $journalWithdrawable = max(0, $ledgerBalances['available'] - $ledgerBalances['deficit']);
        // Never advertise funds that either ledger cannot support.
        // In particular, a matured legacy entry is not proof that the
        // double-entry escrow has been released or a deficit settled.
        $available = min(max(0, $legacyAvailable), $journalWithdrawable);
        $lifetime = (int) $entries->whereIn('entry_type', ['sale', 'admin_adjustment'])->sum('amount_cents');
        $netEarnings = (int) $entries->whereIn('entry_type', ['sale', 'refund', 'admin_adjustment'])->sum('amount_cents');

        // Only count platform-collected orders towards gross sales and commission on the platform
        $orders = StorefrontOrder::query()
            ->where('creator_id', $creatorId)
            ->where('status', 'paid')
            ->where('currency', $currency)
            ->where('collection_owner', StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA)
            ->whereHas('product', fn($query) => $query->where('workspace_id', $workspaceId));

        $payouts = \App\Storefront\Models\PayoutRequest::query()
            ->where('workspace_id', $workspaceId)
            ->where('creator_id', $creatorId)
            ->where('currency', $currency);
        $reserved = (int) (clone $payouts)->whereIn('status', ['requested', 'processing'])->sum('amount_cents');
        $paidOut = (int) $payouts->where('status', 'paid')->sum('amount_cents');

        return [
            'held_earnings_cents' => $ledgerBalances['held'],
            'available_for_payout_cents' => $available,
            'reserved_payout_cents' => $ledgerBalances['reserved'],
            'balance_reconciliation_required' => $legacyAvailable !== $journalWithdrawable
                || $reserved !== $ledgerBalances['reserved'],
            'lifetime_earnings_cents' => $lifetime,
            'gross_sales_cents' => (int) (clone $orders)->sum('gross_amount_cents'),
            'platform_commission_cents' => (int) (clone $orders)->sum('platform_fee_cents'),
            'creator_earnings_cents' => $netEarnings,
            'pending_payout_cents' => $ledgerBalances['reserved'],
            'paid_out_cents' => $paidOut,
            'currency' => $currency,
            'payout_hold_days' => $policy->holdDays(),
            'minimum_withdrawal_cents' => $policy->minimumWithdrawalCents(),
        ];
    }

    public function record(
        int $workspaceId,
        int $creatorId,
        string $sourceKey,
        string $entryType,
        int $amountCents,
        string $currency,
        array $attributes = [],
    ): DigitalProductEarningsLedger {
        return DigitalProductEarningsLedger::query()->firstOrCreate(
            ['source_key' => $sourceKey],
            [
                'uuid' => (string) Str::uuid(),
                'workspace_id' => $workspaceId,
                'creator_id' => $creatorId,
                'entry_type' => $entryType,
                'amount_cents' => $amountCents,
                'currency' => $currency,
                'available_at' => $attributes['available_at'] ?? now(),
                'storefront_order_id' => $attributes['storefront_order_id'] ?? null,
                'payout_request_id' => $attributes['payout_request_id'] ?? null,
                'description' => $attributes['description'] ?? null,
                'metadata' => $attributes['metadata'] ?? null,
            ],
        );
    }
}
