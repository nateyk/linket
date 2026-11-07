<?php

namespace App\CreatorAi\Forecasting;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;
use RuntimeException;

/**
 * Independent, offline verifier for a source-signed closed-window statement
 * and the signed checkpoint event chain. It authenticates *claimed* coverage,
 * not completeness of the external provider's underlying transaction stream.
 *
 * No HTTP route, database mutation, or forecast publication is provided here.
 */
final class ForecastSourceManifestVerifier
{
    private const FIELDS = [
        'schema_version', 'source_kind', 'workspace_id',
        'window_start', 'window_end', 'first_sequence', 'last_sequence',
        'first_previous_digest', 'last_event_digest',
        'source_event_count', 'day_summary_sha256',
        'issued_at', 'key_id',
    ];

    /** @param array<string, mixed> $manifest */
    public static function canonicalPayload(array $manifest): string
    {
        $ordered = [];
        foreach (self::FIELDS as $field) {
            if (! array_key_exists($field, $manifest)) {
                throw new InvalidArgumentException('Signed source manifest is missing a field.');
            }
            $ordered[$field] = $manifest[$field];
        }

        return json_encode(
            $ordered,
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        );
    }

    /** @param list<array{date:string,verified_sales_count:int,verified_revenue_cents:int}> $daily */
    public static function dailyDigest(array $daily): string
    {
        $rows = [];
        foreach ($daily as $row) {
            $rows[] = ($row['date'] ?? '').':'.($row['verified_sales_count'] ?? '').
                ':'.($row['verified_revenue_cents'] ?? '');
        }

        return hash('sha256', implode("\n", $rows)."\n");
    }

