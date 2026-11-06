<?php

use App\CreatorAi\Forecasting\ForecastSourceManifestVerifier;
use App\CreatorAi\Forecasting\SignedForecastCheckpointIngestor;

function signedManifestFixture(): array
{
    $seed = str_repeat('m', 32);
    $keys = sodium_crypto_sign_seed_keypair($seed);
    $private = sodium_crypto_sign_secretkey($keys);
    $public = 'base64:'.base64_encode(sodium_crypto_sign_publickey($keys));
    $daily = [
        ['date' => '2026-10-10', 'verified_sales_count' => 1, 'verified_revenue_cents' => 10000],
        ['date' => '2026-10-11', 'verified_sales_count' => 0, 'verified_revenue_cents' => 0],
    ];
    $events = [];
    $previous = str_repeat('0', 64);
    foreach ($daily as $i => $day) {
        $event = [
            'source_kind' => 'checkout_event_stream',
            'workspace_id' => 7,
            'source_event_id' => 'synthetic-event-'.($i + 1),
            'sequence' => $i + 1,
            'previous_digest' => $previous,
            'observed_on' => $day['date'],
            'verified_sales_count' => $day['verified_sales_count'],
            'verified_gross_cents' => $day['verified_revenue_cents'],
            'revision' => 1,
            'supersedes_digest' => null,
            'backfill_reason' => null,
            'watermark_at' => '2026-10-14T00:00:00Z',
            'signed_at' => '2026-10-15T00:00:00Z',
            'key_id' => 'v1',
            'proof_key_id' => 'v1',
        ];
        $event['proof_signature'] = base64_encode(sodium_crypto_sign_detached(
            SignedForecastCheckpointIngestor::provenancePayload($event), $private
        ));
        $event['signature'] = hash_hmac(
            'sha256', SignedForecastCheckpointIngestor::canonicalPayload($event), str_repeat('h', 32)
        );
        $previous = hash(
            'sha256', SignedForecastCheckpointIngestor::canonicalPayload($event)."\n".$event['signature']
        );
        $events[] = $event;
    }
    $manifest = [
        'schema_version' => 1,
        'source_kind' => 'checkout_event_stream',
        'workspace_id' => 7,
        'window_start' => '2026-10-10',
        'window_end' => '2026-10-11',
        'first_sequence' => 1,
        'last_sequence' => 2,
        'first_previous_digest' => str_repeat('0', 64),
        'last_event_digest' => $previous,
        'source_event_count' => 2,
        'day_summary_sha256' => ForecastSourceManifestVerifier::dailyDigest($daily),
        'issued_at' => '2026-10-15T01:00:00Z',
        'key_id' => 'v1',
    ];
    $manifest['signature'] = base64_encode(sodium_crypto_sign_detached(
        ForecastSourceManifestVerifier::canonicalPayload($manifest), $private
    ));

    return [$manifest, $events, $daily, $public, $private];
}

test('source manifest proves individual signed event chain but never asserts upstream completeness', function () {
    [$manifest, $events, $daily, $key] = signedManifestFixture();
    $audit = (new ForecastSourceManifestVerifier())->verify($manifest, $events, $daily, $key);

    expect($audit)->toBe([
        'manifest_signature_verified' => true,
        'event_signatures_verified' => 2,
        'days_reconciled' => 2,
        'independent_observation_coverage_verified' => false,
        'reason' => 'upstream_event_completeness_not_attested',
    ]);
});

test('source manifest rejects removed or out of order events without updating financial records', function () {
    [$manifest, $events, $daily, $key] = signedManifestFixture();
    $verifier = new ForecastSourceManifestVerifier();

    expect(fn () => $verifier->verify($manifest, [$events[1]], $daily, $key))
        ->toThrow(RuntimeException::class);
    expect(fn () => $verifier->verify($manifest, array_reverse($events), $daily, $key))
        ->toThrow(RuntimeException::class);
});

test('source manifest rejects forged values even if a local operator recomputes the HMAC', function () {
    [$manifest, $events, $daily, $key] = signedManifestFixture();
    $events[1]['verified_gross_cents'] = 40000;
    $events[1]['signature'] = hash_hmac(
        'sha256', SignedForecastCheckpointIngestor::canonicalPayload($events[1]), str_repeat('h', 32)
    );
    expect(fn () => (new ForecastSourceManifestVerifier())->verify($manifest, $events, $daily, $key))
        ->toThrow(RuntimeException::class);
});

test('source manifest rejects altered signed closure, fake empty days, or another signer public key', function () {
    [$manifest, $events, $daily, $key] = signedManifestFixture();
    $verifier = new ForecastSourceManifestVerifier();

    $tampered = $manifest;
    $tampered['last_event_digest'] = str_repeat('f', 64);
    expect(fn () => $verifier->verify($tampered, $events, $daily, $key))->toThrow(RuntimeException::class);

    $falseZero = $daily;
    $falseZero[1]['verified_sales_count'] = 1;
    $falseZero[1]['verified_revenue_cents'] = 1000;
    expect(fn () => $verifier->verify($manifest, $events, $falseZero, $key))->toThrow(RuntimeException::class);

    $unrelatedPublic = 'base64:'.base64_encode(sodium_crypto_sign_publickey(
        sodium_crypto_sign_seed_keypair(str_repeat('x', 32))
    ));
    expect(fn () => $verifier->verify($manifest, $events, $daily, $unrelatedPublic))
        ->toThrow(RuntimeException::class);
});

test('source manifest cannot be signed before the window is closed or without daily coverage', function () {
    [$manifest, $events, $daily, $key, $private] = signedManifestFixture();
    $manifest['issued_at'] = '2026-10-11T00:00:00Z';
    $manifest['signature'] = base64_encode(sodium_crypto_sign_detached(
        ForecastSourceManifestVerifier::canonicalPayload($manifest), $private
    ));
    expect(fn () => (new ForecastSourceManifestVerifier())->verify($manifest, $events, $daily, $key))
        ->toThrow(InvalidArgumentException::class);

    [$valid, $events, $daily, $key] = signedManifestFixture();
    unset($daily[1]);
    expect(fn () => (new ForecastSourceManifestVerifier())->verify($valid, $events, array_values($daily), $key))
        ->toThrow(InvalidArgumentException::class);
});

test('source manifest checks per-day revision and supersession links', function () {
    [$manifest, $events, $daily, $key, $private] = signedManifestFixture();
    $newEvent = $events[1];
    $newEvent['revision'] = 2;
    $newEvent['supersedes_digest'] = str_repeat('f', 64);
    $newEvent['proof_signature'] = base64_encode(sodium_crypto_sign_detached(
        SignedForecastCheckpointIngestor::provenancePayload($newEvent), $private
    ));
    $newEvent['signature'] = hash_hmac(
        'sha256', SignedForecastCheckpointIngestor::canonicalPayload($newEvent), str_repeat('h', 32)
    );
    $events[1] = $newEvent;

    expect(fn () => (new ForecastSourceManifestVerifier())->verify($manifest, $events, $daily, $key))
        ->toThrow(RuntimeException::class);
});
