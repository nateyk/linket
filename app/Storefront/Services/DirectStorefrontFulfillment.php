<?php

namespace App\Storefront\Services;

use App\Courses\Services\EnrollmentService;
use App\Storefront\Jobs\SendStorefrontReceipt;
use App\Storefront\Models\CommissionAccrual;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class DirectStorefrontFulfillment
{
    public function fulfill(StorefrontOrder $order): bool
    {
        return DB::transaction(function () use ($order): bool {
            $order = StorefrontOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($order->status === 'paid') {
                return false;
            }
            abort_unless($order->payment_gateway === 'verify_et' || $order->gross_amount_cents === 0, 409);

            $order->loadMissing('product.files', 'product.course', 'creator');
            $bps = $order->monetization_policy === null ? (int) $order->commission_bps : 0;
            $bps = $order->gross_amount_cents === 0 ? 0 : $bps;
            $fee = intdiv($order->gross_amount_cents * $bps + 5000, 10000);
            $paidAt = now();

            if ($order->gross_amount_cents > 0 && $order->monetization_policy !== null) {
                abort_unless($order->directPaymentVerifications()->whereNotNull('verified_at')->whereNotNull('canonical_transaction_identity')->exists(), 409);
                app(CreatorVerificationAllowance::class)->consume($order);
            }

            $order->update([
                'status' => 'paid',
                'paid_at' => $paidAt,
                'commission_bps' => $bps,
                'platform_fee_percent' => $bps / 100,
                'platform_fee_cents' => $fee,
                'creator_earnings_cents' => $order->gross_amount_cents,
            ]);

            if ($order->gross_amount_cents > 0 && $order->monetization_policy === null) {
                CommissionAccrual::query()->firstOrCreate(
                    ['storefront_order_id' => $order->id],
                    [
                        'creator_id' => $order->creator_id,
                        'workspace_id' => $order->product->workspace_id,
                        'plan_id' => $order->commission_plan_id,
                        'gross_amount_cents' => $order->gross_amount_cents,
                        'fee_bps' => $bps,
                        'fee_cents' => $fee,
                        'paid_at' => $paidAt,
                    ],
                );
            }

            foreach ($order->product->files as $file) {
                DownloadEntitlement::firstOrCreate(
                    ['storefront_order_id' => $order->id, 'file_entry_id' => $file->id],
                    [
                        'token' => (string) Str::uuid(),
                        'download_limit' => config('storefront.download_limit'),
                        'expires_at' => now()->addDays(config('storefront.download_days')),
                    ],
                );
            }

            if ($order->product->isCourse() && $order->product->course) {
                app(EnrollmentService::class)->grantFromOrder($order->fresh('product.course'));
            }

            SendStorefrontReceipt::dispatch($order->id)->afterCommit();

            return true;
        });
    }
}
