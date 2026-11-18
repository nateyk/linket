<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Payments\SubscriptionPaymentGateway;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RetiredPaymentProviderRoutesTest extends TestCase
{
    use DatabaseTransactions;

    private function stateful(): static
    {
        return $this->withSession(['_token' => 'retired-gateway-test'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'retired-gateway-test');
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        foreach (['admin.access', 'settings.update'] as $permission) {
            $user->permissions()->attach(Permission::query()->firstOrCreate(['name' => $permission]));
        }

        return $user;
    }

    public function testSavedOldSubscriptionPreferenceCannotReactivateProvider(): void
    {
        settings()->set(SubscriptionPaymentGateway::KEY, 'verify_et');

        $this->assertSame('chapa', SubscriptionPaymentGateway::current());
    }

    public function testLegacyAdminConfigurationEndpointsAndExperimentCallbackAreGone(): void
    {
        $this->stateful()->actingAs($this->admin(), 'sanctum');

        $this->getJson('/api/v1/admin/storefront/verify-et-settings')->assertNotFound();
        $this->patchJson('/api/v1/admin/storefront/verify-et-settings', [
            'enabled' => true,
        ])->assertNotFound();
        $this->post('/billing/verify-et/experiment-webhook')->assertNotFound();
    }

    public function testAdminCannotSelectOldSubscriptionGateway(): void
    {
        Http::preventStrayRequests();
        $this->stateful()->actingAs($this->admin(), 'sanctum');

        $this->putJson('/api/v1/admin/billing/subscription-gateway', [
            'gateway' => 'verify_et',
        ])->assertUnprocessable();

        $this->getJson('/api/v1/admin/billing/subscription-gateway')
            ->assertOk()->assertJsonPath('data.gateway', 'chapa');
        Http::assertNothingSent();
    }
}
