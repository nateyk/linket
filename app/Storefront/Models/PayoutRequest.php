<?php

namespace App\Storefront\Models;

use App\Models\User;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayoutRequest extends StorefrontModel
{
    use BelongsToWorkspace;
    protected $fillable = [
        'workspace_id',
        'creator_id',
        'digital_product_payout_method_id',
        'withdrawal_method_id',
        'payout_method_label',
        'withdrawal_method_name',
        'payout_destination',
        'currency',
        'amount_cents',
        'status',
        'processed_by',
        'paid_at',
        'processing_at',
        'rejected_at',
        'cancelled_at',
        'transfer_reference',
        'admin_notes',
        'rejection_reason',
    ];
    protected $hidden = ['payout_destination'];
    protected $casts = ['amount_cents' => 'integer', 'payout_destination' => 'encrypted', 'paid_at' => 'datetime', 'processing_at' => 'datetime', 'rejected_at' => 'datetime', 'cancelled_at' => 'datetime'];
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'creator_id'); }
    public function processor(): BelongsTo { return $this->belongsTo(User::class, 'processed_by'); }
    public function payoutMethod(): BelongsTo { return $this->belongsTo(DigitalProductPayoutMethod::class, 'digital_product_payout_method_id'); }
    public function withdrawalMethod(): BelongsTo { return $this->belongsTo(DigitalProductWithdrawalMethod::class); }
    public function activities(): HasMany { return $this->hasMany(DigitalProductPayoutRequestActivity::class); }
    public function destinationReveals(): HasMany { return $this->hasMany(DigitalProductPayoutDestinationReveal::class); }
}
