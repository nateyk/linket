<?php

namespace App\Storefront\Models;

use Codebyray\ReviewRateable\Models\Rating;
use Codebyray\ReviewRateable\Models\Review;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductReview extends Review
{
    protected $table = 'reviews';

    protected $fillable = [
        'reviewable_id',
        'reviewable_type',
        'user_id',
        'review',
        'department',
        'recommend',
        'approved',
        'storefront_order_id',
        'buyer_email',
        'buyer_name',
        'title',
        'hidden_by',
        'hidden_reason',
        'hidden_at',
    ];

    protected $casts = [
        'approved' => 'boolean',
        'recommend' => 'boolean',
        'hidden_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(StorefrontOrder::class, 'storefront_order_id');
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(Rating::class, 'review_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(DigitalProduct::class, 'reviewable_id');
    }
}
