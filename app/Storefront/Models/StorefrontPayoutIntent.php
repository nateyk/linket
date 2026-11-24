<?php

declare(strict_types=1);

namespace App\Storefront\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class StorefrontPayoutIntent extends StorefrontModel
{
    public const STATUS_PREPARED = 'prepared';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_PROVIDER_PENDING = 'provider_pending';
    public const STATUS_SUCCESSFUL = 'successful';
    public const STATUS_FAILED = 'failed';
    public const STATUS_REQUIRES_ACTION = 'requires_action';

    protected $guarded = [];

    protected $hidden = [
        'destination_snapshot',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'amount_cents' => 'integer',
        'attempts' => 'integer',
        'destination_snapshot' => 'encrypted',
        'verified_at' => 'datetime',
        'verification_data' => 'array',
    ];

    public function payoutRequest(): BelongsTo
    {
        return $this->belongsTo(PayoutRequest::class, 'payout_request_id');
    }

    public function isPrepared(): bool
    {
        return $this->status === self::STATUS_PREPARED;
    }

    public function isPending(): bool
    {
        return in_array($this->status, [self::STATUS_SUBMITTED, self::STATUS_PROVIDER_PENDING], true);
    }

    public function isSuccessful(): bool
    {
        return $this->status === self::STATUS_SUCCESSFUL;
    }

    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    public function providerStatus(): ?string
    {
        $status = data_get($this->verification_data, 'data.status')
            ?? data_get($this->verification_data, 'status');

        if (is_string($status) && filled($status)) {
            return strtolower(trim($status));
        }

        if ($this->status === self::STATUS_PROVIDER_PENDING) {
            return 'pending';
        }

        if ($this->status === self::STATUS_SUCCESSFUL) {
            return 'success';
        }

        if ($this->status === self::STATUS_FAILED) {
            return 'failed';
        }

        return null;
    }
}
