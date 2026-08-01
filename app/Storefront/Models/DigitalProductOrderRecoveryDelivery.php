<?php

namespace App\Storefront\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalProductOrderRecoveryDelivery extends StorefrontModel
{
    protected $guarded = [];

    protected $hidden = ['email_hash'];

    public function recovery(): BelongsTo
    {
        return $this->belongsTo(DigitalProductOrderRecovery::class, 'digital_product_order_recovery_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(StorefrontOrder::class, 'storefront_order_id');
    }
}
