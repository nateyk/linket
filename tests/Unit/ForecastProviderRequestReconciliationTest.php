<?php

use App\CreatorAi\Forecasting\ForecastProviderRequestReconciliation;

function reconciliationFixture(array $local, array $remote, int $unresolved = 0): array
{
    return [
        $local,
        [
            'requests_in_scope' => count($remote),
            'successful_requests' => max(0, count($remote) - $unresolved),
            'unresolved_requests' => $unresolved,
            'pages_read' => 1,
            'request_id_hashes' => $remote,
            'page_set_complete' => true,
            'provider_account_scope_attested' => false,
            'upstream_event_completeness_verified' => false,
        ],
    ];
}

test('matching request sets do not attest provider-wide completeness or enable money forecasts', function () {
    $ids = [hash('sha256', 'local-reference-1'), hash('sha256', 'local-reference-2')];
    [$local, $provider] = reconciliationFixture($ids, array_reverse($ids));

    $result = app(ForecastProviderRequestReconciliation::class)->assess($local, $provider);
    expect($result['request_sets_agree'])->toBeTrue()
        ->and($result['provider_requests_missing_locally'])->toBe(0)
        ->and($result['locally_expected_requests_missing_at_provider'])->toBe(0)
        ->and($result['provider_account_scope_attested'])->toBeFalse()
        ->and($result['independent_observation_coverage_verified'])->toBeFalse()
        ->and($result['forecast_publication_allowed'])->toBeFalse()
        ->and($result['reason'])->toBe('provider_account_scope_and_upstream_completeness_not_attested');

    $payload = json_encode($result, JSON_THROW_ON_ERROR);
    expect($payload)->not->toContain('local-reference-')
        ->not->toContain('request_id_hashes')
        ->not->toContain('estimated_total_gross_cents');
});

test('foreign provider requests and missing provider requests are detected in both directions', function () {
    $a = hash('sha256', 'a');
    $b = hash('sha256', 'b');
    $c = hash('sha256', 'c');

    [$local, $remote] = reconciliationFixture([$a, $b], [$a, $c]);
    $r = app(ForecastProviderRequestReconciliation::class)->assess($local, $remote);

    expect($r['request_sets_agree'])->toBeFalse()
        ->and($r['provider_requests_missing_locally'])->toBe(1)
        ->and($r['locally_expected_requests_missing_at_provider'])->toBe(1)
        ->and($r['reason'])->toBe('provider_local_request_set_mismatch');
});

test('pending provider requests suppress reconciliation despite matching identities', function () {
    $ids = [hash('sha256', 'unfinished')];
    [$local, $remote] = reconciliationFixture($ids, $ids, 1);
    $r = app(ForecastProviderRequestReconciliation::class)->assess($local, $remote);
    expect($r['request_sets_agree'])->toBeTrue()
        ->and($r['forecast_publication_allowed'])->toBeFalse()
        ->and($r['reason'])->toBe('provider_history_has_unresolved_requests');
});

test('incomplete provider pagination never qualifies as complete reconciliation', function () {
    $ids = [hash('sha256', 'same')];
    [$local, $remote] = reconciliationFixture($ids, $ids);
    $remote['page_set_complete'] = false;
    $result = app(ForecastProviderRequestReconciliation::class)->assess($local, $remote);
    expect($result['request_sets_agree'])->toBeFalse()
        ->and($result['reason'])->toBe('provider_history_pages_incomplete');
});

test('malformed and repeated request fingerprints are rejected rather than ignored', function () {
    $h = hash('sha256', 'same');
    [$local, $remote] = reconciliationFixture([$h], [$h]);
    $checker = app(ForecastProviderRequestReconciliation::class);

    expect(fn () => $checker->assess([$h, $h], $remote))->toThrow(InvalidArgumentException::class);
    expect(fn () => $checker->assess(['not-a-digest'], $remote))->toThrow(InvalidArgumentException::class);

    $remote['request_id_hashes'] = [$h, $h];
    $remote['requests_in_scope'] = 2;
    expect(fn () => $checker->assess($local, $remote))->toThrow(InvalidArgumentException::class);

    $remote['request_id_hashes'] = [$h];
    $remote['requests_in_scope'] = 2;
    expect(fn () => $checker->assess($local, $remote))->toThrow(InvalidArgumentException::class);
});

test('self-declared source attestation flags never bypass the independent completeness boundary', function () {
    $h = hash('sha256', 'signed');
    [$local, $remote] = reconciliationFixture([$h], [$h]);
    $remote['provider_account_scope_attested'] = true;
    $remote['upstream_event_completeness_verified'] = true;

    $result = app(ForecastProviderRequestReconciliation::class)->assess($local, $remote);
    expect($result['provider_account_scope_attested'])->toBeFalse()
        ->and($result['independent_observation_coverage_verified'])->toBeFalse()
        ->and($result['forecast_publication_allowed'])->toBeFalse();
});

test('empty scoped provider history remains untrusted without an account-wide completeness contract', function () {
    [$local, $remote] = reconciliationFixture([], []);
    $result = app(ForecastProviderRequestReconciliation::class)->assess($local, $remote);
    expect($result['request_sets_agree'])->toBeTrue()
        ->and($result['forecast_publication_allowed'])->toBeFalse()
        ->and($result['reason'])->toBe('provider_account_scope_and_upstream_completeness_not_attested');
});
