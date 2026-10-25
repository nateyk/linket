<?php

namespace Livechat\Widget\Controllers;

use Ai\AiAgent\Conversations\Streaming\EventEmitter;
use App\Conversations\Actions\ConversationListBuilder;
use App\Conversations\Events\ConversationsUpdated;
use App\Conversations\Models\Conversation;
use Common\Core\BaseController;
use Illuminate\Support\Facades\Auth;
use Livechat\Chats\CreateChatAsCustomer;
use Livechat\Chats\StoreChatFormData;
use Livechat\Widget\HandleLatestUserMessage;
use Livechat\Widget\WidgetConversationLoader;

class WidgetConversationsController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index()
    {
        $closed = Conversation::STATUS_CLOSED;
        $pagination = Conversation::query()
            ->where('user_id', Auth::id())
            ->orderByRaw(
                "CASE WHEN status_category > $closed THEN 0 ELSE 1 END",
            )
            // shows latest chats first, then tickets
            ->orderBy('type', 'asc')
            ->orderBy('updated_at', 'desc')
            ->orderBy('id', 'desc')
            ->cursorPaginate(10);

        return $this->success([
            'pagination' => (new ConversationListBuilder())->cursorPagination(
                $pagination,
            ),
        ]);
    }

    public function show(int $conversationId)
    {
        $conversation = Conversation::with('user')->findOrFail($conversationId);

        $this->authorize('show', $conversation);

        return $this->success(
            (new WidgetConversationLoader())->loadDataFor($conversation),
        );
    }

    public function store()
    {
        $preChatForm = request('preChatForm');
        if ($preChatForm) {
            $data = [
                'preChatForm' => $preChatForm,
                'message' => request('message'),
                'flowId' => request('flowId'),
                'startWithGreeting' => request('startWithGreeting'),
            ];
        } else {
            $data = request()->validate([
                'message.body' => 'required|string',
                'message.uuid' => 'string',
                'message.attachments' => 'array',
                'message.attachments.*' => 'int|exists:file_entries,id',
                'flowId' => 'int|nullable',
                'startWithGreeting' => 'bool',
            ]);
        }

        $conversation = (new CreateChatAsCustomer())->execute($data);

        $response = (new WidgetConversationLoader())->loadDataFor(
            $conversation,
        );

        return $this->stream(function () use ($response, $conversation) {
            EventEmitter::startStream();
            EventEmitter::conversationCreated($response);
            (new HandleLatestUserMessage($conversation))->execute();
            EventEmitter::endStream();
        });
    }

    public function submitFormData(int $chatId)
    {
        $data = request()->validate([
            'type' => 'required|string',
            'values' => 'array',
        ]);

        $conversation = Conversation::query()->findOrFail($chatId);

        $this->authorize('show', $conversation);

        $event = new ConversationsUpdated([$conversation]);

        $previousItem = $conversation->items()->orderBy('id', 'desc')->first();

        (new StoreChatFormData())->execute(
            $data['type'],
            $conversation,
            $data['values'],
        );

        // don't show the form anymore after user has submitted it already
        if ($previousItem->type === 'collectDetailsForm') {
            $previousItem->update([
                'body' => [...$previousItem->body, 'submitted' => true],
            ]);
        }

        if ($data['type'] === 'collectDetails') {
            (new HandleLatestUserMessage($conversation))->execute();
        }

        $event->dispatch(collect([$conversation->refresh()]));

        return $this->success();
    }
}
