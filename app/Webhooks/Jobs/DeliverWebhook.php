<?php

namespace App\Webhooks\Jobs;

use App\Webhooks\Models\WebhookDelivery;
use App\Notifications\WebhookDisabledAfterFailures;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class DeliverWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 10;

    public function __construct(protected WebhookDelivery $delivery) {}

    public function backoff(): array
    {
        return [
            12, // 1st retry
            148, // 2nd retry
            1808, // 3rd retry
            22026, // 4th retry
            86400, // 5th+ retries capped at 24h
            86400,
            86400,
            86400,
            86400,
        ];
    }

    public function handle(): void
    {
        if (!$this->delivery->webhook || $this->delivery->webhook->deleted_at) {
            return;
        }

        $attemptId = Str::uuid7();
        $attemptNumber = $this->attempts();
        $startedAt = microtime(true);
        $deliveryPayload = [
            'id' => $attemptId,
            'event' => $this->delivery->event_type,
            'created_at' => now()->toJSON(),
            'data' => $this->delivery->payload,
        ];
        $payloadJson = json_encode($deliveryPayload, JSON_UNESCAPED_SLASHES);
        $signature = hash_hmac(
            'sha256',
            $payloadJson,
            $this->delivery->webhook->signing_secret,
        );

        $requestHeaders = [
            'Content-Type' => 'application/json',
            'X-Webhook-Signature' => $signature,
        ];

        $attemptLogged = false;
        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withHeaders($requestHeaders)
                ->post($this->delivery->webhook->url, $deliveryPayload);

            $durationMs = (int) ((microtime(true) - $startedAt) * 1000);

            $this->storeAttempt(
                $attemptId,
                $attemptNumber,
                $response->status(),
                $response->body(),
                $durationMs,
            );
            $attemptLogged = true;

            if (!$response->successful()) {
                throw new Exception(
                    "Webhook returned status {$response->status()}",
                );
            }

            $this->delivery->update([
                'status' => WebhookDelivery::STATUS_DELIVERED,
                'attempts_count' => $attemptNumber,
                'last_attempt_at' => now(),
                'delivered_at' => now(),
            ]);
            $this->delivery->webhook->update([
                'consecutive_failures' => 0,
                'deleted_at' => null,
            ]);
        } catch (Throwable $e) {
            $durationMs = (int) ((microtime(true) - $startedAt) * 1000);

            if (!$attemptLogged) {
                $this->storeAttempt(
                    $attemptId,
                    $attemptNumber,
                    null,
                    $e->getMessage(),
                    $durationMs,
                );
            }

            $isFinalAttempt = $attemptNumber >= $this->tries;
            $this->delivery->update([
                'status' => $isFinalAttempt
                    ? WebhookDelivery::STATUS_FAILED
                    : WebhookDelivery::STATUS_RETRYING,
                'attempts_count' => $attemptNumber,
                'last_attempt_at' => now(),
            ]);

            if ($isFinalAttempt) {
                $this->delivery->webhook->increment('consecutive_failures');
                $this->delivery->webhook->refresh();
                if ($this->delivery->webhook->consecutive_failures >= 20) {
                    $this->delivery->webhook->update([
                        'consecutive_failures' => 0,
                        'deleted_at' => now(),
                    ]);
                    $this->delivery->webhook->user?->notify(
                        new WebhookDisabledAfterFailures($this->delivery->webhook),
                    );
                }
                return;
            }

            throw $e;
        }
    }

    private function storeAttempt(
        string $attemptId,
        int $attemptNumber,
        ?int $responseStatus,
        ?string $responseBody,
        int $durationMs,
    ): void {
        $this->delivery->attempts()->create([
            'id' => $attemptId,
            'webhook_id' => $this->delivery->webhook_id,
            'attempt_number' => $attemptNumber,
            'response_status' => $responseStatus,
            'response_body' => $responseBody
                ? Str::limit($responseBody, 10000)
                : null,
            'duration_ms' => $durationMs,
        ]);
    }
}
