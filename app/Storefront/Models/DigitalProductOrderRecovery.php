<?php

namespace App\Storefront\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class DigitalProductOrderRecovery extends StorefrontModel
{
    protected $guarded = [];

    protected $hidden = ['email', 'email_hash', 'token_hash', 'session_token_hash'];

    protected $casts = [
        'email' => 'encrypted',
        'expires_at' => 'datetime',
        'redeemed_at' => 'datetime',
        'session_expires_at' => 'datetime',
    ];

    public function deliveries(): HasMany
    {
        return $this->hasMany(DigitalProductOrderRecoveryDelivery::class);
    }
}
