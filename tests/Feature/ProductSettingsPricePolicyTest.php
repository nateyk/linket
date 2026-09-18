<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Settings\Models\Setting;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductSettingsPricePolicyTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()
            ->whereIn('name', [
                'product.min_price_cents',
                'product.max_price_cents',
                'product.allow_free_products',
            ])
            ->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function testFreeProductAllowedByDefault(): void
    {
        $creator = $this->createCreator();
        $file = $this->createFile($creator, $creator->workspaces()->first());

        $response = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Free Guide',
                'price_cents' => 0,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );

        $response->assertStatus(201);
    }

    public function testMinimumPriceEnforcedOnCreate(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);
        settings()->save(['product.min_price_cents' => 5000]);

        $tooCheap = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Too Cheap',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $tooCheap->assertStatus(422);

        $atFloor = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'At Floor',
                'price_cents' => 5000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $atFloor->assertStatus(201);
    }

    public function testMaximumPriceEnforcedOnCreate(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);
        settings()->save(['product.max_price_cents' => 10000]);

        $tooExpensive = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Too Expensive',
                'price_cents' => 20000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $tooExpensive->assertStatus(422);

        $atCeiling = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'At Ceiling',
                'price_cents' => 10000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $atCeiling->assertStatus(201);
    }

    public function testFreeProductBlockedWhenDisabled(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);
        settings()->save(['product.allow_free_products' => 0]);

        $free = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Free Guide',
                'price_cents' => 0,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $free->assertStatus(422);

        $paid = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Paid Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $paid->assertStatus(201);
    }

    public function testUpdatePaidToFreeBlockedWhenDisabled(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);

        $created = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Paid Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $created->assertStatus(201);
        $productId = $created->json('data.id');

        settings()->save(['product.allow_free_products' => 0]);

        $response = $this->stateful()->actingAs($creator)->put(
            "/api/v1/digital-products/{$productId}",
            [
                'title' => 'Paid Guide',
                'price_cents' => 0,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $response->assertStatus(422);
    }

    public function testExistingFreeProductSurvivesDisabling(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);

        $created = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Free Guide',
                'price_cents' => 0,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $created->assertStatus(201);
        $productId = $created->json('data.id');

        settings()->save(['product.allow_free_products' => 0]);

        $this->assertDatabaseHas('digital_products', [
            'id' => $productId,
            'price_cents' => 0,
        ]);
    }

    public function testValidatorRejectsMinGreaterThanMax(): void
    {
        $errors = app(\App\Admin\ProductSettingsValidator::class)->fails([
            'product.min_price_cents' => 20000,
            'product.max_price_cents' => 10000,
        ]);

        $this->assertNotEmpty($errors);
        $this->assertArrayHasKey('client.product.min_price_cents', $errors);
    }

    public function testValidatorRejectsNegativeMin(): void
    {
        $errors = app(\App\Admin\ProductSettingsValidator::class)->fails([
            'product.min_price_cents' => -100,
        ]);

        $this->assertNotEmpty($errors);
        $this->assertArrayHasKey('client.product.min_price_cents', $errors);
    }

    public function testValidatorAcceptsValidBounds(): void
    {
        $errors = app(\App\Admin\ProductSettingsValidator::class)->fails([
            'product.min_price_cents' => 5000,
            'product.max_price_cents' => 10000,
        ]);

        $this->assertEmpty($errors);
    }

    public function testValidatorIsRegistered(): void
    {
        $this->assertContains(
            \App\Admin\ProductSettingsValidator::class,
            config('setting-validators'),
        );
    }

    public function testExistingProductsKeepPriceWhenPolicyChanges(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);

        $created = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Grandfathered Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $created->assertStatus(201);
        $productId = $created->json('data.id');

        settings()->save(['product.min_price_cents' => 50000]);

        $this->assertDatabaseHas('digital_products', [
            'id' => $productId,
            'price_cents' => 1000,
        ]);
    }

    public function testOrderFinancialSnapshotUnaffectedByPolicyChange(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);

        $created = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Paid Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $created->assertStatus(201);

        $order = \App\Storefront\Models\StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $created->json('data.id'),
            'creator_id' => $creator->id,
            'buyer_email' => 'buyer@example.test',
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 500,
            'platform_fee_percent' => 5.0,
            'platform_fee_cents' => 50,
            'creator_earnings_cents' => 950,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        settings()->save([
            'product.min_price_cents' => 50000,
            'product.max_price_cents' => 100,
            'product.allow_free_products' => 0,
        ]);

        $fresh = $order->fresh();
        $this->assertSame(1000, $fresh->gross_amount_cents);
        $this->assertSame(500, $fresh->commission_bps);
        $this->assertSame(50, $fresh->platform_fee_cents);
        $this->assertSame(950, $fresh->creator_earnings_cents);
        $this->assertSame('paid', $fresh->status);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function createCreator(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        if (!Workspace::query()->where('owner_id', $user->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($user);
        }

        return $user;
    }

    private function createFile(User $creator, Workspace $workspace): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'test.pdf',
            'file_name' => 'test.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
    }
}
