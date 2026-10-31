<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Notifications\ProductModerationNotification;
use Common\Files\FileEntry;
use Common\Permissions\Models\Permission;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminProductReviewWorkflowTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testCreatorSubmissionApprovalRejectionAndStorefrontVisibility(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $biolink = Biolink::query()->create([
            'back_half' => Str::lower(Str::random(8)),
            'name' => 'Store',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);
        $file = FileEntry::query()->create([
            'name' => 'guide',
            'file_name' => 'guide.pdf',
            'mime' => 'application/pdf',
            'file_size' => 120,
            'extension' => 'pdf',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'type' => 'file',
        ]);
        $product = $this->product($workspace, $creator, ['status' => 'pending_approval', 'title' => 'Review guide']);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($biolink->id);
        $file->getDisk()->put($file->getStoragePath(), 'review-file-bytes');
        $published = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'title' => 'Already live',
        ]);
        $published->files()->attach($file->id);
        $published->biolinks()->attach($biolink->id);

        $this->guest()->getJson("/api/v1/public/biolinks/{$biolink->id}/digital-products")
            ->assertOk()
            ->assertJsonMissing(['title' => 'Review guide'])
            ->assertJsonFragment(['title' => 'Already live']);
        $this->guest()->getJson("/api/v1/digital-products/{$product->id}/public")->assertNotFound();

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/items/{$product->id}/reject", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/items/{$product->id}/reject", ['reason' => 'Add a clearer description'])
            ->assertOk();

        $this->assertSame('rejected', $product->fresh()->status);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'rejected',
            'actor_id' => $admin->id,
            'reason' => 'Add a clearer description',
        ]);
        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/items/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.rejection_reason', 'Add a clearer description')
            ->assertJsonPath('data.status', 'rejected');
        Notification::assertSentTo(
            $creator,
            ProductModerationNotification::class,
            fn (ProductModerationNotification $notification): bool => $notification->event === 'rejected'
                && $notification->reason === 'Add a clearer description',
        );

        $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/items/{$product->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_approval');

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/items/{$product->id}/approve")
            ->assertOk();
        Notification::assertSentTo(
            $creator,
            ProductModerationNotification::class,
            fn (ProductModerationNotification $notification): bool => $notification->event === 'approved',
        );
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'approved',
            'actor_id' => $admin->id,
            'to_status' => 'approved',
        ]);

        $this->guest()->getJson("/api/v1/public/biolinks/{$biolink->id}/digital-products")
            ->assertOk()
            ->assertJsonFragment(['title' => 'Review guide']);
        $this->guest()->getJson("/api/v1/digital-products/{$product->id}/public")
            ->assertOk()
            ->assertJsonPath('title', 'Review guide');

        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'biolink_id' => $biolink->id,
            'buyer_name' => 'Buyer',
            'buyer_email' => 'buyer@example.test',
            'status' => 'paid',
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 1000,
            'platform_fee_cents' => 100,
            'creator_earnings_cents' => 900,
            'payment_gateway' => 'verify_et',
            'paid_at' => now(),
        ]);
        $entitlement = DownloadEntitlement::query()->create([
            'storefront_order_id' => $order->id,
            'file_entry_id' => $file->id,
            'token' => (string) Str::uuid(),
            'download_limit' => 3,
            'download_count' => 0,
            'expires_at' => now()->addDays(7),
        ]);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/items/{$product->id}/re-review", ['reason' => 'Check the new file'])
            ->assertOk();

        $fresh = $product->fresh();
        $this->assertSame('pending_approval', $fresh->status);
        $this->assertSame('Check the new file', $fresh->rejection_reason);
        $this->assertSame('paid', $order->fresh()->status);
        $this->assertNull($entitlement->fresh()->revoked_at);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 're_review',
            'from_status' => 'approved',
            'to_status' => 'pending_approval',
            'reason' => 'Check the new file',
        ]);
        $this->guest()->getJson("/api/v1/digital-products/{$product->id}/public")->assertNotFound();
        $this->guest()->getJson("/api/v1/public/biolinks/{$biolink->id}/digital-products")
            ->assertOk()
            ->assertJsonMissing(['title' => 'Review guide'])
            ->assertJsonFragment(['title' => 'Already live']);

        $index = $this->stateful()->actingAs($admin)->getJson('/api/v1/admin/items?status=published');
        $index->assertOk();
        $ids = collect($index->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($published->id));
        $this->assertFalse($ids->contains($product->id));
        $this->assertGreaterThanOrEqual(1, $index->json('meta.counters.published.total'));

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/items/{$product->id}/re-review", ['reason' => 'Already waiting'])
            ->assertStatus(422);
        $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/admin/items/{$published->id}/approve")
            ->assertForbidden();

        $show = $this->stateful()->actingAs($admin)->getJson("/api/v1/admin/items/{$product->id}")->assertOk();
        $show->assertJsonPath('data.creator.email', $creator->email)
            ->assertJsonPath('data.price_cents', 1000)
            ->assertJsonPath('data.files.0.download_path', "/api/v1/admin/items/{$product->id}/files/{$file->id}")
            ->assertJsonPath('data.history.0.actor.id', $admin->id);
        $this->assertStringNotContainsString('file-entries/'.$file->id, $show->getContent());

        $this->app['auth']->forgetGuards();
        $this->flushSession();
        $guestDownload = $this->withHeader('Referer', config('app.url'))
            ->get("/api/v1/admin/items/{$product->id}/files/{$file->id}");
        $this->assertNotSame(200, $guestDownload->status());
        $this->assertStringNotContainsString('review-file-bytes', $guestDownload->getContent());
        $this->stateful()->actingAs($creator)
            ->get("/api/v1/admin/items/{$product->id}/files/{$file->id}")
            ->assertForbidden();
        $other = FileEntry::query()->create([
            'name' => 'other',
            'file_name' => 'other.pdf',
            'mime' => 'application/pdf',
            'file_size' => 10,
            'extension' => 'pdf',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'type' => 'file',
        ]);
        $this->stateful()->actingAs($admin)
            ->get("/api/v1/admin/items/{$product->id}/files/{$other->id}")
            ->assertNotFound();
        $this->stateful()->actingAs($admin)
            ->get("/api/v1/admin/items/{$product->id}/files/{$file->id}")
            ->assertOk();

        $page = $this->stateful()->actingAs($admin)
            ->getJson('/api/v1/admin/items?perPage=1&search=Review%20guide');
        $page->assertOk();
        $this->assertCount(1, $page->json('data'));
        $this->assertSame('Review guide', $page->json('data.0.title'));
        $this->assertSame(1, $page->json('per_page'));
        $file->getDisk()->delete($file->getStoragePath());
    }

    private function product(Workspace $workspace, User $creator, array $attributes = []): DigitalProduct
    {
        return DigitalProduct::query()->create(array_merge([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product '.Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'type' => 'digital',
        ], $attributes));
    }

    private function creatorContext(): array
    {
        $creator = User::query()->forceCreate([
            'name' => 'Creator '.Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        if (! Workspace::query()->where('owner_id', $creator->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($creator);
        }
        ActiveWorkspace::clearCache();

        return [$creator, $creator->workspaces()->first()];
    }

    private function createAdmin(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Admin '.Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $user->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin']),
        );

        return $user;
    }

    private function guest(): static
    {
        return $this->withHeader('Referer', config('app.url'));
    }

    private function stateful(): static
    {
        $csrfToken = 'product-review-workflow';
        $this->flushSession();

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
