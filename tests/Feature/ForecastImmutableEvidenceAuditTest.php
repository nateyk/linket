<?php

use App\CreatorAi\Forecasting\ForecastImmutableCoverageAudit;
use App\CreatorAi\Forecasting\ForecastSourceManifestVerifier;
use App\CreatorAi\Forecasting\ImmutableForecastManifestReader;
use App\CreatorAi\Forecasting\SignedForecastCheckpointIngestor;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use Carbon\CarbonImmutable;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

function forecastExternalAuditFixture(): array
{
    $creator = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $workspace->forceFill(['created_at' => CarbonImmutable::parse('2026-09-01', 'UTC')])->save();

    $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $plan->id)->where('currency', 'ETB')->firstOrFail();
    Subscription::query()->create([
        'user_id' => $creator->id,
        'product_id' => $plan->id,
        'price_id' => $price->id,
        'gateway_name' => 'verify_et',
        'gateway_status' => 'active',
        'renews_at' => now()->addMonth(),
    ]);
    $payment = ProSubscriptionPayment::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $creator->id,
        'product_id' => $plan->id,
        'price_id' => $price->id,
        'amount_cents' => 50000,
        'status' => 'paid',
        'paid_at' => now()->subDay(),
        'subscription_period_start' => now()->subDay(),
        'subscription_period_end' => now()->addMonth(),
    ]);
    DirectPaymentVerification::query()->create([
        'reference' => 'AUDIT-'.Str::upper(Str::random(16)),
        'payable_type' => ProSubscriptionPayment::class,
        'payable_id' => $payment->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 50000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now()->subDay(),
    ]);

    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    config()->set('creator_ai.forecast_ingestion.enabled', true);
    config()->set('creator_ai.forecast_evidence.enabled', true);

    return [$creator, (int) $workspace->id];
}

/** @return array{0:array<string,string>,1:array<string,mixed>} */
function forecastExternalSignedWindow(int $workspaceId, string $source, string $seed, string $hmac): array
{
    $keys = sodium_crypto_sign_seed_keypair(str_repeat($seed, 32));
    $private = sodium_crypto_sign_secretkey($keys);
    $public = 'base64:'.base64_encode(sodium_crypto_sign_publickey($keys));

    $daily = [
        ['date' => '2026-10-10', 'verified_sales_count' => 0, 'verified_revenue_cents' => 0],
        ['date' => '2026-10-11', 'verified_sales_count' => 0, 'verified_revenue_cents' => 0],
    ];
    $events = [];
    $previous = str_repeat('0', 64);

    foreach ($daily as $i => $day) {
        $event = [
            'source_kind' => $source,
            'workspace_id' => $workspaceId,
            'source_event_id' => $source.'-synthetic-'.($i + 1),
            'sequence' => $i + 1,
            'previous_digest' => $previous,
            'observed_on' => $day['date'],
            'verified_sales_count' => 0,
            'verified_gross_cents' => 0,
            'revision' => 1,
            'supersedes_digest' => null,
            'backfill_reason' => null,
            'watermark_at' => '2026-10-15T00:00:00Z',
            'signed_at' => '2026-10-16T00:00:00Z',
            'key_id' => 'v1',
            'proof_key_id' => 'v1',
        ];
        $event['proof_signature'] = base64_encode(sodium_crypto_sign_detached(
            SignedForecastCheckpointIngestor::provenancePayload($event), $private
        ));
        $event['signature'] = hash_hmac(
            'sha256', SignedForecastCheckpointIngestor::canonicalPayload($event), str_repeat($hmac, 32)
        );

        $previous = hash(
            'sha256', SignedForecastCheckpointIngestor::canonicalPayload($event)."\n".$event['signature']
        );
        $events[] = $event;
    }

    $manifest = [
        'schema_version' => 1,
        'source_kind' => $source,
        'workspace_id' => $workspaceId,
        'window_start' => '2026-10-10',
        'window_end' => '2026-10-11',
        'first_sequence' => 1,
        'last_sequence' => 2,
        'first_previous_digest' => str_repeat('0', 64),
        'last_event_digest' => $previous,
        'source_event_count' => 2,
        'day_summary_sha256' => ForecastSourceManifestVerifier::dailyDigest($daily),
        'issued_at' => '2026-10-17T00:00:00Z',
        'key_id' => 'v1',
    ];
    $manifest['signature'] = base64_encode(sodium_crypto_sign_detached(
        ForecastSourceManifestVerifier::canonicalPayload($manifest), $private
    ));

    return [
        ['public' => $public, 'hmac' => 'base64:'.base64_encode(str_repeat($hmac, 32))],
        ['events' => $events, 'manifest' => $manifest],
    ];
}

