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
    public const STATUS_PENDING = 'pending_payment';
    public const STATUS_VERIFYING = 'verifying';
    public const STATUS_COMPLETED = 'paid';
    public const STATUS_FAILED = 'failed_verification';
    public const STATUS_CANCELLED = 'expired';
    public const STATUS_MANUAL_REVIEW = 'manual_review';

    public const DELIVERY_AWAITING_PAYMENT = 'awaiting_payment';
    public const DELIVERY_DELIVERING = 'delivering';
    public const DELIVERY_DELIVERED = 'delivered';
    public const DELIVERY_FAILED = 'failed';

    public const MAX_VERIFICATION_ATTEMPTS = 5;

    protected $guarded = [];
    protected $hidden = ['payment_account_snapshot', 'payment_access_token_hash'];
    protected $casts = [
        'gross_amount_cents' => 'integer',
        'commission_bps' => 'integer',
        'commission_plan_id' => 'integer',
        'payment_account_snapshot' => 'encrypted',
        'payment_expires_at' => 'datetime',
        'platform_fee_percent' => 'float',
        'platform_fee_cents' => 'integer',
        'creator_earnings_cents' => 'integer',
        'paid_at' => 'datetime',
        'receipt_sent_at' => 'datetime',
        'verification_attempts' => 'integer',
        'delivered_at' => 'datetime',
    ];

    public function isCompleted(): bool
    {
        return in_array($this->status, ['paid', 'completed', 'fulfilled'], true);
    }

    public function isPending(): bool
    {
        return in_array($this->status, ['pending', 'pending_payment'], true);
    }

    public function isFailed(): bool
    {
        return in_array($this->status, ['failed', 'failed_verification'], true);
    }

    public function isCancelled(): bool
    {
        return in_array($this->status, ['cancelled', 'expired'], true);
    }

    public function isVerifying(): bool
    {
        return $this->status === 'verifying';
    }

    public function isDelivered(): bool
    {
        return ($this->delivery_status ?? '') === self::DELIVERY_DELIVERED;
    }

    public function isDelivering(): bool
    {
        return ($this->delivery_status ?? '') === self::DELIVERY_DELIVERING;
    }

    public function maxAttemptsExceeded(): bool
    {
        return (int) ($this->verification_attempts ?? 0) >= self::MAX_VERIFICATION_ATTEMPTS;
    }

    public function attemptsRemaining(): int
    {
        return max(0, self::MAX_VERIFICATION_ATTEMPTS - (int) ($this->verification_attempts ?? 0));
    }

    public function statusLabel(): string
    {
        return match ($this->status) {
            'pending_payment', 'pending' => 'pending',
            'verifying' => 'verifying',
            'paid', 'completed', 'fulfilled' => 'completed',
            'failed_verification', 'failed' => 'failed',
            'expired', 'cancelled' => 'cancelled',
            'manual_review' => 'manual_review',
            default => (string) $this->status,
        };
    }
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
