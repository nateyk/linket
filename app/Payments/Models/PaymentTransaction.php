<?php

namespace App\Payments\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Storefront\Models\DigitalProductPaymentRefund;

class PaymentTransaction extends Model
{
    protected $guarded = [];

    protected $casts = [
        'amount' => 'decimal:2',
        'verification_data' => 'array',
        'verified_at' => 'datetime',
    ];

    public function payable(): MorphTo
    {
        return $this->morphTo();
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(DigitalProductPaymentRefund::class);
    }
}
