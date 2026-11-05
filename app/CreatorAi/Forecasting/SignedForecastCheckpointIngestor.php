<?php

namespace App\CreatorAi\Forecasting;

use Carbon\CarbonImmutable;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Internal-only signed checkpoint ingestion; NO controller, command, job or
 * public endpoint. Signers must be provisioned OUTSIDE this application and
 * scoped to their permitted workspaces. This is source authentication, not
 * external Verify.et attestation or a completeness guarantee.
 *
 * The event ledger is application-append-only. DB administrators can still
 * mutate it until immutable external storage and permissions are reviewed.
 */
final class SignedForecastCheckpointIngestor
{
    private const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';
    private const SOURCES = ['checkout_event_stream', 'verify_et_reconciliation'];
    private const BACKFILL_REASONS = ['outage_recovery', 'late_verification', 'historical_import'];
    private const FIELDS = [
        'source_kind', 'workspace_id', 'source_event_id', 'sequence',
        'previous_digest', 'observed_on', 'verified_sales_count',
        'verified_gross_cents', 'revision', 'supersedes_digest',
        'backfill_reason', 'watermark_at', 'signed_at', 'key_id',
    ];

    /**
     * Stable byte sequence that must be independently constructed by the
     * source signer. No implicit whitespace normalization or ignored fields.
     *
     * @param array<string,mixed> $event
     */
    public static function canonicalPayload(array $event): string
    {
        $payload = [];
        foreach (self::FIELDS as $field) {
            if (! array_key_exists($field, $event)) {
                throw new InvalidArgumentException('Signed checkpoint field is missing.');
            }
            $payload[$field] = $event[$field];
        }

        return json_encode(
            $payload,
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        );
    }

