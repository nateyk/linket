<?php

namespace Tests\Feature;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Payments\VerifyEt\VerifyEtHttp;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class VerifyEtBankPayloadContractTest extends TestCase
{
    use DatabaseTransactions;

    public function testBankSpecificFieldsMatchTheDocumentedVerifyEtContract(): void
    {
        config()->set('services.verify_et.api_key', 'VERIFY_BANK_ET_test');
        config()->set('services.verify_et.base_url', 'https://verify.et');
        $cases = [
            ['cbe', 'fHCxyReceipt1', [], ['bank' => 'cbe', 'reference' => 'fHCxyReceipt1', 'settlementAccount' => '1234567890']],
            ['cbe', 'FT26001234', ['accountSuffix' => '12345678'], ['bank' => 'cbe', 'reference' => 'FT26001234', 'accountSuffix' => '12345678', 'settlementAccount' => '1234567890']],
            ['boa', 'FT26005678', ['accountSuffix' => '12345'], ['bank' => 'boa', 'referenceNumber' => 'FT26005678', 'accountSuffix' => '12345', 'settlementAccount' => '1234567890']],
            ['telebirr', 'DET8FJGUJ4', [], ['bank' => 'telebirr', 'transactionNumber' => 'DET8FJGUJ4', 'settlementAccount' => '1234567890']],
            ['telebirr', 'SYNTHETICTELEBIRR1', [], ['bank' => 'telebirr', 'transactionNumber' => 'SYNTHETICTELEBIRR1', 'settlementAccount' => '0912345678']],
        ];

        $responses = Http::sequence();
        foreach ($cases as $index => $_case) {
            $responses->push([
                'success' => true,
                'data' => [],
                'requestId' => 'req_queued_' . $index,
                'verification' => ['processingStatus' => 'queued', 'status' => 'pending', 'verified' => false],
            ], 202);
        }
        Http::fake(['verify.et/api/verify?*' => $responses]);
        $http = \Mockery::mock(VerifyEtHttp::class);
        $http->shouldReceive('factory')->andReturn(Http::getFacadeRoot());
        app()->instance(VerifyEtHttp::class, $http);

        foreach ($cases as [$bank, $reference, $input, $expected]) {
            $verification = DirectPaymentVerification::query()->create([
                'reference' => $reference,
                'payable_type' => 'test_payable',
                'payable_id' => random_int(1, 2000000000),
                'bank_code' => $bank,
                'settlement_account' => $expected['settlementAccount'],
                'amount_cents' => 50000,
                'currency' => 'ETB',
                'attempt_uuid' => (string) Str::uuid(),
                'idempotency_key' => 'linket_test_' . Str::uuid(),
                'provider_input' => $input,
            ]);

            app(VerifyEtGateway::class)->submit($verification);

            Http::assertSent(fn ($request): bool => $request->url() === 'https://verify.et/api/verify?waitMs=5000'
                && $request->data() == $expected);
        }
    }
}
