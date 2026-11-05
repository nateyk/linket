<?php

namespace App\CreatorAi\Forecasting;

use Aws\S3\S3Client;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * A READ-ONLY S3 Object Lock COMPLIANCE version reader.
 * Credentials are resolved by the AWS SDK's default provider chain and should
 * have ONLY GetObject/GetObjectRetention/HeadObject for the pinned bucket.
 *
 * This is not an object writer. A credential able to edit the remote evidence
 * cannot be supplied through a user-facing Linket feature.
 */
final class S3ComplianceForecastManifestReader implements ImmutableForecastManifestReader
{
    public function __construct(private readonly ?S3Client $client = null) {}

    /** @return array{body:string,version_id:string,sha256:string,retention_verified:bool} */
    public function readVersion(string $key, string $versionId): array
    {
        if (! (bool) config('creator_ai.forecast_evidence.enabled', false)) {
            throw new RuntimeException('External forecast evidence inspection is disabled.');
        }

        $bucket = config('creator_ai.forecast_evidence.bucket');
        $region = config('creator_ai.forecast_evidence.region');
        $owner = config('creator_ai.forecast_evidence.expected_bucket_owner');
        $prefix = config('creator_ai.forecast_evidence.prefix');
        $days = (int) config('creator_ai.forecast_evidence.minimum_remaining_retention_days', 365);
        $maxBytes = (int) config('creator_ai.forecast_evidence.max_manifest_bytes', 32768);

        if (! is_string($bucket) || preg_match('/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/D', $bucket) !== 1
            || ! is_string($owner) || preg_match('/^[0-9]{12}$/D', $owner) !== 1
            || ! is_string($region) || preg_match('/^[a-z]{2}-[a-z-]+-[0-9]$/D', $region) !== 1
            || ! is_string($prefix) || $prefix !== 'creator-ai/forecast-closed-windows/'
            || ! str_starts_with($key, $prefix)
            || strlen($key) > 240 || preg_match('#^[a-zA-Z0-9/_\.-]+$#D', $key) !== 1
            || str_contains($key, '..')
            || ! preg_match('#^[A-Za-z0-9_.~+/=-]{1,512}$#D', $versionId)
            || $days < 365 || $days > 3650
            || $maxBytes < 1024 || $maxBytes > 65536) {
            throw new RuntimeException('Immutable forecast evidence configuration or object reference is invalid.');
        }

        $s3 = $this->client ?? new S3Client([
            'version' => 'latest',
            'region' => $region,
            'use_path_style_endpoint' => false,
        ]);

        $args = [
            'Bucket' => $bucket,
            'Key' => $key,
            'VersionId' => $versionId,
            'ExpectedBucketOwner' => $owner,
        ];
        $head = $s3->headObject($args);
        $declaredSize = $head['ContentLength'] ?? null;
        $lockedMode = $head['ObjectLockMode'] ?? null;
        $storedVersion = $head['VersionId'] ?? null;
        $declaredSha = $head['Metadata']['sha256'] ?? null;

        if (! is_int($declaredSize) || $declaredSize < 1 || $declaredSize > $maxBytes
            || $lockedMode !== 'COMPLIANCE'
            || $storedVersion !== $versionId
            || ! is_string($declaredSha)
            || preg_match('/^[a-f0-9]{64}$/D', $declaredSha) !== 1) {
            throw new RuntimeException('S3 manifest version is missing size, version, SHA-256 or COMPLIANCE evidence.');
        }

        // Requires separate s3:GetObjectRetention permission; never infer
        // Object Lock from a mutable user metadata flag or from governance mode.
        $retention = $s3->getObjectRetention($args);
        $details = $retention['Retention'] ?? [];
        $until = $details['RetainUntilDate'] ?? null;
        if (($details['Mode'] ?? null) !== 'COMPLIANCE'
            || ! ($until instanceof \DateTimeInterface || is_string($until))) {
            throw new RuntimeException('S3 manifest is not protected by verifiable COMPLIANCE retention.');
        }

        $retainUntil = $until instanceof \DateTimeInterface
            ? CarbonImmutable::instance($until)
            : CarbonImmutable::parse($until, 'UTC');

        if ($retainUntil->lessThan(CarbonImmutable::now('UTC')->addDays($days))) {
            throw new RuntimeException('S3 manifest does not have sufficient remaining immutable retention.');
        }

        $object = $s3->getObject($args);
        if (($object['VersionId'] ?? null) !== $versionId) {
            throw new RuntimeException('S3 manifest version changed during the read.');
        }
        $body = (string) ($object['Body'] ?? '');
        if ($body === '' || strlen($body) !== $declaredSize
            || ! hash_equals($declaredSha, hash('sha256', $body))) {
            throw new RuntimeException('S3 manifest body disagrees with its pinned content hash.');
        }

        return [
            'body' => $body,
            'version_id' => $versionId,
            'sha256' => $declaredSha,
            'retention_verified' => true,
        ];
    }
}
