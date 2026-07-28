<?php

namespace App\Webhooks\Models;

use App\Models\User;
use Common\Core\BaseModel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Webhook extends BaseModel
{
    use SoftDeletes, HasUuids;

    const MODEL_TYPE = 'webhook';

    const EVENT_CREATED = 'created';
    const EVENT_UPDATED = 'updated';
    const EVENT_DELETED = 'deleted';
    const EVENT_CLICKED = 'clicked';
    const EVENT_SCANNED = 'scanned';

    protected $guarded = [];

    protected $casts = [
        'user_id' => 'integer',
        'workspace_id' => 'integer',
        'selected_events' => 'array',
        'consecutive_failures' => 'integer',
    ];

    protected $appends = ['model_type'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class);
    }

    public function deliveryAttempts(): HasMany
    {
        return $this->hasMany(WebhookDeliveryAttempt::class);
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'url' => $this->url,
            'user_id' => $this->user_id,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->url,
        ];
    }

    public static function filterableFields(): array
    {
        return ['id', 'user_id', 'created_at', 'updated_at'];
    }

    public static function sortableFields(): array
    {
        return ['id', 'created_at', 'updated_at'];
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }
}
