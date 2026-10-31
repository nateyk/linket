<?php

namespace App\Storefront\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class CommissionInvoice extends StorefrontModel
{
    protected $guarded = [];

    protected $casts = [
        'due_at' => 'datetime',
        'paid_at' => 'datetime',
        'period_start' => 'date',
        'period_end' => 'date',
        'commission_fee_cents' => 'integer',
        'gross_sales_cents' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function accruals(): HasMany
    {
        return $this->hasMany(CommissionAccrual::class);
    }

    public function directPaymentVerifications(): MorphMany
    {
        return $this->morphMany(\App\Payments\Models\DirectPaymentVerification::class, 'payable');
    }
}
