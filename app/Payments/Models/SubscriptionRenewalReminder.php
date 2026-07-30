<?php

namespace App\Payments\Models;

use Common\Billing\Subscription;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionRenewalReminder extends Model
{
    protected $guarded = [];

    protected $casts = ['sent_at' => 'datetime'];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}
