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
    private const LEGACY_PROVIDER = 'verify_et';
    private const CHAPA_PROVIDER = 'chapa';
    private const ORDER_JOURNAL_SOURCE = 'order';

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
            'verify_et_storefront_orders' => $this->legacyOrderQuery()->count(),
            'verify_et_subscriptions' => Schema::hasTable('subscriptions')
                ? (int) DB::table('subscriptions')->where('gateway_name', self::LEGACY_PROVIDER)->count() : 0,
            'direct_payment_verifications' => $this->tableCount('direct_payment_verifications'),
            'verify_et_webhook_deliveries' => $this->tableCount('verify_et_webhook_deliveries'),
            'pro_subscription_payments' => $this->tableCount('pro_subscription_payments'),
        ];
    }

    private function purgeAll(): void
    {
        $ids = $this->legacyOrderQuery()->orderBy('id')->pluck('id');

        foreach ($ids->chunk(250) as $batch) {
            $this->purgeOrders($batch->all());
        }

        $this->purgeProviderRecords();
    }

    /** @param list<int> $orderIds */
    private function purgeOrders(array $orderIds): void
    {
        $this->assertNoChapaPayment($orderIds);
        $this->assertNoChapaAttempt($orderIds);
        $this->assertNoChapaRefund($orderIds);
        $this->assertNoLinkedPayout($orderIds);
        $this->deleteOrderDependents($orderIds);

        $this->legacyOrderQuery()->whereIn('id', $orderIds)->delete();
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
            ->where('gateway', self::CHAPA_PROVIDER)
            ->exists();

        if ($found) {
            throw new RuntimeException('Chapa transaction references a legacy order.');
        }
    }

    /** @param list<int> $orderIds */
    private function assertNoChapaAttempt(array $orderIds): void
    {
        // This table is exclusive to Chapa marketplace checkout.
        if (Schema::hasTable('storefront_payment_attempts')
            && DB::table('storefront_payment_attempts')->whereIn('order_id', $orderIds)->exists()) {
            throw new RuntimeException('Chapa checkout attempt references a legacy order.');
        }
    }

    /** @param list<int> $orderIds */
    private function assertNoChapaRefund(array $orderIds): void
    {
        if (! Schema::hasTable('digital_product_payment_refunds')
            || ! Schema::hasTable('payment_transactions')) {
            return;
        }

        $chapaPayments = DB::table('payment_transactions')
            ->select('id')
            ->where('gateway', self::CHAPA_PROVIDER);
        $found = DB::table('digital_product_payment_refunds')
            ->whereIn('storefront_order_id', $orderIds)
            ->whereIn('payment_transaction_id', $chapaPayments)
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
            ->where('source_type', self::ORDER_JOURNAL_SOURCE)
            ->whereIn('source_id', $orderIds)
            ->pluck('id');

        if (Schema::hasTable('storefront_journal_lines')) {
            DB::table('storefront_journal_lines')->whereIn('journal_entry_id', $entries)->delete();
        }
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
            DB::table('subscriptions')->where('gateway_name', self::LEGACY_PROVIDER)->delete();
        }
    }

    private function tableCount(string $table): int
    {
        return Schema::hasTable($table) ? (int) DB::table($table)->count() : 0;
    }

    private function legacyOrderQuery(): \Illuminate\Database\Query\Builder
    {
        return DB::table('storefront_orders')->where('payment_gateway', self::LEGACY_PROVIDER);
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
