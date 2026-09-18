<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Permissions\Models\Permission;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductSettingsAdminApiTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function testAdminCanViewProductSettings(): void
    {
        $admin = $this->createAdmin();
        settings()->save([
            'product.min_price_cents' => 5000,
            'product.max_price_cents' => 100000,
            'product.allow_free_products' => 1,
            'product.adding_requires_review' => 1,
            'product.updating_requires_review' => 1,
        ]);

        $response = $this->stateful()->actingAs($admin)->getJson('/api/v1/settings');

        $response->assertOk();
        $response->assertJsonPath('client.product.min_price_cents', 5000);
        $response->assertJsonPath('client.product.max_price_cents', 100000);
        $response->assertJsonPath('client.product.allow_free_products', 1);
        $response->assertJsonPath('client.product.adding_requires_review', 1);
        $response->assertJsonPath('client.product.updating_requires_review', 1);
    }

    public function testUnauthorizedUserCannotViewOrModifySettings(): void
    {
        $creator = $this->createCreator();

        $this->stateful()->actingAs($creator)->getJson('/api/v1/settings')->assertForbidden();

        $this->stateful()->actingAs($creator)->post('/api/v1/settings', [
            'client' => json_encode(['product' => ['min_price_cents' => 5000]]),
        ])->assertForbidden();

        $this->assertDatabaseMissing('settings', ['name' => 'product.min_price_cents']);
    }

    public function testAdminCanPersistProductSettings(): void
    {
        $admin = $this->createAdmin();

        $response = $this->stateful()->actingAs($admin)->post('/api/v1/settings', [
            'client' => json_encode(['product' => [
                'min_price_cents' => 5000,
                'max_price_cents' => 100000,
                'allow_free_products' => 0,
                'adding_requires_review' => 1,
                'updating_requires_review' => 0,
            ]]),
        ]);

        $response->assertNoContent();
        $this->assertDatabaseHas('settings', ['name' => 'product.min_price_cents']);
        $this->assertSame(0, settings('product.allow_free_products'));

        $fetched = $this->stateful()->actingAs($admin)->getJson('/api/v1/settings');
        $fetched->assertJsonPath('client.product.min_price_cents', 5000);
        $fetched->assertJsonPath('client.product.allow_free_products', 0);
    }

    public function testMinGreaterThanMaxRejectedAtSave(): void
    {
        $admin = $this->createAdmin();

        $response = $this->stateful()->actingAs($admin)->post('/api/v1/settings', [
            'client' => json_encode(['product' => [
                'min_price_cents' => 20000,
                'max_price_cents' => 10000,
            ]]),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('client.product.min_price_cents');
        $this->assertDatabaseMissing('settings', ['name' => 'product.min_price_cents']);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function createAdmin(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Admin ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $user->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin']),
        );

        return $user;
    }

    private function createCreator(): User
    {
        return User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }
}
