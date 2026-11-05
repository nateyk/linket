<?php

use App\CreatorAi\Forecasting\S3ComplianceForecastManifestReader;
use Aws\Result;
use Aws\S3\S3Client;
use Carbon\CarbonImmutable;
use Mockery as M;

function immutableReaderConfig(): void
{
    config()->set('creator_ai.forecast_evidence', [
        'enabled' => true,
        'region' => 'us-east-1',
        'bucket' => 'linket-forecast-evidence-tests',
        'expected_bucket_owner' => '123456789012',
        'prefix' => 'creator-ai/forecast-closed-windows/',
        'minimum_remaining_retention_days' => 365,
        'max_manifest_bytes' => 32768,
    ]);
}

test('external immutable evidence reader fails closed before any network access when disabled', function () {
    config()->set('creator_ai.forecast_evidence.enabled', false);
    $reader = new S3ComplianceForecastManifestReader();
    expect(fn () => $reader->readVersion('creator-ai/forecast-closed-windows/x.json', 'v123'))
        ->toThrow(RuntimeException::class);
});

test('reader accepts a pinned COMPLIANCE version and verifies its retention and exact content hash', function () {
    immutableReaderConfig();
    $body = '{"schema_version":1}';
    $sha = hash('sha256', $body);
    $s3 = M::mock(S3Client::class);
    $s3->shouldReceive('headObject')->once()->andReturn(new Result([
        'ContentLength' => strlen($body),
        'VersionId' => 'v123',
        'ObjectLockMode' => 'COMPLIANCE',
        'Metadata' => ['sha256' => $sha],
    ]));
    $s3->shouldReceive('getObjectRetention')->once()->andReturn(new Result([
        'Retention' => [
            'Mode' => 'COMPLIANCE',
            'RetainUntilDate' => CarbonImmutable::now('UTC')->addDays(400),
        ],
    ]));
    $s3->shouldReceive('getObject')->once()->andReturn(new Result([
        'VersionId' => 'v123',
        'Body' => $body,
    ]));

    $reader = new S3ComplianceForecastManifestReader($s3);
    expect($reader->readVersion('creator-ai/forecast-closed-windows/12/checkout_event_stream/20261001-20261030.json', 'v123'))
        ->toBe([
            'body' => $body,
            'version_id' => 'v123',
            'sha256' => $sha,
            'retention_verified' => true,
        ]);
});

test('reader rejects governance retention even with correct metadata', function () {
    immutableReaderConfig();
    $s3 = M::mock(S3Client::class);
    $s3->shouldReceive('headObject')->once()->andReturn(new Result([
        'ContentLength' => 10,
        'VersionId' => 'v123',
        'ObjectLockMode' => 'GOVERNANCE',
        'Metadata' => ['sha256' => str_repeat('a', 64)],
    ]));
    $reader = new S3ComplianceForecastManifestReader($s3);
    expect(fn () => $reader->readVersion('creator-ai/forecast-closed-windows/12/source/a.json', 'v123'))
        ->toThrow(RuntimeException::class);
});

test('reader rejects insufficient immutable retention before downloading the object', function () {
    immutableReaderConfig();
    $s3 = M::mock(S3Client::class);
    $s3->shouldReceive('headObject')->once()->andReturn(new Result([
        'ContentLength' => 10,
        'VersionId' => 'v123',
        'ObjectLockMode' => 'COMPLIANCE',
        'Metadata' => ['sha256' => str_repeat('a', 64)],
    ]));
    $s3->shouldReceive('getObjectRetention')->once()->andReturn(new Result([
        'Retention' => [
            'Mode' => 'COMPLIANCE',
            'RetainUntilDate' => CarbonImmutable::now('UTC')->addDays(30),
        ],
    ]));
    $reader = new S3ComplianceForecastManifestReader($s3);
    expect(fn () => $reader->readVersion('creator-ai/forecast-closed-windows/12/source/a.json', 'v123'))
        ->toThrow(RuntimeException::class);
});

test('reader rejects arbitrary endpoints, bucket owners and object path traversal without network calls', function () {
    immutableReaderConfig();
    $reader = new S3ComplianceForecastManifestReader();
    expect(fn () => $reader->readVersion('https://example.test/manifest', 'v123'))
        ->toThrow(RuntimeException::class);
    expect(fn () => $reader->readVersion('creator-ai/forecast-closed-windows/../../private', 'v123'))
        ->toThrow(RuntimeException::class);
    config()->set('creator_ai.forecast_evidence.expected_bucket_owner', null);
    expect(fn () => $reader->readVersion('creator-ai/forecast-closed-windows/12/source/a.json', 'v123'))
        ->toThrow(RuntimeException::class);
});
