<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductReviewEvent;
use App\Storefront\Models\ProductReview;
use App\Storefront\Models\StorefrontOrder;
use Common\Files\FileEntry;
use Common\Permissions\Models\Permission;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminDigitalProductDetailTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testAdminCanViewProductDetailWithHistory(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $store = $this->createStore($creator, $workspace);
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($store->id);

        DigitalProductReviewEvent::query()->create([
            'digital_product_id' => $product->id,
            'actor_id' => $admin->id,
            'actor_role' => 'admin',
            'event' => 'created',
            'to_status' => 'draft',
        ]);
        DigitalProductReviewEvent::query()->create([
            'digital_product_id' => $product->id,
            'actor_id' => $creator->id,
            'actor_role' => 'creator',
            'event' => 'update_approved',
            'from_status' => 'approved',
            'to_status' => 'approved',
        ]);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}");

        $response->assertOk();
        $response->assertJsonPath('data.id', $product->id);
        $response->assertJsonPath('data.creator.id', $creator->id);
        $response->assertJsonPath('data.has_pending_update', true);
        $response->assertJsonCount(1, 'data.files');
        $response->assertJsonCount(1, 'data.stores');
        $response->assertJsonPath('data.course', null);

        // Newest first.
        $this->assertSame('update_approved', $response->json('data.history.0.event'));
        $this->assertSame($creator->id, $response->json('data.history.0.actor.id'));
        $this->assertSame('created', $response->json('data.history.1.event'));
        $this->assertSame($admin->id, $response->json('data.history.1.actor.id'));
    }

    public function testNonAdminCannotViewProductDetail(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/admin/digital-products/{$product->id}")
            ->assertForbidden();
    }

    public function testWildcardRouteDoesNotShadowStaticAdminProductRoutes(): void
    {
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin)
            ->getJson('/api/v1/admin/digital-products/order-recovery-deliveries')
            ->assertOk();

        $this->stateful()->actingAs($admin)
            ->getJson('/api/v1/admin/digital-products/withdrawal-methods')
            ->assertOk();
    }

    public function testHistoryIsCappedAtFiftyNewestEvents(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        for ($i = 0; $i < 55; $i++) {
            DigitalProductReviewEvent::query()->create([
                'digital_product_id' => $product->id,
                'actor_role' => 'system',
                'event' => 'updated',
                'from_status' => 'approved',
                'to_status' => 'approved',
            ]);
        }

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}");

        $response->assertOk();
        $response->assertJsonCount(50, 'data.history');
    }

    public function testCourseProductReturnsCurriculumCounts(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'type' => 'course',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        $course = Course::query()->create([
            'digital_product_id' => $product->id,
            'instructor_user_id' => $creator->id,
            'published_at' => now(),
        ]);
        $chapter = Chapter::query()->create([
            'course_id' => $course->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);
        Lesson::query()->create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'Published',
            'content' => '<p>x</p>',
            'status' => 'published',
            'content_type' => 'readable',
            'sort_order' => 0,
        ]);
        Lesson::query()->create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'Draft',
            'content' => '<p>x</p>',
            'status' => 'draft',
            'content_type' => 'readable',
            'sort_order' => 1,
        ]);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}");

        $response->assertOk();
        $response->assertJsonPath('data.course.chapters_count', 1);
        $response->assertJsonPath('data.course.lessons_count', 2);
        $response->assertJsonPath('data.course.published_lessons_count', 1);
    }

    public function testDescriptionIsSanitizedOnWriteAndInAdminResponse(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'description' => '<p>Keep</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
        ]);

        $stored = $product->fresh()->description;
        $this->assertStringContainsString('<p>Keep</p>', $stored);
        $this->assertStringNotContainsString('<script', $stored);
        $this->assertStringNotContainsString('javascript:', $stored);

        DB::table('digital_products')->where('id', $product->id)->update([
            'description' => '<p>Legacy</p><script>alert(1)</script>',
        ]);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}");

        $response->assertOk();
        $description = (string) $response->json('data.description');
        $this->assertStringContainsString('<p>Legacy</p>', $description);
        $this->assertStringNotContainsString('<script', $description);
        $this->assertStringNotContainsString('javascript:', $description);
    }

    public function testShowReturnsSalesAndReviewsCounts(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        $this->createOrder($product, $creator, 'paid');
        $this->createOrder($product, $creator, 'pending');

        ProductReview::query()->create([
            'reviewable_id' => $product->id,
            'reviewable_type' => DigitalProduct::class,
            'user_id' => $creator->id,
            'review' => 'Great product',
            'approved' => true,
        ]);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}");

        $response->assertOk();
        $response->assertJsonPath('data.sales_count', 1);
        $response->assertJsonPath('data.reviews_count', 1);
    }

    private function createOrder(DigitalProduct $product, User $creator, string $status): StorefrontOrder
    {
        return StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'currency' => $product->currency,
            'gross_amount_cents' => 1000,
            'commission_bps' => 1000,
            'platform_fee_cents' => 100,
            'creator_earnings_cents' => 900,
            'status' => $status,
            'paid_at' => $status === 'paid' ? now() : null,
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

    private function createStore(User $creator, Workspace $workspace): Biolink
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
