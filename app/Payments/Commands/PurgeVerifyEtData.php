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
 * Explicit reset for the retired provider; never run from migrations or cron.
 * Shared Chapa/zero-price commerce rows must remain untouched.
 */
final class PurgeVerifyEtData extends Command
{
    protected $signature = 'billing:purge-verify-et
                            {--execute : Apply the purge instead of previewing counts}
                            {--confirm= : Exact confirmation phrase PURGE-VERIFY-ET}';

    protected $description = 'Preview or purge Verify.et-only records without touching Chapa or free orders.';

    public function handle(): int
    {
        if (! Schema::hasTable('storefront_orders')) {
            $this->error('Storefront orders table is missing. No records changed.');
            return self::FAILURE;
        }

        $this->line(json_encode($this->previewCounts(), JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));

        if (! $this->option('execute')) {
            $this->info('Preview only. No records changed.');
            return self::SUCCESS;
        }

        if ($this->option('confirm') !== 'PURGE-VERIFY-ET') {
            $this->error('Refusing purge: specify --confirm=PURGE-VERIFY-ET.');
            return self::FAILURE;
        }

        try {
            DB::transaction(fn () => $this->purgeAll(), 1);
        } catch (Throwable $exception) {
            report($exception);
            $this->error('Purge rolled back. See application logs for details.');
            return self::FAILURE;
        }

        $this->info('Verify.et data purge committed. Chapa and free orders were not selected.');
        return self::SUCCESS;
    }

    /** @return array<string, int> */
    private function previewCounts(): array
    {
        return [
            'verify_et_storefront_orders' => $this->countWhere('storefront_orders', 'payment_gateway', 'verify_et'),
            'verify_et_subscriptions' => $this->countWhere('subscriptions', 'gateway_name', 'verify_et'),
            'direct_payment_verifications' => $this->tableCount('direct_payment_verifications'),
            'verify_et_webhook_deliveries' => $this->tableCount('verify_et_webhook_deliveries'),
            'pro_subscription_payments' => $this->tableCount('pro_subscription_payments'),
        ];
    }

    private function purgeAll(): void
    {
        $ids = DB::table('storefront_orders')
            ->where('payment_gateway', 'verify_et')
            ->orderBy('id')
            ->pluck('id');

        foreach ($ids->chunk(250) as $batch) {
            $this->purgeOrders($batch->all());
        }

        $this->purgeProviderRecords();
    }

    /** @param list<int> $orderIds */
    private function purgeOrders(array $orderIds): void
    {
        $this->assertNoChapaPayment($orderIds);
        $this->assertNoChapaRefund($orderIds);
        $this->assertNoLinkedPayout($orderIds);
        $this->deleteOrderDependents($orderIds);

        DB::table('storefront_orders')
            ->where('payment_gateway', 'verify_et')
            ->whereIn('id', $orderIds)
            ->delete();
    }

    /** @param list<int> $orderIds */
    private function assertNoChapaPayment(array $orderIds): void
    {
        if (! Schema::hasTable('payment_transactions')) {
            return;
        }

        $found = DB::table('payment_transactions')
            ->where('payable_type', StorefrontOrder::class)
            ->whereIn('payable_id', $orderIds)
            ->where('gateway', 'chapa')
            ->exists();

        if ($found) {
            throw new RuntimeException('Chapa transaction references a legacy order.');
        }
    }

    /** @param list<int> $orderIds */
    private function assertNoChapaRefund(array $orderIds): void
    {
        if (! Schema::hasTable('digital_product_payment_refunds')
            || ! Schema::hasTable('payment_transactions')) {
            return;
        }

        $found = DB::table('digital_product_payment_refunds as refunds')
            ->join('payment_transactions as payments', 'payments.id', '=', 'refunds.payment_transaction_id')
            ->whereIn('refunds.storefront_order_id', $orderIds)
            ->where('payments.gateway', 'chapa')
            ->exists();

        if ($found) {
            throw new RuntimeException('Chapa refund references a legacy order.');
        }
    }

    /** @param list<int> $orderIds */
    private function assertNoLinkedPayout(array $orderIds): void
    {
        if (! Schema::hasTable('digital_product_earnings_ledger')) {
            return;
        }

        $found = DB::table('digital_product_earnings_ledger')
            ->whereIn('storefront_order_id', $orderIds)
            ->whereNotNull('payout_request_id')
            ->exists();

        if ($found) {
            throw new RuntimeException('A legacy order has an associated payout reservation.');
        }
    }

    /** @param list<int> $orderIds */
    private function deleteOrderDependents(array $orderIds): void
    {
        foreach ([
            'creator_verification_allowances' => 'storefront_order_id',
            'order_manual_approvals' => 'storefront_order_id',
            'commission_accruals' => 'storefront_order_id',
            'storefront_payment_disputes' => 'storefront_order_id',
            'storefront_payment_attempts' => 'order_id',
            'digital_product_payment_refunds' => 'storefront_order_id',
            'digital_product_earnings_ledger' => 'storefront_order_id',
            'download_entitlements' => 'storefront_order_id',
            'storefront_order_items' => 'storefront_order_id',
        ] as $table => $column) {
            $this->deleteWhereIn($table, $column, $orderIds);
        }

        $this->deleteOrderJournals($orderIds);
    }

    /** @param list<int> $orderIds */
    private function deleteOrderJournals(array $orderIds): void
    {
        if (! Schema::hasTable('storefront_journal_entries')) {
            return;
        }

        $entries = DB::table('storefront_journal_entries')
            ->where('source_type', 'order')
            ->whereIn('source_id', $orderIds)
            ->pluck('id');

        $this->deleteWhereIn('storefront_journal_lines', 'journal_entry_id', $entries->all());
        DB::table('storefront_journal_entries')->whereIn('id', $entries)->delete();
    }

    private function purgeProviderRecords(): void
    {
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

    /** @param list<int> $ids */
    private function deleteWhereIn(string $table, string $column, array $ids): void
    {
        if ($ids === [] || ! Schema::hasTable($table)) {
            return;
        }
        DB::table($table)->whereIn($column, $ids)->delete();
    }
}
