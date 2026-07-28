<?php

namespace App\Webhooks\Resources;

use App\Webhooks\Models\WebhookDeliveryAttempt;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WebhookDeliveryAttempt
 */
#[SchemaName('WebhookDeliveryAttempt')]
class WebhookDeliveryAttemptResource extends JsonResource
{
    public function __construct(
        WebhookDeliveryAttempt $resource,
        protected string|null $fieldsPreset = null,
    ) {
        parent::__construct($resource);
    }

    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'attempt_number' => $this->attempt_number,
            'response_status' => $this->response_status,
            'duration_ms' => $this->duration_ms,
            'created_at' => $this->created_at,
            'response_body' => $this->when(
                $this->fieldsPreset === 'show',
                $this->response_body,
            ),
            'delivery' => new WebhookDeliveryResource(
                $this->whenLoaded('delivery'),
                $this->fieldsPreset === 'show' ? 'show' : null,
            ),
            'webhook' => new WebhookResource($this->whenLoaded('webhook')),
        ];
    }
}
