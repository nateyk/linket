<?php

namespace Livechat\Chats;

use Ai\AiAgent\Models\AiAgentSession;
use App\Conversations\Agent\Actions\ConversationsAssigner;
use App\Conversations\Events\ConversationCreated;
use App\Conversations\Events\ConversationsUpdated;
use App\Conversations\Messages\CreateConversationMessage;
use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;
use App\Conversations\Models\ConversationStatus;
use App\Team\Models\Group;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use App\Core\WidgetFlags;

class CreateChatAsCustomer
{
    public function execute(array $data): Conversation
    {
        $startWithGreeting = Arr::get($data, 'startWithGreeting');
        $flowId = Arr::get($data, 'flowId');
        $preChatForm = $data['preChatForm'] ?? [];
        $isAiAgentPreviewMode = WidgetFlags::isAiAgentPreviewMode();

        // Make sure updated event is not fired until chat is fully created
        ConversationsUpdated::pauseDispatching();

        $customer = Auth::user();

        $status = ConversationStatus::getDefaultOpen();

        $assignedTo =
            settings('aiAgent.enabled') || $isAiAgentPreviewMode
                ? Conversation::ASSIGNED_BOT
                : Conversation::ASSIGNED_AGENT;

        $conversation = $customer->conversations()->create([
            'type' => 'chat',
            'status_id' => $status->id,
            'status_category' => $status->category,
            // group selected by customer in pre-chat form or default one
            'group_id' => $preChatForm['group_id'] ?? Group::findDefault()?->id,
            'channel' => $data['channel'] ?? 'widget',
            'assigned_to' => $assignedTo,
            'ai_agent_involved' => $assignedTo === Conversation::ASSIGNED_BOT,
            'mode' => $isAiAgentPreviewMode
                ? Conversation::MODE_PREVIEW
                : Conversation::MODE_NORMAL,
        ]);

        // handle pre-chat form
        if (!empty($preChatForm)) {
            (new StoreChatFormData())->execute(
                'preChat',
                $conversation,
                $preChatForm,
            );
        }

        // if starting with flow, first insert greeting flow nodes, then insert user message, then execute flow from the last greeting node. This will be the same order as when creating a message for existing chat
        if ($startWithGreeting) {
            $newChatGreeting = (new BuildNewChatGreeting(
                $customer,
                $flowId,
            ))->execute();
            isset($newChatGreeting['flow_id'])
                ? $this->handleFlowGreeting($conversation, $newChatGreeting)
                : $this->handleBasicGreeting($conversation, $newChatGreeting);
        }

        if (isset($data['message'])) {
            $data['message']['author'] = Conversation::AUTHOR_USER;
            (new CreateConversationMessage())->execute(
                $conversation,
                $data['message'],
            );
        }

        if ($conversation->assigned_to === Conversation::ASSIGNED_AGENT) {
            ConversationsAssigner::assignConversationToFirstAvailableAgent(
                $conversation,
            );
        }

        $conversation = $conversation->fresh();

        event(new ConversationCreated($conversation));

        return $conversation;
    }

    protected function handleBasicGreeting(
        Conversation $conversation,
        array $basicGreeting,
    ): ConversationItem|null {
        $lastMessage = null;
        foreach ($basicGreeting['parts'] as $part) {
            // hide buttons after user input
            if ($part['type'] === 'buttons') {
                $part['body'] = $part['body']['message'];
                $part['type'] = 'message';
            }

            $lastMessage = (new CreateConversationMessage())->execute(
                $conversation,
                $part,
            );
        }

        return $lastMessage;
    }

    protected function handleFlowGreeting(
        Conversation $conversation,
        array $flowGreeting,
    ): ConversationItem|null {
        AiAgentSession::start(
            $conversation,
            flowId: $flowGreeting['flow_id'],
            status: $flowGreeting['session_status'],
            currentNodeId: $flowGreeting['current_node_id'],
        );

        $messages = array_map(
            fn($part) => (new CreateConversationMessage())->execute(
                $conversation,
                $part,
            ),
            $flowGreeting['parts'],
        );

        return Arr::last($messages);
    }
}
