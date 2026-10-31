<?php

use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function (): void {
    Storage::fake('local');
    Queue::fake();
    config()->set('services.verify_et.experiment_webhook_enabled', true);
    config()->set('services.verify_et.experiment_webhook_secret', 'whsec_synthetic');
});

it('stores an authenticated completion only once without dispatching jobs', function (): void {
    $eventId = (string) Str::uuid();
    $body = json_encode(['event' => 'verification.completed', 'requestId' => 'synthetic'], JSON_THROW_ON_ERROR);
    $timestamp = now()->toIso8601String();
    $headers = ['HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp, 'HTTP_X_WEBHOOK_EVENT_ID' => $eventId, 'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_synthetic')];
    $this->call('POST', '/billing/verify-et/experiment-webhook', [], [], [], $headers, $body)->assertNoContent();
    $this->call('POST', '/billing/verify-et/experiment-webhook', [], [], [], $headers, $body)->assertNoContent();
    expect(array_filter(Storage::disk('local')->allFiles('verify-et-experiment-events'), fn (string $path): bool => str_ends_with($path, '.json')))->toHaveCount(1);
    Queue::assertNothingPushed();
});

it('rejects an invalid signature', function (): void {
    $this->call('POST', '/billing/verify-et/experiment-webhook', [], [], [], ['HTTP_X_WEBHOOK_TIMESTAMP' => now()->toIso8601String(), 'HTTP_X_WEBHOOK_EVENT_ID' => (string) Str::uuid(), 'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=invalid'], '{}')->assertUnauthorized();
});

it('does not modify financial or entitlement tables when a completion arrives', function (): void {
    $tables = ['storefront_orders', 'download_entitlements', 'course_enrollments', 'subscriptions', 'commission_invoices', 'commission_accruals', 'digital_product_earnings_ledger', 'payout_requests'];
    $before = [];
    foreach ($tables as $table) {
        expect(Schema::hasTable($table))->toBeTrue("Missing required table: {$table}");
        $before[$table] = DB::table($table)->orderBy('id')->get()->toJson();
    }
    $body = '{"event":"verification.completed","requestId":"synthetic"}';
    $timestamp = now()->toIso8601String();
    $this->call('POST', '/billing/verify-et/experiment-webhook', [], [], [], [
        'HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp,
        'HTTP_X_WEBHOOK_EVENT_ID' => (string) Str::uuid(),
        'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_synthetic'),
    ], $body)->assertNoContent();
    foreach ($tables as $table) {
        expect(DB::table($table)->orderBy('id')->get()->toJson())->toBe($before[$table]);
    }
    Queue::assertNothingPushed();
});

it('does not acknowledge a duplicate whose stored event is corrupt', function (): void {
    $eventId = (string) Str::uuid();
    Storage::disk('local')->put('verify-et-experiment-events/' . $eventId . '.json', 'interrupted write');
    $body = '{"event":"verification.completed"}';
    $timestamp = now()->toIso8601String();
    $this->call('POST', '/billing/verify-et/experiment-webhook', [], [], [], [
        'HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp,
        'HTTP_X_WEBHOOK_EVENT_ID' => $eventId,
        'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_synthetic'),
    ], $body)->assertStatus(500);
});

it('stores simultaneous deliveries from separate PHP processes', function (bool $sameEvent): void {
    $root = Storage::disk('local')->path('');
    $eventId = (string) Str::uuid();
    $program = <<<'PHP'
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$input = json_decode(fgets(STDIN), true, 512, JSON_THROW_ON_ERROR);
config(['app.env' => 'testing', 'services.verify_et.experiment_webhook_enabled' => true, 'services.verify_et.experiment_webhook_secret' => 'whsec_synthetic', 'filesystems.disks.local.root' => $input['root']]);
Illuminate\Support\Facades\Storage::forgetDisk('local');
$body = '{"event":"verification.completed"}';
$timestamp = now()->toIso8601String();
$request = Illuminate\Http\Request::create('/billing/verify-et/experiment-webhook', 'POST', [], [], [], ['HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp, 'HTTP_X_WEBHOOK_EVENT_ID' => $input['event'], 'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_synthetic')], $body);
fgets(STDIN);
try { exit((new App\Payments\Controllers\VerifyEtExperimentWebhookController)->handle($request)->getStatusCode() === 204 ? 0 : 1); } catch (Throwable $e) { fwrite(STDERR, get_class($e).' code='.$e->getCode()); exit(2); }
PHP;
    $processes = [];
    $events = [$eventId, $sameEvent ? $eventId : (string) Str::uuid()];
    foreach ($events as $event) {
        $process = proc_open([PHP_BINARY, '-r', $program], [['pipe', 'r'], ['pipe', 'w'], ['pipe', 'w']], $pipes, base_path());
        expect(is_resource($process))->toBeTrue();
        fwrite($pipes[0], json_encode(['root' => $root, 'event' => $event], JSON_THROW_ON_ERROR) . "\n");
        fflush($pipes[0]);
        $processes[] = [$process, $pipes];
    }
    foreach ($processes as [, $pipes]) {
        fwrite($pipes[0], "go\n");
        fclose($pipes[0]);
    }
    foreach ($processes as [$process, $pipes]) {
        $errors = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        expect(proc_close($process))->toBe(0, $errors);
    }
    foreach (array_unique($events) as $event) {
        expect(Storage::disk('local')->exists('verify-et-experiment-events/' . $event . '.json'))->toBeTrue();
    }
})->with([true, false]);

it('rejects stale events and accepts a previous secret only within the rotation window', function (): void {
    config()->set('services.verify_et.experiment_webhook_previous_secret', 'whsec_previous');
    config()->set('services.verify_et.experiment_webhook_rotated_at', now()->subHour()->toIso8601String());
    $body = '{"event":"webhook.test"}';
    $send = function (string $timestamp) use ($body) {
        return $this->call('POST', '/billing/verify-et/experiment-webhook', [], [], [], [
            'HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp,
            'HTTP_X_WEBHOOK_EVENT_ID' => (string) Str::uuid(),
            'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_previous'),
            'HTTP_X_WEBHOOK_TEST' => 'true',
        ], $body);
    };
    $send(now()->subMinutes(6)->toIso8601String())->assertUnauthorized();
    $send(now()->toIso8601String())->assertNoContent();
    config()->set('services.verify_et.experiment_webhook_rotated_at', now()->subHours(25)->toIso8601String());
    $send(now()->toIso8601String())->assertUnauthorized();
    Queue::assertNothingPushed();
});
