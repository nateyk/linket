<?php

namespace App\Storefront\Models;

use App\Models\User;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalProductEarningsLedger extends StorefrontModel
{
    use BelongsToWorkspace;

    protected $guarded = [];

    protected $casts = [
        'amount_cents' => 'integer',
        'available_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'creator_id'); }
    public function order(): BelongsTo { return $this->belongsTo(StorefrontOrder::class, 'storefront_order_id'); }
    public function payoutRequest(): BelongsTo { return $this->belongsTo(PayoutRequest::class); }
}
