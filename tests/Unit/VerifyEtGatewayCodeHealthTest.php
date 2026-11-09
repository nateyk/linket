<?php

namespace Tests\Unit;

use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\VerifyEtEvidenceValidator;
use App\Payments\VerifyEt\VerifyEtException;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Payments\VerifyEt\VerifyEtIdentityResolver;
use App\Payments\VerifyEt\VerifyEtMoney;
use App\Payments\VerifyEt\VerifyEtPayloadBuilder;
use Tests\TestCase;

class VerifyEtGatewayCodeHealthTest extends TestCase
{
    private VerifyEtIdentityResolver $identityResolver;
    private VerifyEtEvidenceValidator $evidenceValidator;
    private VerifyEtPayloadBuilder $payloadBuilder;

    protected function setUp(): void
    {
        parent::setUp();
        $this->identityResolver = new VerifyEtIdentityResolver();
        $this->evidenceValidator = new VerifyEtEvidenceValidator(
            $this->identityResolver,
            new VerifyEtMoney(),
        );
        $this->payloadBuilder = new VerifyEtPayloadBuilder();
    }

    public function testCanonicalStripsNonAlphanumericAndUppercases(): void
    {
        $this->assertSame('FT240101ABCD', $this->identityResolver->canonical('ft-240101-abcd'));
        $this->assertSame('ABC123XYZ', $this->identityResolver->canonical(' abc_123.xyz '));
    }

    public function testNormalizeSettlementAccountFormatsEthiopianMobileNumbers(): void
    {
        $cases = [
            ['0912345678', 'telebirr', '251912345678'],
            ['0712345678', 'cbebirr', '251712345678'],
            ['+251912345678', 'mpesa', '251912345678'],
            ['1000123456789', 'cbe', '1000123456789'],
        ];
        foreach ($cases as [$number, $bank, $expected]) {
            $this->assertSame($expected, $this->identityResolver->normalizeSettlementAccount(['number' => $number, 'bank' => $bank]));
        }
    }

    public function testAccountMatchesRejectsMaskedAccounts(): void
    {
        $cases = [
            ['1000123456789', '10001****6789', 'cbe', false],
            ['10001••••6789', '1000123456789', 'cbe', false],
            ['0912345678', '251912345678', 'telebirr', true],
        ];
        foreach ($cases as [$expected, $actual, $bank, $matches]) {
            $this->assertSame($matches, $this->identityResolver->accountMatches([
                'expected' => $expected,
                'actual' => $actual,
                'bank' => $bank,
            ]));
        }
    }

    public function testCanonicalIdentityExtractsBankSpecificFields(): void
    {
        $cases = [
            [['receiptNumber' => 'fHCxyTVljBclm6Yk4C', 'referenceNumber' => 'FT123456'], 'cbe', 'FHCXYTVLJBCLM6YK4C'],
            [['receiptNumber' => null, 'referenceNumber' => 'FT240101ABCD'], 'cbe', 'FT240101ABCD'],
            [['transactionNumber' => 'DET8FJGUJ4'], 'telebirr', 'DET8FJGUJ4'],
            [['transactionNumber' => 'DET8FJGUJ4', 'referenceNumber' => 'DIFFERENT123'], 'telebirr', null],
        ];
        foreach ($cases as [$item, $bank, $expected]) {
            $this->assertSame($expected, $this->identityResolver->canonicalIdentity($item, $bank));
        }
    }

    public function testValidateEnvelopeCatchesInvalidEnvelopes(): void
    {
        $verification = new DirectPaymentVerification();
        $verification->provider_request_id = 'req_original';
        $cases = [
            [['success' => false], 'req_123', 'provider_envelope_invalid'],
            [['event' => 'verification.completed'], 'req_different', 'webhook_request_id_conflict'],
            [['_http_status' => 200], 'req_different', 'request_id_conflict'],
            [['_http_status' => 200], 'req_original', null],
        ];

        foreach ($cases as [$result, $requestId, $expected]) {
            $this->assertSame($expected, $this->evidenceValidator->validateEnvelope($verification, $result, $requestId));
        }
    }

    public function testValidateSettlementAccountMatchRequiresStrictEvidence(): void
    {
        $rejected = [
            ['ambiguous' => true],
            ['candidateCount' => 2],
            ['matchConfidence' => 'low'],
        ];
        foreach ($rejected as $overrides) {
            $this->assertSame('recipient_evidence_missing', $this->evidenceValidator->validateSettlementAccountMatch($this->settlementMatch($overrides)));
        }

        $this->assertNull($this->evidenceValidator->validateSettlementAccountMatch($this->settlementMatch([])));
    }

