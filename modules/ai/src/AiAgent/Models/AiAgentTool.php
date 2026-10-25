<?php

namespace Ai\AiAgent\Models;

use Common\Core\BaseModel;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;

class AiAgentTool extends BaseModel
{
    const MODEL_TYPE = 'aiAgentTool';

    protected $guarded = [];

    protected $casts = [
        'allow_direct_use' => 'bool',
        'config' => 'array',
        'response_schema' => 'array',
        'active' => 'bool',
    ];

    public function responses()
    {
        return $this->hasMany(ToolResponse::class, 'tool_id');
    }

    #[Scope]
    protected function whereActive(Builder $builder): Builder
    {
        return $builder->where('active', true);
    }

    public function toArrayWithResponses()
    {
        $responses = $this->responses()
            ->where(
                fn($query) => $query
                    ->where('type', 'editorExample')
                    ->orWhere('type', 'editorLive'),
            )
            ->get();

        $data = $this->toArray();

        $data['example_response'] = $responses->firstWhere(
            'type',
            'editorExample',
        )?->response;
        $data['live_response'] = $responses->firstWhere(
            'type',
            'editorLive',
        )?->response;

        return $data;
    }

    public static function filterableFields(): array
    {
        return [
            'id',
            'created_at',
            'updated_at',
            'active',
            'type',
            'allow_direct_use',
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'model_type' => self::MODEL_TYPE,
        ];
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
        ];
    }

    public static function getModelTypeAttribute(): string
    {
        return self::MODEL_TYPE;
    }

    public static function sortableFields(): array
    {
        return [];
    }
}
