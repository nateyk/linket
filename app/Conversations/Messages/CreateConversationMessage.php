<?php

namespace App\Conversations\Messages;

use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;

class CreateConversationMessage
{
    public function execute(
        Conversation $conversation,
        array $data,
    ): ConversationItem {
        if (
            !isset($data['user_id']) &&
            $data['author'] === Conversation::AUTHOR_AGENT &&
            $conversation->assignee_id
        ) {
            $data['user_id'] = $conversation->assignee_id;
        }

        if (
            !isset($data['user_id']) &&
            $data['author'] === Conversation::AUTHOR_USER
        ) {
            $data['user_id'] = $conversation->user_id;
        }

        // system and bot messages do not have a user_id
        if (
            $data['author'] === Conversation::AUTHOR_SYSTEM ||
            $data['author'] === Conversation::AUTHOR_BOT
        ) {
            $data['user_id'] = null;
        }

        // Reject foreign attachments before persisting the message. A forbidden
        // request must not leave a message behind.
        $attachmentIds = [];
        if (!empty($data['attachments'])) {
            $attachmentIds = (new AuthorizeConversationAttachments())->execute(
                isset($data['user_id']) ? (int) $data['user_id'] : null,
                $data['attachments'],
            );
        }

        $messageType = $data['type'] ?? 'message';
        $message = $conversation->items()->create([
            'body' => $this->maybePurifyBody($messageType, $data['body']),
            'data' => $data['data'] ?? null,
            'type' => $messageType,
            'uuid' => $data['uuid'] ?? null,
            'author' => $data['author'] ?? Conversation::AUTHOR_USER,
            'user_id' => $data['user_id'],
            'email_id' => $data['email_id'] ?? null,
            'created_at' => $data['created_at'] ?? now(),
            'updated_at' => $data['updated_at'] ?? now(),
        ]);

        if ($attachmentIds !== []) {
            $message->attachments()->attach($attachmentIds);
        }

        $message->syncInlineImages();

        return $message;
    }

    protected function maybePurifyBody(string $type, mixed $body)
    {
        if ($type === 'message' && is_string($body)) {
            return (new MessageBodyPurifier())->messageBody($body);
        }

        return $body;
    }
}
