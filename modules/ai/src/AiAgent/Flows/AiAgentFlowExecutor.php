<?php

namespace Ai\AiAgent\Flows;

use Ai\AiAgent\Conversations\Streaming\EventEmitter;
use Ai\AiAgent\Flows\Nodes\NodeType;
use Ai\AiAgent\Models\AiAgentFlow;
use Ai\AiAgent\Models\AiAgentSession;
use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class AiAgentFlowExecutor
{
    public readonly User $user;

    // will be set on AI agent session "context" column after flow end is reached
    public SessionContext $sessionContext;

    // message that triggered the execution of the flow
    public ConversationItem|null $latestUserMessage = null;

    // message right before the one that triggered the flow execution, for example, it might
    // be buttons message, and $latestUserMessage is the button user clicked or typed out
    public ConversationItem|null $previousMessage = null;

    // execute flow until this node is reached (not inclusive)
    public string|null $stopNodeId = null;

    protected $visitedNodes = [];

    public $executedNodes = [];

    public static array $debugLog = [];

    public function __construct(public readonly Conversation $conversation)
    {
        $this->user = $conversation->user;
        $this->sessionContext = new SessionContext($conversation);
    }

    public function executedAnyNodes(): bool
    {
        return count($this->executedNodes) > 0;
    }

    public function usingMessages(Collection $messages): self
    {
        $this->previousMessage = $messages->get($messages->count() - 2);
        $this->latestUserMessage = $messages->last();
        return $this;
    }

    public function setActiveFlow(int|AiAgentFlow $flow): self
    {
        $this->sessionContext->setActiveFlow($flow);
        return $this;
    }

    public function execute(string|null $targetNodeId = null): self
    {
        if (!$targetNodeId) {
            $targetNodeId = $this->sessionContext->getCurrentNodeId();
        }

        self::$debugLog[] = [
            'event' => 'execute',
            'data' => [
                'latestUserMessage' => $this->latestUserMessage?->id,
                'previousMessage' => $this->previousMessage?->id,
                'targetNodeId' => $targetNodeId,
            ],
        ];

        if ($this->conversation->assigned_to !== Conversation::ASSIGNED_AGENT) {
            EventEmitter::typing();
            $this->goToNode($targetNodeId);
        }

        if (
            $this->conversation->assigned_to === Conversation::ASSIGNED_AGENT ||
            $this->sessionContext->getStatus() !==
                AiAgentSession::STATUS_WAITING_FOR_USER_INPUT
        ) {
            $this->sessionContext->setCurrentNodeId(null);
            $this->sessionContext->setStatus(AiAgentSession::STATUS_IDLE);
        }

        $this->sessionContext->syncWithDB();

        EventEmitter::debug('flowExecuted', self::$debugLog);

        return $this;
    }

    public function goToNode(string|null $to): void
    {
        // if reached the leaf node of this branch or should stop at previous node, bail
        if (!$to || $to === $this->stopNodeId) {
            self::$debugLog[] = [
                'event' => 'goToNodeReachedEnd',
                'data' => [
                    'stopNodeId' => $this->stopNodeId,
                ],
            ];
            return;
        }

        if (count($this->visitedNodes) > 200) {
            self::$debugLog[] = [
                'event' => 'maximumNodeTransitionsReached',
                'data' => [
                    'visitedNodesCount' => count($this->visitedNodes),
                ],
            ];
            return;
        }

        $nodeConfig = Arr::first(
            $this->sessionContext->getAllNodes(),
            fn($node) => $node['id'] === $to,
        );

        // if goToNode is reached and it's already visited, it's an infinite loop most likely
        if (
            $nodeConfig['type'] === 'goToNode' &&
            in_array($to, $this->visitedNodes)
        ) {
            self::$debugLog[] = [
                'event' => 'goToNodeInfiniteLoop',
                'data' => [
                    'to' => $to,
                ],
            ];
            return;
        }

        $nodeNamespace = NodeType::from($nodeConfig['type'])->getNode();

        self::$debugLog[] = [
            'event' => 'goToNode',
            'data' => [
                'to' => $to,
                'stopNodeId' => $this->stopNodeId,
                'nodeConfig' => $nodeConfig,
                'nodeNamespace' => $nodeNamespace,
            ],
        ];

        if ($nodeNamespace) {
            $this->visitedNodes[] = $to;
            $this->sessionContext->setCurrentNodeId($to);
            if ((new $nodeNamespace($nodeConfig, $this))->execute()) {
                $this->executedNodes[] = $to;
            }
        }
    }

    public function waitForUserInput(): void
    {
        $this->setSessionStatus(AiAgentSession::STATUS_WAITING_FOR_USER_INPUT);
    }

    public function setSessionStatus(string $status): void
    {
        self::$debugLog[] = [
            'event' => 'setSessionStatus',
            'data' => [
                'status' => $status,
            ],
        ];
        $this->sessionContext->setStatus($status);
    }
}
