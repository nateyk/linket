<?php

namespace App\Storefront\Models;

use Common\Files\FileEntry;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalProductSample extends StorefrontModel
{
    protected $fillable = [
        'digital_product_id',
        'file_entry_id',
        'kind',
        'title',
        'position',
        'duration_ms',
        'is_free_preview',
    ];

    protected $attributes = [
        'position' => 0,
        'is_free_preview' => true,
    ];

    protected $casts = [
        'digital_product_id' => 'integer',
        'file_entry_id' => 'integer',
        'position' => 'integer',
        'duration_ms' => 'integer',
        'is_free_preview' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(DigitalProduct::class, 'digital_product_id');
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(FileEntry::class, 'file_entry_id');
    }
}
