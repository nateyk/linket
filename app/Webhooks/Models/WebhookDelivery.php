<?php

namespace App\Webhooks\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WebhookDelivery extends Model
{
    use HasUuids;

    protected $guarded = [];

    const STATUS_PENDING = 'pending';
    const STATUS_RETRYING = 'retrying';
    const STATUS_DELIVERED = 'delivered';
    const STATUS_FAILED = 'failed';

    protected $casts = [
        'attempts_count' => 'integer',
        'last_attempt_at' => 'datetime',
        'delivered_at' => 'datetime',
        'payload' => 'array',
    ];

    public function webhook(): BelongsTo
    {
        return $this->belongsTo(Webhook::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(WebhookDeliveryAttempt::class);
    }
}
