<?php

use Illuminate\Http\Client\Request;
use App\Payments\VerifyEt\VerifyEtExperimentHttp;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    Http::preventStrayRequests();
    $this->originalBasePath = app()->basePath();
    $this->experimentPath = sys_get_temp_dir() . '/linket-verify-experiment-' . Str::uuid();
    mkdir($this->experimentPath, 0700);
    file_put_contents($this->experimentPath . '/.env.verify-et-integration', implode("\n", [
        'VERIFY_ET_TELEBIRR_REFERENCE=SYNTHETIC1',
        'VERIFY_ET_TELEBIRR_SETTLEMENT_ACCOUNT=0912345678',
        'VERIFY_ET_DASHEN_REFERENCE=SYNTHETIC2',
        'VERIFY_ET_DASHEN_SETTLEMENT_ACCOUNT=0012345600789',
        'VERIFY_ET_API_KEY=fake-test-value',
    ]));
    $transport = Mockery::mock(VerifyEtExperimentHttp::class);
    $transport->shouldReceive('request')->andReturnUsing(fn (string $key) => Http::baseUrl('https://verify.et')
        ->withHeaders(['x-api-key' => $key])->acceptJson()->asJson());
    app()->instance(VerifyEtExperimentHttp::class, $transport);
    app()->setBasePath($this->experimentPath);
});

afterEach(function (): void {
    app()->setBasePath($this->originalBasePath);
    foreach (glob($this->experimentPath . '/.env.*') ?: [] as $file) {
        unlink($file);
    }
    \Illuminate\Support\Facades\File::deleteDirectory($this->experimentPath);
});

it('never sends a request in dry-run mode', function (): void {
    Http::fake();
    $this->artisan('verify-et:experiment')
        ->expectsOutput('DRY RUN: no HTTP requests will be sent.')
        ->expectsOutputToContain('"settlementAccount":"******5678"')
        ->expectsOutputToContain('"settlementAccount":"*********0789"')
        ->assertSuccessful();
    Http::assertNothingSent();
});

it('refuses live requests without confirmation or with an active account webhook', function (): void {
    Http::fake(['verify.et/api/webhook-endpoints' => Http::response(['success' => true, 'data' => [['status' => 'active']]], 200)]);
    $this->artisan('verify-et:experiment', ['--live' => true])->assertFailed();
    Http::assertNothingSent();

    $this->artisan('verify-et:experiment', ['--live' => true, '--rotated-key-confirmed' => true])->assertFailed();
    Http::assertNothingSent();

    $this->artisan('verify-et:experiment', [
        '--live' => true,
        '--rotated-key-confirmed' => true,
        '--receiving-accounts-registered' => true,
    ])->assertFailed();
    Http::assertSentCount(1);
    Http::assertNotSent(fn (Request $request): bool => $request->method() === 'POST');
});

it('accepts only an active isolated receiver with authenticated local test evidence', function (): void {
    Storage::fake('local');
    $eventId = (string) Str::uuid();
    $url = 'https://isolated.example/billing/verify-et/experiment-webhook';
    config()->set('app.url', 'https://isolated.example');
    config()->set('services.verify_et.experiment_webhook_enabled', true);
    config()->set('services.verify_et.experiment_webhook_secret', 'whsec_synthetic');
    config()->set('services.verify_et.experiment_webhook_url', $url);
    config()->set('services.verify_et.experiment_webhook_test_event_id', $eventId);
    config()->set('services.verify_et.experiment_receiver_id', str_repeat('a', 64));
    config()->set('services.verify_et.experiment_destination_confirmed', true);
    config()->set('services.verify_et.experiment_public_reachability_confirmed', true);
    $body = json_encode(['id' => $eventId, 'event' => 'webhook.test'], JSON_THROW_ON_ERROR);
    $timestamp = now()->toIso8601String();
    $this->call('POST', '/billing/verify-et/experiment-webhook', [], [], [], [
        'HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp,
        'HTTP_X_WEBHOOK_EVENT_ID' => $eventId,
        'HTTP_X_WEBHOOK_TEST' => 'true',
        'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_synthetic'),
    ], $body)->assertNoContent();
    $evidence = json_decode(Crypt::decryptString(Storage::disk('local')->get('verify-et-experiment-evidence/' . $eventId . '.json')), true, 512, JSON_THROW_ON_ERROR);
    expect($evidence['receiver_id'])->toBe(str_repeat('a', 64));
    Http::fake([
        'verify.et/api/webhook-endpoints' => Http::response(['success' => true, 'data' => [['status' => 'active', 'url' => $url]]], 200),
        'verify.et/api/verify*' => Http::response(['requestId' => 'synthetic', 'data' => [], 'verification' => ['processingStatus' => 'queued']], 202),
    ]);
    $this->artisan('verify-et:experiment', ['--live' => true, '--rotated-key-confirmed' => true, '--receiving-accounts-registered' => true])->assertSuccessful();
    expect(Http::recorded(fn (Request $request): bool => $request->method() === 'POST'))->toHaveCount(2);
});

