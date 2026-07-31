<?php

namespace App\Storefront\Models;

use Illuminate\Database\Eloquent\Builder;

class DigitalProductWithdrawalMethod extends StorefrontModel
{
    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
        'minimum_amount_cents' => 'integer',
        'maximum_amount_cents' => 'integer',
        'position' => 'integer',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
