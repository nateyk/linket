<?php

namespace App\Storefront\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StorefrontPaymentDisputeEvent extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = [
        'storefront_payment_dispute_id' => 'integer',
        'actor_user_id' => 'integer',
        'created_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new \RuntimeException('Payment dispute audit events are immutable.');
        });

        static::deleting(function (): never {
            throw new \RuntimeException('Payment dispute audit events are immutable.');
        });
    }

    public function dispute(): BelongsTo
    {
        return $this->belongsTo(StorefrontPaymentDispute::class, 'storefront_payment_dispute_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
