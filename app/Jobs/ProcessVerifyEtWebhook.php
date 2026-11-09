<?php

namespace App\Jobs;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\VerifyEtWebhookDelivery;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorPaymentReviewNotifier;
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
        if (!$this->deliveryIsActionable($delivery)) {
            return;
        }

        $verification = DirectPaymentVerification::query()->where('provider_request_id', $delivery->provider_request_id)->first();
        if (!$verification) {
            $this->releaseUnmatched($delivery);

            return;
        }

        $payload = $this->completedPayload($delivery);
        if ($payload === null) {
            return;
        }

        $status = $this->applyResult($verification, $payload);
        $delivery->update(['status' => $status]);
        $this->notifyManualReview($verification, $status);
    }

    private function deliveryIsActionable(?VerifyEtWebhookDelivery $delivery): bool
    {
        if ($delivery === null || !$delivery->provider_request_id) {
            return false;
        }

        return in_array($delivery->status, ['received', 'unmatched'], true);
    }

    private function releaseUnmatched(VerifyEtWebhookDelivery $delivery): void
    {
        if ($this->attempts() < $this->tries) {
            $this->release(3);

            return;
        }

        $delivery->update(['status' => 'unmatched']);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function completedPayload(VerifyEtWebhookDelivery $delivery): ?array
    {
        $payload = $this->decryptPayload($delivery);
        if (!$this->isCompletedEvent($payload, $delivery)) {
            $delivery->update(['status' => 'invalid_payload']);

            return null;
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decryptPayload(VerifyEtWebhookDelivery $delivery): ?array
    {
        try {
            $encrypted = $delivery->payload['encrypted'] ?? null;
            if (!is_string($encrypted)) {
                return null;
            }

            $payload = json_decode(Crypt::decryptString($encrypted), true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }

        return is_array($payload) ? $payload : null;
    }

    private function isCompletedEvent(mixed $payload, VerifyEtWebhookDelivery $delivery): bool
    {
        if (!is_array($payload)) {
            return false;
        }

        if (($payload['event'] ?? null) !== 'verification.completed') {
            return false;
        }

        return ($payload['requestId'] ?? null) === $delivery->provider_request_id;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function applyResult(DirectPaymentVerification $verification, array $payload): string
    {
        try {
            return app(VerifyEtGateway::class)->processResult($verification, $payload);
        } catch (\Throwable) {
            throw new \RuntimeException('Verify.et webhook processing failed.');
        }
    }

    private function notifyManualReview(DirectPaymentVerification $verification, string $status): void
    {
        if ($status !== 'manual_review') {
            return;
        }

        if ($verification->payable_type !== StorefrontOrder::class) {
            return;
        }

        $order = StorefrontOrder::query()->find($verification->payable_id);
        if ($order === null || $order->status !== 'manual_review') {
            return;
        }

        app(CreatorPaymentReviewNotifier::class)->notify($order, $verification->id);
    }
}
