<?php

namespace App\Storefront\Jobs;

use App\Courses\Services\EnrollmentService;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class DeliverStorefrontOrder implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $uniqueFor = 3600;

    public function __construct(public int $orderId) {}

    public function uniqueId(): string
    {
        return (string) $this->orderId;
    }

    public function handle(): void
    {
        if (!$this->orderNeedsDelivery()) {
            return;
        }

        try {
            $this->deliverLockedOrder();
        } catch (Throwable $exception) {
            $this->recordDeliveryFailure($exception);
        }
    }

    private function orderNeedsDelivery(): bool
    {
        $order = StorefrontOrder::query()->find($this->orderId);
        if ($order === null || !$order->isCompleted()) {
            return false;
        }

        return !$order->isDelivered();
    }

    private function deliverLockedOrder(): void
    {
        DB::transaction(function (): void {
            $order = StorefrontOrder::query()->whereKey($this->orderId)->lockForUpdate()->firstOrFail();
            if (!$order->isCompleted() || $order->isDelivered()) {
                return;
            }

            $this->grantDownloads($order);
            $this->grantCourse($order);
            $order->update([
                'delivery_status' => StorefrontOrder::DELIVERY_DELIVERED,
                'delivered_at' => now(),
                'delivery_error' => null,
            ]);
            SendStorefrontReceipt::dispatch($order->id)->afterCommit();
        });
    }

    private function grantDownloads(StorefrontOrder $order): void
    {
        $order->loadMissing('product.files');
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
    }

    private function grantCourse(StorefrontOrder $order): void
    {
        $order->loadMissing('product.course');
        if (!$order->product->isCourse() || !$order->product->course) {
            return;
        }

        app(EnrollmentService::class)->grantFromOrder($order->fresh('product.course'));
    }

    private function recordDeliveryFailure(Throwable $exception): void
    {
        StorefrontOrder::query()->whereKey($this->orderId)->whereIn('status', ['paid', 'completed', 'fulfilled'])->update([
            'delivery_status' => StorefrontOrder::DELIVERY_FAILED,
            'delivery_error' => Str::limit($exception->getMessage(), 255, ''),
        ]);
    }
}
