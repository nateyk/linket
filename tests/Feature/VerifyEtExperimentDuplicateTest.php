<?php

use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\CommissionInvoice;
use App\Payments\Models\ProSubscriptionPayment;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

it('rejects a second claim for a provider transaction identity across payable purposes', function (string $firstPayable, string $secondPayable, int $secondPayableId): void {
    Http::preventStrayRequests();
    $identity = 'SYNTHETIC' . Str::upper(Str::random(16));
    $common = [
        'payable_type' => $firstPayable,
        'payable_id' => 0,
        'bank_code' => 'telebirr',
        'settlement_account' => '0000000000',
        'amount_cents' => 247000,
        'currency' => 'ETB',
        'canonical_transaction_identity' => $identity,
    ];

    DirectPaymentVerification::query()->create([...$common, 'reference' => 'SYNTHETIC-A-' . Str::uuid()]);
    expect(fn () => DirectPaymentVerification::query()->create([
        ...$common,
        'payable_type' => $secondPayable,
        'payable_id' => $secondPayableId,
        'reference' => 'SYNTHETIC-B-' . Str::uuid(),
    ]))->toThrow(UniqueConstraintViolationException::class);
})->with([
    [StorefrontOrder::class, CommissionInvoice::class, 1],
    [StorefrontOrder::class, ProSubscriptionPayment::class, 1],
    [CommissionInvoice::class, CommissionInvoice::class, 2],
]);
