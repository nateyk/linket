<?php

namespace App\Storefront\Models;

use App\Models\User;
use App\Payments\Models\PaymentTransaction;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalProductPaymentRefund extends StorefrontModel
{
    protected $guarded = [];

    protected $casts = ['amount_cents' => 'integer', 'creator_earnings_reversal_cents' => 'integer', 'platform_fee_reversal_cents' => 'integer', 'refunded_at' => 'datetime'];

    public function transaction(): BelongsTo { return $this->belongsTo(PaymentTransaction::class, 'payment_transaction_id'); }
    public function order(): BelongsTo { return $this->belongsTo(StorefrontOrder::class, 'storefront_order_id'); }
    public function recorder(): BelongsTo { return $this->belongsTo(User::class, 'recorded_by'); }
}
