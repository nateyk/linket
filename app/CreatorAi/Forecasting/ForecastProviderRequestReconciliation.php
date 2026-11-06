<?php

namespace App\CreatorAi\Forecasting;

use InvalidArgumentException;

/**
 * Compares a caller's server-authorized expected request-ID fingerprints
 * against a separate Verify.et account-scoped history snapshot.
 *
 * Never receives raw request IDs, buyers, bank accounts or payment receipts.
 * A match proves only agreement between two selected sets, not completeness
 * of an account's upstream requests or the authenticity of provider scope.
 *
 * No route, schedule, provider call or forecast-publication capability.
 */
final class ForecastProviderRequestReconciliation
{
    /**
     * @param list<string> $expectedLocalRequestHashes Already scoped by an authorized, server-side creator/workspace reader.
     * @param array<string,mixed> $snapshot Output from the read-only provider history adapter.
     * @return array<string,int|bool|string>
     */
    public function assess(array $expectedLocalRequestHashes, array $snapshot): array
    {
        if (! array_is_list($expectedLocalRequestHashes) || count($expectedLocalRequestHashes) > 10000) {
            throw new InvalidArgumentException('Unsafe expected-request snapshot.');
        }

        $expected = [];
        foreach ($expectedLocalRequestHashes as $digest) {
            if (! is_string($digest) || preg_match('/^[a-f0-9]{64}$/D', $digest) !== 1
                || isset($expected[$digest])) {
                throw new InvalidArgumentException('Local request fingerprints are malformed or repeated.');
            }
            $expected[$digest] = true;
        }

        $providerHashes = $snapshot['request_id_hashes'] ?? null;
        $total = $snapshot['requests_in_scope'] ?? null;
        $success = $snapshot['successful_requests'] ?? null;
        $unresolved = $snapshot['unresolved_requests'] ?? null;
        $pages = $snapshot['pages_read'] ?? null;
        $complete = $snapshot['page_set_complete'] ?? null;

        if (! is_array($providerHashes) || ! array_is_list($providerHashes)
            || count($providerHashes) > 10000
            || ! is_int($total) || $total < 0 || $total > 10000
            || ! is_int($success) || $success < 0 || $success > $total
            || ! is_int($unresolved) || $unresolved < 0 || $unresolved > $total
            || ! is_int($pages) || $pages < 1 || $pages > 200
            || ! is_bool($complete)
            || ! is_bool($snapshot['provider_account_scope_attested'] ?? null)
            || ! is_bool($snapshot['upstream_event_completeness_verified'] ?? null)
            || count($providerHashes) !== $total) {
            throw new InvalidArgumentException('Invalid or inconsistent provider request snapshot.');
        }

        $provider = [];
        foreach ($providerHashes as $digest) {
            if (! is_string($digest) || preg_match('/^[a-f0-9]{64}$/D', $digest) !== 1
                || isset($provider[$digest])) {
                throw new InvalidArgumentException('Provider request fingerprints are malformed or repeated.');
            }
            $provider[$digest] = true;
        }

        // Never promote caller- or provider-declared booleans into attestation.
        // Provider history can be scoped to the WRONG provider account; even
        // a perfect set match says nothing about undisclosed missing events.
        $missingLocally = count(array_diff_key($provider, $expected));
        $missingAtProvider = count(array_diff_key($expected, $provider));

        $reason = ! $complete
            ? 'provider_history_pages_incomplete'
            : ($unresolved > 0
                ? 'provider_history_has_unresolved_requests'
                : ($missingLocally > 0 || $missingAtProvider > 0
                    ? 'provider_local_request_set_mismatch'
                    : 'provider_account_scope_and_upstream_completeness_not_attested'));

        return [
            'provider_requests_in_scope' => $total,
            'locally_expected_request_count' => count($expected),
            'provider_requests_missing_locally' => $missingLocally,
            'locally_expected_requests_missing_at_provider' => $missingAtProvider,
            'provider_unresolved_requests' => $unresolved,
            'provider_history_page_set_complete' => $complete,
            'request_sets_agree' => $complete && $missingLocally === 0 && $missingAtProvider === 0,
            'provider_account_scope_attested' => false,
            'independent_observation_coverage_verified' => false,
            'forecast_publication_allowed' => false,
            'reason' => $reason,
        ];
    }
}
