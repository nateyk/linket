<?php

namespace App\CreatorServices\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServicePackage extends Model
{
    protected $table = 'creator_service_packages';

    protected $guarded = [];

    protected $casts = [
        'creator_service_id' => 'integer',
        'price_cents' => 'integer',
        'delivery_days' => 'integer',
        'revisions' => 'integer',
        'features' => 'array',
        'position' => 'integer',
    ];

    public function service(): BelongsTo
    {
        return $this->belongsTo(CreatorService::class, 'creator_service_id');
    }
}
