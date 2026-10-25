<?php

namespace Ai\AiAgent\Conversations;

use Ai\AiAgent\Conversations\Actions\ChatWithLlm;
use Ai\AiAgent\Conversations\Actions\ClassifyUserMessage;
use Ai\AiAgent\Conversations\Actions\MessageCreator;
use Ai\AiAgent\Conversations\Data\ClassifierResponse;
use Ai\AiAgent\Conversations\Data\ClassifierStatusCode;
use Ai\AiAgent\Conversations\Streaming\EventEmitter;
use Ai\AiAgent\Flows\AiAgentFlowExecutor;
use Ai\AiAgent\Models\AiAgentFlow;
use Ai\AiAgent\Models\AiAgentTool;
use Ai\AiAgent\Tools\ToolBoundToConversation;
use App\Conversations\Agent\Actions\ConversationsAssigner;
use App\Conversations\Models\Conversation;
use Common\AI\Chat\AssistantMessage;
use Common\AI\Chat\UserMessage;
use Common\AI\Llm;
use Common\AI\Providers\ProviderParams;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class AiAgent
{
    protected readonly MessageCreator $messageCreator;
    protected readonly Collection $messages;

    public function __construct(protected Conversation $conversation)
    {
        $this->messageCreator = new MessageCreator($this->conversation);

        $this->messages = $this->conversation
            ->items()
            ->orderBy('id', 'desc')
            ->limit(15)
            ->get()
            ->reverse()
            ->values();
    }

    public function handleLatestUserMessage()
    {
        // if last message is not by user, bail
        $latestMessage = $this->messages->last();
        if (
            $latestMessage->author !== Conversation::AUTHOR_USER ||
            $latestMessage->type !== 'message'
        ) {
            return;
        }

        EventEmitter::debug('handlingLatestMessage', $latestMessage->toArray());

        if ($this->maybeHandleWithFlow()) {
            return;
        }

        $this->handleWithLlm();
    }

    protected function maybeHandleWithFlow(): bool
    {
        if (
            $this->messages->isNotEmpty() &&
            $this->conversation->AiAgentSession?->isActive()
        ) {
            return (new AiAgentFlowExecutor($this->conversation))
                ->usingMessages($this->messages)
                ->execute()
                ->executedAnyNodes();
        }

        return false;
    }

    protected function handleWithLlm()
    {
        EventEmitter::typing();

        if (
            $this->messages->last()->author !== Conversation::AUTHOR_USER ||
            !$this->messages->last()->body
        ) {
            EventEmitter::error('User message is invalid', [
                'message' => $this->messages->last()->toArray(),
            ]);
            return;
        }

        try {
            $flowsWithIntent = AiAgentFlow::whereNotNull('intent')
                ->limit(20)
                ->get();

            $response = (new ClassifyUserMessage())->execute(
                $this->getConversationHistory(),
                $flowsWithIntent,
            );

            if (ClassifierStatusCode::isFlowIntent($response->code)) {
                $index = ClassifierStatusCode::flowIntentCodeToIndex(
                    $response->code,
                );
                $flow = $this->flowsWithIntent[$index] ?? null;
                if ($flow) {
                    $this->triggerFlow($flow);
                }
            } elseif (
                $response->code === ClassifierStatusCode::TransferToHuman
            ) {
                $this->transferToHuman();
            } else {
                $this->chatWithLlm($response);
            }
        } catch (\Throwable $e) {
            $this->messageCreator->genericErrorMessage();
            EventEmitter::error($e->getMessage());
            Log::error($e);
        }
    }

    protected function chatWithLlm(ClassifierResponse $classifierResponse)
    {
        $conversationHistory = $this->getConversationHistory();

        $response = (new ChatWithLlm())->execute(
            $classifierResponse,
            $conversationHistory,
            tools: $this->buildTools(),
        );

        $this->messageCreator->genericMessage($response->output);

        if (
            $classifierResponse->code === ClassifierStatusCode::TransferToHuman
        ) {
            (new ConversationsAssigner())->assignConversationToFirstAvailableAgent(
                $this->conversation,
                addEvent: true,
            );
        }
    }

    protected function transferToHuman()
    {
        if (settings('aiAgent.transfer.type') === 'instruction') {
            $response = Llm::resolveProvider(
                new ProviderParams(
                    systemPrompt: 'Classifier has determined that user has asked to speak to human agent. ' .
                        settings('aiAgent.transfer.instruction') .
                        '. Match the language and tone of conversation history.',
                    messages: $this->getConversationHistory(),
                ),
            )->generateText();

            $this->messageCreator->genericMessage($response->output);
        } else {
            $response = Llm::resolveProvider(
                new ProviderParams(
                    systemPrompt: 'Classifier has determined that user has asked to speak to human agent. Let user know that you are transferring the conversation to a member of the team. Match the language and tone of conversation history.',
                    messages: $this->getConversationHistory(),
                ),
            )->generateText();

            $this->messageCreator->genericMessage($response->output);

            (new ConversationsAssigner())->assignConversationToFirstAvailableAgent(
                $this->conversation,
                addEvent: true,
            );
        }
    }

    protected function getConversationHistory(): Collection
    {
        return $this->messages
            ->filter(
                fn($message) => $message->type === 'message' &&
                    strlen($message->body) >= 1,
            )
            ->map(
                fn($message) => $message->author === Conversation::AUTHOR_USER
                    ? new UserMessage($message->body)
                    : new AssistantMessage($message->body),
            );
    }

    protected function triggerFlow(int|AiAgentFlow $flow)
    {
        return (new AiAgentFlowExecutor($this->conversation))
            ->setActiveFlow($flow)
            ->usingMessages($this->messages)
            ->execute()
            ->executedAnyNodes();
    }

    protected function buildTools(): Collection
    {
        return AiAgentTool::query()
            ->whereActive()
            ->where('allow_direct_use', true)
            ->limit(20)
            ->get()
            ->map(
                fn($tool) => new ToolBoundToConversation(
                    $tool,
                    $this->conversation,
                ),
            );
    }
}
