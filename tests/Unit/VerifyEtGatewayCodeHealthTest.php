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
        $this->assertSame('251912345678', $this->identityResolver->normalizeSettlementAccount(['number' => '0912345678', 'bank' => 'telebirr']));
        $this->assertSame('251712345678', $this->identityResolver->normalizeSettlementAccount(['number' => '0712345678', 'bank' => 'cbebirr']));
        $this->assertSame('251912345678', $this->identityResolver->normalizeSettlementAccount(['number' => '+251912345678', 'bank' => 'mpesa']));
        $this->assertSame('1000123456789', $this->identityResolver->normalizeSettlementAccount(['number' => '1000123456789', 'bank' => 'cbe']));
    }

    public function testAccountMatchesRejectsMaskedAccounts(): void
    {
        $this->assertFalse($this->identityResolver->accountMatches(['expected' => '1000123456789', 'actual' => '10001****6789', 'bank' => 'cbe']));
        $this->assertFalse($this->identityResolver->accountMatches(['expected' => '10001••••6789', 'actual' => '1000123456789', 'bank' => 'cbe']));
        $this->assertTrue($this->identityResolver->accountMatches(['expected' => '0912345678', 'actual' => '251912345678', 'bank' => 'telebirr']));
    }

    public function testCanonicalIdentityExtractsBankSpecificFields(): void
    {
        // CBE with receiptNumber
        $cbeItem = ['receiptNumber' => 'fHCxyTVljBclm6Yk4C', 'referenceNumber' => 'FT123456'];
        $this->assertSame('FHCXYTVLJBCLM6YK4C', $this->identityResolver->canonicalIdentity($cbeItem, 'cbe'));

        // CBE with only FT reference
        $cbeFtItem = ['receiptNumber' => null, 'referenceNumber' => 'FT240101ABCD'];
        $this->assertSame('FT240101ABCD', $this->identityResolver->canonicalIdentity($cbeFtItem, 'cbe'));

        // Telebirr
        $telebirrItem = ['transactionNumber' => 'DET8FJGUJ4'];
        $this->assertSame('DET8FJGUJ4', $this->identityResolver->canonicalIdentity($telebirrItem, 'telebirr'));

        // Non-CBE with conflicting identities returns null
        $conflictingItem = ['transactionNumber' => 'DET8FJGUJ4', 'referenceNumber' => 'DIFFERENT123'];
        $this->assertNull($this->identityResolver->canonicalIdentity($conflictingItem, 'telebirr'));
    }

    public function testValidateEnvelopeCatchesInvalidEnvelopes(): void
    {
        $verification = new DirectPaymentVerification();
        $verification->provider_request_id = 'req_original';

        // Explicit failure
        $error = $this->evidenceValidator->validateEnvelope($verification, ['success' => false], 'req_123');
        $this->assertSame('provider_envelope_invalid', $error);

        // Webhook conflict
        $error = $this->evidenceValidator->validateEnvelope($verification, ['event' => 'verification.completed'], 'req_different');
        $this->assertSame('webhook_request_id_conflict', $error);

        // Request ID conflict on poll
        $error = $this->evidenceValidator->validateEnvelope($verification, ['_http_status' => 200], 'req_different');
        $this->assertSame('request_id_conflict', $error);

        // Valid matching envelope
        $error = $this->evidenceValidator->validateEnvelope($verification, ['_http_status' => 200], 'req_original');
        $this->assertNull($error);
    }

    public function testValidateSettlementAccountMatchRequiresStrictEvidence(): void
    {
        // Ambiguous match
        $ambiguous = ['matched' => true, 'ambiguous' => true, 'candidateCount' => 1, 'matchConfidence' => 'high', 'matchedSettlementAccount' => '1000123'];
        $this->assertSame('recipient_evidence_missing', $this->evidenceValidator->validateSettlementAccountMatch($ambiguous));

        // Candidate count > 1
        $multiCandidate = ['matched' => true, 'ambiguous' => false, 'candidateCount' => 2, 'matchConfidence' => 'high', 'matchedSettlementAccount' => '1000123'];
        $this->assertSame('recipient_evidence_missing', $this->evidenceValidator->validateSettlementAccountMatch($multiCandidate));

        // Low confidence
        $lowConfidence = ['matched' => true, 'ambiguous' => false, 'candidateCount' => 1, 'matchConfidence' => 'low', 'matchedSettlementAccount' => '1000123'];
        $this->assertSame('recipient_evidence_missing', $this->evidenceValidator->validateSettlementAccountMatch($lowConfidence));

        // Valid match
        $valid = ['matched' => true, 'ambiguous' => false, 'candidateCount' => 1, 'matchConfidence' => 'high', 'matchedSettlementAccount' => '1000123'];
        $this->assertNull($this->evidenceValidator->validateSettlementAccountMatch($valid));
    }

    public function testValidateConfirmationHistoryChecks(): void
    {
        $verification = new DirectPaymentVerification();
        $verification->canonical_transaction_identity = 'TXN123';

        // History is not array
        $this->assertSame('confirmation_history_review', $this->evidenceValidator->validateConfirmationHistory('invalid', $verification, 'TXN123'));

        // Confirmed before but identity changed
        $history = ['confirmedBefore' => true, 'isFirstConfirmation' => false, 'confirmationCount' => 2];
        $this->assertSame('confirmation_history_review', $this->evidenceValidator->validateConfirmationHistory($history, $verification, 'DIFFERENT_TXN'));

        // Confirmed before AND isFirstConfirmation both true
        $historyContradiction = ['confirmedBefore' => true, 'isFirstConfirmation' => true, 'confirmationCount' => 1];
        $this->assertSame('confirmation_history_review', $this->evidenceValidator->validateConfirmationHistory($historyContradiction, $verification, 'TXN123'));

        // Valid first confirmation
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

        // Proxy methods
        $this->assertSame('ABC123XYZ', $gateway->canonical('abc-123.xyz'));
        $this->assertSame('251912345678', $gateway->normalizeSettlementAccount('0912345678', 'telebirr'));
        $this->assertTrue($gateway->accountMatches('0912345678', '251912345678', 'telebirr'));
        $this->assertFalse($gateway->accountMatches('1000123', '10001***', 'cbe'));

        $item = ['transactionNumber' => 'DET8FJGUJ4'];
        $this->assertSame('DET8FJGUJ4', $gateway->canonicalIdentity($item, 'telebirr'));

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
