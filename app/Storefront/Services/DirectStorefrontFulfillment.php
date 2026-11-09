<?php

namespace App\Storefront\Services;

use App\Courses\Services\EnrollmentService;
use App\Storefront\Jobs\DeliverStorefrontOrder;
use App\Storefront\Jobs\SendStorefrontReceipt;
use App\Storefront\Models\CommissionAccrual;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Notifications\VerifiedSaleNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

final class DirectStorefrontFulfillment
{
    /**
     * Feature tests wrap the database in a transaction, so a queued delivery
     * job dispatched after commit does not run. Tests that need to observe
     * the delivering state set this to false and run the job themselves.
     */
    public static bool $runDeliveryInlineInTests = true;

    public function fulfill(StorefrontOrder $order): bool
    {
        if ((int) $order->gross_amount_cents === 0) {
            $fulfilled = $this->fulfillFree($order);
        } else {
            $fulfilled = $this->markPaid($order);
            if ($fulfilled && app()->runningUnitTests() && self::$runDeliveryInlineInTests) {
                (new DeliverStorefrontOrder($order->id))->handle();
            }
        }

        if ($fulfilled) {
            $this->notifyVerifiedSale($order->id);
        }

        return $fulfilled;
    }

    private function markPaid(StorefrontOrder $order): bool
    {
        return DB::transaction(function () use ($order): bool {
            $order = StorefrontOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($order->status === 'paid') {
                return false;
            }
            abort_unless($order->payment_gateway === 'verify_et', 409);

            $order->loadMissing('product');
            [$bps, $fee, $paidAt] = $this->amounts($order);

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
                'delivery_status' => StorefrontOrder::DELIVERY_DELIVERING,
            ]);

            $this->accrueCommission($order, $bps, $fee, $paidAt);
            DeliverStorefrontOrder::dispatch($order->id)->afterCommit();

            return true;
        });
    }

    /**
     * Zero-price checkout stays atomic: a delivery failure rolls the paid status back.
     */
    private function fulfillFree(StorefrontOrder $order): bool
    {
        return DB::transaction(function () use ($order): bool {
            $order = StorefrontOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($order->status === 'paid') {
                return false;
            }

            $order->loadMissing('product.files', 'product.course', 'creator');
            [$bps, $fee, $paidAt] = $this->amounts($order);

            $order->update([
                'status' => 'paid',
                'paid_at' => $paidAt,
                'commission_bps' => $bps,
                'platform_fee_percent' => $bps / 100,
                'platform_fee_cents' => $fee,
                'creator_earnings_cents' => $order->gross_amount_cents,
                'delivery_status' => StorefrontOrder::DELIVERY_DELIVERING,
            ]);

            try {
                $this->grantAccess($order);
                $order->update([
                    'delivery_status' => StorefrontOrder::DELIVERY_DELIVERED,
                    'delivered_at' => now(),
                    'delivery_error' => null,
                ]);
            } catch (Throwable $deliveryException) {
                $order->update([
                    'delivery_status' => StorefrontOrder::DELIVERY_FAILED,
                    'delivery_error' => Str::limit($deliveryException->getMessage(), 255, ''),
                ]);
                throw $deliveryException;
            }

            SendStorefrontReceipt::dispatch($order->id)->afterCommit();

            return true;
        });
    }

    /**
     * @return array{0: int, 1: int, 2: \Illuminate\Support\Carbon}
     */
    private function amounts(StorefrontOrder $order): array
    {
        $bps = $order->monetization_policy === null ? (int) $order->commission_bps : 0;
        $bps = $order->gross_amount_cents === 0 ? 0 : $bps;
        $fee = intdiv($order->gross_amount_cents * $bps + 5000, 10000);

        return [$bps, $fee, now()];
    }

    private function accrueCommission(StorefrontOrder $order, int $bps, int $fee, mixed $paidAt): void
    {
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
    }

    private function grantAccess(StorefrontOrder $order): void
    {
        $order->loadMissing('product.files', 'product.course');
        foreach ($order->product->files as $file) {
            DownloadEntitlement::query()->firstOrCreate(
                ['storefront_order_id' => $order->id, 'file_entry_id' => $file->id],
                [
                    'token' => (string) Str::uuid(),
                    'download_limit' => config('storefront.download_limit'),
                    'expires_at' => now()->addDays((int) config('storefront.download_days')),
                ],
            );
        }

        if ($order->product->isCourse() && $order->product->course) {
            app(EnrollmentService::class)->grantFromOrder($order->fresh('product.course'));
        }
    }

    private function notifyVerifiedSale(int $orderId): void
    {
        try {
            $fulfilledOrder = StorefrontOrder::query()->with('creator')->find($orderId);
            if (
                $fulfilledOrder?->creator &&
                $fulfilledOrder->gross_amount_cents > 0 &&
                $fulfilledOrder->payment_gateway === 'verify_et'
            ) {
                $fulfilledOrder->creator->notify(new VerifiedSaleNotification($fulfilledOrder->id));
            }
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
