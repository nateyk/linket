<?php

namespace App\Webhooks\Resources;

use App\Models\User;
use App\Webhooks\Models\Webhook;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Webhook
 */
#[SchemaName('Webhook')]
class WebhookResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'url' => $this->url,
            'user_id' => $this->user_id,
            /** @var list<string> */
            'selected_events' => $this->selected_events,
            'consecutive_failures' => $this->consecutive_failures,
            'signing_secret' => $this->getRawOriginal('signing_secret'),
            'delivery_attempts_count' => $this->whenCounted('deliveryAttempts'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
            'user' => $this->whenLoaded(
                'user',
                fn(User $user) => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    'avatar' => $user->avatar,
                ],
            ),
            /** @var 'webhook' */
            'model_type' => $this->model_type,
        ];
    }
}
