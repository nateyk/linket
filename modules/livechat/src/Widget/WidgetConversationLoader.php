<?php

namespace Livechat\Widget;

use App\Attributes\Models\CustomAttribute;
use App\Conversations\Actions\PaginateConversationItems;
use App\Conversations\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Arr;

class WidgetConversationLoader
{
    public function activeConversationFor(
        User $customer,
        int|null $conversationId = null,
    ): array|null {
        if ($conversationId) {
            $conversation = $customer
                ->conversations()
                ->whereNotClosed()
                ->find($conversationId);
        }

        if (!isset($conversation)) {
            $conversation = $customer
                ->conversations()
                ->whereNotClosed()
                ->orderByRaw('FIELD(type, "chat", "ticket")')
                ->orderBy('id', 'desc')
                ->first();
        }

        if ($conversation) {
            return $this->loadDataFor($conversation);
        }

        return null;
    }

    public function loadDataFor(Conversation $conversation): array
    {
        $pagination = (new PaginateConversationItems())->execute($conversation);

        $hasPostChatForm = !!Arr::first(
            $pagination['data'],
            fn($msg) => $msg['type'] === 'submittedFormData' &&
                $msg['body']['formType'] === 'postChat',
        );

        $attributes = $conversation
            ->customAttributes()
            ->where('materialized', false)
            ->where(
                'permission',
                '!=',
                CustomAttribute::PERMISSION_AGENT_CAN_EDIT,
            )
            ->get()
            ->map(
                fn(CustomAttribute $attribute) => $attribute->toCompactArray(
                    'customer',
                ),
            );

        $data = [
            'conversation' => [
                'id' => $conversation->id,
                'type' => $conversation->type,
                'status_category' => $conversation->status_category,
                'status' =>
                    $conversation->status->user_label ??
                    $conversation->status->label,
                'priority' => $conversation->priority,
                'updated_at' => $conversation->updated_at,
                'created_at' => $conversation->created_at,
                'subject' => $conversation->subject,
                'user' => $conversation->user
                    ? [
                        'id' => $conversation->user->id,
                        'name' => $conversation->user->name,
                        'image' => $conversation->user->image,
                    ]
                    : null,
                'assigned_to' => $conversation->assigned_to,
                'assignee_id' => $conversation->assignee_id,
                'assignee' => $conversation->assignee
                    ? [
                        'id' => $conversation->assignee->id,
                        'name' => $conversation->assignee->name,
                        'image' => $conversation->assignee->image,
                    ]
                    : null,
            ],
            'items' => $pagination,
            'hasPostChatForm' => $hasPostChatForm,
            'attributes' => $attributes,
        ];

        if (
            $conversation->type !== 'ticket' &&
            $conversation->status_category >= Conversation::STATUS_OPEN &&
            !$conversation->assignee_id
        ) {
            $data['queuedChatInfo'] = $this->getQueuedChatInfo(
                $conversation->id,
            );
        }

        return $data;
    }

    protected function getQueuedChatInfo(int $chatId): array
    {
        $allQueuedChats = Conversation::whereNotClosed()
            ->where('assignee_id', null)
            ->pluck('id');

        $waitTimePerChat = 5;
        $index = $allQueuedChats->search($chatId);

        return [
            'estimatedWaitTime' => !$index
                ? $waitTimePerChat
                : $waitTimePerChat * $index,
            'positionInQueue' => $index + 1,
        ];
    }
}