    /**
     * @param array<string,mixed> $manifest
     * @param list<array<string,mixed>> $envelopes Each must be an original
     * signed event envelope, including original HMAC and Ed25519 signatures.
     * @param list<array{date:string,verified_sales_count:int,verified_revenue_cents:int}> $daily
     * @return array{manifest_signature_verified:bool,event_signatures_verified:int,days_reconciled:int,independent_observation_coverage_verified:bool,reason:string}
     */
    public function verify(array $manifest, array $envelopes, array $daily, string $publicKeyBase64): array
    {
        $fields = [...self::FIELDS, 'signature'];
        $keys = array_keys($manifest);
        sort($fields);
        sort($keys);
        if ($keys !== $fields
            || ! is_int($manifest['schema_version'])
            || $manifest['schema_version'] !== 1
            || ! in_array($manifest['source_kind'], ['checkout_event_stream', 'verify_et_reconciliation'], true)
            || ! is_int($manifest['workspace_id']) || $manifest['workspace_id'] < 1
            || ! is_string($manifest['key_id'])
            || preg_match('/^[A-Za-z0-9_-]{1,32}$/D', $manifest['key_id']) !== 1
            || ! is_string($manifest['signature'])
            || ! is_int($manifest['first_sequence']) || $manifest['first_sequence'] < 1
            || ! is_int($manifest['last_sequence']) || $manifest['last_sequence'] < $manifest['first_sequence']
            || ! is_int($manifest['source_event_count']) || $manifest['source_event_count'] < 1
            || $manifest['source_event_count'] > 1500
            || $manifest['last_sequence'] - $manifest['first_sequence'] + 1 !== $manifest['source_event_count']
            || ! $this->digest($manifest['first_previous_digest'])
            || ! $this->digest($manifest['last_event_digest'])
            || ! $this->digest($manifest['day_summary_sha256'])
            || ! $this->validDay($manifest['window_start'])
            || ! $this->validDay($manifest['window_end'])
            || $manifest['window_start'] > $manifest['window_end']
            || ! $this->validTimestamp($manifest['issued_at'])) {
            throw new InvalidArgumentException('Signed source manifest envelope is invalid.');
        }

        $from = new DateTimeImmutable($manifest['window_start'], new DateTimeZone('UTC'));
        $to = new DateTimeImmutable($manifest['window_end'], new DateTimeZone('UTC'));
        $numberOfDays = (int) $from->diff($to)->days + 1;
        $issued = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s\Z', $manifest['issued_at'], new DateTimeZone('UTC'));
        $minIssue = $to->modify('+3 days')->setTime(0, 0);
        if ($numberOfDays > 366 || $numberOfDays < 1
            || count($daily) !== $numberOfDays
            || $issued < $minIssue
            || $issued > (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify('+5 minutes')) {
            throw new InvalidArgumentException('Manifest window is incomplete, premature or excessive.');
        }

        foreach ($daily as $index => $row) {
            if (! is_array($row)
                || array_keys($row) !== ['date', 'verified_sales_count', 'verified_revenue_cents']
                || $row['date'] !== $from->modify('+'.$index.' days')->format('Y-m-d')
                || ! is_int($row['verified_sales_count']) || ! is_int($row['verified_revenue_cents'])
                || $row['verified_sales_count'] < 0 || $row['verified_sales_count'] > 1000000
                || $row['verified_revenue_cents'] < 0 || $row['verified_revenue_cents'] > 1000000000000
                || ($row['verified_sales_count'] === 0 && $row['verified_revenue_cents'] !== 0)) {
                throw new InvalidArgumentException('Manifest was given invalid daily revenue observations.');
            }
        }

        $public = $this->publicKey($publicKeyBase64);
        $signature = base64_decode($manifest['signature'], true);
        if ($signature === false || strlen($signature) !== SODIUM_CRYPTO_SIGN_BYTES
            || ! sodium_crypto_sign_verify_detached($signature, self::canonicalPayload($manifest), $public)) {
            throw new RuntimeException('External completeness manifest signature is invalid.');
        }

        if (! hash_equals($manifest['day_summary_sha256'], self::dailyDigest($daily))) {
            throw new RuntimeException('Signed manifest disagrees with authorized daily history.');
        }

        if (count($envelopes) !== $manifest['source_event_count']) {
            throw new RuntimeException('Signed manifest references missing or additional events.');
        }

        $expectedSequence = $manifest['first_sequence'];
        $previousDigest = $manifest['first_previous_digest'];
        $latest = [];
        foreach ($envelopes as $event) {
            if (! is_array($event)
                || ! isset($event['source_kind'], $event['workspace_id'], $event['sequence'],
                    $event['previous_digest'], $event['observed_on'], $event['proof_signature'],
                    $event['proof_key_id'], $event['signature'], $event['revision'])
                || $event['source_kind'] !== $manifest['source_kind']
                || $event['workspace_id'] !== $manifest['workspace_id']
                || $event['sequence'] !== $expectedSequence
                || $event['proof_key_id'] !== $manifest['key_id']
                || ! is_string($event['observed_on'])
                || $event['observed_on'] < $manifest['window_start']
                || $event['observed_on'] > $manifest['window_end']
                || ! is_string($event['previous_digest'])
                || ! hash_equals($previousDigest, $event['previous_digest'])
                || ! is_string($event['signature']) || ! $this->digest($event['signature'])) {
                throw new RuntimeException('Signed checkpoint stream has a gap, cross-tenant item, or invalid cursor.');
            }

            $eventProof = base64_decode($event['proof_signature'], true);
            if ($eventProof === false || strlen($eventProof) !== SODIUM_CRYPTO_SIGN_BYTES
                || ! sodium_crypto_sign_verify_detached(
                    $eventProof, SignedForecastCheckpointIngestor::provenancePayload($event), $public
                )) {
                throw new RuntimeException('Signed checkpoint event has invalid independent provenance.');
            }

            $digest = hash(
                'sha256',
                SignedForecastCheckpointIngestor::canonicalPayload($event)."\n".$event['signature']
            );
            $previous = $latest[$event['observed_on']] ?? null;
            if ($previous === null) {
                if ($event['revision'] !== 1 || ($event['supersedes_digest'] ?? null) !== null) {
                    throw new RuntimeException('Manifest window contains an unverifiable initial day revision.');
                }
            } elseif ($event['revision'] !== $previous['revision'] + 1
                || ($event['supersedes_digest'] ?? null) !== $previous['digest']) {
                throw new RuntimeException('Manifest contains an invalid historical revision link.');
            }
            $latest[$event['observed_on']] = [
                'revision' => $event['revision'],
                'digest' => $digest,
                'count' => $event['verified_sales_count'],
                'cents' => $event['verified_gross_cents'],
            ];
            $previousDigest = $digest;
            $expectedSequence++;
        }

        if (! hash_equals($manifest['last_event_digest'], $previousDigest)) {
            throw new RuntimeException('Manifest closing cursor does not match the signed event chain.');
        }

        foreach ($daily as $day) {
            $latestForDay = $latest[$day['date']] ?? null;
            if ($latestForDay === null
                || $latestForDay['count'] !== $day['verified_sales_count']
                || $latestForDay['cents'] !== $day['verified_revenue_cents']) {
                throw new RuntimeException('Manifest lacks a complete and reconciled daily checkpoint.');
            }
        }

        // A signed statement and object retention still cannot independently
        // prove that every upstream payment was delivered to either producer.
        return [
            'manifest_signature_verified' => true,
            'event_signatures_verified' => count($envelopes),
            'days_reconciled' => count($daily),
            'independent_observation_coverage_verified' => false,
            'reason' => 'upstream_event_completeness_not_attested',
        ];
    }

    private function publicKey(string $value): string
    {
        if (! str_starts_with($value, 'base64:')) {
            throw new InvalidArgumentException('A pinned Ed25519 source public key is required.');
        }
        $binary = base64_decode(substr($value, 7), true);
        if ($binary === false || strlen($binary) !== SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES) {
            throw new InvalidArgumentException('The pinned Ed25519 public key is invalid.');
        }

        return $binary;
    }

    private function digest(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[a-f0-9]{64}$/D', $value) === 1;
    }

    private function validDay(mixed $value): bool
    {
        if (! is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value) !== 1) {
            return false;
        }
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));

        return $date !== false && $date->format('Y-m-d') === $value;
    }

    private function validTimestamp(mixed $value): bool
    {
        if (! is_string($value)) {
            return false;
        }
        $stamp = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s\Z', $value, new DateTimeZone('UTC'));

        return $stamp !== false && $stamp->format('Y-m-d\TH:i:s\Z') === $value;
    }
}
