<?php

namespace App\CreatorServices\Models;

use Common\Files\FileEntry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceImage extends Model
{
    protected $table = 'creator_service_images';

    protected $guarded = [];

    protected $casts = [
        'creator_service_id' => 'integer',
        'file_entry_id' => 'integer',
        'position' => 'integer',
    ];

    public function service(): BelongsTo
    {
        return $this->belongsTo(CreatorService::class, 'creator_service_id');
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(FileEntry::class, 'file_entry_id');
    }
}
