<?php

namespace App\Storefront\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalProductPayoutDestinationReveal extends StorefrontModel
{
    protected $guarded = [];

    public function payoutRequest(): BelongsTo { return $this->belongsTo(PayoutRequest::class); }
    public function revealer(): BelongsTo { return $this->belongsTo(User::class, 'revealed_by'); }
}
