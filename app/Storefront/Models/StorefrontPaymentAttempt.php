<?php

declare(strict_types=1);

namespace App\Storefront\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StorefrontPaymentAttempt extends StorefrontModel
{
    public const STATUS_CREATED = 'created';
    public const STATUS_INITIALIZING = 'initializing';
    public const STATUS_PENDING = 'pending';
    public const STATUS_SUCCESSFUL = 'successful';
    public const STATUS_FAILED = 'failed';
    public const STATUS_EXPIRED = 'expired';

    protected $guarded = [];

    protected $casts = [
        'amount_cents' => 'integer',
        'verified_at' => 'datetime',
        'verification_data' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(StorefrontOrder::class, 'order_id');
    }

    public function isPending(): bool
    {
        return in_array($this->status, [self::STATUS_CREATED, self::STATUS_INITIALIZING, self::STATUS_PENDING], true);
    }

    public function isSuccessful(): bool
    {
        return $this->status === self::STATUS_SUCCESSFUL;
    }

    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    public function isExpired(): bool
    {
        return $this->status === self::STATUS_EXPIRED;
    }
}
