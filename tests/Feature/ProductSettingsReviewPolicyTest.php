<?php

namespace Tests\Feature;

use App\Courses\Models\Course;
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

class ProductSettingsReviewPolicyTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()
            ->whereIn('name', [
                'product.min_price_cents',
                'product.max_price_cents',
                'product.allow_free_products',
                'product.adding_requires_review',
                'product.updating_requires_review',
            ])
            ->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function testSubmitApprovesImmediatelyWhenAddingReviewDisabled(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);
        settings()->save(['product.adding_requires_review' => 0]);

        $created = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Direct Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $created->assertStatus(201);
        $productId = $created->json('data.id');

        $submitted = $this->stateful()->actingAs($creator)->postJson(
            "/api/v1/digital-products/{$productId}/submit",
        );
        $submitted->assertOk();

        $this->assertSame('approved', DigitalProduct::find($productId)->status);
        $this->assertNotNull(DigitalProduct::find($productId)->approved_at);
    }

    public function testSubmitPendsWhenAddingReviewEnabled(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);
        settings()->save(['product.adding_requires_review' => 1]);

        $created = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Reviewed Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $created->assertStatus(201);
        $productId = $created->json('data.id');

        $submitted = $this->stateful()->actingAs($creator)->postJson(
            "/api/v1/digital-products/{$productId}/submit",
        );
        $submitted->assertOk();

        $this->assertSame('pending_approval', DigitalProduct::find($productId)->status);
    }

    public function testCourseSubmitApprovesWhenPlatformAndEnvAllow(): void
    {
        config()->set('store.courses_require_approval', false);
        settings()->save(['product.adding_requires_review' => 0]);
        [$creator, $product] = $this->createSubmittableCourse();

        $submitted = $this->stateful()->actingAs($creator)->postJson(
            "/api/v1/digital-products/{$product->id}/submit",
        );
        $submitted->assertOk();

        $this->assertSame('approved', $product->fresh()->status);
    }

    public function testCourseSubmitPendsWhenEnvRequiresReviewEvenIfPlatformOff(): void
    {
        config()->set('store.courses_require_approval', true);
        settings()->save(['product.adding_requires_review' => 0]);
        [$creator, $product] = $this->createSubmittableCourse();

        $submitted = $this->stateful()->actingAs($creator)->postJson(
            "/api/v1/digital-products/{$product->id}/submit",
        );
        $submitted->assertOk();
        $submitted->assertJsonStructure(['data' => ['course', 'cover']]);

        $this->assertSame('pending_approval', $product->fresh()->status);
    }

    public function testUpdateKeepsApprovalWhenUpdatingReviewDisabled(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);

        $created = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Live Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $created->assertStatus(201);
        $productId = $created->json('data.id');
        DigitalProduct::query()->whereKey($productId)->update([
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        settings()->save(['product.updating_requires_review' => 0]);

        $response = $this->stateful()->actingAs($creator)->put(
            "/api/v1/digital-products/{$productId}",
            [
                'title' => 'Live Guide v2',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $response->assertOk();

        $this->assertSame('approved', DigitalProduct::find($productId)->status);
    }

    public function testUpdateQueuesReviewWhenUpdatingReviewEnabled(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);

        $created = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Live Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $created->assertStatus(201);
        $productId = $created->json('data.id');
        DigitalProduct::query()->whereKey($productId)->update([
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        settings()->save(['product.updating_requires_review' => 1]);

        $response = $this->stateful()->actingAs($creator)->put(
            "/api/v1/digital-products/{$productId}",
            [
                'title' => 'Live Guide v2',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $response->assertOk();

        $updated = DigitalProduct::find($productId);
        $this->assertSame('approved', $updated->status);
        $this->assertNotNull($updated->review_requested_at);
    }

    public function testLessonEditKeepsCourseApprovalWhenUpdatingReviewDisabled(): void
    {
        settings()->save(['product.updating_requires_review' => 0]);
        [$creator, $product, $lessonId] = $this->createApprovedCourseWithLesson();

        $response = $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/course-lessons/{$lessonId}",
            ['title' => 'Renamed Lesson'],
        );
        $response->assertOk();

        $this->assertSame('approved', $product->fresh()->status);
        $this->assertNotNull($product->fresh()->course->published_at);
    }

    public function testCoursePriceChangeBypassingPolicyIsRejected(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        ActiveWorkspace::clearCache();

        $created = $this->stateful()->actingAs($creator)->postJson(
            "/api/v1/digital-products?workspace_id={$workspace->id}",
            [
                'title' => 'Course',
                'price_cents' => 2000,
                'type' => 'course',
            ],
        );
        $created->assertCreated();
        $courseId = $created->json('data.course.id');

        settings()->save(['product.min_price_cents' => 50000]);

        $response = $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/courses/{$courseId}",
            ['price_cents' => 1000],
        );
        $response->assertStatus(422);
    }

    public function testDefaultsRequireReview(): void
    {
        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();

        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace);

        $created = $this->stateful()->actingAs($creator)->post(
            '/api/v1/digital-products',
            [
                'title' => 'Default Policy Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $created->assertStatus(201);
        $productId = $created->json('data.id');

        $this->stateful()->actingAs($creator)->postJson(
            "/api/v1/digital-products/{$productId}/submit",
        )->assertOk();
        $this->assertSame('pending_approval', DigitalProduct::find($productId)->status);

        DigitalProduct::query()->whereKey($productId)->update([
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        $this->stateful()->actingAs($creator)->put(
            "/api/v1/digital-products/{$productId}",
            [
                'title' => 'Default Policy Guide v2',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        )->assertOk();
        $updated = DigitalProduct::find($productId);
        $this->assertSame('approved', $updated->status);
        $this->assertNotNull($updated->review_requested_at);
    }

    /**
     * @return array{User, DigitalProduct}
     */
    private function createSubmittableCourse(): array
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        ActiveWorkspace::clearCache();

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Course ' . Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'draft',
            'type' => 'course',
        ]);
        Course::firstOrCreate(
            ['digital_product_id' => $product->id],
            ['instructor_user_id' => $creator->id],
        );
        $product = $product->fresh()->load('course');

        $chapter = $this->stateful()->actingAs($creator)->postJson(
            "/api/v1/courses/{$product->course->id}/chapters",
            ['title' => 'Chapter 1'],
        );
        $chapter->assertCreated();

        $lesson = $this->stateful()->actingAs($creator)->postJson(
            "/api/v1/course-chapters/{$chapter->json('data.id')}/lessons",
            ['title' => 'Lesson 1', 'content_type' => 'readable'],
        );
        $lesson->assertCreated();

        $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/course-lessons/{$lesson->json('data.id')}",
            ['status' => 'published'],
        )->assertOk();

        return [$creator, $product->fresh()->load('course')];
    }

    /**
     * @return array{User, DigitalProduct, int}
     */
    private function createApprovedCourseWithLesson(): array
    {
        [$creator, $product] = $this->createSubmittableCourse();

        $lessonId = \App\Courses\Models\Lesson::where(
            'course_id',
            $product->course->id,
        )->value('id');

        DigitalProduct::query()->whereKey($product->id)->update([
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        Course::whereKey($product->course->id)->update([
            'published_at' => now(),
        ]);

        return [$creator, $product->fresh()->load('course'), $lessonId];
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
