<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\ChapaPayoutService;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\StorefrontPayoutProcessingService;
use Mockery;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\Support\StorefrontPayoutTestCase;

final class ChapaItemizedTransferFeeTest extends StorefrontPayoutTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $manager = $this->createStub(LinketChapaManager::class);
        $manager->method('platformSecret')->willReturn('CHASECK-fixture');
        $this->app->instance(LinketChapaManager::class, $manager);
    }

    public function testSuccessfulTelebirrTransferWithAnItemizedChargeSettlesOnce(): void
    {
        $payout = $this->payout();
        $payout->update(['amount_cents' => 500, 'payout_destination' => '0900000001']);
        $intent = $this->intent($payout);
        $intent->update([
            'amount_cents' => 500, 'withdrawal_code' => 'telebirr', 'destination_snapshot' => '0900000001',
            'status' => StorefrontPayoutIntent::STATUS_SUBMITTED, 'last_error' => 'Submission not confirmed.',
        ]);
        $response = ['status' => 'success', 'data' => [
            'status' => 'success', 'mode' => 'live', 'tx_ref' => $intent->merchant_reference,
            'currency' => 'ETB', 'account_number' => '251900000001', 'amount' => 4.90, 'charge' => 0.10,
        ]];
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->with($intent->merchant_reference)->twice()->andReturn($response);
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldReceive('disbursePayout')->once()->withArgs(fn (PayoutRequest $paid): bool =>
            $paid->is($payout) && $paid->amount_cents === 500);
        $service = new StorefrontPayoutProcessingService(creatorLedger: $ledger, chapaPayoutService: $provider);
        $service->verifyPayout($intent);
        $verified = $service->verifyPayout($intent->fresh());

        $this->assertSame('paid', $payout->fresh()->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUCCESSFUL, $verified->status);
        $this->assertSame($response, $verified->verification_data);
        $this->assertNull($verified->last_error);
    }

    #[TestWith(['bank_transfer', []])]
    #[TestWith(['telebirr', ['charge' => 0.99]])]
    #[TestWith(['telebirr', ['account_number' => null]])]
    #[TestWith(['telebirr', ['mode' => 'test']])]
    #[TestWith(['bank_transfer', ['status' => 'failed/cancelled', 'charge' => 0.99]])]
    #[TestWith(['bank_transfer', ['status' => 'failed/cancelled', 'account_number' => null]])]
    #[TestWith(['bank_transfer', ['status' => 'failed/cancelled', 'mode' => 'test']])]
    public function testListVerificationWithWrongAmountKeepsFundsReserved(string $method, array $overrides): void
    {
        $payout = $this->payout();
        $intent = $this->intent($payout);
        $intent->update(['withdrawal_code' => $method]);
        $provider = Mockery::mock(ChapaPayoutService::class);
        $record = [
            'status' => 'success', 'currency' => 'ETB', 'tx_ref' => $intent->merchant_reference,
            'amount' => '499.00', 'charge' => 1, 'mode' => 'live', 'account_number' => $intent->destination_snapshot,
            ...$overrides,
        ];
        if ($record['account_number'] === null) {
            unset($record['account_number']);
        }
        $provider->shouldReceive('verifyTransfer')->once()->andReturn([
            'status' => 'success', 'data' => [$record],
        ]);
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('disbursePayout');

        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger,
            chapaPayoutService: $provider,
        );

        $this->expectExceptionMessage('verification details do not match');
        try {
            $service->verifyPayout($intent);
        } finally {
            $this->assertSame('processing', $payout->fresh()->status);
        }
    }
}
