<?php

namespace Tests\Feature;

use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
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

    private function createCourseProduct(User $creator, $workspace, int $priceCents = 1000): DigitalProduct
    {
        $product = DigitalProduct::create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Course ' . Str::random(6),
            'price_cents' => $priceCents,
            'currency' => 'ETB',
            'status' => 'draft',
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::firstOrCreate(['digital_product_id' => $product->id], ['instructor_user_id' => $creator->id]);
        return $product->fresh()->load('course');
    }

    public function testCreatorCanCreateCourseProduct(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $response = $this->stateful()->actingAs($creator)->postJson("/api/v1/digital-products?workspace_id={$workspace->id}", [
            'title' => 'My Course',
            'price_cents' => 2000,
            'type' => 'course',
            'description' => 'Test course',
        ]);
        $response->assertCreated();
        $this->assertEquals('course', $response->json('data.type'));
        $productId = $response->json('data.id');
        $this->assertDatabaseHas('courses', ['digital_product_id' => $productId]);
    }

    public function testOwnerCanManageChaptersAndLessons(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $course = $product->course;

        // Create chapter
        $resp = $this->stateful()->actingAs($creator)->postJson("/api/v1/courses/{$course->id}/chapters", ['title' => 'Chapter 1']);
        $resp->assertCreated();
        $chapterId = $resp->json('data.id');

        // Rename chapter
        $this->stateful()->actingAs($creator)->putJson("/api/v1/course-chapters/{$chapterId}", ['title' => 'Intro'])->assertOk();

        // Create lesson
        $less = $this->stateful()->actingAs($creator)->postJson("/api/v1/course-chapters/{$chapterId}/lessons", ['title' => 'Lesson 1']);
        $less->assertCreated();
        $lessonId = $less->json('data.id');

        // Update lesson with content
        $this->stateful()->actingAs($creator)->putJson("/api/v1/course-lessons/{$lessonId}", [
            'title' => 'Lesson 1 updated',
            'content' => '<p>Hello</p>',
            'status' => 'published',
        ])->assertOk();

        $this->assertDatabaseHas('course_lessons', ['id' => $lessonId, 'status' => 'published']);
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

        $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/digital-products/{$product->id}/submit")
            ->assertOk();

        $this->assertSame('pending_approval', $product->fresh()->status);
        $this->assertNotNull($course->fresh()->published_at);
    }

    public function testOtherCreatorCannotEditCourse(): void
    {
        $creatorA = $this->createCreator();
        $creatorB = $this->createCreator();
        $workspaceA = (new CreateWorkspace())->createPersonalWorkspace($creatorA);
        $workspaceB = (new CreateWorkspace())->createPersonalWorkspace($creatorB);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creatorA, $workspaceA);
        $course = $product->course;
        // Try as B to add chapter
        // Need to set active workspace to B's workspace
        ActiveWorkspace::clearCache();
        // Force workspace context via header? Use workspace_id param but assertOwner checks ActiveWorkspace::get()->id
        // So we need to set workspace header via query? The middleware uses ActiveWorkspace which resolves from ?workspace_id
        // We'll try acting as B with workspace_id=B
        $this->stateful()->actingAs($creatorB)->postJson("/api/v1/courses/{$course->id}/chapters?workspace_id={$workspaceB->id}", ['title' => 'Hacked'])
            ->assertStatus(403);
    }

    public function testDraftLessonsHiddenAndSequentialEnforcement(): void
    {
        $creator = $this->createCreator();
        $student = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $workspace);
        $course = $product->course;
        $course->update(['require_sequential_completion' => true, 'published_at' => now()]);
        $product->update(['status' => 'approved', 'approved_at' => now()]);
        // Create chapters/lessons
        $chapter = \App\Courses\Models\Chapter::create(['course_id' => $course->id, 'title' => 'Ch 1', 'sort_order' => 0]);
        $l1 = Lesson::create(['chapter_id' => $chapter->id, 'course_id' => $course->id, 'title' => 'L1', 'status' => 'published', 'sort_order' => 0]);
        $l2 = Lesson::create(['chapter_id' => $chapter->id, 'course_id' => $course->id, 'title' => 'L2', 'status' => 'published', 'sort_order' => 1]);
        $l3 = Lesson::create(['chapter_id' => $chapter->id, 'course_id' => $course->id, 'title' => 'L3 Draft', 'status' => 'draft', 'sort_order' => 2]);

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
        app(\App\Courses\Services\EnrollmentService::class)->grantFromOrder($order->fresh('product.course'));

        // Student can access L1 (first)
        $this->stateful()->actingAs($student)->getJson("/api/v1/courses/{$course->id}/learn/lessons/{$l1->id}")->assertOk();
        // L2 locked before completing L1
        $this->stateful()->actingAs($student)->getJson("/api/v1/courses/{$course->id}/learn/lessons/{$l2->id}")->assertStatus(403);
        // Complete L1
        $this->stateful()->actingAs($student)->postJson("/api/v1/course-lessons/{$l1->id}/complete")->assertOk();
        // Now L2 unlocked
        $this->stateful()->actingAs($student)->getJson("/api/v1/courses/{$course->id}/learn/lessons/{$l2->id}")->assertOk();
        // Draft lesson never accessible even after
        $this->stateful()->actingAs($student)->getJson("/api/v1/courses/{$course->id}/learn/lessons/{$l3->id}")->assertStatus(403);
        // Progress percent
        $this->stateful()->actingAs($student)->getJson("/api/v1/courses/{$course->id}/progress")->assertOk()->assertJsonPath('data.percent', 50);
        // Duplicate complete idempotent
        $this->stateful()->actingAs($student)->postJson("/api/v1/course-lessons/{$l1->id}/complete")->assertOk();
        $this->assertEquals(1, \App\Courses\Models\LessonProgress::where('user_id', $student->id)->where('lesson_id', $l1->id)->count());
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
        $this->assertEquals(1, \App\Courses\Models\Enrollment::where('user_id', $student->id)->where('course_id', $product->course->id)->count());
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
