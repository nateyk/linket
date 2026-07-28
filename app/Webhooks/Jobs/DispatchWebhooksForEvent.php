<?php

namespace App\Webhooks\Jobs;

use App\Webhooks\Models\Webhook;
use App\Webhooks\Models\WebhookDelivery;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DispatchWebhooksForEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected string $eventType,
        protected int $userId,
        protected array $payload,
    ) {}

    public function handle(): void
    {
        $modelEventType = "{$this->payload['model_type']}.{$this->eventType}";

        $query = Webhook::query()
            ->where('user_id', $this->userId)
            ->whereJsonContains('selected_events', $modelEventType);

        $query->chunkById(100, function ($webhooks) use ($modelEventType) {
            foreach ($webhooks as $webhook) {
                $delivery = $webhook->deliveries()->create([
                    'event_type' => $modelEventType,
                    'status' => WebhookDelivery::STATUS_PENDING,
                    'payload' => $this->payload,
                ]);

                // incase it's sync driver, make sure not to error out
                try {
                    DeliverWebhook::dispatch($delivery);
                } catch (Exception $e) {
                    if (config('queue.default') === 'sync') {
                        report($e);
                    }
                }
            }
        });
    }
}
