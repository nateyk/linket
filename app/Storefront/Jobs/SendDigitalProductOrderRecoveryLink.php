<?php

namespace App\Storefront\Jobs;

use App\Storefront\Models\DigitalProductOrderRecovery;
use App\Storefront\Models\DigitalProductOrderRecoveryDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class SendDigitalProductOrderRecoveryLink implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        private readonly int $recoveryId,
        private readonly string $code,
        private readonly int $deliveryId,
    ) {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        Cache::lock("digital-product-recovery:{$this->recoveryId}", 120)->block(5, function (): void {
            $recovery = DigitalProductOrderRecovery::find($this->recoveryId);
            $delivery = DigitalProductOrderRecoveryDelivery::find($this->deliveryId);

            if (!$recovery || !$delivery || $recovery->expires_at->isPast() || $recovery->redeemed_at) {
                return;
            }

            Mail::raw(
                "Your Linket sign-in code is: {$this->code}\n\nThis code expires in 10 minutes.",
                fn($message) => $message->to($recovery->email)->subject(__('Your Linket sign-in code')),
            );

            $delivery->update(['status' => 'sent', 'failure_code' => null]);
        });
    }

    public function failed(\Throwable $exception): void
    {
        DigitalProductOrderRecoveryDelivery::query()
            ->whereKey($this->deliveryId)
            ->where('status', 'queued')
            ->update(['status' => 'failed', 'failure_code' => 'mail_delivery_failed']);
    }
}
