<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\ChapaV1PayoutMode;
use App\Storefront\Services\ChapaV1TransferVerificationGuard;
use RuntimeException;
use Tests\TestCase;

class ChapaV1TransferVerificationGuardTest extends TestCase
{
    private ChapaV1TransferVerificationGuard $guard;

    protected function setUp(): void
    {
        parent::setUp();
        $this->guard = new ChapaV1TransferVerificationGuard();
        config()->set('services.chapa.secret', 'CHASECK-live_secret_for_test');
        config()->set('services.chapa.payouts_enabled', true);
        config()->set('services.chapa.test_payouts_enabled', false);
    }

    public function testVerifiesExactAmountTransfer(): void
    {
        $intent = new StorefrontPayoutIntent([
            'merchant_reference' => 'lk-po-TEST12345678',
            'amount_cents' => 200,
            'currency' => 'ETB',
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => '183285319',
        ]);

        $response = [
            'status' => 'success',
            'data' => [
                'tx_ref' => 'lk-po-TEST12345678',
                'amount' => 2,
                'charge' => 0,
                'currency' => 'ETB',
                'account_number' => '183285319',
                'status' => 'processing',
                'mode' => 'live',
            ],
        ];

        $status = $this->guard->status($intent, $response);
        $this->assertSame('processing', $status);
    }

    public function testVerifiesBankTransferWithDeductedCharge(): void
    {
        $intent = new StorefrontPayoutIntent([
            'merchant_reference' => 'lk-po-TESTBOA9988',
            'amount_cents' => 200,
            'currency' => 'ETB',
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => '183285319',
        ]);

        $response = [
            'status' => 'success',
            'data' => [
                'tx_ref' => 'lk-po-TESTBOA9988',
                'amount' => 1.95,
                'charge' => 0.05,
                'currency' => 'ETB',
                'account_number' => '183285319',
                'status' => 'success',
                'mode' => 'live',
            ],
        ];

        $status = $this->guard->status($intent, $response);
        $this->assertSame('success', $status);
    }

    public function testVerifiesTelebirrTransferWithDeductedCharge(): void
    {
        $intent = new StorefrontPayoutIntent([
            'merchant_reference' => 'lk-po-TESTTELE123',
            'amount_cents' => 200,
            'currency' => 'ETB',
            'withdrawal_code' => 'telebirr',
            'destination_snapshot' => '0995885798',
        ]);

        $response = [
            'status' => 'success',
            'data' => [
                'tx_ref' => 'lk-po-TESTTELE123',
                'amount' => 1.96,
                'charge' => 0.04,
                'currency' => 'ETB',
                'account_number' => '251995885798',
                'status' => 'success',
                'mode' => 'live',
            ],
        ];

        $status = $this->guard->status($intent, $response);
        $this->assertSame('success', $status);
    }

    public function testRejectsMismatchedReference(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Transfer verification details do not match the approved withdrawal.');

        $intent = new StorefrontPayoutIntent([
            'merchant_reference' => 'lk-po-CORRECTREF1',
            'amount_cents' => 200,
            'currency' => 'ETB',
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => '183285319',
        ]);

        $response = [
            'status' => 'success',
            'data' => [
                'tx_ref' => 'lk-po-WRONGREF999',
                'amount' => 2,
                'currency' => 'ETB',
                'status' => 'success',
            ],
        ];

        $this->guard->status($intent, $response);
    }

    public function testRejectsMismatchedRecipient(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Chapa verified a different recipient account.');

        $intent = new StorefrontPayoutIntent([
            'merchant_reference' => 'lk-po-RECIPIENTTEST',
            'amount_cents' => 200,
            'currency' => 'ETB',
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => '183285319',
        ]);

        $response = [
            'status' => 'success',
            'data' => [
                'tx_ref' => 'lk-po-RECIPIENTTEST',
                'amount' => 2,
                'currency' => 'ETB',
                'account_number' => '999999999',
                'status' => 'success',
                'mode' => 'live',
            ],
        ];

        $this->guard->status($intent, $response);
    }
}
