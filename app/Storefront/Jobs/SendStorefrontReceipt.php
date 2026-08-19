<?php

namespace App\Storefront\Jobs;

use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\DigitalProductOrderRecoveryDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\DB;

class SendStorefrontReceipt implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        private readonly int $orderId,
        private readonly bool $force = false,
        private readonly ?int $deliveryId = null,
    ) {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        Cache::lock("storefront-receipt:{$this->orderId}", 120)->block(5, function () {
            $order = DB::transaction(function (): ?StorefrontOrder {
                $order = StorefrontOrder::query()
                    ->with(['product', 'entitlements.file'])
                    ->lockForUpdate()
                    ->find($this->orderId);

                if (!$order?->buyer_email || $order->status !== 'paid' || (!$this->force && $order->receipt_sent_at)) {
                    return null;
                }

                return $order;
            });

            if (!$order) {
                return;
            }

            $links = $order->entitlements
                ->filter(fn($entitlement) => $entitlement->file && !$entitlement->revoked_at && !$entitlement->expires_at->isPast() && $entitlement->download_count < $entitlement->download_limit)
                ->map(fn($entitlement) => [
                'name' => $entitlement->file->getNameWithExtension(),
                'url' => URL::temporarySignedRoute('storefront.download', $entitlement->expires_at, ['token' => $entitlement->token]),
            ]);
            $downloads = $links->map(fn(array $link) => "- {$link['name']}: {$link['url']}")->implode("\n");
            $buyerName = $order->buyer_name ?: __('there');
            $total = number_format($order->gross_amount_cents / 100, 2) . " {$order->currency}";

            Mail::raw(
                "Hello {$buyerName},\n\nThank you for purchasing {$order->product->title}.\nOrder: {$order->uuid}\nTotal: {$total}\n\nYour protected downloads:\n{$downloads}\n\nThese links expire on " . $order->entitlements->min('expires_at')?->toDayDateTimeString() . '. Each file can be downloaded up to 10 times.',
                fn($message) => $message->to($order->buyer_email)->subject(__('Your digital product receipt')),
            );

            $order->update(['receipt_sent_at' => now()]);
            $this->deliveryId && DigitalProductOrderRecoveryDelivery::query()
                ->whereKey($this->deliveryId)
                ->where('status', 'queued')
                ->update(['status' => 'sent', 'failure_code' => null]);
        });
    }

    public function failed(\Throwable $exception): void
    {
        $this->deliveryId && DigitalProductOrderRecoveryDelivery::query()
            ->whereKey($this->deliveryId)
            ->where('status', 'queued')
            ->update(['status' => 'failed', 'failure_code' => 'mail_delivery_failed']);
    }
}
