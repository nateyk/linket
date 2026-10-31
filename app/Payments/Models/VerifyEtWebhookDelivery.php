<?php

namespace App\Payments\Models;

use Illuminate\Database\Eloquent\Model;

class VerifyEtWebhookDelivery extends Model
{
    protected $guarded = [];

    protected $hidden = ['payload'];

    protected $casts = ['is_test' => 'boolean', 'received_at' => 'datetime', 'payload' => 'array'];
}
