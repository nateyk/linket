<?php

namespace App\Analytics\Resources;

use App\Analytics\Models\TrackedEvent;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TrackedEvent
 */
#[SchemaName('TrackedEvent')]
class TrackedEventResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'created_at' => $this->created_at,
            'referrer' => $this->referrer,
            'location' => $this->location ? strtolower($this->location) : null,
            'device' => $this->device ? strtolower($this->device) : null,
            'event_type' => $this->event_type,
            'linkeable' => $this->whenLoaded(
                'linkeable',
                fn($linkeable) => [
                    'id' => $linkeable->id,
                    'name' => $linkeable->name ?? null,
                    'short_url' => $linkeable->short_url ?? null,
                    'model_type' => $linkeable->model_type ?? null,
                ],
            ),
        ];
    }

    public function toWebhookArray(): array
    {
        return [
            'id' => $this->id,
            'device' => $this->device,
            'browser' => $this->browser,
            'platform' => $this->platform,
            'location' => $this->location,
            'city' => $this->city,
            'state' => $this->state,
            'referrer' => $this->referrer,
            'ip' => $this->ip,
            'event_type' => $this->event_type,
            'model_type' => $this->model_type,
        ];
    }
}
