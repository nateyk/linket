<?php

namespace Livechat\Models;

use Common\Core\BaseModel;
use Laravel\Scout\Searchable;
use Livechat\Models\IdeHelperCampaign;

/**
 * @mixin IdeHelperCampaign
 */
class Campaign extends BaseModel
{
    use Searchable;

    const MODEL_TYPE = 'campaign';

    protected $guarded = ['id'];

    protected $dateFormat = 'Y-m-d H:i:s';

    protected $casts = [
        'content' => 'array',
        'conditions' => 'array',
        'appearance' => 'array',
        'width' => 'float',
        'height' => 'float',
        'enabled' => 'bool',
        'impression_count' => 'int',
        'interaction_count' => 'int',
    ];

    public static function getModelTypeAttribute(): string
    {
        return self::MODEL_TYPE;
    }

    public static function filterableFields(): array
    {
        return ['enabled'];
    }

    public static function sortableFields(): array
    {
        return ['id', 'name', 'enabled', 'created_at', 'updated_at'];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'model_type' => self::MODEL_TYPE,
        ];
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
        ];
    }
}
