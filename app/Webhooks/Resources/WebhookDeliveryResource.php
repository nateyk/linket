<?php

namespace App\Webhooks\Resources;

use App\Webhooks\Models\WebhookDelivery;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WebhookDelivery
 */
#[SchemaName('WebhookDelivery')]
class WebhookDeliveryResource extends JsonResource
{
    public function __construct(
        WebhookDelivery $resource,
        protected string|null $fieldsPreset = null,
    ) {
        parent::__construct($resource);
    }

    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'webhook_id' => $this->webhook_id,
            'event_type' => $this->event_type,
            /** @var 'pending' | 'retrying' | 'delivered' | 'failed' */
            'status' => $this->status,
            'payload' => $this->when(
                $this->fieldsPreset === 'show',
                $this->payload,
            ),
            'attempts_count' => $this->attempts_count,
            'last_attempt_at' => $this->last_attempt_at,
            'delivered_at' => $this->delivered_at,
            'created_at' => $this->created_at,
        ];
    }
}
