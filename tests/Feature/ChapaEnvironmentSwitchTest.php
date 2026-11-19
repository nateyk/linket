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
        foreach (['admin.access', 'settings.update'] as $permission) {
            $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => $permission]));
        }

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
        $this->setupMerchant();
        $this->actingAs($this->admin(), 'sanctum');
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
        $this->setupMerchant();
        $admin = $this->admin();
        $this->actingAs($admin, 'sanctum');
        $this->saveLive();

        config()->set('services.chapa.live_mode_switch_allowed', false);
        $this->switchLive()->assertUnprocessable();
        config()->set('services.chapa.live_mode_switch_allowed', true);

        $payment = ProSubscriptionPayment::query()->create([
            'uuid' => (string) Str::uuid(), 'creator_id' => $admin->id,
            'amount_cents' => 100, 'status' => 'pending_payment',
        ]);
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
        $this->setupMerchant();
        $this->actingAs($this->admin(), 'sanctum');
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
        $this->setupMerchant();
        $this->actingAs($this->admin(), 'sanctum');
        $this->putJson('/api/v1/admin/billing/chapa/environments/test', [
            'public_key' => 'CHAPUBK_TEST-example', 'secret_key' => 'CHAPA_TEST-example',
        ])->assertUnprocessable();
        Http::assertNothingSent();
    }
}
