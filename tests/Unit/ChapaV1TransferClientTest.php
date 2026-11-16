<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\ChapaV1TransferClient;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class ChapaV1TransferClientTest extends TestCase
{
    public function testItUsesV1EndpointsWithBearerAuthAndMajorUnitEtbTransfers(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'status' => 'success',
                'data' => [
                    ['id' => 855, 'slug' => 'telebirr', 'is_active' => 1, 'active' => 1, 'currency' => 'ETB'],
                ],
            ], 200),
            'https://api.chapa.co/v1/transfers' => Http::response([
                'status' => 'success',
                'message' => 'Transfer Queued Successfully',
                'data' => 'lk-po-test-ref',
            ], 200),
            'https://api.chapa.co/v1/transfers/verify/*' => Http::response([
                'status' => 'success',
                'data' => ['status' => 'pending', 'reference' => 'lk-po-test-ref', 'amount' => '500.00', 'currency' => 'ETB'],
            ], 200),
        ]);

        $client = new ChapaV1TransferClient();
        $this->assertCount(1, $client->banks('CHASECK_TEST-private'));
        $transfer = $client->create('CHASECK_TEST-private', [
            'account_name' => 'Test Seller',
            'account_number' => '0911223344',
            'amount' => '500.00',
            'currency' => 'ETB',
            'reference' => 'lk-po-test-ref',
            'bank_code' => 855,
        ]);
        $this->assertSame('success', $transfer['status']);
        $this->assertSame('pending', $client->verify('CHASECK_TEST-private', 'lk-po-test-ref')['data']['status']);

        Http::assertSent(fn ($request) =>
            $request->url() === 'https://api.chapa.co/v1/transfers'
            && $request->hasHeader('Authorization', 'Bearer CHASECK_TEST-private')
            && $request['bank_code'] === 855
            && $request['amount'] === '500.00'
            && $request['reference'] === 'lk-po-test-ref'
        );
    }

    public function testRejectedTransferFailsClosed(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/transfers' => Http::response([
                'status' => 'failed',
                'message' => 'Insufficient Balance',
                'data' => null,
            ], 422),
        ]);

        $this->expectException(RuntimeException::class);
        (new ChapaV1TransferClient())->create('CHASECK_TEST-private', [
            'amount' => '100.00',
            'reference' => 'lk-po-unpaid',
            'currency' => 'ETB',
            'account_number' => '0911223344',
            'account_name' => 'Test Seller',
            'bank_code' => 855,
        ]);
    }

    public function testNoSecretPreventsExternalNetworkCall(): void
    {
        Http::fake();
        $this->expectExceptionMessage('secret is not configured');
        try {
            (new ChapaV1TransferClient())->banks('');
        } finally {
            Http::assertNothingSent();
        }
    }
}
