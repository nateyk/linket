<?php

namespace App\TrackingPixels\Models;

use App\TrackingPixels\Factories\TrackingPixelFactory;
use App\Models\User;
use Common\Core\BaseModel;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class TrackingPixel extends BaseModel
{
    use Searchable, HasFactory, BelongsToWorkspace, SoftDeletes;

    protected $guarded = [];
    protected $appends = ['model_type'];

    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',
        'deleted_at' => 'datetime',
    ];

    const MODEL_TYPE = 'trackingPixel';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'user_id' => $this->user_id,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
            'workspace_id' => $this->workspace_id ?? '_null',
            'is_archived' => $this->deleted_at !== null,
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->type,
        ];
    }

    public static function filterableFields(): array
    {
        return [
            'id',
            'type',
            'name',
            'is_archived',
            'user_id',
            'created_at',
            'updated_at',
            'deleted_at',
            'workspace_id',
        ];
    }

    public static function sortableFields(): array
    {
        return ['id', 'name', 'created_at', 'updated_at'];
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }

    protected static function newFactory()
    {
        return TrackingPixelFactory::new();
    }
}
