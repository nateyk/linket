<?php

namespace Livechat\Widget\Controllers;

use Ai\AiAgent\Conversations\Streaming\EventEmitter;
use App\Conversations\Actions\PaginateConversationItems;
use App\Conversations\Customer\Actions\SubmitMessageAsCustomer;
use App\Conversations\Models\Conversation;
use Common\Core\BaseController;
use Livechat\Widget\HandleLatestUserMessage;

class WidgetChatMessagesController extends BaseController
{
    public function index(int $chatId)
    {
        $conversation = Conversation::findOrFail($chatId);

        $this->authorize('show', $conversation);

        $pagination = (new PaginateConversationItems())->execute(
            $conversation,
            request()->all(),
        );

        return $this->success(['pagination' => $pagination]);
    }

    public function store(int $conversationId)
    {
        $conversation = Conversation::findOrFail($conversationId);

        $this->authorize('show', $conversation);

        $attachments = request('attachments', []);
        $data = $this->validate(request(), [
            'message.body' => !count($attachments) ? 'required|string' : '',
            'message.uuid' => 'string',
            'message.attachments' => 'required_without:message.body|array',
            'message.attachments.*' => 'int|exists:file_entries,id',
        ]);

        (new SubmitMessageAsCustomer())->execute(
            $conversation,
            $data['message'],
        );

        return $this->stream(function () use ($conversation) {
            EventEmitter::startStream();
            (new HandleLatestUserMessage($conversation))->execute();
            EventEmitter::endStream();
        });
    }
}
