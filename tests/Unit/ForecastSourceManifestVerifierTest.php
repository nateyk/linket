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

test('source manifest rejects invalid envelope fields before checking signatures', function (array $changes) {
    [$manifest, $events, $daily, $key] = signedManifestFixture();

    expect(fn () => (new ForecastSourceManifestVerifier())->verify(array_replace($manifest, $changes), $events, $daily, $key))
        ->toThrow(InvalidArgumentException::class, 'Signed source manifest envelope is invalid.');
})->with([
    'extra field' => [['extra' => true]],
    'schema type' => [['schema_version' => '1']],
    'source kind' => [['source_kind' => 'other']],
    'workspace type' => [['workspace_id' => '7']],
    'workspace bounds' => [['workspace_id' => 0]],
    'invalid key id' => [['key_id' => 'bad key']],
    'signature type' => [['signature' => null]],
    'first sequence' => [['first_sequence' => 0]],
    'last sequence' => [['last_sequence' => 0]],
    'event count' => [['source_event_count' => 1501]],
    'sequence count mismatch' => [['source_event_count' => 1]],
    'opening digest' => [['first_previous_digest' => 'bad']],
    'closing digest' => [['last_event_digest' => 'bad']],
    'history digest' => [['day_summary_sha256' => 'bad']],
    'invalid start' => [['window_start' => '2026-02-30']],
    'reversed window' => [['window_end' => '2026-10-09']],
    'invalid timestamp' => [['issued_at' => '2026-10-15']],
]);

test('source manifest rejects malformed and unreconcilable daily row inputs', function (array $row) {
    [$manifest, $events, $daily, $key] = signedManifestFixture();
    $daily[0] = $row;

    expect(fn () => (new ForecastSourceManifestVerifier())->verify($manifest, $events, $daily, $key))
        ->toThrow(InvalidArgumentException::class, 'Manifest was given invalid daily revenue observations.');
})->with([
    'missing amount' => [['date' => '2026-10-10', 'verified_sales_count' => 1]],
    'wrong date' => [['date' => '2026-10-11', 'verified_sales_count' => 1, 'verified_revenue_cents' => 10000]],
    'count type' => [['date' => '2026-10-10', 'verified_sales_count' => '1', 'verified_revenue_cents' => 10000]],
    'negative count' => [['date' => '2026-10-10', 'verified_sales_count' => -1, 'verified_revenue_cents' => 10000]],
    'count limit' => [['date' => '2026-10-10', 'verified_sales_count' => 1000001, 'verified_revenue_cents' => 10000]],
    'amount type' => [['date' => '2026-10-10', 'verified_sales_count' => 1, 'verified_revenue_cents' => '10000']],
    'negative revenue' => [['date' => '2026-10-10', 'verified_sales_count' => 1, 'verified_revenue_cents' => -1]],
    'revenue limit' => [['date' => '2026-10-10', 'verified_sales_count' => 1, 'verified_revenue_cents' => 1000000000001]],
    'revenue without sales' => [['date' => '2026-10-10', 'verified_sales_count' => 0, 'verified_revenue_cents' => 10000]],
]);

test('source manifest rejects invalid event cursor before checking independent provenance', function (array $changes) {
    [$manifest, $events, $daily, $key] = signedManifestFixture();
    $events[0] = array_replace($events[0], $changes);

    expect(fn () => (new ForecastSourceManifestVerifier())->verify($manifest, $events, $daily, $key))
        ->toThrow(RuntimeException::class, 'Signed checkpoint stream has a gap, cross-tenant item, or invalid cursor.');
})->with([
    'missing proof' => [['proof_signature' => null]],
    'wrong source' => [['source_kind' => 'other']],
    'wrong workspace' => [['workspace_id' => 8]],
    'wrong sequence' => [['sequence' => 2]],
    'wrong proof signer' => [['proof_key_id' => 'v2']],
    'day before window' => [['observed_on' => '2026-10-09']],
    'day after window' => [['observed_on' => '2026-10-12']],
    'wrong previous digest' => [['previous_digest' => str_repeat('f', 64)]],
    'malformed HMAC' => [['signature' => 'bad']],
]);

test('source manifest rejects a validly signed but incorrect closing cursor', function () {
    [$manifest, $events, $daily, $key, $private] = signedManifestFixture();
    $manifest['last_event_digest'] = str_repeat('f', 64);
    $manifest['signature'] = base64_encode(sodium_crypto_sign_detached(
        ForecastSourceManifestVerifier::canonicalPayload($manifest), $private
    ));

    expect(fn () => (new ForecastSourceManifestVerifier())->verify($manifest, $events, $daily, $key))
        ->toThrow(RuntimeException::class, 'Manifest closing cursor does not match the signed event chain.');
});

test('source manifest rejects signed daily history that does not reconcile to the chain', function () {
    [$manifest, $events, $daily, $key, $private] = signedManifestFixture();
    $daily[0]['verified_revenue_cents']++;
    $manifest['day_summary_sha256'] = ForecastSourceManifestVerifier::dailyDigest($daily);
    $manifest['signature'] = base64_encode(sodium_crypto_sign_detached(
        ForecastSourceManifestVerifier::canonicalPayload($manifest), $private
    ));

    expect(fn () => (new ForecastSourceManifestVerifier())->verify($manifest, $events, $daily, $key))
        ->toThrow(RuntimeException::class, 'Manifest lacks a complete and reconciled daily checkpoint.');
});

test('source manifest reconciles the latest revision and rejects invalid historical links', function (bool $validLink) {
    [$manifest, $events, $daily, $key, $private] = signedManifestFixture();
    $event = $events[1];
    $event['source_event_id'] = 'synthetic-event-3';
    $event['sequence'] = 3;
    $event['previous_digest'] = $manifest['last_event_digest'];
    $event['revision'] = 2;
    $event['supersedes_digest'] = $validLink ? $manifest['last_event_digest'] : str_repeat('f', 64);
    $event['backfill_reason'] = 'corrected observation';
    $event['verified_sales_count'] = 1;
    $event['verified_gross_cents'] = 500;
    $event['proof_signature'] = base64_encode(sodium_crypto_sign_detached(
        SignedForecastCheckpointIngestor::provenancePayload($event), $private
    ));
    $payload = SignedForecastCheckpointIngestor::canonicalPayload($event);
    $event['signature'] = hash_hmac('sha256', $payload, str_repeat('h', 32));
    $events[] = $event;
    $daily[1]['verified_sales_count'] = 1;
    $daily[1]['verified_revenue_cents'] = 500;
    $manifest['last_sequence'] = 3;
    $manifest['source_event_count'] = 3;
    $manifest['last_event_digest'] = hash('sha256', $payload."\n".$event['signature']);
    $manifest['day_summary_sha256'] = ForecastSourceManifestVerifier::dailyDigest($daily);
    $manifest['signature'] = base64_encode(sodium_crypto_sign_detached(
        ForecastSourceManifestVerifier::canonicalPayload($manifest), $private
    ));
    $verifier = new ForecastSourceManifestVerifier();

    if (! $validLink) {
        expect(fn () => $verifier->verify($manifest, $events, $daily, $key))
            ->toThrow(RuntimeException::class, 'Manifest contains an invalid historical revision link.');

        return;
    }

    expect($verifier->verify($manifest, $events, $daily, $key))->toBe([
        'manifest_signature_verified' => true,
        'event_signatures_verified' => 3,
        'days_reconciled' => 2,
        'independent_observation_coverage_verified' => false,
        'reason' => 'upstream_event_completeness_not_attested',
    ]);
})->with([
    'valid revision' => [true],
    'invalid supersession' => [false],
]);
