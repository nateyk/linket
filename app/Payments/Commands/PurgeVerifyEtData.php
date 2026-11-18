<?php

declare(strict_types=1);

namespace App\Payments\Commands;

use App\Storefront\Models\StorefrontOrder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

/**
 * Explicit data reset for the retired Verify.et provider.
 *
 * Never truncate shared commerce tables: Chapa and zero-price orders live there.
 * This is intentionally not called by migrations, deployments, or cron.
 */
final class PurgeVerifyEtData extends Command
{
    protected $signature = 'billing:purge-verify-et
                            {--execute : Apply the purge instead of previewing counts}
                            {--confirm= : Exact confirmation phrase PURGE-VERIFY-ET}';

    protected $description = 'Preview or purge Verify.et-only payment records without touching Chapa or free orders.';

    public function handle(): int
    {
        if (! Schema::hasTable('storefront_orders')) {
            $this->error('Storefront orders table is missing. No records changed.');
            return self::FAILURE;
        }

        $counts = [
            'verify_et_storefront_orders' => $this->countWhere('storefront_orders', 'payment_gateway', 'verify_et'),
            'verify_et_subscriptions' => $this->countWhere('subscriptions', 'gateway_name', 'verify_et'),
            'direct_payment_verifications' => $this->tableCount('direct_payment_verifications'),
            'verify_et_webhook_deliveries' => $this->tableCount('verify_et_webhook_deliveries'),
            'pro_subscription_payments' => $this->tableCount('pro_subscription_payments'),
        ];

        $this->line(json_encode($counts, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));

        if (! $this->option('execute')) {
            $this->info('Preview only. No records changed.');
            return self::SUCCESS;
        }

        if ($this->option('confirm') !== 'PURGE-VERIFY-ET') {
            $this->error('Refusing purge: specify --confirm=PURGE-VERIFY-ET.');
            return self::FAILURE;
        }

        try {
            DB::transaction(function (): void {
                $legacyOrders = DB::table('storefront_orders')
                    ->where('payment_gateway', 'verify_et')
                    ->orderBy('id')
                    ->pluck('id');

                foreach ($legacyOrders->chunk(250) as $ids) {
                    // Refuse to consume or destroy any Chapa payment evidence,
                    // even if it is accidentally associated with a legacy order.
                    if (Schema::hasTable('payment_transactions')
                        && DB::table('payment_transactions')
                            ->where('payable_type', StorefrontOrder::class)
                            ->whereIn('payable_id', $ids)
                            ->where('gateway', 'chapa')
                            ->exists()) {
                        throw new RuntimeException('Chapa transaction references a legacy order.');
                    }

                    if (Schema::hasTable('digital_product_payment_refunds')
                        && Schema::hasTable('payment_transactions')
                        && DB::table('digital_product_payment_refunds as refunds')
                            ->join('payment_transactions as payments', 'payments.id', '=', 'refunds.payment_transaction_id')
                            ->whereIn('refunds.storefront_order_id', $ids)
                            ->where('payments.gateway', 'chapa')
                            ->exists()) {
                        throw new RuntimeException('Chapa refund references a legacy order.');
                    }

                    if (Schema::hasTable('digital_product_earnings_ledger')
                        && DB::table('digital_product_earnings_ledger')
                            ->whereIn('storefront_order_id', $ids)
                            ->whereNotNull('payout_request_id')
                            ->exists()) {
                        throw new RuntimeException('A legacy order has an associated payout reservation.');
                    }

                    foreach ([
                        'creator_verification_allowances',
                        'order_manual_approvals',
                        'commission_accruals',
                        'storefront_payment_disputes',
                        'storefront_payment_attempts',
                        'digital_product_payment_refunds',
                        'digital_product_earnings_ledger',
                        'download_entitlements',
                        'storefront_order_items',
                    ] as $table) {
                        $this->deleteWhereIn($table, 'storefront_order_id', $ids->all(),
                            $table === 'storefront_payment_attempts' ? 'order_id' : null);
                    }

                    if (Schema::hasTable('storefront_journal_entries')) {
                        $entries = DB::table('storefront_journal_entries')
                            ->where('source_type', 'order')
                            ->whereIn('source_id', $ids)->pluck('id');
                        $this->deleteWhereIn('storefront_journal_lines', 'journal_entry_id', $entries->all());
                        DB::table('storefront_journal_entries')->whereIn('id', $entries)->delete();
                    }

                    DB::table('storefront_orders')
                        ->where('payment_gateway', 'verify_et')
                        ->whereIn('id', $ids)
                        ->delete();
                }

                // Provider-exclusive tables only; never truncate Chapa payments,
                // platform journals, payout methods, or shared user/product rows.
                foreach ([
                    'direct_payment_verifications',
                    'verify_et_webhook_deliveries',
                    'pro_subscription_payments',
                ] as $table) {
                    if (Schema::hasTable($table)) {
                        DB::table($table)->delete();
                    }
                }

                if (Schema::hasTable('subscriptions')) {
                    DB::table('subscriptions')->where('gateway_name', 'verify_et')->delete();
                }
            }, 1);
        } catch (Throwable $exception) {
            report($exception);
            $this->error('Purge rolled back: '.$exception->getMessage());
            return self::FAILURE;
        }

        $this->info('Verify.et data purge committed. Chapa and free orders were not selected.');
        return self::SUCCESS;
    }

    private function tableCount(string $table): int
    {
        return Schema::hasTable($table) ? (int) DB::table($table)->count() : 0;
    }

    private function countWhere(string $table, string $column, string $value): int
    {
        return Schema::hasTable($table)
            ? (int) DB::table($table)->where($column, $value)->count()
            : 0;
    }

    /**
     * @param list<int> $ids
     */
    private function deleteWhereIn(
        string $table,
        string $column,
        array $ids,
        ?string $overrideColumn = null,
    ): void {
        if ($ids === [] || ! Schema::hasTable($table)) {
            return;
        }
        DB::table($table)->whereIn($overrideColumn ?? $column, $ids)->delete();
    }
}
