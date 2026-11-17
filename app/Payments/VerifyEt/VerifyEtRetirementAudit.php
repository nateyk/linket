<?php

declare(strict_types=1);

namespace App\Payments\VerifyEt;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class VerifyEtRetirementAudit
{
    private const REQUIRED_TABLES = [
        'storefront_orders',
        'direct_payment_verifications',
        'verify_et_webhook_deliveries',
        'subscriptions',
        'pro_subscription_payments',
        'storefront_payment_disputes',
    ];

    /** @return array<string, mixed> */
    public function snapshot(): array
    {
        $missing = array_values(array_filter(
            self::REQUIRED_TABLES,
            static fn (string $table): bool => ! Schema::hasTable($table),
        ));

        if ($missing !== []) {
            return [
                'candidate_for_manual_signoff' => false,
                'missing_tables' => $missing,
                'blockers' => null,
                'historical_records' => null,
            ];
        }

        $blockers = $this->blockers();

        return [
            'candidate_for_manual_signoff' => array_sum($blockers) === 0,
            'missing_tables' => [],
            'blockers' => $blockers,
            'historical_records' => $this->historicalCounts(),
        ];
    }

    /** @return array<string, int> */
    private function blockers(): array
    {
        return [
            'unsettled_storefront_orders' => DB::table('storefront_orders')
                ->where('payment_gateway', 'verify_et')
                ->where(function ($query): void {
                    $query->whereNotIn('status', ['paid', 'completed', 'fulfilled', 'expired', 'cancelled'])
                        ->orWhereNull('status');
                })->count(),
            'paid_orders_awaiting_delivery' => DB::table('storefront_orders')
                ->where('payment_gateway', 'verify_et')
                ->whereIn('status', ['paid', 'completed', 'fulfilled'])
                ->where(function ($query): void {
                    $query->where('delivery_status', '!=', 'delivered')
                        ->orWhereNull('delivery_status');
                })->count(),
            'unresolved_verifications' => DB::table('direct_payment_verifications')
                ->where(function ($query): void {
                    $query->whereNotIn('status', ['success', 'manual_approved', 'failed', 'mismatch', 'expired', 'cancelled', 'rejected'])
                        ->orWhereNull('status');
                })->count(),
            'unprocessed_webhooks' => DB::table('verify_et_webhook_deliveries')
                ->where(function ($query): void {
                    $query->whereNotIn('status', ['processed', 'ignored', 'test'])
                        ->orWhereNull('status');
                })->count(),
            'unresolved_pro_subscription_payments' => DB::table('pro_subscription_payments')
                ->where(function ($query): void {
                    $query->whereNotIn('status', ['paid', 'completed', 'expired', 'cancelled', 'rejected', 'failed'])
                        ->orWhereNull('status');
                })->count(),
            'open_legacy_subscriptions' => DB::table('subscriptions')
                ->where('gateway_name', 'verify_et')->whereNull('ends_at')->count(),
            'active_legacy_disputes' => DB::table('storefront_payment_disputes as disputes')
                ->join('storefront_orders as orders', 'orders.id', '=', 'disputes.storefront_order_id')
                ->where('orders.payment_gateway', 'verify_et')
                ->whereIn('disputes.lifecycle_status', ['open', 'investigating'])->count(),
        ];
    }

    /** @return array<string, int> */
    private function historicalCounts(): array
    {
        return [
            'verify_et_storefront_orders' => DB::table('storefront_orders')
                ->where('payment_gateway', 'verify_et')->count(),
            'direct_payment_verifications' => DB::table('direct_payment_verifications')->count(),
            'verify_et_webhook_deliveries' => DB::table('verify_et_webhook_deliveries')->count(),
            'verify_et_subscriptions' => DB::table('subscriptions')
                ->where('gateway_name', 'verify_et')->count(),
            'pro_subscription_payments' => DB::table('pro_subscription_payments')->count(),
        ];
    }
}
