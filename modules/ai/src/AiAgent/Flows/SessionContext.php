<?php

namespace Ai\AiAgent\Flows;

use Ai\AiAgent\Models\AiAgentFlow;
use Ai\AiAgent\Models\AiAgentSession;
use Ai\AiAgent\Models\ToolResponse;
use App\Conversations\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class SessionContext
{
    // not persisted to DB currently
    protected array $toolResponses = [];

    protected array $data;
    protected bool $isDirty = false;
    protected string $status;
    protected int|null $activeFlowId;
    protected AiAgentFlow|null $flow;
    protected AiAgentSession|null $session;
    protected User $user;

    // [['from' => 'flowId', 'to' => 'flowId'], ...]
    protected array $flowRedirects = [];

    public function __construct(protected Conversation $conversation)
    {
        $this->session = $conversation->AiAgentSession;
        $this->user = $conversation->user;
        $this->data = $this->session?->context ?? [];
        $this->status = $this->session?->status ?? AiAgentSession::STATUS_IDLE;
        $this->activeFlowId = $this->session?->active_flow_id ?? null;
        $this->flow = $this->session?->flow;
    }

    public function getAllNodes(): array
    {
        return $this->flow?->config['nodes'] ?? [];
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): void
    {
        $this->status = $status;
        $this->isDirty = true;
    }

    public function attachToolResponse(
        string $nodeId,
        ToolResponse $response,
    ): void {
        $this->session->toolResponses()->syncWithPivotValues(
            $response,
            [
                'flow_node_id' => $nodeId,
            ],
            false,
        );
    }

    public function getToolResponse(
        int $toolId,
        array $ancestorIds,
    ): ToolResponse|null {
        return $this->session
            ->toolResponses()
            ->where('tool_id', $toolId)
            ->whereIn('flow_node_id', $ancestorIds)
            ->first();
    }

    public function getSession()
    {
        return $this->session;
    }

    public function updateAttributes(array|Collection $attributes): void
    {
        $groupedAttributes = collect($attributes)
            ->groupBy('type')
            ->map->pluck('value', 'name');

        foreach ($groupedAttributes as $type => $group) {
            if ($type === User::MODEL_TYPE && $group->isNotEmpty()) {
                $this->user->updateCustomAttributes($group);
            }

            if ($type === Conversation::MODEL_TYPE && $group->isNotEmpty()) {
                $this->conversation->updateCustomAttributes($group);
            }

            if ($type === AiAgentSession::MODEL_TYPE && $group->isNotEmpty()) {
                $this->session->updateCustomAttributes($group);
            }
        }
    }

    public function getCurrentNodeId(): string|null
    {
        return $this->data['currentNodeId'] ?? null;
    }

    public function setCurrentNodeId(string|null $nodeId): void
    {
        $this->updateData([
            'currentNodeId' => $nodeId,
        ]);
    }

    public function updateData(array $data): void
    {
        $this->data = [...$this->data, ...$data];
        $this->isDirty = true;
    }

    public function setActiveFlow(int|AiAgentFlow $flow): string|null
    {
        $flowId = $flow instanceof AiAgentFlow ? $flow->id : $flow;

        if ($flowId === $this->activeFlowId) {
            return null;
        }

        // allow the same from => to transition only twice to prevent infinite loops
        if ($this->redirectedFlowTooManyTimes($this->activeFlowId, $flowId)) {
            return null;
        }

        $newFlow =
            $flow instanceof AiAgentFlow ? $flow : AiAgentFlow::find($flowId);
        $firstNodeId =
            Arr::first(
                $newFlow->config['nodes'],
                fn($node) => $node['parentId'] === 'start',
            )['id'] ?? null;

        if ($newFlow && $firstNodeId) {
            $this->activeFlowId = $newFlow->id;
            $this->flow = $newFlow;

            if ($this->session) {
                $this->flowRedirects[] = [
                    'from' => $this->activeFlowId,
                    'to' => $newFlow->id,
                ];
                $newFlow->increment('activation_count');
                $this->isDirty = true;
            } else {
                $this->session = AiAgentSession::start(
                    $this->conversation,
                    flowId: $flowId,
                    status: AiAgentSession::STATUS_ACTIVE,
                    currentNodeId: $firstNodeId,
                );
            }

            $this->setStatus(AiAgentSession::STATUS_ACTIVE);
            $this->session->setRelation('flow', $newFlow);
            $this->session->active_flow_id = $newFlow->id;
            $this->setCurrentNodeId($firstNodeId);
            return $firstNodeId;
        }

        return null;
    }

    public function syncWithDB()
    {
        if (!$this->session || !$this->isDirty) {
            return;
        }

        $this->session->update([
            'status' => $this->status,
            'active_flow_id' => $this->activeFlowId,
            'context' => $this->data,
        ]);

        $this->isDirty = false;
    }

    protected function redirectedFlowTooManyTimes(
        int|null $from,
        int|null $to,
    ): bool {
        if (!$from || !$to) {
            return false;
        }

        $count = 0;
        foreach ($this->flowRedirects as $redirect) {
            if ($redirect['from'] === $from && $redirect['to'] === $to) {
                $count++;
                if ($count >= 2) {
                    return true;
                }
            }
        }

        return false;
    }
}
