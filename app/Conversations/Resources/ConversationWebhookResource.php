<?php

namespace App\Conversations\Resources;

use App\Conversations\Models\Conversation;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Conversation */
class ConversationWebhookResource extends JsonResource
{
    public function toWebhookArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'subject' => $this->subject,
            'status_id' => $this->status_id,
            'status_category' => $this->status_category,
            'user_id' => $this->user_id,
            'assignee_id' => $this->assignee_id,
            'support_owner_id' => $this->support_owner_id,
            'channel' => $this->channel,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'model_type' => 'ticket',
        ];
    }
}
