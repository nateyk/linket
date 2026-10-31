<?php

namespace App\Storefront\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommissionAccrual extends StorefrontModel
{
    protected $guarded = [];

    protected $casts = [
        'gross_amount_cents' => 'integer',
        'fee_bps' => 'integer',
        'fee_cents' => 'integer',
        'paid_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(StorefrontOrder::class, 'storefront_order_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(CommissionInvoice::class, 'commission_invoice_id');
    }
}
