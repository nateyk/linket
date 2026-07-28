<?php

namespace App\Webhooks\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookDeliveryAttempt extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected $casts = [
        'attempt_number' => 'integer',
        'response_status' => 'integer',
        'duration_ms' => 'integer',
    ];

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(WebhookDelivery::class, 'webhook_delivery_id');
    }

    public function webhook(): BelongsTo
    {
        return $this->belongsTo(Webhook::class);
    }
}
