<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CourseSystemTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function createCreator(): User
    {
        $token = Str::lower(Str::random(12));
        return User::query()->forceCreate([
            'name' => 'Creator ' . $token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function createCourseProduct(
        User $creator,
        $workspace,
        int $priceCents = 1000,
    ): DigitalProduct {
        $product = DigitalProduct::create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Course ' . Str::random(6),
            'price_cents' => $priceCents,
            'currency' => 'ETB',
            'status' => 'draft',
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::firstOrCreate(
            ['digital_product_id' => $product->id],
            ['instructor_user_id' => $creator->id],
        );
        return $product->fresh()->load('course');
    }

    public function testCreatorCanCreateCourseProduct(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $response = $this->stateful()
            ->actingAs($creator)
            ->postJson(
                "/api/v1/items?workspace_id={$workspace->id}",
                [
                    'title' => 'My Course',
                    'price_cents' => 2000,
                    'type' => 'course',
                    'description' => 'Test course',
                ],
            );
        $response->assertCreated();
        $this->assertEquals('course', $response->json('data.type'));
        $productId = $response->json('data.id');
        $this->assertDatabaseHas('courses', [
            'digital_product_id' => $productId,
        ]);
    }

    public function testCreatorCannotUseAnotherWorkspacesCoverWhenCreatingCourse(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $otherCreator = $this->createCreator();
        $otherWorkspace = (new CreateWorkspace())->createPersonalWorkspace(
            $otherCreator,
        );
        ActiveWorkspace::clearCache();
        $cover = FileEntry::create([
            'name' => 'private-cover.png',
            'file_name' => 'private-cover.png',
            'file_size' => 1024,
            'mime' => 'image/png',
            'extension' => 'png',
            'type' => 'file',
            'public' => true,
            'user_id' => (string) $otherCreator->id,
            'disk_prefix' => 'uploads',
            'workspace_id' => $otherWorkspace->id,
        ]);

        $this->stateful()
            ->actingAs($creator)
            ->postJson(
                "/api/v1/items?workspace_id={$workspace->id}",
                [
                    'title' => 'My Course',
                    'price_cents' => 2000,
                    'type' => 'course',
                    'cover_file_entry_id' => $cover->id,
                ],
            )
            ->assertStatus(422);
    }

    public function testCreatorCannotUseAnotherWorkspacesCoverWhenUpdatingCourse(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $otherCreator = $this->createCreator();
        $otherWorkspace = (new CreateWorkspace())->createPersonalWorkspace(
            $otherCreator,
        );
        $product = $this->createCourseProduct($creator, $workspace);
        $cover = FileEntry::create([
            'name' => 'private-cover.png',
            'file_name' => 'private-cover.png',
            'file_size' => 1024,
            'mime' => 'image/png',
            'extension' => 'png',
            'type' => 'file',
            'public' => true,
            'user_id' => (string) $otherCreator->id,
            'disk_prefix' => 'uploads',
            'workspace_id' => $otherWorkspace->id,
        ]);

        ActiveWorkspace::clearCache();

        $this->stateful()
            ->actingAs($creator)
            ->putJson(
                "/api/v1/items/{$product->id}?workspace_id={$workspace->id}",
                [
                    'title' => $product->title,
                    'price_cents' => $product->price_cents,
                    'type' => 'course',
                    'cover_file_entry_id' => $cover->id,
                ],
            )
            ->assertStatus(422);
    }

    public function testCreatorCannotAttachAnotherWorkspacesFileToProduct(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $otherCreator = $this->createCreator();
        $otherWorkspace = (new CreateWorkspace())->createPersonalWorkspace(
            $otherCreator,
        );
        $file = FileEntry::create([
            'name' => 'private-guide.pdf',
            'file_name' => 'private-guide.pdf',
            'file_size' => 1024,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'public' => false,
            'user_id' => (string) $otherCreator->id,
            'disk_prefix' => 'digital-products',
            'workspace_id' => $otherWorkspace->id,
        ]);

        ActiveWorkspace::clearCache();

        $response = $this->stateful()
            ->actingAs($creator)
            ->postJson(
                "/api/v1/items?workspace_id={$workspace->id}",
                [
                    'title' => 'My Guide',
                    'price_cents' => 1000,
                    'file_ids' => [$file->id],
                ],
            );

        $response->assertStatus(422);
        $this->assertDatabaseMissing('digital_products', [
            'workspace_id' => $workspace->id,
            'title' => 'My Guide',
        ]);
    }

    public function testOwnerCanManageChaptersAndLessons(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $course = $product->course;

        // Create chapter
        $resp = $this->stateful()
            ->actingAs($creator)
            ->postJson("/api/v1/courses/{$course->id}/chapters", [
                'title' => 'Chapter 1',
            ]);
        $resp->assertCreated();
        $chapterId = $resp->json('data.id');

        // Rename chapter
        $this->stateful()
            ->actingAs($creator)
            ->putJson("/api/v1/course-chapters/{$chapterId}", [
                'title' => 'Intro',
            ])
            ->assertOk();

        // Create lesson
        $less = $this->stateful()
            ->actingAs($creator)
            ->postJson("/api/v1/course-chapters/{$chapterId}/lessons", [
                'title' => 'Lesson 1',
                'content_type' => 'video',
            ]);
        $less->assertCreated();
        $lessonId = $less->json('data.id');

        // Update lesson with content
        $this->stateful()
            ->actingAs($creator)
            ->putJson("/api/v1/course-lessons/{$lessonId}", [
                'title' => 'Lesson 1 updated',
                'content' => '<p>Hello</p>',
                'status' => 'published',
            ])
            ->assertOk();

        $this->assertDatabaseHas('course_lessons', [
            'id' => $lessonId,
            'status' => 'published',
        ]);
    }

    public function testNewLessonButtonPayloadCreatesLesson(): void
    {
        // Regression test (prod 422): the curriculum sidebar's "New lesson"
        // button sends exactly {title, content_type: 'video'}. If the API
        // ever requires more than this again, lesson creation breaks for
        // every creator, so lock the contract in here.
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $course = $product->course;

        $resp = $this->stateful()
            ->actingAs($creator)
            ->postJson("/api/v1/courses/{$course->id}/chapters", [
                'title' => 'Chapter 1',
            ]);
        $resp->assertCreated();
        $chapterId = $resp->json('data.id');

        $less = $this->stateful()
            ->actingAs($creator)
            ->postJson("/api/v1/course-chapters/{$chapterId}/lessons", [
                'title' => 'Lesson 1',
                'content_type' => 'video',
            ]);
        $less->assertCreated();

        $this->assertDatabaseHas('course_lessons', [
            'id' => $less->json('data.id'),
            'title' => 'Lesson 1',
            'content_type' => 'video',
        ]);
    }

    public function testSubmittingCourseForApprovalPublishesItsCurriculum(): void
    {
        config()->set('store.courses_require_approval', true);
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $course = $product->course;
        $chapter = \App\Courses\Models\Chapter::create([
            'course_id' => $course->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);
        Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'Lesson 1',
            'status' => 'published',
            'sort_order' => 0,
        ]);

        $this->stateful()
            ->actingAs($creator)
            ->postJson("/api/v1/items/{$product->id}/submit")
            ->assertOk();

        $this->assertSame('pending_approval', $product->fresh()->status);
        $this->assertNotNull($course->fresh()->published_at);
    }

    public function testApprovedCourseCannotBeSubmittedAgain(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $course = $product->course;
        $chapter = \App\Courses\Models\Chapter::create([
            'course_id' => $course->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);
        Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'Lesson 1',
            'status' => 'published',
            'sort_order' => 0,
        ]);
        $product->update(['status' => 'approved', 'approved_at' => now()]);

        $this->stateful()
            ->actingAs($creator)
            ->postJson("/api/v1/items/{$product->id}/submit")
            ->assertStatus(422);
    }

    public function testOtherCreatorCannotEditCourse(): void
    {
        $creatorA = $this->createCreator();
        $creatorB = $this->createCreator();
        $workspaceA = (new CreateWorkspace())->createPersonalWorkspace(
            $creatorA,
        );
        $workspaceB = (new CreateWorkspace())->createPersonalWorkspace(
            $creatorB,
        );
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creatorA, $workspaceA);
        $course = $product->course;
        // Try as B to add chapter
        // Need to set active workspace to B's workspace
        ActiveWorkspace::clearCache();
        // Force workspace context via header? Use workspace_id param but assertOwner checks ActiveWorkspace::get()->id
        // So we need to set workspace header via query? The middleware uses ActiveWorkspace which resolves from ?workspace_id
        // We'll try acting as B with workspace_id=B
        $this->stateful()
            ->actingAs($creatorB)
            ->postJson(
                "/api/v1/courses/{$course->id}/chapters?workspace_id={$workspaceB->id}",
                ['title' => 'Hacked'],
            )
            ->assertStatus(403);
    }

    public function testCreatorCanPlaceCourseOnStorefront(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $storefront = Biolink::query()->create([
            'name' => 'Creator storefront',
            'back_half' => Str::random(8),
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);

        $this->stateful()
            ->actingAs($creator)
            ->putJson("/api/v1/courses/{$product->course->id}", [
                'biolink_ids' => [$storefront->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.product.biolink_ids', [$storefront->id]);

        $this->assertTrue(
            $product->fresh()->biolinks()->whereKey($storefront->id)->exists(),
        );
    }

    public function testDraftLessonsHiddenAndSequentialEnforcement(): void
    {
        $creator = $this->createCreator();
        $student = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $course = $product->course;
        $course->update([
            'require_sequential_completion' => true,
            'published_at' => now(),
        ]);
        $product->update(['status' => 'approved', 'approved_at' => now()]);
        // Create chapters/lessons
        $chapter = \App\Courses\Models\Chapter::create([
            'course_id' => $course->id,
            'title' => 'Ch 1',
            'sort_order' => 0,
        ]);
        $l1 = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'L1',
            'status' => 'published',
            'sort_order' => 0,
        ]);
        $l2 = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'L2',
            'status' => 'published',
            'sort_order' => 1,
        ]);
        $l3 = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'L3 Draft',
            'status' => 'draft',
            'sort_order' => 2,
        ]);

        // Create enrollment for student
        $order = StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => $student->id,
            'buyer_email' => $student->email,
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 500,
            'platform_fee_cents' => 50,
            'creator_earnings_cents' => 950,
            'status' => 'paid',
            'paid_at' => now(),
        ]);
        app(\App\Courses\Services\EnrollmentService::class)->grantFromOrder(
            $order->fresh('product.course'),
        );

        // Student can access L1 (first)
        $this->stateful()
            ->actingAs($student)
            ->getJson("/api/v1/courses/{$course->id}/learn/lessons/{$l1->id}")
            ->assertOk();
        // L2 locked before completing L1
        $this->stateful()
            ->actingAs($student)
            ->getJson("/api/v1/courses/{$course->id}/learn/lessons/{$l2->id}")
            ->assertStatus(403);
        // Complete L1
        $this->stateful()
            ->actingAs($student)
            ->postJson("/api/v1/course-lessons/{$l1->id}/complete")
            ->assertOk();
        // Now L2 unlocked
        $this->stateful()
            ->actingAs($student)
            ->getJson("/api/v1/courses/{$course->id}/learn/lessons/{$l2->id}")
            ->assertOk();
        // Draft lesson never accessible even after
        $this->stateful()
            ->actingAs($student)
            ->getJson("/api/v1/courses/{$course->id}/learn/lessons/{$l3->id}")
            ->assertStatus(403);
        // Progress percent
        $this->stateful()
            ->actingAs($student)
            ->getJson("/api/v1/courses/{$course->id}/progress")
            ->assertOk()
            ->assertJsonPath('data.percent', 50);
        // Duplicate complete idempotent
        $this->stateful()
            ->actingAs($student)
            ->postJson("/api/v1/course-lessons/{$l1->id}/complete")
            ->assertOk();
        $this->assertEquals(
            1,
            \App\Courses\Models\LessonProgress::where('user_id', $student->id)
                ->where('lesson_id', $l1->id)
                ->count(),
        );
    }

    public function testMyCoursesIncludesCompletedAtAndNextLesson(): void
    {
        $creator = $this->createCreator();
        $student = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $course = $product->course;
        $course->update(['published_at' => now()]);
        $product->update(['status' => 'approved', 'approved_at' => now()]);
        $chapter = \App\Courses\Models\Chapter::create([
            'course_id' => $course->id,
            'title' => 'Ch 1',
            'sort_order' => 0,
        ]);
        $lesson = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'L1',
            'status' => 'published',
            'sort_order' => 0,
        ]);
        $order = StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => $student->id,
            'buyer_email' => $student->email,
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 500,
            'platform_fee_cents' => 50,
            'creator_earnings_cents' => 950,
            'status' => 'paid',
            'paid_at' => now(),
        ]);
        app(\App\Courses\Services\EnrollmentService::class)->grantFromOrder(
            $order->fresh('product.course'),
        );

        $this->stateful()
            ->actingAs($student)
            ->getJson('/api/v1/my-courses')
            ->assertOk()
            ->assertJsonPath('data.0.course_id', $course->id)
            ->assertJsonPath('data.0.next_lesson_id', $lesson->id)
            ->assertJsonPath('data.0.completed_at', null);
    }

    public function testLearnPayloadIncludesNextLessonLocksAndInstructor(): void
    {
        $creator = $this->createCreator();
        $student = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $course = $product->course;
        $course->update([
            'require_sequential_completion' => true,
            'published_at' => now(),
            'instructor_user_id' => $creator->id,
        ]);
        $product->update([
            'status' => 'approved',
            'approved_at' => now(),
            'description' => 'Learn UX fundamentals',
            'learning_outcomes' => ['Plan tests', 'Apply heuristics'],
        ]);
        $chapter = \App\Courses\Models\Chapter::create([
            'course_id' => $course->id,
            'title' => 'Ch 1',
            'sort_order' => 0,
        ]);
        $l1 = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'L1',
            'status' => 'published',
            'sort_order' => 0,
        ]);
        $l2 = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'L2',
            'status' => 'published',
            'sort_order' => 1,
        ]);
        $order = StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => $student->id,
            'buyer_email' => $student->email,
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 500,
            'platform_fee_cents' => 50,
            'creator_earnings_cents' => 950,
            'status' => 'paid',
            'paid_at' => now(),
        ]);
        app(\App\Courses\Services\EnrollmentService::class)->grantFromOrder(
            $order->fresh('product.course'),
        );

        $response = $this->stateful()
            ->actingAs($student)
            ->getJson("/api/v1/courses/{$course->id}/learn")
            ->assertOk();

        $response
            ->assertJsonPath('data.next_lesson_id', $l1->id)
            ->assertJsonPath('data.instructor.name', $creator->name)
            ->assertJsonPath('data.unlocked_lesson_ids.0', $l1->id)
            ->assertJsonPath('data.chapters.0.lessons.0.locked', false)
            ->assertJsonPath('data.chapters.0.lessons.1.locked', true);

        $this->assertNotContains(
            $l2->id,
            $response->json('data.unlocked_lesson_ids'),
        );
    }

    public function testDuplicateWebhookDoesNotDuplicateEnrollment(): void
    {
        $creator = $this->createCreator();
        $student = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $order = StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => $student->id,
            'buyer_email' => $student->email,
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 500,
            'platform_fee_cents' => 50,
            'creator_earnings_cents' => 950,
            'status' => 'pending',
        ]);
        $handler = app(\App\Storefront\StorefrontWebhookHandler::class);
        $handler->fulfill($order, $student->email, []);
        $handler->fulfill($order->fresh(), $student->email, []);
        $this->assertEquals(
            1,
            \App\Courses\Models\Enrollment::where('user_id', $student->id)
                ->where('course_id', $product->course->id)
                ->count(),
        );
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
