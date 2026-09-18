<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Permissions\Models\Permission;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminProductReviewQueueTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testUpdatedScopeReturnsOnlyUnreviewedUpdates(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();

        $flagged = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);
        $clean = $this->product($workspace, $creator, ['status' => 'approved', 'approved_at' => now()]);
        $pending = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $response = $this->stateful()->actingAs($admin)->getJson('/api/v1/admin/digital-products?scope=updated');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($flagged->id, $ids);
        $this->assertNotContains($clean->id, $ids);
        $this->assertNotContains($pending->id, $ids);
        $response->assertJsonPath('meta.counters.updated.total', 1);
    }

    public function testAdminCanApproveAPendingUpdate(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now()->subDay(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/digital-products/{$product->id}/approve")
            ->assertOk();

        $fresh = $product->fresh();
        $this->assertSame('approved', $fresh->status);
        $this->assertNull($fresh->review_requested_at);
        $this->assertNull($fresh->review_requested_by);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_approved',
            'actor_role' => 'admin',
        ]);
    }

    public function testAdminCanRejectAPendingUpdateTakesItOffline(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now()->subDay(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/digital-products/{$product->id}/reject", ['reason' => 'Not suitable'])
            ->assertOk();

        $fresh = $product->fresh();
        $this->assertSame('rejected', $fresh->status);
        $this->assertNull($fresh->review_requested_at);
        $this->assertSame('Not suitable', $fresh->rejection_reason);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_rejected',
            'actor_role' => 'admin',
            'reason' => 'Not suitable',
        ]);
    }

    private function product(Workspace $workspace, User $creator, array $attributes = []): DigitalProduct
    {
        return DigitalProduct::query()->create(array_merge([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product ' . Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'type' => 'digital',
        ], $attributes));
    }

    private function creatorContext(): array
    {
        $creator = User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        if (!Workspace::query()->where('owner_id', $creator->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($creator);
        }
        ActiveWorkspace::clearCache();

        return [$creator, $creator->workspaces()->first()];
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

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
