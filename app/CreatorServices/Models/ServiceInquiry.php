<?php

namespace App\CreatorServices\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceInquiry extends Model
{
    protected $table = 'creator_service_inquiries';

    protected $guarded = [];

    protected $casts = [
        'creator_service_id' => 'integer',
        'creator_service_package_id' => 'integer',
        'read_at' => 'datetime',
    ];

    public function service(): BelongsTo
    {
        return $this->belongsTo(CreatorService::class, 'creator_service_id')->withTrashed();
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(ServicePackage::class, 'creator_service_package_id');
    }
}
