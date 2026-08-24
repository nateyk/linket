<?php

namespace App\Stores\Models;

use App\Links\Actions\LinkeablePublicPolicy;
use App\Links\Models\Link;
use Illuminate\Database\Eloquent\Casts\Attribute;

class StoreLink extends Link
{
    public $table = 'links';

    protected $eagerLoad = ['rules', 'tags', 'pixels', 'domain'];
    protected $hidden = ['pivot', 'password'];
    protected $appends = [
        'position',
        'animation',
        'leap_until',
        'active',
        'active_locked',
        'short_url',
        'model_type',
    ];
    protected $casts = [
        'id' => 'integer',
        'domain_id' => 'integer',
        'user_id' => 'integer',
        'active' => 'boolean',
        'position' => 'int',
        'expires_at' => 'datetime',
        'clicked_at' => 'datetime',
        'activates_at' => 'datetime',
        'leap_until' => 'datetime',
        'active_locked' => 'boolean',
    ];

    const MODEL_TYPE = 'storeLink';

    public function getTable(): string
    {
        return 'links';
    }

    protected function position(): Attribute
    {
        return Attribute::make(
            get: fn($value, $attributes) => $this->pivot->position ?? $value,
        );
    }

    protected function animation(): Attribute
    {
        return Attribute::make(
            get: fn($value, $attributes) => $this->pivot->animation ?? $value,
        );
    }

    protected function leapUntil(): Attribute
    {
        return Attribute::make(
            get: fn($value, $attributes) => $this->pivot->leap_until ?? $value,
        );
    }

    protected function activeLocked(): Attribute
    {
        return Attribute::make(
            get: function (): bool {
                if (
                    LinkeablePublicPolicy::linkeableExpired($this) ||
                    LinkeablePublicPolicy::linkeableWillActivateLater($this)
                ) {
                    return true;
                }
                return false;
            },
        );
    }

    protected function active(): Attribute
    {
        return Attribute::make(
            get: fn() => !$this->active_locked && (bool) ($this->pivot->active ?? $this->attributes['active'] ?? false),
        );
    }

    public static function getModelTypeAttribute(): string
    {
        return self::MODEL_TYPE;
    }
}
