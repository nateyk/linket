<?php

namespace App\Storefront\Models;

use Illuminate\Database\Eloquent\Model;

class DirectPaymentMethod extends Model
{
    protected $table = 'direct_payment_method_catalog';
    protected $guarded = [];
    protected $casts = ['creator_setup_enabled' => 'boolean', 'checkout_enabled' => 'boolean', 'automated_verification_supported' => 'boolean', 'recipient_matching_supported' => 'boolean', 'manual_review_eligible' => 'boolean', 'operationally_suspended' => 'boolean', 'required_transaction_fields' => 'array', 'required_account_fields' => 'array'];

    public function isAvailableForCheckout(): bool
    {
        return $this->checkout_enabled && $this->automated_verification_supported && $this->recipient_matching_supported && !$this->operationally_suspended;
    }
}
