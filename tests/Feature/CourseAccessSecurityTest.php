<?php

namespace Tests\Feature;

use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Courses\Models\LessonResource;
use App\Courses\Models\Chapter;
use App\Courses\Models\Enrollment;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CourseAccessSecurityTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    protected User $creator;
    protected User $student;
    protected User $otherStudent;
    protected Course $course;
    protected Chapter $chapter;
    protected Lesson $videoLesson;
    protected Lesson $readableLesson;
    protected LessonResource $resource;
    protected $workspace;

    protected function setUp(): void
    {
        parent::setUp();
        ActiveWorkspace::clearCache();

        $this->creator = User::factory()->create();
        $this->student = User::factory()->create();
        $this->otherStudent = User::factory()->create();

        // Create workspace for creator
        $this->workspace = (new CreateWorkspace())->createPersonalWorkspace($this->creator);

        // Create a course product
        $product = DigitalProduct::create([
            'user_id' => $this->creator->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'Test Course',
            'description' => 'Test course description',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'course',
        ]);

        $this->course = \App\Courses\Models\Course::create([
            'digital_product_id' => $product->id,
            'published_at' => now(),
        ]);

        $chapter = $this->chapter = Chapter::create([
            'course_id' => $this->course->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);

        // Create video lesson
        $this->videoLesson = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $this->course->id,
            'title' => 'Video Lesson',
            'content' => '<p>Video summary</p>',
            'video_type' => 'external',
            'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'status' => 'published',
            'content_type' => 'video',
            'sort_order' => 0,
        ]);

        // Create readable lesson
        $this->readableLesson = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $this->course->id,
            'title' => 'Readable Lesson',
            'content' => '<p>Full readable content</p>',
            'status' => 'published',
            'content_type' => 'readable',
            'sort_order' => 1,
        ]);

        // Create a resource for the video lesson
        $file = FileEntry::create([
            'workspace_id' => $this->workspace->id,
            'name' => 'test.pdf',
            'file_name' => 'test.pdf',
            'extension' => 'pdf',
            'mime' => 'application/pdf',
            'file_size' => 1024,
            'disk_prefix' => 'test',
            'type' => 'file',
            'public' => true,
            'user_id' => (string) $this->creator->id,
        ]);

        $this->resource = LessonResource::create([
            'lesson_id' => $this->videoLesson->id,
            'file_entry_id' => $file->id,
            'display_name' => 'Test Resource',
            'size' => 1024,
            'mime' => 'application/pdf',
            'sort_order' => 0,
        ]);

        // Enroll the student in the course
        Enrollment::create([
            'course_id' => $this->course->id,
            'user_id' => $this->student->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);
    }

    /** @test */
    public function non_enrolled_user_cannot_access_lesson_content_via_student_lesson_endpoint()
    {
        // otherStudent is NOT enrolled in the course
        $response = $this->stateful()
            ->actingAs($this->otherStudent)
            ->getJson("/api/v1/courses/{$this->course->id}/learn/lessons/{$this->videoLesson->id}?workspace_id={$this->workspace->id}");

        // Should be forbidden (403) because user is not enrolled
        $response->assertForbidden();
    }

    /** @test */
    public function enrolled_user_can_access_their_lesson_content()
    {
        $response = $this->stateful()
            ->actingAs($this->student)
            ->getJson("/api/v1/courses/{$this->course->id}/learn/lessons/{$this->videoLesson->id}?workspace_id={$this->workspace->id}");

        $response->assertOk()
            ->assertJsonPath('data.title', 'Video Lesson')
            ->assertJsonPath('data.video_type', 'external');
    }

    /** @test */
    public function non_enrolled_user_cannot_download_resource_even_with_valid_resource_id()
    {
        // otherStudent is NOT enrolled, but tries to download a resource from the course
        $response = $this->stateful()
            ->actingAs($this->otherStudent)
            ->get("/api/v1/course-lesson-resources/{$this->resource->id}/download?workspace_id={$this->workspace->id}");

        // Should be forbidden because user is not enrolled in the course
        $response->assertForbidden();
    }

    /** @test */
    public function enrolled_user_can_download_resource_from_their_course()
    {
        $response = $this->stateful()
            ->actingAs($this->student)
            ->get("/api/v1/course-lesson-resources/{$this->resource->id}/download?workspace_id={$this->workspace->id}");

        // Should be allowed (or at least not forbidden)
        // Note: actual file download might fail because file doesn't exist on disk,
        // but the authorization should pass (not 403)
        $this->assertNotEquals(403, $response->getStatusCode());
    }

    /** @test */
    public function user_enrolled_in_course_a_cannot_access_resource_from_course_b_via_idor()
    {
        // Create a second course and resource
        $otherProduct = \App\Storefront\Models\DigitalProduct::create([
            'user_id' => $this->creator->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'Other Course',
            'description' => 'Other course',
            'price_cents' => 2000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'course',
        ]);

        $otherCourse = \App\Courses\Models\Course::create([
            'digital_product_id' => $otherProduct->id,
            'published_at' => now(),
        ]);

        $otherChapter = \App\Courses\Models\Chapter::create([
            'course_id' => $otherCourse->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);

        $otherLesson = Lesson::create([
            'chapter_id' => $otherChapter->id,
            'course_id' => $otherCourse->id,
            'title' => 'Other Lesson',
            'content' => '<p>Other content</p>',
            'status' => 'published',
            'content_type' => 'readable',
            'sort_order' => 0,
        ]);

        $otherFile = FileEntry::create([
            'workspace_id' => $this->workspace->id,
            'name' => 'secret.pdf',
            'file_name' => 'secret.pdf',
            'extension' => 'pdf',
            'mime' => 'application/pdf',
            'file_size' => 2048,
            'disk_prefix' => 'test',
            'type' => 'file',
            'public' => true,
            'user_id' => (string) $this->creator->id,
        ]);

        $otherResource = LessonResource::create([
            'lesson_id' => $otherLesson->id,
            'file_entry_id' => $otherFile->id,
            'display_name' => 'Secret Resource',
            'size' => 2048,
            'mime' => 'application/pdf',
            'sort_order' => 0,
        ]);

        // Student is enrolled in course A, tries to download resource from course B
        // by passing the other resource's ID directly
        $response = $this->stateful()
            ->actingAs($this->student)
            ->get("/api/v1/course-lesson-resources/{$otherResource->id}/download?workspace_id={$this->workspace->id}");

        // Should be forbidden because student is not enrolled in course B
        $response->assertForbidden();
    }

    /** @test */
    public function lesson_content_edit_on_approved_course_reverts_product_to_draft()
    {
        // Verify course is approved
        $this->assertEquals('approved', $this->course->product->status);

        // Update the video lesson content (simulating seller editing lesson content)
        $response = $this->stateful()
            ->actingAs($this->creator)
            ->putJson("/api/v1/course-lessons/{$this->videoLesson->id}?workspace_id={$this->workspace->id}", [
                'title' => 'Updated Video Lesson',
                'content' => '<p>Updated summary</p>',
            ]);

        $response->assertOk();

        // Refresh and check product status - should now be 'draft' (re-review required)
        $this->course->product->refresh();
        $this->assertEquals('draft', $this->course->product->status,
            'Editing lesson content on an approved course should revert it to draft');
        $this->course->refresh();
        $this->assertNull($this->course->published_at,
            'Editing lesson content on an approved course should unpublish it');
    }

    /** @test */
    public function lesson_sort_order_only_edit_does_not_revert_approved_course()
    {
        // Verify course is approved
        $this->assertEquals('approved', $this->course->product->status);

        // Pure reordering via the update endpoint (drag-reorder in the UI uses the
        // dedicated POST .../lessons/reorder endpoint instead, but the PUT endpoint
        // also accepts sort_order, so guard it explicitly)
        $response = $this->stateful()
            ->actingAs($this->creator)
            ->putJson("/api/v1/course-lessons/{$this->videoLesson->id}?workspace_id={$this->workspace->id}", [
                'sort_order' => 5,
            ]);

        $response->assertOk();

        // Refresh and check product status - should still be 'approved'
        $this->course->product->refresh();
        $this->assertEquals('approved', $this->course->product->status,
            'Pure sort_order edits should NOT revert an approved course to draft');
    }

    /** @test */
    public function course_edit_on_approved_course_reverts_to_draft()
    {
        // Verify course is approved
        $this->assertEquals('approved', $this->course->product->status);

        // Update the course (simulating seller editing course details)
        $response = $this->stateful()
            ->actingAs($this->creator)
            ->putJson("/api/v1/courses/{$this->course->id}?workspace_id={$this->workspace->id}", [
                'title' => 'Updated Course Title',
            ]);

        $response->assertOk();

        // Refresh and check product status - should be 'draft'
        $this->course->product->refresh();
        $this->assertEquals('draft', $this->course->product->status,
            'Editing an approved course should revert to draft');
    }

    /** @test */
    public function lesson_resource_add_reverts_approved_course_to_draft()
    {
        $this->assertEquals('approved', $this->course->product->status);

        $file = FileEntry::create([
            'workspace_id' => $this->workspace->id,
            'name' => 'slides.pdf',
            'file_name' => 'slides.pdf',
            'extension' => 'pdf',
            'mime' => 'application/pdf',
            'file_size' => 2048,
            'disk_prefix' => 'test',
            'type' => 'file',
            'public' => true,
            'user_id' => (string) $this->creator->id,
        ]);

        $response = $this->stateful()
            ->actingAs($this->creator)
            ->postJson("/api/v1/course-lessons/{$this->videoLesson->id}/resources?workspace_id={$this->workspace->id}", [
                'file_entry_id' => $file->id,
            ]);

        $response->assertCreated();

        $this->course->product->refresh();
        $this->assertEquals('draft', $this->course->product->status,
            'Adding a lesson attachment on an approved course should revert it to draft');
        $this->course->refresh();
        $this->assertNull($this->course->published_at,
            'Adding a lesson attachment on an approved course should unpublish it');
    }

    /** @test */
    public function lesson_resource_remove_reverts_approved_course_to_draft()
    {
        $this->assertEquals('approved', $this->course->product->status);

        $response = $this->stateful()
            ->actingAs($this->creator)
            ->deleteJson("/api/v1/course-lesson-resources/{$this->resource->id}?workspace_id={$this->workspace->id}");

        $response->assertNoContent();

        $this->course->product->refresh();
        $this->assertEquals('draft', $this->course->product->status,
            'Removing a lesson attachment on an approved course should revert it to draft');
        $this->course->refresh();
        $this->assertNull($this->course->published_at,
            'Removing a lesson attachment on an approved course should unpublish it');
    }

    /** @test */
    public function lesson_delete_reverts_approved_course_to_draft()
    {
        $this->assertEquals('approved', $this->course->product->status);

        $response = $this->stateful()
            ->actingAs($this->creator)
            ->deleteJson("/api/v1/course-lessons/{$this->readableLesson->id}?workspace_id={$this->workspace->id}");

        $response->assertNoContent();

        $this->course->product->refresh();
        $this->assertEquals('draft', $this->course->product->status,
            'Deleting a lesson on an approved course should revert it to draft');
        $this->course->refresh();
        $this->assertNull($this->course->published_at,
            'Deleting a lesson on an approved course should unpublish it');
    }

    /** @test */
    public function lesson_duplicate_reverts_approved_course_to_draft()
    {
        $this->assertEquals('approved', $this->course->product->status);

        $response = $this->stateful()
            ->actingAs($this->creator)
            ->postJson("/api/v1/course-lessons/{$this->videoLesson->id}/duplicate?workspace_id={$this->workspace->id}");

        $response->assertCreated();

        $this->course->product->refresh();
        $this->assertEquals('draft', $this->course->product->status,
            'Duplicating a lesson on an approved course should revert it to draft');
        $this->course->refresh();
        $this->assertNull($this->course->published_at,
            'Duplicating a lesson on an approved course should unpublish it');
    }

    /** @test */
    public function chapter_delete_reverts_approved_course_to_draft()
    {
        $this->assertEquals('approved', $this->course->product->status);

        $response = $this->stateful()
            ->actingAs($this->creator)
            ->deleteJson("/api/v1/course-chapters/{$this->chapter->id}?workspace_id={$this->workspace->id}");

        $response->assertNoContent();

        $this->course->product->refresh();
        $this->assertEquals('draft', $this->course->product->status,
            'Deleting a chapter on an approved course should revert it to draft');
        $this->course->refresh();
        $this->assertNull($this->course->published_at,
            'Deleting a chapter on an approved course should unpublish it');
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}