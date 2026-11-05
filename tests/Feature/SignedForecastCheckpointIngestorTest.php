<?php

use App\CreatorAi\Forecasting\SignedForecastCheckpointIngestor;
use App\Models\User;
use Carbon\CarbonImmutable;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

/** @return array{0:int,1:SignedForecastCheckpointIngestor} */
function signedCheckpointFixture(): array
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($user);
    $workspaceId = (int) $workspace->id;

    config()->set('creator_ai.forecast_ingestion.enabled', true);
    config()->set('creator_ai.forecast_ingestion.signers', [
        'checkout_event_stream' => [
            'v1' => [
                'key' => 'base64:'.base64_encode(str_repeat('a', 32)),
                'workspace_ids' => [$workspaceId],
            ],
        ],
        'verify_et_reconciliation' => [
            'v1' => [
                'key' => 'base64:'.base64_encode(str_repeat('b', 32)),
                'workspace_ids' => [$workspaceId],
            ],
        ],
    ]);

    return [$workspaceId, app(SignedForecastCheckpointIngestor::class)];
}

/** @return array<string,mixed> */
function signedForecastCheckpoint(
    int $workspaceId,
    string $source = 'checkout_event_stream',
    int $sequence = 1,
    array $overrides = [],
): array {
    $day = $overrides['observed_on'] ?? '2026-10-12';
    $watermark = CarbonImmutable::parse($day, 'UTC')->addDays(3)->startOfDay();

    $event = [
        'source_kind' => $source,
        'workspace_id' => $workspaceId,
        'source_event_id' => 'synthetic-checkpoint-'.$source.'-'.$sequence,
        'sequence' => $sequence,
        'previous_digest' => str_repeat('0', 64),
        'observed_on' => $day,
        'verified_sales_count' => 1,
        'verified_gross_cents' => 10000,
        'revision' => 1,
        'supersedes_digest' => null,
        'backfill_reason' => null,
        'watermark_at' => $watermark->format('Y-m-d\TH:i:s\Z'),
        'signed_at' => CarbonImmutable::now('UTC')->format('Y-m-d\TH:i:s\Z'),
        'key_id' => 'v1',
        ...$overrides,
    ];

    $registration = config('creator_ai.forecast_ingestion.signers.'.$source.'.'.$event['key_id']);
    $secret = base64_decode(substr($registration['key'], 7), true);
    $event['signature'] = hash_hmac(
        'sha256',
        SignedForecastCheckpointIngestor::canonicalPayload($event),
        $secret
    );

    return $event;
}

function signedForecastDigest(array $envelope): string
{
    return hash('sha256', SignedForecastCheckpointIngestor::canonicalPayload($envelope)."\n".$envelope['signature']);
}

test('signed ingestion records an append-only event and a private projection and is idempotent on exact replay', function () {
    [$workspace, $ingestor] = signedCheckpointFixture();
    $envelope = signedForecastCheckpoint($workspace);

    expect($ingestor->ingest($envelope))->toBe(['status' => 'recorded', 'sequence' => 1])
        ->and($ingestor->ingest($envelope))->toBe(['status' => 'duplicate', 'sequence' => 1]);

    expect(DB::table('creator_ai_forecast_checkpoint_events')->where('workspace_id', $workspace)->count())->toBe(1)
        ->and(DB::table('creator_ai_forecast_checkpoint_streams')->where('workspace_id', $workspace)->value('last_sequence'))->toBe(1)
        ->and(DB::table('creator_ai_forecast_coverage_checkpoints')->where('workspace_id', $workspace)->value('verified_gross_cents'))->toBe(10000)
        ->and(DB::table('creator_ai_forecast_coverage_checkpoints')->where('workspace_id', $workspace)->value('source_cursor_sha256'))->toBe(signedForecastDigest($envelope));
});

test('ingestion rejects unsigned, forged, unexpected-field and cross-source envelopes without adding records', function () {
    [$workspace, $ingestor] = signedCheckpointFixture();
    $valid = signedForecastCheckpoint($workspace);

    $forged = $valid;
    $forged['verified_gross_cents'] = 900000;
    expect(fn () => $ingestor->ingest($forged))->toThrow(RuntimeException::class);

    $withBuyer = $valid;
    $withBuyer['buyer_email'] = 'sensitive@example.test';
    expect(fn () => $ingestor->ingest($withBuyer))->toThrow(InvalidArgumentException::class);

    $crossSource = $valid;
    $crossSource['source_kind'] = 'verify_et_reconciliation';
    expect(fn () => $ingestor->ingest($crossSource))->toThrow(RuntimeException::class);

    $unsigned = $valid;
    unset($unsigned['signature']);
    expect(fn () => $ingestor->ingest($unsigned))->toThrow(InvalidArgumentException::class);

    expect(DB::table('creator_ai_forecast_checkpoint_events')->count())->toBe(0);
});

