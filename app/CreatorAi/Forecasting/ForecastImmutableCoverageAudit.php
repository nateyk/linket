<?php

namespace App\CreatorAi\Forecasting;

use App\CreatorAi\Services\CreatorAiAccess;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Internal-only, READ-ONLY audit: authorized Linket daily aggregates versus
 * independently signed S3 Object Lock COMPLIANCE evidence, pinned by version.
 *
 * No forecast is published, no payment is changed, no object is uploaded, and
 * a signed window never proves an external provider delivered *all* events.
 */
final class ForecastImmutableCoverageAudit
{
    private const SOURCES = ['checkout_event_stream', 'verify_et_reconciliation'];

    public function __construct(
        private readonly CreatorAiAccess $access,
        private readonly VerifiedRevenueDailySeries $history,
        private readonly ImmutableForecastManifestReader $objectReader,
        private readonly ForecastSourceManifestVerifier $verifier,
    ) {}

    /**
     * This API is strictly internal: version IDs must originate from a
     * separately reviewed operator-controlled inventory, not a buyer request.
     *
     * @param array{checkout_event_stream:string,verify_et_reconciliation:string} $versionIds
     * @return array<string,int|string|bool>
     */
    public function inspect(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
        array $versionIds,
    ): array {
        // Re-authorize before any S3 key, DB cursor or version lookup.
        $this->access->authorize($creator, $workspaceId, 'forecast');

        if (! (bool) config('creator_ai.forecast_evidence.enabled', false)) {
            return [
                'independent_observation_coverage_verified' => false,
                'signed_source_windows_verified' => 0,
                'reason' => 'external_object_evidence_disabled',
            ];
        }

        $sources = array_keys($versionIds);
        sort($sources);
        $expectedSources = self::SOURCES;
        sort($expectedSources);
        if ($sources !== $expectedSources || $from->getTimezone()->getName() !== 'UTC'
            || $to->getTimezone()->getName() !== 'UTC') {
            throw new InvalidArgumentException('The independent evidence window or source versions are invalid.');
        }

        $from = $from->startOfDay();
        $to = $to->startOfDay();
        $daily = $this->history->forCreator($creator, $workspaceId, $from, $to);
        if ($daily === [] || count($daily) > 366) {
            throw new InvalidArgumentException('Invalid bounded source manifest range.');
        }

        $prefix = 'creator-ai/forecast-closed-windows/';
        $rangeName = $from->format('Ymd').'-'.$to->format('Ymd').'.json';
        $signedSources = 0;
        $days = count($daily);

        // Both producers must use different pinned public keys. This check
        // cannot prove organizational independence or external event delivery.
        $pinned = config('creator_ai.forecast_ingestion.public_keys', []);
        $firstKey = $pinned[self::SOURCES[0]]['v1'] ?? null;
        $secondKey = $pinned[self::SOURCES[1]]['v1'] ?? null;
        if (! is_string($firstKey) || ! is_string($secondKey)
            || hash_equals($firstKey, $secondKey)) {
            throw new RuntimeException('Independent source signing keys must be separately pinned.');
        }

        foreach (self::SOURCES as $source) {
            $version = $versionIds[$source];
            if (! is_string($version) || strlen($version) > 512) {
                throw new InvalidArgumentException('Object version identifier is missing or excessive.');
            }
            $objectKey = $prefix.$workspaceId.'/'.$source.'/'.$rangeName;
            $object = $this->objectReader->readVersion($objectKey, $version);
            if (($object['retention_verified'] ?? false) !== true
                || ($object['version_id'] ?? null) !== $version
                || ! is_string($object['body'] ?? null)
                || ! is_string($object['sha256'] ?? null)
                || ! hash_equals($object['sha256'], hash('sha256', $object['body']))) {
                throw new RuntimeException('Immutable evidence object failed version or content verification.');
            }

            $manifest = json_decode($object['body'], true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($manifest)
                || ($manifest['workspace_id'] ?? null) !== $workspaceId
                || ($manifest['source_kind'] ?? null) !== $source
                || ($manifest['window_start'] ?? null) !== $from->toDateString()
                || ($manifest['window_end'] ?? null) !== $to->toDateString()
                || ! is_int($manifest['first_sequence'] ?? null)
                || ! is_int($manifest['last_sequence'] ?? null)
                || $manifest['first_sequence'] < 1
                || $manifest['last_sequence'] < $manifest['first_sequence']
                || $manifest['last_sequence'] - $manifest['first_sequence'] > 1500
                || ! is_string($manifest['key_id'] ?? null)) {
                throw new RuntimeException('Immutable manifest does not cover the authorized workspace and window.');
            }

            $publicKey = $pinned[$source][$manifest['key_id']] ?? null;
            if (! is_string($publicKey)) {
                throw new RuntimeException('The external manifest key is not pinned.');
            }
            $rows = DB::table('creator_ai_forecast_checkpoint_events')
                ->where('workspace_id', $workspaceId)
                ->where('source_kind', $source)
                ->whereBetween('sequence', [$manifest['first_sequence'], $manifest['last_sequence']])
                ->orderBy('sequence')
                ->get();

            $envelopes = [];
            foreach ($rows as $row) {
                $envelopes[] = $this->restoreSignedEnvelope($row);
            }
            $check = $this->verifier->verify($manifest, $envelopes, $daily, $publicKey);
            if (! $check['manifest_signature_verified']
                || $check['event_signatures_verified'] !== count($envelopes)
                || $check['days_reconciled'] !== $days) {
                throw new RuntimeException('Signed manifest and evidence chain do not agree.');
            }

            $signedSources++;
        }

        return [
            'immutable_object_lock_versions_verified' => $signedSources,
            'signed_source_windows_verified' => $signedSources,
            'signed_days_reconciled' => $days,
            'independent_observation_coverage_verified' => false,
            'forecast_publication_allowed' => false,
            'reason' => 'upstream_event_completeness_not_attested',
        ];
    }

    /**
     * Recreate the exact canonical source message from stored UTC timestamps.
     * The original signatures and digest remain cryptographically anchored by
     * the signed, externally locked window manifest.
     *
     * @return array<string,mixed>
     */
    private function restoreSignedEnvelope(object $row): array
    {
        $utc = static fn ($timestamp) => CarbonImmutable::parse($timestamp, 'UTC')
            ->utc()->format('Y-m-d\TH:i:s\Z');

        return [
            'source_kind' => (string) $row->source_kind,
            'workspace_id' => (int) $row->workspace_id,
            'source_event_id' => (string) $row->source_event_id,
            'sequence' => (int) $row->sequence,
            'previous_digest' => (string) $row->previous_digest,
            'observed_on' => (string) $row->observed_on,
            'verified_sales_count' => (int) $row->verified_sales_count,
            'verified_gross_cents' => (int) $row->verified_gross_cents,
            'revision' => (int) $row->revision,
            'supersedes_digest' => $row->supersedes_digest === null ? null : (string) $row->supersedes_digest,
            'backfill_reason' => $row->backfill_reason === null ? null : (string) $row->backfill_reason,
            'watermark_at' => $utc($row->source_watermark_at),
            'signed_at' => $utc($row->source_signed_at),
            'key_id' => (string) $row->key_id,
            'proof_key_id' => (string) $row->proof_key_id,
            'proof_signature' => (string) $row->proof_signature_base64,
            'signature' => (string) $row->signature_hmac_sha256,
        ];
    }
}