it('submits each synthetic receipt once and persists queued request IDs', function (): void {
    Http::fake([
        'verify.et/api/webhook-endpoints' => Http::response(['success' => true, 'data' => []], 200),
        'verify.et/api/verify*' => Http::sequence()
            ->push(['requestId' => 'req-telebirr', 'data' => [], 'verification' => ['processingStatus' => 'queued']], 202)
            ->push(['requestId' => 'req-dashen', 'data' => [], 'verification' => ['processingStatus' => 'queued']], 202),
    ]);

    $arguments = ['--live' => true, '--rotated-key-confirmed' => true, '--receiving-accounts-registered' => true];
    $this->artisan('verify-et:experiment', $arguments)->assertSuccessful();
    $this->artisan('verify-et:experiment', $arguments)->assertSuccessful();

    $state = json_decode(file_get_contents($this->experimentPath . '/.env.verify-et-integration-state.json'), true, 512, JSON_THROW_ON_ERROR);
    expect($state['telebirr']['request_id'])->toBe('req-telebirr')
        ->and($state['dashen']['request_id'])->toBe('req-dashen')
        ->and($state['telebirr']['idempotency_key'])->not->toBe($state['dashen']['idempotency_key']);
    expect(Http::recorded(fn (Request $request): bool => $request->method() === 'POST'))->toHaveCount(2);
    Http::assertSent(fn (Request $request): bool => $request->method() === 'POST'
        && $request['bank'] === 'telebirr'
        && $request['transactionNumber'] === 'SYNTHETIC1'
        && $request['settlementAccount'] === '0912345678'
        && $request->hasHeader('Idempotency-Key', $state['telebirr']['idempotency_key']));
    Http::assertSent(fn (Request $request): bool => $request->method() === 'POST'
        && $request['bank'] === 'dashen'
        && $request['referenceNumber'] === 'SYNTHETIC2'
        && $request['settlementAccount'] === '0012345600789'
        && $request->hasHeader('Idempotency-Key', $state['dashen']['idempotency_key']));

    file_put_contents($this->experimentPath . '/.env.verify-et-integration-state.json', '');
    $this->artisan('verify-et:experiment', $arguments)->assertSuccessful();
    expect(Http::recorded(fn (Request $request): bool => $request->method() === 'POST'))->toHaveCount(2);
});

it('does not retry after an uncertain connection failure', function (): void {
    Http::fake([
        'verify.et/api/webhook-endpoints' => Http::response(['success' => true, 'data' => []], 200),
        'verify.et/api/verify*' => Http::failedConnection(),
    ]);

    $arguments = ['--live' => true, '--rotated-key-confirmed' => true, '--receiving-accounts-registered' => true];
    $this->artisan('verify-et:experiment', $arguments)->assertFailed();
    $this->artisan('verify-et:experiment', $arguments)->assertSuccessful();

    $state = json_decode(file_get_contents($this->experimentPath . '/.env.verify-et-integration-state.json'), true, 512, JSON_THROW_ON_ERROR);
    expect($state['telebirr']['phase'])->toBe('outcome_unknown')
        ->and($state['dashen']['phase'])->toBe('outcome_unknown');
    expect(Http::recorded(fn (Request $request): bool => $request->method() === 'POST'))->toHaveCount(2);
});

it('refuses unsuccessful or incomplete webhook endpoint listings', function (array $envelope): void {
    Http::fake(['verify.et/api/webhook-endpoints' => Http::response($envelope, 200)]);
    $this->artisan('verify-et:experiment', ['--live' => true, '--rotated-key-confirmed' => true, '--receiving-accounts-registered' => true])->assertFailed();
    Http::assertSentCount(1);
    Http::assertNotSent(fn (Request $request): bool => $request->method() === 'POST');
})->with([
    [['success' => false, 'data' => []]],
    [['success' => true, 'data' => [], 'meta' => ['nextCursor' => 'more']]],
    [['success' => true, 'data' => [], 'meta' => ['total' => 1]]],
    [['success' => true, 'data' => [], 'meta' => ['hasMore' => 'true']]],
]);

it('polls stored request IDs without resubmitting receipts', function (): void {
    Http::fake([
        'verify.et/api/verify/req-*' => Http::response(['data' => ['processingStatus' => 'running', 'status' => 'pending']], 200),
    ]);
    file_put_contents($this->experimentPath . '/.env.verify-et-integration-state.json', json_encode([
        'telebirr' => ['fingerprint' => hash('sha256', json_encode([
            'bank' => 'telebirr', 'transactionNumber' => 'SYNTHETIC1', 'settlementAccount' => '0912345678', 'amountCents' => 247000, 'currency' => 'ETB',
        ], JSON_THROW_ON_ERROR)), 'request_id' => 'req-telebirr', 'submission_http_status' => 202],
        'dashen' => ['fingerprint' => hash('sha256', json_encode([
            'bank' => 'dashen', 'referenceNumber' => 'SYNTHETIC2', 'settlementAccount' => '0012345600789', 'amountCents' => 560000, 'currency' => 'ETB',
        ], JSON_THROW_ON_ERROR)), 'request_id' => 'req-dashen', 'submission_http_status' => 202],
    ], JSON_THROW_ON_ERROR));

    $this->artisan('verify-et:experiment', ['--live' => true, '--rotated-key-confirmed' => true, '--status' => true])->assertSuccessful();
    $state = json_decode(file_get_contents($this->experimentPath . '/.env.verify-et-integration-state.json'), true, 512, JSON_THROW_ON_ERROR);
    expect($state['telebirr']['submission_http_status'])->toBe(202)->and($state['telebirr']['status_http_status'])->toBe(200);
    Http::assertSentCount(2);
    Http::assertNotSent(fn (Request $request): bool => $request->method() === 'POST');
});
