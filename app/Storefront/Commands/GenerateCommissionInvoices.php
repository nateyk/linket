<?php

namespace App\Storefront\Commands;

use App\Storefront\Models\CommissionAccrual;
use App\Storefront\Models\CommissionInvoice;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class GenerateCommissionInvoices extends Command
{
    protected $signature = 'billing:generate-commission-invoices';
    protected $description = 'Invoice historical commission accruals. New-policy orders are excluded.';

    public function handle(): int
    {
        $nowEat = CarbonImmutable::now('Africa/Nairobi');
        $cutoff = $nowEat->startOfMonth()->utc();
        $creatorIds = $this->legacyAccruals()
            ->where('paid_at', '<', $cutoff)
            ->distinct()->pluck('creator_id');

        foreach ($creatorIds as $creatorId) {
            DB::transaction(function () use ($creatorId, $nowEat, $cutoff): void {
                $accruals = $this->legacyAccruals()
                    ->where('creator_id', $creatorId)
                    ->where('paid_at', '<', $cutoff)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get();
                $fee = (int) $accruals->sum('fee_cents');
                if ($fee < 5000) {
                    return;
                }

                $uuid = (string) Str::uuid();
                $invoice = CommissionInvoice::query()->create([
                    'uuid' => $uuid,
                    'creator_id' => $creatorId,
                    'workspace_id' => $accruals->first()->workspace_id,
                    'invoice_number' => sprintf('CM-%s-%d-%s', $nowEat->format('Ym'), $creatorId, substr($uuid, 0, 8)),
                    'period_start' => $accruals->min('paid_at')->copy()->timezone('Africa/Nairobi')->toDateString(),
                    'period_end' => $nowEat->subMonth()->endOfMonth()->toDateString(),
                    'sales_count' => $accruals->count(),
                    'gross_sales_cents' => $accruals->sum('gross_amount_cents'),
                    'commission_fee_cents' => $fee,
                    'status' => 'pending',
                    'due_at' => $nowEat->startOfMonth()->addDays(4)->endOfDay()->utc(),
                ]);
                CommissionAccrual::query()->whereIn('id', $accruals->pluck('id'))->update(['commission_invoice_id' => $invoice->id]);
            });
        }

        return self::SUCCESS;
    }

    private function legacyAccruals(): \Illuminate\Database\Eloquent\Builder
    {
        return CommissionAccrual::query()
            ->whereNull('commission_invoice_id')
            ->where('fee_cents', '>', 0)
            ->whereHas('order', fn ($query) => $query->whereNull('monetization_policy'));
    }
}
