<?php

use App\Payments\VerifyEt\VerifyEtExperiment;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Http::preventStrayRequests();
});

it('summarizes synthetic completed transactions without storing account numbers or references', function (string $bank, string $field, string $reference, string $amount, int $cents): void {
    $body = [
        'success' => true,
        'requestId' => 'synthetic-request',
        'verification' => ['processingStatus' => 'completed'],
        'data' => [[
            'bank' => $bank,
            'status' => 'success',
            'verified' => true,
            'amount' => $amount,
            'currency' => 'ETB',
            $field => $reference,
            'receiverAccount' => '9***1234',
            'confirmationHistory' => ['confirmedBefore' => false, 'confirmationCount' => 1],
        ]],
    ];
    $result = app(VerifyEtExperiment::class)->summarize($body, 200, $bank, $reference, $cents);

    expect($result)->toMatchArray([
        'http_status' => 200, 'amount' => $amount, 'amount_matches' => true,
        'currency_matches' => true, 'identity_matches' => true, 'bank_matches' => true,
        'receiver_available' => true, 'settlement_match_present' => false,
        'confirmed_before' => false, 'automatic_fulfillment_sufficient' => false,
    ]);
    expect(json_encode($result))->not->toContain($reference)->not->toContain('9***1234');
})->with([
    ['telebirr', 'transactionNumber', 'SYNTHETIC1', '2470.00', 247000],
    ['dashen', 'referenceNumber', 'SYNTHETIC2', '5600.00', 560000],
]);

it('does not infer details from a queued verification or a status-only response', function (): void {
    $service = app(VerifyEtExperiment::class);
    $queued = $service->summarize(['requestId' => 'req-1', 'data' => [], 'verification' => ['processingStatus' => 'queued']], 202, 'telebirr', 'SYNTHETIC1', 247000);
    $status = $service->summarize(['data' => ['requestId' => 'req-1', 'processingStatus' => 'completed', 'status' => 'success', 'verified' => true]], 200, 'telebirr', 'SYNTHETIC1', 247000);

    expect($queued['request_id'])->toBe('req-1')
        ->and($queued['amount_matches'])->toBeNull()
        ->and($status['verified'])->toBeTrue()
        ->and($status['identity_matches'])->toBeNull()
        ->and($status['settlement_match_present'])->toBeNull();
});

it('interprets the documented webhook object without inventing recipient matching', function (): void {
    $body = ['event' => 'verification.completed', 'requestId' => 'req-2', 'data' => [
        'processingStatus' => 'completed', 'status' => 'success', 'verified' => true,
        'bank' => 'dashen', 'amount' => '5600', 'currency' => 'ETB', 'referenceNumber' => 'SYNTHETIC2',
    ]];
    $result = app(VerifyEtExperiment::class)->summarize($body, 200, 'dashen', 'SYNTHETIC2', 560000);

    expect($result['amount_matches'])->toBeTrue()
        ->and($result['identity_matches'])->toBeTrue()
        ->and($result['settlement_match_present'])->toBeFalse()
        ->and($result['webhook_received'])->toBeNull();
});

it('distinguishes synthetic recipient matching outcomes', function (array $match, string $state): void {
    $body = ['data' => [[
        'bank' => 'telebirr', 'status' => 'success', 'verified' => true, 'amount' => '2470.00',
        'currency' => 'ETB', 'transactionNumber' => 'SYNTHETIC1', 'settlementAccountMatch' => $match,
    ]]];
    $result = app(VerifyEtExperiment::class)->summarize($body, 200, 'telebirr', 'SYNTHETIC1', 247000);
    expect($result['recipient_match_state'])->toBe($state)
        ->and($result['automatic_fulfillment_sufficient'])->toBeFalse();
})->with([
    [['matched' => false, 'ambiguous' => false, 'reason' => 'no_registered_accounts'], 'no_registered_accounts'],
    [['matched' => false, 'ambiguous' => false, 'reason' => 'missing_receiver_account'], 'missing_receiver_account'],
    [['matched' => true, 'ambiguous' => false, 'matchConfidence' => 'high', 'matchedSettlementAccount' => '0000000000'], 'provider_matched'],
    [['matched' => false, 'ambiguous' => false, 'reason' => 'candidate_account_mismatch'], 'unmatched'],
    [['matched' => false, 'ambiguous' => true, 'candidateCount' => 2], 'ambiguous'],
]);

it('detects incorrect amount, currency, bank and transaction identity using decimal-safe checks', function (): void {
    $body = ['data' => [[
        'bank' => 'dashen', 'amount' => '2470.01', 'currency' => 'USD', 'transactionNumber' => 'OTHER',
    ]]];
    $result = app(VerifyEtExperiment::class)->summarize($body, 200, 'telebirr', 'SYNTHETIC1', 247000);
    expect($result['amount_matches'])->toBeFalse()->and($result['currency_matches'])->toBeFalse()
        ->and($result['identity_matches'])->toBeFalse()->and($result['bank_matches'])->toBeFalse();

    $body['data'][0]['amount'] = '2470.001';
    expect(app(VerifyEtExperiment::class)->summarize($body, 200, 'telebirr', 'SYNTHETIC1', 247000)['amount_matches'])->toBeNull();
    $body['data'][0]['amount'] = 2470.0;
    expect(app(VerifyEtExperiment::class)->summarize($body, 200, 'telebirr', 'SYNTHETIC1', 247000)['amount_matches'])->toBeNull();
});

it('does not choose between duplicate matching result items', function (): void {
    $item = ['bank' => 'telebirr', 'transactionNumber' => 'SYNTHETIC1', 'amount' => '2470.00', 'currency' => 'ETB'];
    $result = app(VerifyEtExperiment::class)->summarize(['data' => [$item, $item]], 200, 'telebirr', 'SYNTHETIC1', 247000);

    expect($result['result_item_count'])->toBe(2)
        ->and($result['matching_item_count'])->toBe(2)
        ->and($result['amount_matches'])->toBeNull()
        ->and($result['automatic_fulfillment_sufficient'])->toBeFalse();
});