    /**
     * @param array<string,mixed> $event
     * @return array{status:string,sequence:int}
     */
    public function ingest(array $event): array
    {
        if (! (bool) config('creator_ai.forecast_ingestion.enabled', false)) {
            throw new RuntimeException('Forecast checkpoint ingestion is disabled.');
        }

        $expectedFields = [...self::FIELDS, 'signature'];
        $actualFields = array_keys($event);
        sort($expectedFields);
        sort($actualFields);
        if ($actualFields !== $expectedFields) {
            throw new InvalidArgumentException('Unexpected or missing signed checkpoint fields.');
        }

        $this->validateEvent($event);
        $source = $event['source_kind'];
        $workspace = $event['workspace_id'];
        $signers = config('creator_ai.forecast_ingestion.signers', []);

        // Requiring distinct, concurrently configured producer keys prevents
        // a single unconfigured or reused secret from impersonating both feeds.
        $checkoutSecret = $this->decodeSecret($signers['checkout_event_stream']['v1']['key'] ?? null);
        $reconciliationSecret = $this->decodeSecret($signers['verify_et_reconciliation']['v1']['key'] ?? null);
        if (hash_equals($checkoutSecret, $reconciliationSecret)) {
            throw new RuntimeException('Independent checkpoint signers cannot share an HMAC key.');
        }

        $registration = $signers[$source][$event['key_id']] ?? null;
        $secret = $this->decodeSecret(is_array($registration) ? ($registration['key'] ?? null) : null);
        $allowedWorkspaces = is_array($registration) ? ($registration['workspace_ids'] ?? null) : null;
        if (! is_array($allowedWorkspaces)
            || ! in_array($workspace, $allowedWorkspaces, true)) {
            throw new RuntimeException('Checkpoint signer is not authorized for this workspace.');
        }

        $expectedSignature = hash_hmac('sha256', self::canonicalPayload($event), $secret);
        if (! hash_equals($expectedSignature, $event['signature'])) {
            throw new RuntimeException('Checkpoint signature verification failed.');
        }

        $digest = hash('sha256', self::canonicalPayload($event)."\n".$event['signature']);
        $now = CarbonImmutable::now('UTC');
        $watermark = CarbonImmutable::parse($event['watermark_at'], 'UTC');
        $signedAt = CarbonImmutable::parse($event['signed_at'], 'UTC');
        $observedDay = CarbonImmutable::parse($event['observed_on'], 'UTC');
        if ($observedDay->greaterThanOrEqualTo($now->startOfDay())
            || $watermark->lessThan($observedDay->addDays(3)->startOfDay())
            || $signedAt->lessThan($watermark)
            || $signedAt->greaterThan($now->addMinutes(5))) {
            throw new InvalidArgumentException('Checkpoint watermark, signature time or observed day is invalid.');
        }

        return DB::transaction(function () use ($event, $source, $workspace, $digest, $now): array {
            $streams = DB::table('creator_ai_forecast_checkpoint_streams');
            $streams->insertOrIgnore([
                'workspace_id' => $workspace,
                'source_kind' => $source,
                'last_sequence' => 0,
                'last_event_digest' => self::GENESIS,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $stream = DB::table('creator_ai_forecast_checkpoint_streams')
                ->where('workspace_id', $workspace)
                ->where('source_kind', $source)
                ->lockForUpdate()
                ->first();

            if (! $stream) {
                throw new RuntimeException('Checkpoint stream could not be locked.');
            }

            $events = DB::table('creator_ai_forecast_checkpoint_events');
            $replay = $events->where('stream_id', $stream->id)
                ->where('source_event_id', $event['source_event_id'])
                ->first(['event_digest', 'sequence']);
            if ($replay) {
                if (hash_equals((string) $replay->event_digest, $digest)
                    && (int) $replay->sequence === $event['sequence']) {
                    return ['status' => 'duplicate', 'sequence' => $event['sequence']];
                }
                throw new RuntimeException('Conflicting signed event replay.');
            }

            if ($event['sequence'] !== ((int) $stream->last_sequence) + 1
                || ! hash_equals((string) $stream->last_event_digest, $event['previous_digest'])) {
                throw new RuntimeException('Checkpoint stream has a missing or replayed cursor.');
            }

            $isBackfill = $stream->last_observed_on !== null
                && $event['observed_on'] < (string) $stream->last_observed_on;
            if ($isBackfill && $event['backfill_reason'] === null) {
                throw new RuntimeException('Historical checkpoint backfill requires a signed reason.');
            }

            $lastForDay = DB::table('creator_ai_forecast_checkpoint_events')
                ->where('stream_id', $stream->id)
                ->where('observed_on', $event['observed_on'])
                ->orderByDesc('sequence')
                ->first(['revision', 'event_digest']);

            if ($lastForDay === null) {
                if ($event['revision'] !== 1 || $event['supersedes_digest'] !== null) {
                    throw new RuntimeException('A new checkpoint requires revision one.');
                }
            } elseif (
                $event['revision'] !== ((int) $lastForDay->revision) + 1
                || $event['supersedes_digest'] === null
                || ! hash_equals((string) $lastForDay->event_digest, $event['supersedes_digest'])
                || $event['backfill_reason'] === null
            ) {
                throw new RuntimeException('Checkpoint correction must cite its previous signed revision.');
            }

            $events->insert([
                'stream_id' => $stream->id,
                'workspace_id' => $workspace,
                'source_kind' => $source,
                'source_event_id' => $event['source_event_id'],
                'sequence' => $event['sequence'],
                'observed_on' => $event['observed_on'],
                'revision' => $event['revision'],
                'previous_digest' => $event['previous_digest'],
                'supersedes_digest' => $event['supersedes_digest'],
                'event_digest' => $digest,
                'key_id' => $event['key_id'],
                'signature_hmac_sha256' => $event['signature'],
                'verified_sales_count' => $event['verified_sales_count'],
                'verified_gross_cents' => $event['verified_gross_cents'],
                'source_watermark_at' => $event['watermark_at'],
                'source_signed_at' => $event['signed_at'],
                'captured_at' => $now,
                'backfill_reason' => $event['backfill_reason'],
                'created_at' => $now,
            ]);

            $projections = DB::table('creator_ai_forecast_coverage_checkpoints');
            $projectionFilter = [
                'workspace_id' => $workspace,
                'observed_on' => $event['observed_on'],
                'source_kind' => $source,
            ];
            $summary = [
                'verified_sales_count' => $event['verified_sales_count'],
                'verified_gross_cents' => $event['verified_gross_cents'],
                'source_cursor_sha256' => $digest,
                'source_watermark_at' => $event['watermark_at'],
                'captured_at' => $now,
                'sealed_at' => $now,
                'updated_at' => $now,
            ];

            if ($lastForDay === null) {
                $projections->insert([
                    ...$projectionFilter,
                    ...$summary,
                    'created_at' => $now,
                ]);
            } else {
                if ($projections->where($projectionFilter)->update($summary) !== 1) {
                    throw new RuntimeException('Checkpoint projection is missing for a signed correction.');
                }
            }

            DB::table('creator_ai_forecast_checkpoint_streams')
                ->where('id', $stream->id)
                ->update([
                    'last_sequence' => $event['sequence'],
                    'last_event_digest' => $digest,
                    'last_observed_on' => $stream->last_observed_on === null
                        || $event['observed_on'] > (string) $stream->last_observed_on
                        ? $event['observed_on'] : $stream->last_observed_on,
                    'updated_at' => $now,
                ]);

            return ['status' => 'recorded', 'sequence' => $event['sequence']];
        }, 3);
    }

    /** @param array<string,mixed> $event */
    private function validateEvent(array $event): void
    {
        if (! in_array($event['source_kind'], self::SOURCES, true)
            || ! is_int($event['workspace_id']) || $event['workspace_id'] < 1
            || ! is_string($event['source_event_id'])
            || preg_match('/^[A-Za-z0-9_.:-]{1,80}$/D', $event['source_event_id']) !== 1
            || ! is_int($event['sequence']) || $event['sequence'] < 1
            || ! is_string($event['previous_digest']) || ! $this->isDigest($event['previous_digest'])
            || ! is_string($event['observed_on'])
            || preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/D', $event['observed_on']) !== 1
            || ! is_int($event['verified_sales_count']) || $event['verified_sales_count'] < 0
            || $event['verified_sales_count'] > 1000000
            || ! is_int($event['verified_gross_cents']) || $event['verified_gross_cents'] < 0
            || $event['verified_gross_cents'] > 1000000000000
            || ($event['verified_sales_count'] === 0 && $event['verified_gross_cents'] !== 0)
            || ! is_int($event['revision']) || $event['revision'] < 1 || $event['revision'] > 1000000
            || ($event['supersedes_digest'] !== null
                && (! is_string($event['supersedes_digest']) || ! $this->isDigest($event['supersedes_digest'])))
            || ($event['backfill_reason'] !== null
                && ! in_array($event['backfill_reason'], self::BACKFILL_REASONS, true))
            || ! is_string($event['key_id'])
            || preg_match('/^[a-zA-Z0-9_-]{1,32}$/D', $event['key_id']) !== 1
            || ! is_string($event['signature']) || ! $this->isDigest($event['signature'])
            || ! $this->validUtcTimestamp($event['watermark_at'])
            || ! $this->validUtcTimestamp($event['signed_at'])
            || ! $this->validUtcDay($event['observed_on'])) {
            throw new InvalidArgumentException('Signed checkpoint envelope is invalid.');
        }
    }

    private function isDigest(string $value): bool
    {
        return preg_match('/^[a-f0-9]{64}$/D', $value) === 1;
    }

    private function validUtcDay(string $value): bool
    {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));
        return $date !== false && $date->format('Y-m-d') === $value;
    }

    private function validUtcTimestamp(mixed $value): bool
    {
        if (! is_string($value)) {
            return false;
        }
        $stamp = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s\Z', $value, new DateTimeZone('UTC'));
        return $stamp !== false && $stamp->format('Y-m-d\TH:i:s\Z') === $value;
    }

    private function decodeSecret(mixed $encoded): string
    {
        if (! is_string($encoded) || ! str_starts_with($encoded, 'base64:')) {
            throw new RuntimeException('Checkpoint source HMAC key is not provisioned.');
        }
        $key = base64_decode(substr($encoded, 7), true);
        if ($key === false || strlen($key) < 32) {
            throw new RuntimeException('Checkpoint source HMAC key is invalid.');
        }

        return $key;
    }
}
