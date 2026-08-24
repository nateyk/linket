<?php

namespace App\Storefront\Models;

use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StorefrontOrder extends StorefrontModel
{
    protected $guarded = [];
    protected $casts = ['gross_amount_cents' => 'integer', 'commission_bps' => 'integer', 'platform_fee_percent' => 'float', 'platform_fee_cents' => 'integer', 'creator_earnings_cents' => 'integer', 'paid_at' => 'datetime', 'receipt_sent_at' => 'datetime'];
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
    public function items(): HasMany { return $this->hasMany(StorefrontOrderItem::class); }
    public function entitlements(): HasMany { return $this->hasMany(DownloadEntitlement::class); }
    public function earningsLedger(): HasMany { return $this->hasMany(DigitalProductEarningsLedger::class); }
    public function refunds(): HasMany { return $this->hasMany(DigitalProductPaymentRefund::class); }
}
