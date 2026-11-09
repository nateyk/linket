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
        $order = StorefrontOrder::query()->find($this->orderId);
        if (!$order || !$order->isCompleted() || $order->isDelivered()) {
            return;
        }

        try {
            DB::transaction(function (): void {
                $order = StorefrontOrder::query()->whereKey($this->orderId)->lockForUpdate()->firstOrFail();
                if (!$order->isCompleted() || $order->isDelivered()) {
                    return;
                }

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

                $order->update([
                    'delivery_status' => StorefrontOrder::DELIVERY_DELIVERED,
                    'delivered_at' => now(),
                    'delivery_error' => null,
                ]);

                SendStorefrontReceipt::dispatch($order->id)->afterCommit();
            });
        } catch (Throwable $exception) {
            StorefrontOrder::query()->whereKey($this->orderId)->whereIn('status', ['paid', 'completed', 'fulfilled'])->update([
                'delivery_status' => StorefrontOrder::DELIVERY_FAILED,
                'delivery_error' => Str::limit($exception->getMessage(), 255, ''),
            ]);
        }
    }
}
