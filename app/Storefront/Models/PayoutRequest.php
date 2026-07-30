<?php

namespace App\Storefront\Models;

use App\Models\User;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayoutRequest extends StorefrontModel
{
    use BelongsToWorkspace;
    protected $fillable = [
        'workspace_id',
        'creator_id',
        'digital_product_payout_method_id',
        'payout_method_label',
        'currency',
        'amount_cents',
        'status',
        'processed_by',
        'paid_at',
    ];
    protected $casts = ['amount_cents' => 'integer', 'paid_at' => 'datetime'];
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'creator_id'); }
    public function processor(): BelongsTo { return $this->belongsTo(User::class, 'processed_by'); }
    public function payoutMethod(): BelongsTo { return $this->belongsTo(DigitalProductPayoutMethod::class, 'digital_product_payout_method_id'); }
}
