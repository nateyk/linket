<?php

namespace App\Storefront\Models;

use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

class StorefrontOrder extends StorefrontModel
{
    protected $guarded = [];
    protected $hidden = ['payment_account_snapshot', 'payment_access_token_hash'];
    protected $casts = ['gross_amount_cents' => 'integer', 'commission_bps' => 'integer', 'commission_plan_id' => 'integer', 'payment_account_snapshot' => 'encrypted', 'payment_expires_at' => 'datetime', 'platform_fee_percent' => 'float', 'platform_fee_cents' => 'integer', 'creator_earnings_cents' => 'integer', 'paid_at' => 'datetime', 'receipt_sent_at' => 'datetime'];
    public function product(): BelongsTo { return $this->belongsTo(DigitalProduct::class, 'digital_product_id'); }
    public function biolink(): BelongsTo { return $this->belongsTo(Biolink::class, 'biolink_id'); }
    public function store(): BelongsTo { return $this->belongsTo(Store::class, 'biolink_id'); }

    public function getStoreIdAttribute()
    {
        return $this->attributes['biolink_id'] ?? null;
    }

    public function setStoreIdAttribute($value): void
    {
        $this->attributes['biolink_id'] = $value;
    }

    public function getBiolinkIdAttribute($value)
    {
        return $value ?? $this->attributes['store_id'] ?? null;
    }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'creator_id'); }
    public function buyer(): BelongsTo { return $this->belongsTo(User::class, 'buyer_user_id'); }
    public function items(): HasMany { return $this->hasMany(StorefrontOrderItem::class); }
    public function entitlements(): HasMany { return $this->hasMany(DownloadEntitlement::class); }
    public function earningsLedger(): HasMany { return $this->hasMany(DigitalProductEarningsLedger::class); }
    public function refunds(): HasMany { return $this->hasMany(DigitalProductPaymentRefund::class); }
    public function review(): HasOne { return $this->hasOne(ProductReview::class); }
    public function creatorPaymentMethod(): BelongsTo { return $this->belongsTo(CreatorPaymentMethod::class); }
    public function directPaymentVerifications(): MorphMany { return $this->morphMany(\App\Payments\Models\DirectPaymentVerification::class, 'payable'); }
    public function latestDirectPaymentVerification(): MorphOne { return $this->morphOne(\App\Payments\Models\DirectPaymentVerification::class, 'payable')->latestOfMany(); }
}
