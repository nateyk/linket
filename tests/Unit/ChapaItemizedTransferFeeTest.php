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

    #[TestWith(['success', 1, '1000123456789', 'live'])]
    #[TestWith(['success', 0.99, '1000123456789', 'live', 'telebirr'])]
    #[TestWith(['success', 1, null, 'live', 'telebirr'])]
    #[TestWith(['success', 1, '1000123456789', 'test', 'telebirr'])]
    #[TestWith(['failed/cancelled', 0.99, '1000123456789', 'live'])]
    #[TestWith(['failed/cancelled', 1, null, 'live'])]
    #[TestWith(['failed/cancelled', 1, '1000123456789', 'test'])]
    public function testListVerificationWithWrongAmountKeepsFundsReserved(string $status, float $charge, ?string $account, string $mode, string $method = 'bank_transfer'): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $record = $this->verified($status)['data'];
        $record['amount'] = '499.00';
        $record['charge'] = $charge;
        $record['mode'] = $mode;
        $record['tx_ref'] = $record['reference'];
        if ($account !== null) {
            $record['account_number'] = $account;
        }
        $provider->shouldReceive('verifyTransfer')->once()->andReturn([
            'status' => 'success', 'data' => [$record],
        ]);
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('disbursePayout');

        $payout = $this->payout();
        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger,
            chapaPayoutService: $provider,
        );

        $this->expectExceptionMessage('verification details do not match');
        $intent = $this->intent($payout);
        $intent->update(['withdrawal_code' => $method]);
        try {
            $service->verifyPayout($intent);
        } finally {
            $this->assertSame('processing', $payout->fresh()->status);
        }
    }
}
