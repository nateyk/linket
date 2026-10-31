<?php

namespace Tests\Feature;

use App\Payments\Models\VerifyEtWebhookDelivery;
use App\Jobs\ProcessVerifyEtWebhook;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class VerifyEtWebhookTest extends TestCase
{
    use DatabaseTransactions;

    public function testSignedTestWebhookIsAcknowledgedWithoutQueuingFulfillment(): void
    {
        Queue::fake();
        config()->set('services.verify_et.webhook_secret', 'whsec_current');
        $body = json_encode(['id' => (string) Str::uuid(), 'event' => 'webhook.test', 'requestId' => 'req_webhook_test'], JSON_THROW_ON_ERROR);
        $timestamp = now()->toIso8601String();
        $response = $this->call('POST', '/billing/verify-et/webhook', [], [], [], [
            'HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp,
            'HTTP_X_WEBHOOK_EVENT_ID' => (string) Str::uuid(),
            'HTTP_X_WEBHOOK_TEST' => 'true',
            'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_current'),
        ], $body);

        $response->assertNoContent();
        if (app()->bound('clockwork')) {
            $request = new \Clockwork\Request\IncomingRequest([
                'method' => 'POST', 'uri' => '/billing/verify-et/webhook', 'host' => 'localhost', 'headers' => [],
            ]);
            $this->assertFalse(app('clockwork')->shouldCollect()->filter($request));
        }
        $this->assertSame(1, VerifyEtWebhookDelivery::query()->where('status', 'test')->count());
        Queue::assertNothingPushed();
    }

    public function testInvalidWebhookSignatureIsRejected(): void
    {
        config()->set('services.verify_et.webhook_secret', 'whsec_current');
        $response = $this->post('/billing/verify-et/webhook', ['event' => 'verification.completed'], [
            'X-Webhook-Timestamp' => now()->toIso8601String(),
            'X-Webhook-Event-Id' => (string) Str::uuid(),
            'X-Webhook-Signature' => 'sha256=invalid',
        ]);

        $response->assertUnauthorized();
    }

    public function testStaleSignedWebhookIsRejected(): void
    {
        Queue::fake();
        config()->set('services.verify_et.webhook_secret', 'whsec_current');
        $body = json_encode(['event' => 'verification.completed', 'requestId' => 'req_stale'], JSON_THROW_ON_ERROR);
        $timestamp = now()->subMinutes(10)->toIso8601String();
        $this->call('POST', '/billing/verify-et/webhook', [], [], [], [
            'HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp,
            'HTTP_X_WEBHOOK_EVENT_ID' => (string) Str::uuid(),
            'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_current'),
        ], $body)->assertUnauthorized();

        Queue::assertNothingPushed();
    }

    public function testPreviousWebhookSecretWorksOnlyDuringItsConfiguredRotationWindow(): void
    {
        config()->set('services.verify_et.webhook_secret', 'whsec_current');
        config()->set('services.verify_et.webhook_previous_secret', 'whsec_previous');
        config()->set('services.verify_et.webhook_previous_secret_rotated_at', now()->subHour()->toIso8601String());
        config()->set('services.verify_et.webhook_previous_secret_expires_at', now()->addHours(2)->toIso8601String());
        $this->postSigned(['event' => 'webhook.test'], 'whsec_previous')->assertNoContent();

        config()->set('services.verify_et.webhook_previous_secret_expires_at', now()->subSecond()->toIso8601String());
        $this->postSigned(['event' => 'webhook.test'], 'whsec_previous')->assertUnauthorized();
    }

    public function testRepeatedEventIdsAreQueuedOnlyOnce(): void
    {
        Queue::fake();
        config()->set('services.verify_et.webhook_secret', 'whsec_current');
        $payload = ['event' => 'verification.completed', 'requestId' => 'req_duplicate', 'data' => ['processingStatus' => 'completed']];
        $eventId = (string) Str::uuid();

        $this->postSigned($payload, 'whsec_current', $eventId)->assertNoContent();
        $this->postSigned($payload, 'whsec_current', $eventId)->assertNoContent();

        Queue::assertPushed(ProcessVerifyEtWebhook::class, 1);
        $this->assertSame(1, VerifyEtWebhookDelivery::query()->where('event_id', $eventId)->count());
    }

    public function testLegacyWebhookEvidenceMigrationEncryptsExistingPayloads(): void
    {
        $delivery = VerifyEtWebhookDelivery::query()->create([
            'event_id' => (string) Str::uuid(), 'status' => 'received', 'is_test' => false,
            'received_at' => now(), 'payload' => ['data' => ['settlementAccountMatch' => ['matchedSettlementAccount' => '1000123456789']]],
        ]);
        $migration = require database_path('migrations/2026_10_28_050549_encrypt_existing_verify_et_webhook_payloads.php');
        $migration->up();

        $raw = DB::table('verify_et_webhook_deliveries')->where('id', $delivery->id)->value('payload');
        $this->assertStringNotContainsString('1000123456789', $raw);
        $encrypted = json_decode($raw, true, 512, JSON_THROW_ON_ERROR)['encrypted'];
        $payload = json_decode(Crypt::decryptString($encrypted), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('1000123456789', $payload['data']['settlementAccountMatch']['matchedSettlementAccount']);
    }

    private function postSigned(array $payload, string $secret, ?string $eventId = null): \Illuminate\Testing\TestResponse
    {
        $body = json_encode($payload, JSON_THROW_ON_ERROR);
        $timestamp = now()->toIso8601String();

        return $this->call('POST', '/billing/verify-et/webhook', [], [], [], [
            'HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp,
            'HTTP_X_WEBHOOK_EVENT_ID' => $eventId ?? (string) Str::uuid(),
            'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, $secret),
        ], $body);
    }
}
