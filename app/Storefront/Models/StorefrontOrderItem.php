<?php

namespace App\Storefront\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StorefrontOrderItem extends StorefrontModel
{
    protected $guarded = [];
    protected $casts = ['unit_amount_cents' => 'integer', 'quantity' => 'integer'];
    public function order(): BelongsTo { return $this->belongsTo(StorefrontOrder::class, 'storefront_order_id'); }
}
