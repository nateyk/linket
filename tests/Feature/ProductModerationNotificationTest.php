<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Notifications\ProductModerationNotification;
use Common\Permissions\Models\Permission;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductModerationNotificationTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testApprovingNotifiesCreatorOnMailAndDatabaseChannels(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/digital-products/{$product->id}/approve")
            ->assertOk();

        Notification::assertSentTo(
            $creator,
            ProductModerationNotification::class,
            function (ProductModerationNotification $notification, array $channels) use ($product): bool {
                return $notification->productId === $product->id
                    && $notification->event === 'approved'
                    && in_array('mail', $channels, true)
                    && in_array('database', $channels, true);
            },
        );
    }

    public function testRejectingAndUpdateOutcomesNotifyWithTheRightEvent(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();

        $pending = $this->product($workspace, $creator, ['status' => 'pending_approval']);
        $toApprove = $this->updatedProduct($workspace, $creator);
        $toReject = $this->updatedProduct($workspace, $creator);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$pending->id}/reject",
            ['reason' => 'Missing files'],
        )->assertOk();

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$toApprove->id}/approve",
        )->assertOk();

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$toReject->id}/reject",
            ['reason' => 'Price too high'],
        )->assertOk();

        Notification::assertSentTo(
            $creator,
            ProductModerationNotification::class,
            fn (ProductModerationNotification $n): bool => $n->productId === $pending->id
                && $n->event === 'rejected'
                && $n->reason === 'Missing files',
        );
        Notification::assertSentTo(
            $creator,
            ProductModerationNotification::class,
            fn (ProductModerationNotification $n): bool => $n->productId === $toApprove->id
                && $n->event === 'update_approved',
        );
        Notification::assertSentTo(
            $creator,
            ProductModerationNotification::class,
            fn (ProductModerationNotification $n): bool => $n->productId === $toReject->id
                && $n->event === 'update_rejected'
                && $n->reason === 'Price too high',
        );
    }

    public function testBulkApproveNotifiesEachActionableCreatorOnly(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$creatorA, $workspaceA] = $this->creatorContext();
        [$creatorB, $workspaceB] = $this->creatorContext();

        $first = $this->product($workspaceA, $creatorA, ['status' => 'pending_approval']);
        $second = $this->product($workspaceA, $creatorA, ['status' => 'pending_approval']);
        $draft = $this->product($workspaceB, $creatorB, ['status' => 'draft']);

        $this->stateful()->actingAs($admin)->postJson(
            '/api/v1/admin/digital-products/bulk-approve',
            ['ids' => [$first->id, $second->id, $draft->id]],
        )->assertOk();

        Notification::assertSentToTimes($creatorA, ProductModerationNotification::class, 2);
        Notification::assertNotSentTo($creatorB, ProductModerationNotification::class);
    }

    public function testApprovingPersistsADatabaseNotification(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/digital-products/{$product->id}/approve")
            ->assertOk();

        $this->assertSame(1, $creator->notifications()->count());
        $this->assertSame(
            ProductModerationNotification::class,
            $creator->notifications()->first()->type,
        );
    }

    public function testToMailAndShouldSendGuardDeletedProducts(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'rejected']);

        $notification = new ProductModerationNotification($product->id, 'rejected', 'Bad');

        $this->assertInstanceOf(MailMessage::class, $notification->toMail($creator));
        $this->assertTrue($notification->shouldSend($creator, 'mail'));

        $product->delete();

        $this->assertFalse($notification->shouldSend($creator, 'mail'));
    }

    private function updatedProduct(Workspace $workspace, User $creator): DigitalProduct
    {
        return $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now()->subDay(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
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
