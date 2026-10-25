<?php

namespace Ai\AiAgent\Models;

use App\Attributes\Traits\HasCustomAttributes;
use App\Conversations\Models\Conversation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AiAgentSession extends Model
{
    use HasCustomAttributes;

    const MODEL_TYPE = 'aiAgentSession';

    const STATUS_ACTIVE = 'active';
    const STATUS_IDLE = 'idle';
    const STATUS_WAITING_FOR_USER_INPUT = 'waiting_for_user_input';

    protected $guarded = [];

    protected $casts = [
        'context' => 'array',
        'user_id' => 'int',
        'chat_id' => 'int',
        'active_flow_id' => 'int',
        'status' => 'string',
    ];

    public function flow(): BelongsTo
    {
        return $this->belongsTo(AiAgentFlow::class, 'active_flow_id');
    }

    public function toolResponses(): BelongsToMany
    {
        return $this->belongsToMany(ToolResponse::class);
    }

    public function isActive(): bool
    {
        return $this->active_flow_id !== null &&
            $this->status !== self::STATUS_IDLE;
    }

    public static function start(
        Conversation $conversation,
        int $flowId,
        string $status,
        string|null $currentNodeId,
    ) {
        $session = $conversation->aiAgentSession()->create([
            'user_id' => $conversation->user_id,
            'active_flow_id' => $flowId,
            'status' => $status,
            'context' => [
                'currentNodeId' => $currentNodeId,
            ],
        ]);

        $conversation->setRelation('session', $session);

        AiAgentFlow::where('id', $flowId)->increment('activation_count');

        return $session;
    }
}
