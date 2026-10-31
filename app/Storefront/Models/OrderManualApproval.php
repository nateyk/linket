<?php

namespace App\Storefront\Models;

class OrderManualApproval extends StorefrontModel
{
    public $timestamps = false;

    protected $fillable = [
        'storefront_order_id', 'creator_id', 'buyer_reference', 'creator_ip',
        'reason', 'proof_path', 'was_degraded_mode', 'approved_by', 'approval_source', 'created_at',
    ];

    protected $hidden = ['creator_ip', 'proof_path'];

    protected $casts = ['was_degraded_mode' => 'boolean', 'created_at' => 'datetime'];
}
