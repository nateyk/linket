<?php

namespace App\Webhooks\Actions;

use App\Analytics\Models\TrackedEvent;
use App\Analytics\Resources\TrackedEventResource;
use App\Folders\Models\Folder;
use App\Folders\Resources\FolderResource;
use App\QrCodes\Models\QrCode;
use App\QrCodes\Resources\QrCodeResource;
use App\Webhooks\Jobs\DeliverWebhook;
use App\Links\Models\Link;
use App\Links\Resources\LinkResource;
use App\Webhooks\Models\Webhook;
use App\Webhooks\Models\WebhookDelivery;
use Exception;
use InvalidArgumentException;

class SendTestWebhookEvent
{
    public function execute(Webhook $webhook, string $eventType): void
    {
        $delivery = $webhook->deliveries()->create([
            'event_type' => $eventType,
            'status' => WebhookDelivery::STATUS_PENDING,
            'payload' => $this->payloadForEventType($eventType),
        ]);

        try {
            DeliverWebhook::dispatchSync($delivery);
        } catch (Exception $e) {
            // ignore
        }
    }

    protected function payloadForEventType(string $eventType): array
    {
        return match ($eventType) {
            'link.created', 'link.updated', 'link.deleted' => (new LinkResource(
                Link::factory()->make(['id' => random_int(1, 1000000)]),
            ))->toWebhookArray(),
            'folder.created',
            'folder.updated',
            'folder.deleted'
                => (new FolderResource(
                Folder::factory()->make(['id' => random_int(1, 1000000)]),
            ))->toWebhookArray(),
            'qrCode.created',
            'qrCode.updated',
            'qrCode.deleted'
                => (new QrCodeResource(
                QrCode::factory()->make(['id' => random_int(1, 1000000)]),
            ))->toWebhookArray(),
            'trackedEvent.clicked' => (new TrackedEventResource(
                TrackedEvent::factory()->make([
                    'id' => random_int(1, 1000000),
                    'event_type' => 'click',
                ]),
            ))->toWebhookArray(),
            'trackedEvent.scanned' => (new TrackedEventResource(
                TrackedEvent::factory()->make([
                    'id' => random_int(1, 1000000),
                    'event_type' => 'scan',
                ]),
            ))->toWebhookArray(),
            default => throw new InvalidArgumentException(
                "Unsupported event type [$eventType]",
            ),
        };
    }
}
