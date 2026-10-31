<?php

namespace App\Payments\Models;

use App\Payments\VerifyEt\EncryptedProviderEvidence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class DirectPaymentVerification extends Model
{
    protected $guarded = [];

    protected $hidden = ['settlement_account', 'reference', 'canonical_transaction_identity', 'provider_input', 'provider_result'];

    protected $casts = [
        'settlement_account' => 'encrypted',
        'amount_cents' => 'integer',
        'verified_at' => 'datetime',
        'provider_input' => EncryptedProviderEvidence::class,
        'provider_result' => EncryptedProviderEvidence::class,
    ];

    public function payable(): MorphTo
    {
        return $this->morphTo();
    }
}
