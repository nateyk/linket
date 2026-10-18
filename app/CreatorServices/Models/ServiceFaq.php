<?php

namespace App\CreatorServices\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceFaq extends Model
{
    protected $table = 'creator_service_faqs';

    protected $guarded = [];

    protected $casts = [
        'creator_service_id' => 'integer',
        'position' => 'integer',
    ];

    public function service(): BelongsTo
    {
        return $this->belongsTo(CreatorService::class, 'creator_service_id');
    }
}
