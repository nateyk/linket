<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Courses\Models\Course;
use App\Courses\Services\CourseService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductUpdateRevertTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testFirstEditStoresSnapshotAndSecondDoesNotOverwrite(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'title' => 'Original',
            'price_cents' => 1000,
        ]);
        $product->files()->attach($file->id);

        $this->updateProduct($creator, $product, ['title' => 'First edit']);
        $snapshot = $product->fresh()->pending_review_snapshot;
        $this->assertIsArray($snapshot);
        $this->assertSame('Original', $snapshot['title']);
        $this->assertSame([$file->id], $snapshot['file_ids']);

        $this->updateProduct($creator, $product, ['title' => 'Second edit']);
        $this->assertSame('Original', $product->fresh()->pending_review_snapshot['title']);
    }

    public function testNoSnapshotWhenUpdateReviewIsDisabled(): void
    {
        settings()->save(['product.updating_requires_review' => 0]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->product($workspace, $creator, ['status' => 'approved', 'approved_at' => now()]);
        $product->files()->attach($file->id);

        $this->updateProduct($creator, $product, ['title' => 'Edit']);

        $this->assertNull($product->fresh()->pending_review_snapshot);
    }

    public function testRejectingAnUpdateRevertsToSnapshotAndStaysLive(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $store = $this->store($creator, $workspace);
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'title' => 'Original',
            'price_cents' => 1000,
        ]);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($store->id);

        $this->updateProduct($creator, $product, ['title' => 'Edited', 'price_cents' => 2000]);
        $this->assertSame('Edited', $product->fresh()->title);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$product->id}/reject",
            ['reason' => 'Not acceptable'],
        )->assertOk();

        $fresh = $product->fresh();
        $this->assertSame('approved', $fresh->status);
        $this->assertSame('Original', $fresh->title);
        $this->assertSame(1000, $fresh->price_cents);
        $this->assertNull($fresh->review_requested_at);
        $this->assertNull($fresh->pending_review_snapshot);
        $this->assertSame([$file->id], $fresh->files()->pluck('file_entries.id')->all());

        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_reverted',
            'reason' => 'Not acceptable',
            'actor_role' => 'admin',
        ]);

        $listed = $this->stateful()->getJson("/api/v1/public/stores/{$store->id}/digital-products");
        $listed->assertOk();
        $this->assertNotNull(collect($listed->json('data'))->firstWhere('id', $product->id));
    }

    public function testRejectingAnUpdateWithoutSnapshotFallsBackToRejected(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);
        $this->assertNull($product->pending_review_snapshot);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$product->id}/reject",
            ['reason' => 'No'],
        )->assertOk();

        $this->assertSame('rejected', $product->fresh()->status);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_rejected',
        ]);
    }

    public function testFirstTimeRejectIsUnchanged(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$product->id}/reject",
            ['reason' => 'Nope'],
        )->assertOk();

        $this->assertSame('rejected', $product->fresh()->status);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'rejected',
        ]);
    }

    public function testAdminDetailExposesPendingChanges(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'title' => 'Original',
            'price_cents' => 1000,
        ]);
        $product->files()->attach($file->id);

        $this->updateProduct($creator, $product, ['title' => 'Edited', 'price_cents' => 2000]);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}");

        $response->assertOk();
        $changes = collect($response->json('data.pending_changes'));
        $this->assertNotNull($changes->firstWhere('field', 'title'));
        $this->assertSame('Original', $changes->firstWhere('field', 'title')['before']);
        $this->assertSame('Edited', $changes->firstWhere('field', 'title')['after']);
        $this->assertNotNull($changes->firstWhere('field', 'price_cents'));
    }

    public function testUpdateRevertedNotificationCopy(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'approved', 'approved_at' => now()]);

        $notification = new \App\Storefront\Notifications\ProductModerationNotification(
            $product->id,
            'update_reverted',
            'Nope',
        );

        $this->assertStringContainsString(
            'previous version is still live',
            $notification->toMail($creator)->render(),
        );

        $payload = $notification->toDatabase($creator);
        $this->assertStringContainsString('previous version is still live', $payload['lines'][0]['content']);
        $this->assertStringContainsString('Nope', $payload['lines'][1]['content']);
    }

    public function testCourseProductEditCanBeReverted(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $course = $this->approvedCourse($creator, $workspace, [
            'title' => 'Original Course',
            'price_cents' => 1000,
        ]);

        $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/courses/{$course->id}",
            ['title' => 'Edited Course', 'price_cents' => 2000],
        )->assertOk();

        $product = $course->product->fresh();
        $this->assertSame('approved', $product->status);
        $this->assertNotNull($product->review_requested_at);
        $this->assertIsArray($product->pending_review_snapshot);
        $this->assertSame('Original Course', $product->pending_review_snapshot['title']);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$product->id}/reject",
            ['reason' => 'No'],
        )->assertOk();

        $reverted = $product->fresh();
        $this->assertSame('approved', $reverted->status);
        $this->assertSame('Original Course', $reverted->title);
        $this->assertSame(1000, $reverted->price_cents);
        $this->assertNull($reverted->review_requested_at);
        $this->assertNull($reverted->pending_review_snapshot);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_reverted',
            'reason' => 'No',
            'actor_role' => 'admin',
        ]);
    }

    public function testCurriculumFirstThenProductEditIsStillRevertable(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $course = $this->approvedCourse($creator, $workspace, [
            'title' => 'Original Course',
            'price_cents' => 1000,
        ]);

        app(CourseService::class)->revertApprovalForContentChange($course);
        $this->assertNotNull($course->product->fresh()->review_requested_at);
        $this->assertNull($course->product->fresh()->pending_review_snapshot);

        $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/courses/{$course->id}",
            ['title' => 'Edited Course', 'price_cents' => 2000],
        )->assertOk();

        $product = $course->product->fresh();
        $this->assertIsArray($product->pending_review_snapshot);
        $this->assertSame('Original Course', $product->pending_review_snapshot['title']);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$product->id}/reject",
            ['reason' => 'No'],
        )->assertOk();

        $reverted = $product->fresh();
        $this->assertSame('approved', $reverted->status);
        $this->assertSame('Original Course', $reverted->title);
        $this->assertSame(1000, $reverted->price_cents);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_reverted',
        ]);
    }

    private function approvedCourse(User $creator, Workspace $workspace, array $attributes = []): Course
    {
        $product = $this->product($workspace, $creator, array_merge([
            'type' => 'course',
            'status' => 'approved',
            'approved_at' => now(),
        ], $attributes));

        return Course::query()->create([
            'digital_product_id' => $product->id,
            'instructor_user_id' => $creator->id,
            'published_at' => now(),
        ])->load('product');
    }

    private function updateProduct(User $creator, DigitalProduct $product, array $overrides = []): void
    {
        $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/digital-products/{$product->id}",
            array_merge([
                'title' => $product->title,
                'price_cents' => $product->price_cents,
                'currency' => 'ETB',
                'file_ids' => $product->files()->pluck('file_entries.id')->all(),
            ], $overrides),
        )->assertOk();
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

    private function createFile(User $creator, Workspace $workspace): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'download.pdf',
            'file_name' => 'download.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 1024,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
    }

    private function store(User $creator, Workspace $workspace): Biolink
    {
        return Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Store ' . Str::random(4),
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);
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
            \Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin']),
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
