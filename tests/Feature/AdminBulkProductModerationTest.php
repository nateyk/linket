<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Permissions\Models\Permission;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminBulkProductModerationTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testBulkApproveActsOnActionableAndSkipsTheRest(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();

        $pending = $this->product($workspace, $creator, ['status' => 'pending_approval']);
        $updated = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now()->subDay(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);
        $clean = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        $response = $this->stateful()->actingAs($admin)->postJson(
            '/api/v1/admin/digital-products/bulk-approve',
            ['ids' => [$pending->id, $updated->id, $clean->id]],
        );

        $response->assertOk();
        $response->assertJsonPath('approved', 2);
        $response->assertJsonPath('skipped', 1);

        $this->assertSame('approved', $pending->fresh()->status);
        $this->assertSame('approved', $updated->fresh()->status);
        $this->assertNull($updated->fresh()->review_requested_at);
        $this->assertSame('approved', $clean->fresh()->status);

        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $pending->id,
            'event' => 'approved',
            'actor_role' => 'admin',
        ]);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $updated->id,
            'event' => 'update_approved',
            'actor_role' => 'admin',
        ]);
        $this->assertDatabaseMissing('digital_product_review_events', [
            'digital_product_id' => $clean->id,
        ]);
    }

    public function testBulkRejectRejectsActionableProductsWithReason(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();

        $pending = $this->product($workspace, $creator, ['status' => 'pending_approval']);
        $draft = $this->product($workspace, $creator, ['status' => 'draft']);

        $response = $this->stateful()->actingAs($admin)->postJson(
            '/api/v1/admin/digital-products/bulk-reject',
            ['ids' => [$pending->id, $draft->id], 'reason' => 'Missing files'],
        );

        $response->assertOk();
        $response->assertJsonPath('rejected', 1);
        $response->assertJsonPath('skipped', 1);

        $this->assertSame('rejected', $pending->fresh()->status);
        $this->assertSame('Missing files', $pending->fresh()->rejection_reason);
        $this->assertSame('draft', $draft->fresh()->status);

        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $pending->id,
            'event' => 'rejected',
            'actor_role' => 'admin',
            'reason' => 'Missing files',
        ]);
    }

    public function testBulkModerationValidatesInput(): void
    {
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin)
            ->postJson('/api/v1/admin/digital-products/bulk-approve', ['ids' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors('ids');

        $this->stateful()->actingAs($admin)
            ->postJson('/api/v1/admin/digital-products/bulk-approve', ['ids' => range(1, 101)])
            ->assertStatus(422)
            ->assertJsonValidationErrors('ids');
    }

    public function testNonAdminCannotBulkModerate(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $this->stateful()->actingAs($creator)
            ->postJson('/api/v1/admin/digital-products/bulk-approve', ['ids' => [$product->id]])
            ->assertForbidden();

        $this->assertSame('pending_approval', $product->fresh()->status);
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
