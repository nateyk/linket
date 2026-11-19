<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Services\ChapaTransferApprovalSecret;
use Common\Permissions\Models\Permission;
use Common\Settings\Settings;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class ChapaTransferApprovalSettingsTest extends TestCase
{
    use DatabaseTransactions;

    private function administrator(): User
    {
        $admin = User::factory()->create();
        foreach (['admin.access', 'settings.update'] as $permission) {
            $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => $permission]));
        }
        return $admin;
    }

    private function stateful(): static
    {
        return $this->withSession(['_token' => 'chapa-approval-test-token'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'chapa-approval-test-token');
    }

    public function testEncryptedApprovalSecretIsSavedAndNeverExposed(): void
    {
        config()->set('services.chapa.secret', 'CHASECK_TEST-admin-approval-fixture');
        config()->set('services.chapa.transfer_approval_secret', '');
        $secret = 'test-approval-secret-123456';

        $admin = $this->administrator();
        $response = $this->stateful()->actingAs($admin)->putJson('/api/v1/admin/billing/subscription-gateway', [
            'transfer_approval_secret' => $secret,
        ]);
        $response->assertOk();
        $this->assertStringNotContainsString($secret, $response->getContent());

        $raw = DB::table('settings')->where('name', ChapaTransferApprovalSecret::settingKey('test'))->value('value');
        $this->assertNotNull($raw);
        $this->assertNotSame($secret, $raw);
        $this->assertSame($secret, decrypt($raw));
        $this->assertSame($secret, app(ChapaTransferApprovalSecret::class)->current());
        $this->getJson('/api/v1/admin/financial/chapa-payout-readiness')
            ->assertOk()->assertJsonPath('data.mode', 'test')
            ->assertJsonPath('data.approval_configured', true)
            ->assertDontSee($secret);
        $this->assertArrayNotHasKey(ChapaTransferApprovalSecret::settingKey('test'), app(Settings::class)->all(false));
        $this->assertArrayNotHasKey('transfer_approval_secret', app(Settings::class)->getAllForFrontendForm()['billing']['chapa'] ?? []);
    }

    public function testOnlyAuthorizedAdministratorsCanRotateTheSecret(): void
    {
        config()->set('services.chapa.secret', 'CHASECK_TEST-admin-approval-fixture');
        $user = User::factory()->create();
        $this->stateful()->actingAs($user)->putJson('/api/v1/admin/billing/subscription-gateway', [
            'transfer_approval_secret' => 'unauthorized-test-secret-123',
        ])->assertForbidden();
        $this->assertDatabaseMissing('settings', ['name' => ChapaTransferApprovalSecret::settingKey('test')]);
    }

    public function testShortSecretIsRejectedBeforeStorage(): void
    {
        config()->set('services.chapa.secret', 'CHASECK_TEST-admin-approval-fixture');
        $this->stateful()->actingAs($this->administrator())
            ->putJson('/api/v1/admin/billing/subscription-gateway', [
                'transfer_approval_secret' => 'short',
            ])->assertUnprocessable();
        $this->assertDatabaseMissing('settings', ['name' => ChapaTransferApprovalSecret::settingKey('test')]);
    }

    public function testTestAndLiveApprovalSecretsAreNotReused(): void
    {
        config()->set('services.chapa.transfer_approval_secret', '');
        config()->set('services.chapa.secret', 'CHASECK_TEST-admin-approval-fixture');
        $this->stateful()->actingAs($this->administrator());
        $this->putJson('/api/v1/admin/billing/subscription-gateway', [
            'transfer_approval_secret' => 'sandbox-approval-secret-123',
        ])->assertOk();
        config()->set('services.chapa.secret', 'CHASECK-admin-approval-live-fixture');
        $this->assertSame('', app(ChapaTransferApprovalSecret::class)->current());
        $this->putJson('/api/v1/admin/billing/subscription-gateway', [
            'transfer_approval_secret' => 'live-approval-secret-987654',
        ])->assertOk();
        $this->assertSame('live-approval-secret-987654', app(ChapaTransferApprovalSecret::class)->current());
        config()->set('services.chapa.secret', 'CHASECK_TEST-admin-approval-fixture');
        $this->assertSame('sandbox-approval-secret-123', app(ChapaTransferApprovalSecret::class)->current());
    }
}
