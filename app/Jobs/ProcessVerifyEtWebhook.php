<?php

namespace App\Jobs;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\VerifyEtWebhookDelivery;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Crypt;

final class ProcessVerifyEtWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;
    public array $backoff = [30, 120, 480, 1800];

    public function __construct(public int $deliveryId) {}

    public function handle(): void
    {
        $delivery = VerifyEtWebhookDelivery::query()->find($this->deliveryId);
        if (!$delivery || !in_array($delivery->status, ['received', 'unmatched'], true) || !$delivery->provider_request_id) {
            return;
        }
        $verification = DirectPaymentVerification::query()->where('provider_request_id', $delivery->provider_request_id)->first();
        if (!$verification) {
            $delivery->update(['status' => 'unmatched']);
            return;
        }
        try {
            $encrypted = $delivery->payload['encrypted'] ?? null;
            $payload = is_string($encrypted) ? json_decode(Crypt::decryptString($encrypted), true, 512, JSON_THROW_ON_ERROR) : null;
        } catch (\Throwable) {
            $delivery->update(['status' => 'invalid_payload']);
            return;
        }
        if (!is_array($payload) || ($payload['event'] ?? null) !== 'verification.completed'
            || ($payload['requestId'] ?? null) !== $delivery->provider_request_id) {
            $delivery->update(['status' => 'invalid_payload']);
            return;
        }
        try {
            $status = app(VerifyEtGateway::class)->processResult($verification, $payload);
        } catch (\Throwable) {
            throw new \RuntimeException('Verify.et webhook processing failed.');
        }
        $delivery->update(['status' => $status]);
        if ($verification->payable_type === StorefrontOrder::class && in_array($status, ['manual_review', 'mismatch'], true)) {
            StorefrontOrder::query()->whereKey($verification->payable_id)->whereIn('status', ['verifying', 'pending_payment'])->update([
                'status' => $status === 'mismatch' ? 'failed_verification' : 'manual_review',
            ]);
        }
    }
}
