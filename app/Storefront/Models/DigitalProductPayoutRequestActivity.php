<?php

namespace App\Storefront\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalProductPayoutRequestActivity extends StorefrontModel
{
    protected $guarded = [];

    public function actor(): BelongsTo { return $this->belongsTo(User::class, 'actor_id'); }
    public function payoutRequest(): BelongsTo { return $this->belongsTo(PayoutRequest::class); }
}
