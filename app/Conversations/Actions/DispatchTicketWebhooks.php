<?php

namespace App\Conversations\Actions;

use App\Conversations\Models\Conversation;
use App\Conversations\Resources\ConversationWebhookResource;
use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Webhooks\Models\Webhook;

class DispatchTicketWebhooks
{
    public function execute(
        Conversation $conversation,
        string $eventType,
    ): void {
        if ($conversation->type !== 'ticket') {
            return;
        }

        $userId = $this->webhookUserId($conversation);

        if (!$userId) {
            return;
        }

        DispatchWebhooksForEvent::dispatch(
            eventType: $eventType,
            userId: $userId,
            payload: (new ConversationWebhookResource($conversation))->toWebhookArray(),
        );
    }

    protected function webhookUserId(Conversation $conversation): ?int
    {
        if ($conversation->support_owner_id) {
            return $conversation->support_owner_id;
        }

        $platformUserId = settings('helpdesk.webhook_user_id');

        return $platformUserId ? (int) $platformUserId : null;
    }
}
