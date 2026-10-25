<?php

namespace Ai\AiAgent\Models;

use App\HelpCenter\Models\HcArticle;
use Common\Core\BaseModel;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class AiAgent extends BaseModel
{
    const MODEL_TYPE = 'aiAgent';

    protected $table = 'ai_agents';

    protected $guarded = ['id'];

    protected $casts = [
        'enabled' => 'boolean',
    ];

    public function articles(): MorphToMany
    {
        return $this->morphedByMany(
            HcArticle::class,
            'ai_agentable',
        );
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'enabled' => $this->enabled,
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'image' => null,
            'model_type' => self::MODEL_TYPE,
        ];
    }

    public static function filterableFields(): array
    {
        return ['id', 'enabled'];
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
