<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\ChapaV1TransferVerificationGuard;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

final readonly class TransferVerificationSuccessCase
{
    /**
     * @param array<string, mixed> $intentAttributes
     * @param array<string, mixed> $responseData
     */
    public function __construct(
        public array $intentAttributes,
        public array $responseData,
        public string $expectedStatus,
    ) {
    }
}

final readonly class TransferVerificationRejectionCase
{
    /**
     * @param array<string, mixed> $intentAttributes
     * @param array<string, mixed> $responseData
     */
    public function __construct(
        public array $intentAttributes,
        public array $responseData,
        public string $expectedMessage,
    ) {
    }
}

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

    #[DataProvider('validTransferCases')]
    public function testVerifiesValidTransfers(TransferVerificationSuccessCase $case): void
    {
        $intent = new StorefrontPayoutIntent($case->intentAttributes);
        $response = [
            'status' => 'success',
            'data' => $case->responseData,
        ];

        $status = $this->guard->status($intent, $response);
        $this->assertSame($case->expectedStatus, $status);
    }

    #[DataProvider('invalidTransferCases')]
    public function testRejectsInvalidTransfers(TransferVerificationRejectionCase $case): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage($case->expectedMessage);

        $intent = new StorefrontPayoutIntent($case->intentAttributes);
        $response = [
            'status' => 'success',
            'data' => $case->responseData,
        ];

        $this->guard->status($intent, $response);
    }

    /**
     * @return array<string, array{TransferVerificationSuccessCase}>
     */
    public static function validTransferCases(): array
    {
        return [
            'exact amount transfer' => [
                new TransferVerificationSuccessCase(
                    intentAttributes: [
                        'merchant_reference' => 'lk-po-TEST12345678',
                        'amount_cents' => 200,
                        'currency' => 'ETB',
                        'withdrawal_code' => 'bank_transfer',
                        'destination_snapshot' => '183285319',
                    ],
                    responseData: [
                        'tx_ref' => 'lk-po-TEST12345678',
                        'amount' => 2,
                        'charge' => 0,
                        'currency' => 'ETB',
                        'account_number' => '183285319',
                        'status' => 'processing',
                        'mode' => 'live',
                    ],
                    expectedStatus: 'processing',
                ),
            ],
            'bank transfer with deducted charge' => [
                new TransferVerificationSuccessCase(
                    intentAttributes: [
                        'merchant_reference' => 'lk-po-TESTBOA9988',
                        'amount_cents' => 200,
                        'currency' => 'ETB',
                        'withdrawal_code' => 'bank_transfer',
                        'destination_snapshot' => '183285319',
                    ],
                    responseData: [
                        'tx_ref' => 'lk-po-TESTBOA9988',
                        'amount' => 1.95,
                        'charge' => 0.05,
                        'currency' => 'ETB',
                        'account_number' => '183285319',
                        'status' => 'success',
                        'mode' => 'live',
                    ],
                    expectedStatus: 'success',
                ),
            ],
            'telebirr transfer with deducted charge' => [
                new TransferVerificationSuccessCase(
                    intentAttributes: [
                        'merchant_reference' => 'lk-po-TESTTELE123',
                        'amount_cents' => 200,
                        'currency' => 'ETB',
                        'withdrawal_code' => 'telebirr',
                        'destination_snapshot' => '0995885798',
                    ],
                    responseData: [
                        'tx_ref' => 'lk-po-TESTTELE123',
                        'amount' => 1.96,
                        'charge' => 0.04,
                        'currency' => 'ETB',
                        'account_number' => '251995885798',
                        'status' => 'success',
                        'mode' => 'live',
                    ],
                    expectedStatus: 'success',
                ),
            ],
        ];
    }

    /**
     * @return array<string, array{TransferVerificationRejectionCase}>
     */
    public static function invalidTransferCases(): array
    {
        return [
            'mismatched reference' => [
                new TransferVerificationRejectionCase(
                    intentAttributes: [
                        'merchant_reference' => 'lk-po-CORRECTREF1',
                        'amount_cents' => 200,
                        'currency' => 'ETB',
                        'withdrawal_code' => 'bank_transfer',
                        'destination_snapshot' => '183285319',
                    ],
                    responseData: [
                        'tx_ref' => 'lk-po-WRONGREF999',
                        'amount' => 2,
                        'currency' => 'ETB',
                        'status' => 'success',
                    ],
                    expectedMessage: 'Transfer verification details do not match the approved withdrawal.',
                ),
            ],
            'mismatched recipient' => [
                new TransferVerificationRejectionCase(
                    intentAttributes: [
                        'merchant_reference' => 'lk-po-RECIPIENTTEST',
                        'amount_cents' => 200,
                        'currency' => 'ETB',
                        'withdrawal_code' => 'bank_transfer',
                        'destination_snapshot' => '183285319',
                    ],
                    responseData: [
                        'tx_ref' => 'lk-po-RECIPIENTTEST',
                        'amount' => 2,
                        'currency' => 'ETB',
                        'account_number' => '999999999',
                        'status' => 'success',
                        'mode' => 'live',
                    ],
                    expectedMessage: 'Chapa verified a different recipient account.',
                ),
            ],
        ];
    }
}
