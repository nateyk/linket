<?php

namespace Tests\Feature;

use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Models\Enrollment;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

/**
 * Batch 0 verification for R17 (buyer learn list allegedly renders draft
 * lessons as disabled `#` links with a "Draft" badge).
 *
 * Desired behavior asserted: an enrolled student never receives draft lesson
 * titles from the student APIs.
 */
#[Group('audit-verify')]
class AuditVerifyDraftVisibilityTest extends TestCase
{
    use DatabaseTransactions;

    protected User $seller;

    protected User $student;

    protected $workspace;

    protected Course $course;

    protected string $draftMarker;

    protected Lesson $draftLesson;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    protected function setUp(): void
    {
        parent::setUp();
        ActiveWorkspace::clearCache();

        $this->seller = User::factory()->create();
        $this->student = User::factory()->create();

        $this->workspace = (new CreateWorkspace())->createPersonalWorkspace($this->seller);

        $product = DigitalProduct::create([
            'user_id' => $this->seller->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'Audit Draft Course',
            'description' => 'Verify draft visibility.',
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'course',
        ]);

        $this->course = Course::create([
            'digital_product_id' => $product->id,
            'published_at' => now(),
        ]);

        $chapter = Chapter::create([
            'course_id' => $this->course->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);

        Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $this->course->id,
            'title' => 'Published Lesson One',
            'content' => '<p>Visible.</p>',
            'status' => 'published',
            'content_type' => 'readable',
            'sort_order' => 0,
        ]);

        $this->draftMarker = 'UNPUBLISHED-DRAFT-'.Str::upper(Str::random(8));
        $this->draftLesson = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $this->course->id,
            'title' => $this->draftMarker,
            'content' => '<p>Staged content.</p>',
            'status' => 'draft',
            'content_type' => 'readable',
            'sort_order' => 1,
        ]);

        Enrollment::create([
            'course_id' => $this->course->id,
            'user_id' => $this->student->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    public function test_learn_endpoint_never_returns_draft_titles_to_enrolled_student(): void
    {
        $response = $this->stateful()->actingAs($this->student)
            ->getJson("/api/v1/courses/{$this->course->id}/learn?workspace_id={$this->workspace->id}");

        $response->assertOk();
        $response->assertDontSee($this->draftMarker, false);
        $response->assertSee('Published Lesson One', false);
    }

    public function test_draft_lesson_endpoint_is_forbidden_to_enrolled_student(): void
    {
        $this->stateful()->actingAs($this->student)
            ->getJson("/api/v1/courses/{$this->course->id}/learn/lessons/{$this->draftLesson->id}?workspace_id={$this->workspace->id}")
            ->assertForbidden();
    }

    public function test_public_curriculum_never_returns_draft_titles(): void
    {
        // Anonymous browser session (no user), like a guest buyer.
        $response = $this->stateful()
            ->getJson("/api/v1/public/courses/{$this->course->id}/curriculum");

        $response->assertOk();
        $response->assertDontSee($this->draftMarker, false);
    }
}
