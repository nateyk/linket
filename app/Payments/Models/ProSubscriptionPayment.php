<?php

namespace App\Payments\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProSubscriptionPayment extends Model
{
    protected $guarded = [];

    protected $casts = [
        'amount_cents' => 'integer',
        'paid_at' => 'datetime',
        'subscription_period_start' => 'datetime',
        'subscription_period_end' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }
}
