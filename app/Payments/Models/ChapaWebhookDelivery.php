<?php

namespace App\Payments\Models;

use Illuminate\Database\Eloquent\Model;

class ChapaWebhookDelivery extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'signature_valid' => 'boolean',
        'received_at' => 'datetime',
    ];
}
