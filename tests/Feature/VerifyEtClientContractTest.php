<?php

namespace Tests\Feature;

use App\Payments\VerifyEt\VerifyEtClient;
use App\Payments\VerifyEt\VerifyEtHttp;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VerifyEtClientContractTest extends TestCase
{
    public function testItUsesTheDocumentedApiKeyHeaderAndEndpoints(): void
    {
        config()->set('services.verify_et.api_key', 'VERIFY_BANK_ET_test');
        config()->set('services.verify_et.base_url', 'https://verify.et');
        Http::fake([
            'verify.et/api/verify' => Http::response(['success' => true, 'data' => [], 'requestId' => 'request-1', 'verification' => ['processingStatus' => 'queued', 'status' => 'pending', 'verified' => false]], 202),
            'verify.et/api/verify/request-1' => Http::response(['success' => true, 'data' => ['requestId' => 'request-1', 'processingStatus' => 'running', 'status' => 'pending', 'verified' => false]], 200),
        ]);
        $http = \Mockery::mock(VerifyEtHttp::class);
        $http->shouldReceive('factory')->andReturn(Http::getFacadeRoot());
        app()->instance(VerifyEtHttp::class, $http);

        app(VerifyEtClient::class)->submitVerification(['bank' => 'cbe', 'reference' => 'receipt-1'], 'stable-key');
        app(VerifyEtClient::class)->getVerification('request-1');

        Http::assertSent(fn ($request) => $request->url() === 'https://verify.et/api/verify'
            && $request->hasHeader('x-api-key', 'VERIFY_BANK_ET_test')
            && $request->hasHeader('Idempotency-Key', 'stable-key'));
        Http::assertSent(fn ($request) => $request->url() === 'https://verify.et/api/verify/request-1'
            && $request->hasHeader('x-api-key', 'VERIFY_BANK_ET_test'));
    }
}
