<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Notifications\ProductModerationNotification;
use App\Storefront\Notifications\ProductModerationSummaryNotification;
use Common\Files\FileEntry;
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

    public function testBulkApproveSendsOneSummaryPerCreatorAndSkipsIneligible(): void
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

        Notification::assertSentToTimes($creatorA, ProductModerationSummaryNotification::class, 1);
        Notification::assertNotSentTo($creatorA, ProductModerationNotification::class);
        Notification::assertNotSentTo($creatorB, ProductModerationSummaryNotification::class);
        Notification::assertNotSentTo($creatorB, ProductModerationNotification::class);

        Notification::assertSentTo(
            $creatorA,
            ProductModerationSummaryNotification::class,
            fn (ProductModerationSummaryNotification $n): bool => $n->event === 'approved'
                && count($n->titles) === 2,
        );
    }

    public function testBulkWithSingleActionableProductUsesTheIndividualNotification(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $this->stateful()->actingAs($admin)->postJson(
            '/api/v1/admin/digital-products/bulk-approve',
            ['ids' => [$product->id]],
        )->assertOk();

        Notification::assertSentToTimes($creator, ProductModerationNotification::class, 1);
        Notification::assertNotSentTo($creator, ProductModerationSummaryNotification::class);
    }

    public function testBulkRejectSummaryCarriesTheReason(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $first = $this->product($workspace, $creator, ['status' => 'pending_approval']);
        $second = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $this->stateful()->actingAs($admin)->postJson(
            '/api/v1/admin/digital-products/bulk-reject',
            ['ids' => [$first->id, $second->id], 'reason' => 'Not allowed'],
        )->assertOk();

        Notification::assertSentTo(
            $creator,
            ProductModerationSummaryNotification::class,
            fn (ProductModerationSummaryNotification $n): bool => $n->event === 'rejected'
                && $n->reason === 'Not allowed'
                && count($n->titles) === 2,
        );
    }

    public function testSummaryNotificationRendersMailAndEscapedDatabasePayload(): void
    {
        [$creator] = $this->creatorContext();
        $notification = new ProductModerationSummaryNotification(
            'rejected',
            ['<b>A</b>', 'B'],
            'Nope',
        );

        $this->assertInstanceOf(MailMessage::class, $notification->toMail($creator));
        $this->assertTrue($notification->shouldSend($creator, 'database'));

        $payload = $notification->toDatabase($creator);
        $this->assertStringContainsString('&lt;b&gt;A&lt;/b&gt;', $payload['lines'][0]['content']);
        $this->assertStringContainsString('Nope', $payload['lines'][1]['content']);
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

    public function testBulkRejectOfRevertedUpdatesSummarizesAsStillLive(): void
    {
        Notification::fake();
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $first = $this->editedProduct($workspace, $creator, 'Original A');
        $second = $this->editedProduct($workspace, $creator, 'Original B');

        $this->stateful()->actingAs($admin)->postJson(
            '/api/v1/admin/digital-products/bulk-reject',
            ['ids' => [$first->id, $second->id], 'reason' => 'Nope'],
        )->assertOk();

        Notification::assertSentToTimes($creator, ProductModerationSummaryNotification::class, 1);
        Notification::assertNotSentTo($creator, ProductModerationNotification::class);
        Notification::assertSentTo(
            $creator,
            ProductModerationSummaryNotification::class,
            fn (ProductModerationSummaryNotification $n): bool => $n->event === 'update_reverted',
        );
    }

    public function testRevertedSummaryCopySaysProductsRemainLive(): void
    {
        [$creator] = $this->creatorContext();
        $notification = new ProductModerationSummaryNotification('update_reverted', ['A', 'B'], 'Nope');

        $payload = $notification->toDatabase($creator);

        $this->assertStringContainsString('still live', $payload['lines'][0]['content']);
        $this->assertStringNotContainsString('need changes', $payload['lines'][0]['content']);
        $this->assertStringContainsString('Nope', $payload['lines'][1]['content']);
        $this->assertInstanceOf(MailMessage::class, $notification->toMail($creator));
    }

    private function editedProduct(Workspace $workspace, User $creator, string $title): DigitalProduct
    {
        $name = 'test-' . Str::random(6) . '.pdf';
        $file = FileEntry::query()->create([
            'name' => $name,
            'file_name' => $name,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'title' => $title,
        ]);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)->putJson("/api/v1/digital-products/{$product->id}", [
            'title' => $title . ' Edited',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ])->assertOk();

        return $product->fresh();
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

        $this->flushSession();

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
