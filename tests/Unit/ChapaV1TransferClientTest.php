<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\Exceptions\ChapaTransferRejectedException;
use App\Payments\Chapa\ChapaV1TransferClient;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\ChapaPayoutService;
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

    public function testExplicitTransferRejectionIsDistinguishedFromAnUncertainSubmission(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/transfers' => Http::response([
                'status' => 'failed',
                'message' => 'Our Transfer hours are Mon-Sat from 08:30 AM - 04:30 PM only.',
                'data' => null,
            ], 401),
        ]);

        try {
            (new ChapaV1TransferClient())->create('CHASECK_TEST-private', [
                'amount' => '100.00',
                'reference' => 'lk-po-unpaid',
                'currency' => 'ETB',
                'account_number' => '0911223344',
                'account_name' => 'Test Seller',
                'bank_code' => 855,
            ]);
            $this->fail('An explicit Chapa rejection must use the definitive rejection path.');
        } catch (ChapaTransferRejectedException $exception) {
            $this->assertSame(401, $exception->httpStatus);
            $this->assertSame(
                'Chapa rejected the transfer because it was submitted outside transfer hours.',
                $exception->publicReason(),
            );
        }
    }

    public function testServerFailureRemainsAnUncertainSubmission(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/transfers' => Http::response([
                'status' => 'failed',
                'message' => 'Internal server error',
            ], 503),
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Check the transfer reference before retrying');

        (new ChapaV1TransferClient())->create('CHASECK_TEST-private', [
            'amount' => '100.00',
            'reference' => 'lk-po-uncertain',
            'currency' => 'ETB',
            'account_number' => '0911223344',
            'account_name' => 'Test Seller',
            'bank_code' => 855,
        ]);
    }

    public function testInsufficientChapaAvailableBalanceBlocksPayoutBeforeTransfer(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/balances' => Http::response([
                'status' => 'success',
                'data' => [
                    ['currency' => 'ETB', 'available_balance' => 10.00, 'ledger_balance' => 1000.00],
                ],
            ], 200),
        ]);
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformSecret')->willReturn('CHASECK_TEST-platform');
        $this->app->instance(LinketChapaManager::class, $manager);

        $this->expectExceptionMessage('available ETB balance is insufficient');
        try {
            app(ChapaPayoutService::class)->assertSufficientBalance(1500);
        } finally {
            Http::assertNotSent(fn ($request) => $request->method() === 'POST');
        }
    }

    public function testFractionalCentBalanceIsRejectedInsteadOfRoundedUp(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/balances' => Http::response([
                'status' => 'success',
                'data' => [
                    ['currency' => 'ETB', 'available_balance' => '10.009', 'ledger_balance' => '100.00'],
                ],
            ], 200),
        ]);
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformSecret')->willReturn('CHASECK_TEST-local-only');
        $this->app->instance(LinketChapaManager::class, $manager);

        $this->expectExceptionMessage('invalid available ETB balance');
        try {
            app(ChapaPayoutService::class)->assertSufficientBalance(1000);
        } finally {
            Http::assertNotSent(fn ($request) => $request->method() === 'POST');
        }
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