    public function testValidateConfirmationHistoryChecks(): void
    {
        $verification = new DirectPaymentVerification();
        $verification->canonical_transaction_identity = 'TXN123';
        $rejected = [
            ['invalid', 'TXN123'],
            [['confirmedBefore' => true, 'isFirstConfirmation' => false, 'confirmationCount' => 2], 'DIFFERENT_TXN'],
            [['confirmedBefore' => true, 'isFirstConfirmation' => true, 'confirmationCount' => 1], 'TXN123'],
        ];
        foreach ($rejected as [$history, $identity]) {
            $this->assertSame('confirmation_history_review', $this->evidenceValidator->validateConfirmationHistory($history, $verification, $identity));
        }

        $validHistory = ['confirmedBefore' => false, 'isFirstConfirmation' => true, 'confirmationCount' => 1];
        $this->assertNull($this->evidenceValidator->validateConfirmationHistory($validHistory, $verification, 'TXN123'));
    }

    public function testPayloadBuilderNormalizesCbeBirrPhones(): void
    {
        $local = $this->verification(['provider_input' => ['phoneNumber' => '0712345678']]);
        $international = $this->verification(['provider_input' => ['phoneNumber' => '+251912345678']]);

        $this->assertSame('251712345678', $this->payloadBuilder->build($local)['phoneNumber']);
        $this->assertSame('251912345678', $this->payloadBuilder->build($international)['phoneNumber']);
    }

    public function testPayloadBuilderRejectsNonEthiopianCbeBirrPhones(): void
    {
        $verification = $this->verification([
            'settlement_account' => '251812345678',
            'provider_input' => ['phoneNumber' => '0812345678'],
        ]);

        $this->expectException(VerifyEtException::class);
        $this->payloadBuilder->build($verification);
    }

    public function testPayloadBuilderEnforcesBankFieldRules(): void
    {
        $verification = $this->verification([
            'bank_code' => 'unsupported',
            'reference' => 'REF123',
            'settlement_account' => '1000123',
        ]);

        // Unsupported bank
        $this->expectException(VerifyEtException::class);
        $this->payloadBuilder->build($verification);
    }

    public function testPayloadBuilderRequiresBoa5DigitSuffix(): void
    {
        $verification = $this->verification([
            'bank_code' => 'boa',
            'reference' => 'REF123',
            'settlement_account' => '1000123',
            'provider_input' => ['accountSuffix' => '123'],
        ]);

        $this->expectException(VerifyEtException::class);
        $this->payloadBuilder->build($verification);
    }

    public function testGatewayResolvesFromContainerAndProxiesIdentityMethods(): void
    {
        $gateway = app(VerifyEtGateway::class);
        $this->assertInstanceOf(VerifyEtGateway::class, $gateway);

        $this->assertSame('ABC123XYZ', $gateway->canonical('abc-123.xyz'));
        $this->assertSame('251911000000', $gateway->normalizeSettlementAccount('0911000000', 'telebirr'));
        $this->assertTrue($gateway->accountMatches('0911000000', '251911000000', 'telebirr'));
        $this->assertSame('DET8FJGUJ4', $gateway->canonicalIdentity(['transactionNumber' => 'DET8FJGUJ4'], 'telebirr'));

        $safeResult = $gateway->safeProviderResult([
            'requestId' => 'req_test',
            'data' => [
                [
                    'status' => 'success',
                    'bank' => 'cbe',
                    'amount' => '100.00',
                    'currency' => 'ETB',
                    'receiptNumber' => 'REC123',
                    'settlementAccountMatch' => [
                        'matched' => true,
                        'ambiguous' => false,
                        'matchConfidence' => 'high',
                        'matchedSettlementAccount' => '1000123456789',
                    ],
                ],
            ],
        ]);
        $this->assertSame('req_test', $safeResult['requestId']);
        $this->assertSame('cbe', $safeResult['transactionEvidence']['bank']);
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function settlementMatch(array $overrides): array
    {
        return array_merge([
            'matched' => true,
            'ambiguous' => false,
            'candidateCount' => 1,
            'matchConfidence' => 'high',
            'matchedSettlementAccount' => '1000123',
        ], $overrides);
    }

    /**
     * @param array<string, mixed> $overrides
     */
    private function verification(array $overrides = []): DirectPaymentVerification
    {
        $verification = new DirectPaymentVerification();
        $verification->bank_code = $overrides['bank_code'] ?? 'cbebirr';
        $verification->reference = $overrides['reference'] ?? 'RCPT123456';
        $verification->settlement_account = $overrides['settlement_account'] ?? '251912345678';
        $verification->provider_input = $overrides['provider_input'] ?? [];

        return $verification;
    }
}