test('ingestion requires separately provisioned scoped source keys and a default-off gate', function () {
    [$workspace, $ingestor] = signedCheckpointFixture();
    $valid = signedForecastCheckpoint($workspace);

    config()->set('creator_ai.forecast_ingestion.enabled', false);
    expect(fn () => $ingestor->ingest($valid))->toThrow(RuntimeException::class);

    config()->set('creator_ai.forecast_ingestion.enabled', true);
    config()->set('creator_ai.forecast_ingestion.signers.checkout_event_stream.v1.workspace_ids', []);
    expect(fn () => $ingestor->ingest($valid))->toThrow(RuntimeException::class);

    config()->set('creator_ai.forecast_ingestion.signers.checkout_event_stream.v1.workspace_ids', [$workspace]);
    config()->set('creator_ai.forecast_ingestion.signers.verify_et_reconciliation.v1.key',
        'base64:'.base64_encode(str_repeat('a', 32)));
    expect(fn () => $ingestor->ingest($valid))->toThrow(RuntimeException::class);

    expect(DB::table('creator_ai_forecast_checkpoint_events')->count())->toBe(0);
});

test('gap detection rejects an interrupted stream and accepts ordered retry after the missing event arrives', function () {
    [$workspace, $ingestor] = signedCheckpointFixture();
    $first = signedForecastCheckpoint($workspace);
    $ingestor->ingest($first);
    $firstDigest = signedForecastDigest($first);

    $second = signedForecastCheckpoint($workspace, sequence: 2, overrides: [
        'previous_digest' => $firstDigest,
        'observed_on' => '2026-10-13',
    ]);
    $third = signedForecastCheckpoint($workspace, sequence: 3, overrides: [
        'previous_digest' => signedForecastDigest($second),
        'observed_on' => '2026-10-14',
    ]);

    expect(fn () => $ingestor->ingest($third))->toThrow(RuntimeException::class);
    expect(DB::table('creator_ai_forecast_checkpoint_streams')->where('workspace_id', $workspace)->value('last_sequence'))->toBe(1);

    expect($ingestor->ingest($second))->toBe(['status' => 'recorded', 'sequence' => 2]);
    expect($ingestor->ingest($third))->toBe(['status' => 'recorded', 'sequence' => 3]);

    expect(DB::table('creator_ai_forecast_checkpoint_events')->where('workspace_id', $workspace)->count())->toBe(3)
        ->and(DB::table('creator_ai_forecast_checkpoint_streams')->where('workspace_id', $workspace)->value('last_sequence'))->toBe(3);
});

test('conflicting replay and incorrect previous chain digest are rejected without changing cursor', function () {
    [$workspace, $ingestor] = signedCheckpointFixture();
    $original = signedForecastCheckpoint($workspace);
    $ingestor->ingest($original);

    $conflict = signedForecastCheckpoint($workspace, overrides: ['verified_gross_cents' => 17000]);
    expect(fn () => $ingestor->ingest($conflict))->toThrow(RuntimeException::class);

    $broken = signedForecastCheckpoint($workspace, sequence: 2, overrides: [
        'observed_on' => '2026-10-13',
        'previous_digest' => str_repeat('1', 64),
    ]);
    expect(fn () => $ingestor->ingest($broken))->toThrow(RuntimeException::class);
    expect(DB::table('creator_ai_forecast_checkpoint_events')->where('workspace_id', $workspace)->count())->toBe(1);
});

test('historical backfill needs a signed reason but may append an older day after a later day', function () {
    [$workspace, $ingestor] = signedCheckpointFixture();
    $first = signedForecastCheckpoint($workspace, overrides: ['observed_on' => '2026-10-20']);
    $ingestor->ingest($first);

    $older = signedForecastCheckpoint($workspace, sequence: 2, overrides: [
        'observed_on' => '2026-10-12',
        'previous_digest' => signedForecastDigest($first),
    ]);
    expect(fn () => $ingestor->ingest($older))->toThrow(RuntimeException::class);

    $older = signedForecastCheckpoint($workspace, sequence: 2, overrides: [
        'observed_on' => '2026-10-12',
        'previous_digest' => signedForecastDigest($first),
        'backfill_reason' => 'outage_recovery',
    ]);
    expect($ingestor->ingest($older))->toBe(['status' => 'recorded', 'sequence' => 2]);

    expect(DB::table('creator_ai_forecast_checkpoint_streams')->where('workspace_id', $workspace)->value('last_observed_on'))->toBe('2026-10-20')
        ->and(DB::table('creator_ai_forecast_checkpoint_events')->where('workspace_id', $workspace)->whereNotNull('backfill_reason')->count())->toBe(1);
});

