<?php

namespace App\Kyc\Models;

use App\Models\User;
use Common\Core\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KycVerification extends BaseModel
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public const DOCUMENT_TYPE_NATIONAL_ID = 'national_id';
    public const DOCUMENT_TYPE_PASSPORT = 'passport';

    protected $fillable = [
        'user_id',
        'document_type',
        'document_number',
        'documents',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'documents' => 'object',
        'reviewed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public static function filterableFields(): array
    {
        return ['id', 'user_id', 'document_type', 'status', 'created_at', 'updated_at'];
    }

    public static function sortableFields(): array
    {
        return ['id', 'created_at', 'updated_at'];
    }

    public function toNormalizedArray(): array
    {
        return ['id' => $this->id];
    }

    public function toSearchableArray(): array
    {
        return $this->toNormalizedArray();
    }

    public static function getModelTypeAttribute(): string
    {
        return static::class;
    }

    public function getMorphClass(): string
    {
        return static::class;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    protected static function booted(): void
    {
        static::deleted(function (KycVerification $kycVerification): void {
            app(\App\Kyc\KycVerificationService::class)->deleteDocumentFiles(
                $kycVerification,
            );
        });
    }
}
