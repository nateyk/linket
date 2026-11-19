<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Chapa\ChapaMerchantProfiles;
use App\Payments\Models\ProSubscriptionPayment;
use Common\Permissions\Models\Permission;
use Common\Settings\Settings;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ChapaEnvironmentSwitchTest extends TestCase
{
    use DatabaseTransactions;

    private function admin(): User
    {
        $admin = User::factory()->create(['password' => Hash::make('unit-admin-password')]);
        foreach (['admin.access', 'settings.update', 'api.access'] as $permission) {
            $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => $permission]));
        }

        // Refresh Linket's aggregated permissions after attaching the test grants.
        // The user model caches its permissions relation on first access.
        $admin->loadPermissions(true);

        return $admin;
    }

    private function setupMerchant(): void
    {
        config()->set('services.chapa.secret', 'CHASECK_TEST-legacy-fixture');
        config()->set('services.chapa.webhook_secret', 'legacy-webhook-fixture');
        config()->set('services.chapa.transfer_approval_secret', '');
        config()->set('services.chapa.live_mode_switch_allowed', true);
        config()->set('services.chapa.payouts_enabled', false);
        Http::fake(['https://api.chapa.co/v1/banks' => Http::response(['status' => 'success', 'data' => []])]);
    }

    private function actingAdmin(): User
    {
        $this->setupMerchant();
        $admin = $this->admin();
        $this->actingAs($admin, 'sanctum');
        $this->assertTrue($admin->hasPermission('admin.access'));
        $this->assertTrue($admin->hasPermission('settings.update'));
        $this->assertTrue($admin->hasPermission('api.access'));

        return $admin;
    }

    private function pendingPayment(User $creator): ProSubscriptionPayment
    {
        return ProSubscriptionPayment::query()->create([
            'uuid' => (string) Str::uuid(), 'creator_id' => $creator->id,
            'product_id' => 1,
            'amount_cents' => 100, 'status' => 'pending_payment',
        ]);
    }

    private function saveLive(): void
    {
        $this->putJson('/api/v1/admin/billing/chapa/environments/live', [
            'public_key' => 'CHAPUBK-fixture-live',
            'secret_key' => 'CHASECK-fixture-live',
            'webhook_secret' => 'webhook-live-secret-123',
            'transfer_approval_secret' => 'approval-live-secret-123',
        ])->assertOk();
    }

    private function switchLive(): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/v1/admin/billing/chapa/activate', [
            'mode' => 'live', 'confirmation' => 'SWITCH TO LIVE',
            'admin_password' => 'unit-admin-password',
        ]);
    }

    public function testLiveProfileIsEncryptedAndInactiveUntilExplicitSwitch(): void
    {
        $this->actingAdmin();
        $this->saveLive();

        $response = $this->getJson('/api/v1/admin/billing/chapa/environments')
            ->assertOk()->assertJsonPath('data.active_mode', 'test')
            ->assertJsonPath('data.profiles.live.configured', true);
        $this->assertStringNotContainsString('CHASECK-fixture-live', $response->getContent());

        $name = ChapaMerchantProfiles::key('live', 'secret_key');
        $raw = DB::table('settings')->where('name', $name)->value('value');
        $this->assertNotSame('CHASECK-fixture-live', $raw);
        $this->assertSame('CHASECK-fixture-live', decrypt($raw));
        $this->assertArrayNotHasKey($name, app(Settings::class)->all(false));
    }

    public function testSwitchRequiresPasswordReleaseGateAndNoPendingPayments(): void
    {
        $admin = $this->actingAdmin();
        $this->saveLive();

        config()->set('services.chapa.live_mode_switch_allowed', false);
        $this->switchLive()->assertUnprocessable();
        config()->set('services.chapa.live_mode_switch_allowed', true);

        $payment = $this->pendingPayment($admin);
        $this->switchLive()->assertUnprocessable();
        $payment->delete();

        $this->postJson('/api/v1/admin/billing/chapa/activate', [
            'mode' => 'live', 'confirmation' => 'SWITCH TO LIVE', 'admin_password' => 'incorrect',
        ])->assertUnprocessable();
        $this->switchLive()->assertOk()->assertJsonPath('data.active_mode', 'live')
            ->assertJsonPath('data.checkout_enabled', false);
        $this->assertFalse((bool) settings()->get('billing.chapa.enable'));
        $this->assertSame('CHASECK-fixture-live', app(\App\Payments\Chapa\LinketChapaManager::class)->platformSecret());
        $this->assertFalse((bool) config('services.chapa.payouts_enabled'));
    }

    public function testLiveCheckoutRequiresSecondConfirmationToEnable(): void
    {
        $this->actingAdmin();
        $this->saveLive();
        $this->switchLive()->assertOk();

        $this->postJson('/api/v1/admin/billing/chapa/enable', [
            'confirmation' => 'ENABLE LIVE CHECKOUT', 'admin_password' => 'incorrect',
        ])->assertUnprocessable();
        $this->postJson('/api/v1/admin/billing/chapa/enable', [
            'confirmation' => 'ENABLE LIVE CHECKOUT', 'admin_password' => 'unit-admin-password',
        ])->assertOk()->assertJsonPath('data.checkout_enabled', true);
        $this->postJson('/api/v1/admin/billing/chapa/pause')
            ->assertOk()->assertJsonPath('data.checkout_enabled', false);
    }

    public function testRegularUsersCannotConfigureMerchantProfiles(): void
    {
        $this->setupMerchant();
        $this->actingAs(User::factory()->create(), 'sanctum');
        $this->putJson('/api/v1/admin/billing/chapa/environments/live', [
            'public_key' => 'CHAPUBK-fixture-live', 'secret_key' => 'CHASECK-fixture-live',
        ])->assertForbidden();
        $this->getJson('/api/v1/admin/billing/chapa/environments')->assertForbidden();
    }

    public function testV2CredentialsCannotAccidentallyActivateTheV1Adapter(): void
    {
        $this->actingAdmin();
        $this->putJson('/api/v1/admin/billing/chapa/environments/test', [
            'public_key' => 'CHAPUBK_TEST-example', 'secret_key' => 'CHAPA_TEST-example',
        ])->assertUnprocessable();
        Http::assertNothingSent();
    }
    public function testProfileUpdateRejectsMixedEnvironmentKeyPair(): void
    {
        $this->actingAdmin();
        $this->putJson('/api/v1/admin/billing/chapa/environments/live', [
            'public_key' => 'CHAPUBK_TEST-wrong-environment',
            'secret_key' => 'CHASECK-fixture-live',
        ])->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function testPartialKeyPairCannotBeStored(): void
    {
        $this->actingAdmin();
        $this->putJson('/api/v1/admin/billing/chapa/environments/live', [
            'secret_key' => 'CHASECK-fixture-live',
        ])->assertUnprocessable();
        $this->assertDatabaseMissing('settings', [
            'name' => ChapaMerchantProfiles::key('live', 'secret_key'),
        ]);
    }

    public function testInactiveProfileCanBeConfiguredDuringExistingPendingSubscription(): void
    {
        $admin = $this->actingAdmin();
        $payment = $this->pendingPayment($admin);
        $this->saveLive();
        $this->assertSame('test', app(ChapaMerchantProfiles::class)->activeMode());
        $payment->delete();
    }

    public function testActiveProfileCannotRotateWithPendingProviderTransactions(): void
    {
        $admin = $this->actingAdmin();
        $payment = $this->pendingPayment($admin);
        $this->putJson('/api/v1/admin/billing/chapa/environments/test', [
            'webhook_secret' => 'rotated-webhook-secret-123',
        ])->assertUnprocessable();
        $payment->delete();
    }

    public function testSwitchDoesNotEnableCheckoutIfProfileIsIncomplete(): void
    {
        $this->actingAdmin();
        $this->putJson('/api/v1/admin/billing/chapa/environments/live', [
            'public_key' => 'CHAPUBK-fixture-live',
            'secret_key' => 'CHASECK-fixture-live',
        ])->assertOk();
        $this->switchLive()->assertUnprocessable();
        $this->assertNotSame('live', app(ChapaMerchantProfiles::class)->activeMode());
    }

    public function testLivePayoutFlagPreventsAccidentalCheckoutCutover(): void
    {
        $this->actingAdmin();
        $this->saveLive();
        config()->set('services.chapa.payouts_enabled', true);
        $this->switchLive()->assertUnprocessable();
        $this->assertSame('test', app(ChapaMerchantProfiles::class)->activeMode());
    }

    public function testEmergencyPausePersistsWithoutChangingMerchantKeys(): void
    {
        $this->actingAdmin();
        $this->postJson('/api/v1/admin/billing/chapa/pause')
            ->assertOk()->assertJsonPath('data.checkout_enabled', false);
        $this->assertSame('CHASECK_TEST-legacy-fixture',
            app(\App\Payments\Chapa\LinketChapaManager::class)->platformSecret());
        $this->assertFalse((bool) settings()->get('billing.chapa.enable', true));
    }

    public function testLiveModeCannotUseLegacyTestSecretIfLiveProfileIsAbsent(): void
    {
        $this->setupMerchant();
        settings()->save([
            'billing.chapa.active_mode' => 'live',
            'billing.chapa.enable' => 'false',
        ]);
        $profiles = app(ChapaMerchantProfiles::class);
        $this->assertSame('live', $profiles->activeMode());
        $this->assertSame('', $profiles->active('secret_key'));
        $this->assertSame('', app(\App\Payments\Chapa\LinketChapaManager::class)->platformSecret());
    }

    public function testRotatedTestMerchantMustConfigureItsOwnWebhookAndApprovalSecret(): void
    {
        $this->actingAdmin();
        config()->set('services.chapa.transfer_approval_secret', 'old-approval-secret-fixture-123');
        $this->putJson('/api/v1/admin/billing/chapa/environments/test', [
            'public_key' => 'CHAPUBK_TEST-rotated-public',
            'secret_key' => 'CHASECK_TEST-rotated-merchant',
        ])->assertOk();
        $profiles = app(ChapaMerchantProfiles::class);
        $this->assertSame('CHASECK_TEST-rotated-merchant', $profiles->active('secret_key'));
        $this->assertFalse($profiles->summary('test')['webhook_configured']);
        $this->assertFalse($profiles->summary('test')['approval_configured']);
    }

}
