<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\VerifyEt\VerifyEtSettings;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VerifyEtAdminSettingsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('app.installed', true);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        foreach (['admin.access', 'settings.update'] as $permission) {
            $user->permissions()->attach(Permission::query()->firstOrCreate(['name' => $permission]));
        }
        return $user;
    }

    private function sessionHeaders(): static
    {
        return $this->withSession(['_token' => 'verify-settings'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'verify-settings');
    }

    public function test_only_admins_can_read_or_change_provider_settings(): void
    {
        $this->sessionHeaders()->actingAs(User::factory()->create(), 'sanctum');
        $this->getJson('/api/v1/admin/storefront/verify-et-settings')->assertForbidden();
        $this->patchJson('/api/v1/admin/storefront/verify-et-settings', ['enabled' => true])->assertForbidden();
    }

    public function test_secrets_are_encrypted_write_only_and_used_by_runtime(): void
    {
        Http::preventStrayRequests();
        $this->sessionHeaders()->actingAs($this->admin(), 'sanctum');
        $this->patchJson('/api/v1/admin/storefront/verify-et-settings', [
            'enabled' => true, 'api_key' => 'synthetic-api-key',
            'webhook_secret' => 'whsec_synthetic-webhook-secret', 'alert_email' => 'payments@example.test',
        ])->assertOk()->assertJsonPath('data.enabled', true)->assertJsonPath('data.api_key_configured', true)
            ->assertJsonMissingPath('data.api_key')->assertJsonMissingPath('data.webhook_secret');
        $raw = DB::table('settings')->where('name', 'billing.verify_et')->value('value');
        $this->assertStringNotContainsString('synthetic-api-key', $raw);
        $this->assertSame('synthetic-api-key', VerifyEtSettings::get('api_key'));
        $this->assertArrayNotHasKey('billing.verify_et', settings()->all());
        $this->assertArrayNotHasKey('billing.verify_et', settings()->getAllForFrontendForm());
        $this->getJson('/api/v1/admin/storefront/verify-et-settings')->assertOk()
            ->assertJsonPath('data.webhook_url', url('billing/verify-et/webhook'))
            ->assertJsonMissingPath('data.api_key')->assertJsonMissingPath('data.webhook_secret');
        $this->patchJson('/api/v1/admin/storefront/verify-et-settings', ['enabled' => false, 'api_key' => '', 'webhook_secret' => ''])
            ->assertOk()->assertJsonPath('data.enabled', false);
        settings()->loadSettings();
        $this->assertFalse(VerifyEtSettings::get('enabled'));
        $this->assertSame('verification_unavailable', app(\App\Storefront\Services\CheckoutAvailability::class)->creatorBlocker($this->admin()));
        $this->assertSame('synthetic-api-key', VerifyEtSettings::get('api_key'));
        Http::assertNothingSent();
    }

    public function test_enabling_requires_credentials_and_does_not_accept_transport_overrides(): void
    {
        config()->set('services.verify_et.api_key', null);
        config()->set('services.verify_et.webhook_secret', null);
        $this->sessionHeaders()->actingAs($this->admin(), 'sanctum');
        $this->patchJson('/api/v1/admin/storefront/verify-et-settings', ['enabled' => true])
            ->assertUnprocessable()->assertJsonValidationErrors(['api_key', 'webhook_secret']);
        $this->patchJson('/api/v1/admin/storefront/verify-et-settings', ['base_url' => 'http://localhost', 'mock' => true])
            ->assertUnprocessable();
    }

    public function test_effective_credentials_are_used_by_the_provider_client(): void
    {
        Http::preventStrayRequests();
        Http::fake(['https://verify.et/api/verify/synthetic-request' => Http::response(['data' => ['processingStatus' => 'queued']], 202)]);
        config()->set('services.verify_et.mock', false);
        config()->set('services.verify_et.base_url', 'https://verify.et');
        settings()->save([VerifyEtSettings::KEY => ['api_key' => 'synthetic-runtime-key']]);
        $transport = \Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
        $transport->shouldReceive('factory')->andReturn(Http::getFacadeRoot());
        app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);
        app(\App\Payments\VerifyEt\VerifyEtClient::class)->getVerification('synthetic-request');
        Http::assertSent(fn ($request) => $request->hasHeader('x-api-key', 'synthetic-runtime-key'));
    }

    public function test_saved_signing_secret_authenticates_the_real_webhook_receiver(): void
    {
        \Illuminate\Support\Facades\Queue::fake();
        config()->set('services.verify_et.webhook_secret', 'whsec_environment-secret');
        settings()->save([VerifyEtSettings::KEY => ['webhook_secret' => 'whsec_saved-secret']]);
        $body = json_encode(['event' => 'webhook.test', 'requestId' => 'req_webhook_test'], JSON_THROW_ON_ERROR);
        $timestamp = now()->toIso8601String();
        $this->call('POST', '/billing/verify-et/webhook', [], [], [], [
            'HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp,
            'HTTP_X_WEBHOOK_EVENT_ID' => (string) \Illuminate\Support\Str::uuid(),
            'HTTP_X_WEBHOOK_TEST' => 'true',
            'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256='.hash_hmac('sha256', $timestamp.'.'.$body, 'whsec_saved-secret'),
        ], $body)->assertNoContent();
        \Illuminate\Support\Facades\Queue::assertNothingPushed();
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/v1/admin/storefront/verify-et-settings')->assertUnauthorized();
    }

    public function test_admin_without_settings_permission_cannot_change_credentials(): void
    {
        $user = User::factory()->create();
        $user->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin.access']));
        $this->sessionHeaders()->actingAs($user, 'sanctum');
        $this->patchJson('/api/v1/admin/storefront/verify-et-settings', ['api_key' => 'not-allowed'])->assertForbidden();
    }

    public function test_replacing_webhook_secret_retains_bounded_rotation_grace(): void
    {
        config()->set('services.verify_et.webhook_secret', 'whsec_old-synthetic-secret');
        $this->freezeTime();
        $this->sessionHeaders()->actingAs($this->admin(), 'sanctum');
        $this->patchJson('/api/v1/admin/storefront/verify-et-settings', ['webhook_secret' => 'whsec_new-synthetic-secret'])
            ->assertOk();
        $this->assertSame('whsec_old-synthetic-secret', VerifyEtSettings::get('webhook_previous_secret'));
        $this->assertSame(now()->addHours(24)->toIso8601String(), VerifyEtSettings::get('webhook_previous_secret_expires_at'));
    }
}