function forecastExternalPopulate(int $workspaceId): array
{
    $sources = [
        'checkout_event_stream' => ['seed' => 'c', 'hmac' => 'a'],
        'verify_et_reconciliation' => ['seed' => 'd', 'hmac' => 'b'],
    ];
    $signers = [];
    $publicKeys = [];
    $manifests = [];

    foreach ($sources as $source => $setting) {
        [$keys, $data] = forecastExternalSignedWindow(
            $workspaceId, $source, $setting['seed'], $setting['hmac']
        );
        $signers[$source]['v1'] = [
            'key' => $keys['hmac'],
            'workspace_ids' => [$workspaceId],
        ];
        $publicKeys[$source]['v1'] = $keys['public'];
        $manifests[$source] = $data;
    }

    config()->set('creator_ai.forecast_ingestion.signers', $signers);
    config()->set('creator_ai.forecast_ingestion.public_keys', $publicKeys);
    $ingestor = app(SignedForecastCheckpointIngestor::class);
    foreach ($manifests as $entry) {
        foreach ($entry['events'] as $event) {
            expect($ingestor->ingest($event)['status'])->toBe('recorded');
        }
    }

    return $manifests;
}

function forecastExternalObjectReader(int $workspaceId, array $manifests): ImmutableForecastManifestReader
{
    return new class($workspaceId, $manifests) implements ImmutableForecastManifestReader {
        public function __construct(private readonly int $workspace, private readonly array $sources) {}

        public function readVersion(string $key, string $versionId): array
        {
            $matched = null;
            foreach (array_keys($this->sources) as $source) {
                $expected = 'creator-ai/forecast-closed-windows/'.$this->workspace.'/'.$source.'/20261010-20261011.json';
                if ($key === $expected && $versionId === 'version-'.$source) {
                    $matched = $source;
                    break;
                }
            }
            if ($matched === null) {
                throw new RuntimeException('Unknown synthetic immutable source version.');
            }
            $body = json_encode($this->sources[$matched]['manifest'], JSON_THROW_ON_ERROR);
            return [
                'body' => $body,
                'version_id' => $versionId,
                'sha256' => hash('sha256', $body),
                'retention_verified' => true,
            ];
        }
    };
}

test('two immutable, signed, tenant-scoped external manifests still cannot publish an earning estimate', function () {
    [$creator, $workspace] = forecastExternalAuditFixture();
    $manifests = forecastExternalPopulate($workspace);
    app()->instance(ImmutableForecastManifestReader::class, forecastExternalObjectReader($workspace, $manifests));

    $result = app(ForecastImmutableCoverageAudit::class)->inspect(
        $creator, $workspace,
        CarbonImmutable::parse('2026-10-10', 'UTC'),
        CarbonImmutable::parse('2026-10-11', 'UTC'),
        [
            'checkout_event_stream' => 'version-checkout_event_stream',
            'verify_et_reconciliation' => 'version-verify_et_reconciliation',
        ]
    );
    expect($result['immutable_object_lock_versions_verified'])->toBe(2)
        ->and($result['signed_source_windows_verified'])->toBe(2)
        ->and($result['signed_days_reconciled'])->toBe(2)
        ->and($result['independent_observation_coverage_verified'])->toBeFalse()
        ->and($result['forecast_publication_allowed'])->toBeFalse()
        ->and($result['reason'])->toBe('upstream_event_completeness_not_attested');
    expect(array_key_exists('estimated_total_gross_cents', $result))->toBeFalse();
});

test('a modified database amount invalidates externally signed evidence regardless of local cursor edits', function () {
    [$creator, $workspace] = forecastExternalAuditFixture();
    $manifests = forecastExternalPopulate($workspace);
    app()->instance(ImmutableForecastManifestReader::class, forecastExternalObjectReader($workspace, $manifests));

    DB::table('creator_ai_forecast_checkpoint_events')
        ->where('workspace_id', $workspace)
        ->where('source_kind', 'checkout_event_stream')
        ->where('sequence', 2)
        ->update(['verified_gross_cents' => 999999]);

    expect(fn () => app(ForecastImmutableCoverageAudit::class)->inspect(
        $creator, $workspace,
        CarbonImmutable::parse('2026-10-10', 'UTC'),
        CarbonImmutable::parse('2026-10-11', 'UTC'),
        [
            'checkout_event_stream' => 'version-checkout_event_stream',
            'verify_et_reconciliation' => 'version-verify_et_reconciliation',
        ]
    ))->toThrow(RuntimeException::class);
});

test('foreign workspace and revoked forecast capability cannot inspect external evidence', function () {
    [$creator, $workspace] = forecastExternalAuditFixture();
    [$other, $foreignWorkspace] = forecastExternalAuditFixture();
    $reader = new class implements ImmutableForecastManifestReader {
        public int $readCount = 0;

        public function readVersion(string $key, string $versionId): array
        {
            $this->readCount++;
            throw new RuntimeException('Unexpected external read');
        }
    };
    app()->instance(ImmutableForecastManifestReader::class, $reader);
    $from = CarbonImmutable::parse('2026-10-10', 'UTC');
    $to = CarbonImmutable::parse('2026-10-11', 'UTC');
    $versions = [
        'checkout_event_stream' => 'synthetic-v1',
        'verify_et_reconciliation' => 'synthetic-v2',
    ];

    try {
        app(ForecastImmutableCoverageAudit::class)->inspect($creator, $foreignWorkspace, $from, $to, $versions);
        $this->fail('Foreign workspace accessed immutable evidence.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }

    config()->set('creator_ai.features.forecast', false);
    try {
        app(ForecastImmutableCoverageAudit::class)->inspect($creator, $workspace, $from, $to, $versions);
        $this->fail('Revoked forecast permission was ignored.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }

    expect($reader->readCount)->toBe(0);
});
