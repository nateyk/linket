<?php

namespace App\Storefront\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreatorPaymentMethod extends StorefrontModel
{
    protected $fillable = [
        'workspace_id', 'user_id', 'provider', 'account_number', 'account_fingerprint',
        'account_name_raw', 'account_name_normalized', 'approved_aliases', 'pending_alias',
        'alias_proof_path', 'proof_path',
        'status', 'rejection_reason', 'is_active', 'reviewed_by', 'verified_at',
        'provider_registration_status', 'provider_registered_at', 'provider_registered_by',
        'is_suspended', 'suspension_reason', 'suspended_at', 'suspended_by',
    ];

    protected $hidden = ['account_number', 'account_fingerprint', 'proof_path', 'alias_proof_path'];

    protected $casts = [
        'account_number' => 'encrypted',
        'approved_aliases' => 'array',
        'is_active' => 'boolean',
        'verified_at' => 'datetime',
        'provider_registered_at' => 'datetime',
        'suspended_at' => 'datetime',
        'is_suspended' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function isAvailable(): bool
    {
        return $this->status === 'approved'
            && $this->provider_registration_status === 'registered'
            && $this->is_active
            && !$this->is_suspended;
    }

    public function lifecycleState(): string
    {
        if ($this->status === 'rejected') {
            return 'rejected';
        }

        if ($this->is_suspended) {
            return 'suspended';
        }

        if ($this->status !== 'approved') {
            return 'pending_ownership_review';
        }

        if ($this->provider_registration_status !== 'registered') {
            return 'pending_provider_registration';
        }

        return $this->is_active ? 'active' : 'provider_registered';
    }
}
