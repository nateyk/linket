<?php

namespace App\Storefront\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalProductReviewEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'digital_product_id',
        'actor_id',
        'actor_role',
        'event',
        'from_status',
        'to_status',
        'reason',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'created_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(DigitalProduct::class, 'digital_product_id');
    }
}