test('signed late correction appends evidence while updating only the latest materialized projection', function () {
    [$workspace, $ingestor] = signedCheckpointFixture();
    $original = signedForecastCheckpoint($workspace);
    $ingestor->ingest($original);
    $digest = signedForecastDigest($original);

    $incorrect = signedForecastCheckpoint($workspace, sequence: 2, overrides: [
        'previous_digest' => $digest,
        'revision' => 2,
        'supersedes_digest' => str_repeat('f', 64),
        'verified_gross_cents' => 17000,
        'backfill_reason' => 'late_verification',
    ]);
    expect(fn () => $ingestor->ingest($incorrect))->toThrow(RuntimeException::class);

    $correction = signedForecastCheckpoint($workspace, sequence: 2, overrides: [
        'previous_digest' => $digest,
        'revision' => 2,
        'supersedes_digest' => $digest,
        'verified_gross_cents' => 17000,
        'backfill_reason' => 'late_verification',
    ]);
    expect($ingestor->ingest($correction))->toBe(['status' => 'recorded', 'sequence' => 2]);

    $ledger = DB::table('creator_ai_forecast_checkpoint_events')
        ->where('workspace_id', $workspace)->orderBy('sequence')->get();
    expect($ledger)->toHaveCount(2)
        ->and((int) $ledger[0]->verified_gross_cents)->toBe(10000)
        ->and((int) $ledger[1]->verified_gross_cents)->toBe(17000)
        ->and((string) $ledger[1]->supersedes_digest)->toBe($digest);

    expect(DB::table('creator_ai_forecast_coverage_checkpoints')->where('workspace_id', $workspace)->value('verified_gross_cents'))->toBe(17000)
        ->and($ingestor->ingest($original))->toBe(['status' => 'duplicate', 'sequence' => 1]);
});

test('invalid observed days, early watermarks and future signing times are rejected', function () {
    [$workspace, $ingestor] = signedCheckpointFixture();

    $invalidDay = signedForecastCheckpoint($workspace, overrides: ['observed_on' => '2026-02-30']);
    expect(fn () => $ingestor->ingest($invalidDay))->toThrow(InvalidArgumentException::class);

    $early = signedForecastCheckpoint($workspace, overrides: ['watermark_at' => '2026-10-13T00:00:00Z']);
    expect(fn () => $ingestor->ingest($early))->toThrow(InvalidArgumentException::class);

    $future = signedForecastCheckpoint($workspace, overrides: [
        'signed_at' => CarbonImmutable::now('UTC')->addHours(2)->format('Y-m-d\TH:i:s\Z'),
    ]);
    expect(fn () => $ingestor->ingest($future))->toThrow(InvalidArgumentException::class);

    expect(DB::table('creator_ai_forecast_checkpoint_events')->where('workspace_id', $workspace)->count())->toBe(0);
});

test('both authenticated source streams remain independent and never attest publisher coverage', function () {
    [$workspace, $ingestor] = signedCheckpointFixture();
    $checkout = signedForecastCheckpoint($workspace);
    $reconciler = signedForecastCheckpoint($workspace, 'verify_et_reconciliation');

    expect($ingestor->ingest($checkout)['status'])->toBe('recorded')
        ->and($ingestor->ingest($reconciler)['status'])->toBe('recorded');

    $summaries = DB::table('creator_ai_forecast_coverage_checkpoints')
        ->where('workspace_id', $workspace)->get(['source_kind', 'source_cursor_sha256']);
    expect($summaries)->toHaveCount(2)
        ->and($summaries[0]->source_cursor_sha256)->not->toBe($summaries[1]->source_cursor_sha256);

    // These signatures are from test-only shared secrets. Neither proves
    // completeness or upstream Verify.et's actual event-delivery history.
    expect((bool) config('creator_ai.features.forecast', false))->toBeFalse();
});

test('a failed projection update rolls back an appended event and cursor in one transaction', function () {
    [$workspace, $ingestor] = signedCheckpointFixture();
    $first = signedForecastCheckpoint($workspace);
    $ingestor->ingest($first);
    $firstDigest = signedForecastDigest($first);

    // Deliberate synthetic corruption simulates a missing materialization.
    DB::table('creator_ai_forecast_coverage_checkpoints')
        ->where('workspace_id', $workspace)->delete();

    $revision = signedForecastCheckpoint($workspace, sequence: 2, overrides: [
        'previous_digest' => $firstDigest,
        'revision' => 2,
        'supersedes_digest' => $firstDigest,
        'verified_gross_cents' => 12000,
        'backfill_reason' => 'late_verification',
    ]);
    expect(fn () => $ingestor->ingest($revision))->toThrow(RuntimeException::class);

    expect(DB::table('creator_ai_forecast_checkpoint_events')->where('workspace_id', $workspace)->count())->toBe(1)
        ->and(DB::table('creator_ai_forecast_checkpoint_streams')->where('workspace_id', $workspace)->value('last_sequence'))->toBe(1);
});
