<?php

use App\Payments\VerifyEt\VerifyEtClient;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

it('rejects synthetic Verify.et verification when the configured environment is production', function (): void {
    config()->set('services.verify_et.mock', true);
    config()->set('app.env', 'production');

    expect(fn () => app(VerifyEtClient::class)->getVerification('synthetic-request-id'))
        ->toThrow(\RuntimeException::class, 'Verify.et mock');
});

it('rejects synthetic Verify.et verification when the runtime environment is production', function (): void {
    config()->set('services.verify_et.mock', true);

    $originalEnvironment = app()->environment();
    app()->detectEnvironment(fn () => 'production');

    try {
        expect(fn () => app(VerifyEtClient::class)->submitVerification([
            'bank' => 'cbe',
            'amount' => '10.00',
            'currency' => 'ETB',
            'referenceNumber' => 'SYNTHETIC-TEST-ONLY',
        ], 'synthetic-idempotency-key'))->toThrow(\RuntimeException::class, 'Verify.et mock');
    } finally {
        app()->detectEnvironment(fn () => $originalEnvironment);
    }
});
