<?php

namespace Tests\Feature;

use App\Courses\Models\Chapter;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class QuizSecurityTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';
        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function createCourseWithLesson(User $creator, $workspace, string $status = 'approved'): array
    {
        $product = DigitalProduct::create([
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'title' => 'Course '.\Illuminate\Support\Str::random(4),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => $status,
            'approved_at' => $status === 'approved' ? now() : null,
            'type' => 'course',
        ]);
        $course = \App\Courses\Models\Course::create(['digital_product_id' => $product->id, 'published_at' => $status === 'approved' ? now() : null]);
        $chapter = Chapter::create(['course_id' => $course->id, 'title' => 'Ch 1', 'sort_order' => 0]);
        $lesson = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'Lesson 1',
            'content' => '<p>hi</p>',
            'status' => 'published',
            'content_type' => 'readable',
            'sort_order' => 0,
        ]);
        return [$product, $course, $chapter, $lesson];
    }

    private function enroll(User $user, $course): void
    {
        \App\Courses\Models\Enrollment::create([
            'course_id' => $course->id,
            'user_id' => $user->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);
    }

    private function quizPayload(array $over = []): array
    {
        return array_merge([
            'require_pass_to_progress' => false,
            'passing_score' => 70,
            'questions' => [
                ['type' => 'multiple_choice', 'question_text' => '2+2?', 'options' => ['3','4','5'], 'correct_answer' => '4'],
                ['type' => 'true_false', 'question_text' => 'Sky is blue', 'correct_answer' => 'true'],
            ],
        ], $over);
    }

    /** @test */
    public function non_enrolled_cannot_view_quiz()
    {
        $creator = User::factory()->create();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        [$product, $course, $ch, $lesson] = $this->createCourseWithLesson($creator, $ws);
        $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $this->quizPayload())->assertCreated();
        $quiz = $lesson->fresh()->quiz;

        $other = User::factory()->create();
        $this->stateful()->actingAs($other)->getJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}")->assertForbidden();
    }

    /** @test */
    public function non_enrolled_cannot_submit_quiz_attempt()
    {
        $creator = User::factory()->create();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        [$p,$c,$ch,$lesson] = $this->createCourseWithLesson($creator, $ws);
        $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $this->quizPayload())->assertCreated();
        $quiz = $lesson->fresh()->quiz()->first();
        $other = User::factory()->create();
        $this->stateful()->actingAs($other)->postJson("/api/v1/quizzes/{$quiz->id}/attempts?workspace_id={$ws->id}", ['answers' => [$quiz->questions()->first()->id => '4']])->assertForbidden();
    }

    /** @test */
    public function student_cannot_fetch_correct_answer()
    {
        $creator = User::factory()->create();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        [$p,$c,$ch,$lesson] = $this->createCourseWithLesson($creator, $ws);
        $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $this->quizPayload())->assertCreated();
        $student = User::factory()->create();
        $this->enroll($student, $c);
        // re-assert approved/published state before the security check
        $p->refresh(); $c->refresh();
        $p->update(['status' => 'approved', 'approved_at' => now()]); $c->update(['published_at' => now()]);
        $c->refresh(); $lesson->refresh();
        $res = $this->stateful()->actingAs($student)->getJson("/api/v1/course-lessons/{$lesson->id}/quiz")->assertOk();
        $qs = $res->json('data.questions');
        $this->assertNotEmpty($qs);
        foreach ($qs as $q) {
            $this->assertArrayNotHasKey('correct_answer', $q, 'correct_answer leaked to student');
        }
    }

    /** @test */
    public function instructor_can_see_correct_answer()
    {
        $creator = User::factory()->create();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        [$p,$c,$ch,$lesson] = $this->createCourseWithLesson($creator, $ws);
        $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $this->quizPayload())->assertCreated();
        $res = $this->stateful()->actingAs($creator)->getJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}")->assertOk();
        $this->assertArrayHasKey('correct_answer', $res->json('data.questions.0'));
    }

    /** @test */
    public function student_cannot_view_another_students_attempts()
    {
        $creator = User::factory()->create();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        [$p,$c,$ch,$lesson] = $this->createCourseWithLesson($creator, $ws);
        $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $this->quizPayload())->assertCreated();
        $quiz = $lesson->fresh()->quiz()->first();
        // re-assert approved/published state - use fresh models to avoid stale isDirty check
        $p->refresh(); $c->refresh();
        $p->update(['status' => 'approved', 'approved_at' => now()]); $c->update(['published_at' => now()]);
        $c->refresh(); $p->refresh();
        $s1 = User::factory()->create(); $s2 = User::factory()->create();
        $this->enroll($s1,$c); $this->enroll($s2,$c);
        ActiveWorkspace::clearCache();
        // s1 submits
        $q = $quiz->questions()->first();
        $this->stateful()->actingAs($s1)->postJson("/api/v1/quizzes/{$quiz->id}/attempts", ['answers' => [$q->id => '4']])->assertCreated();
        // s2 fetches own attempts -> should be 0
        $res = $this->stateful()->actingAs($s2)->getJson("/api/v1/quizzes/{$quiz->id}/attempts?workspace_id={$ws->id}")->assertOk();
        $this->assertCount(0, $res->json('data'));
        // s1 fetches own -> 1
        $res2 = $this->stateful()->actingAs($s1)->getJson("/api/v1/quizzes/{$quiz->id}/attempts?workspace_id={$ws->id}")->assertOk();
        $this->assertCount(1, $res2->json('data'));
    }

    /** @test */
    public function non_owner_cannot_create_update_delete_quiz()
    {
        $creator = User::factory()->create();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        [$p,$c,$ch,$lesson] = $this->createCourseWithLesson($creator, $ws);
        $other = User::factory()->create();
        // create
        $this->stateful()->actingAs($other)->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $this->quizPayload())->assertForbidden();
        ActiveWorkspace::clearCache();
        // create as owner then try update/delete as other
        $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $this->quizPayload())->assertCreated();
        $quiz = $lesson->fresh()->quiz()->first();
        $this->stateful()->actingAs($other)->putJson("/api/v1/quizzes/{$quiz->id}?workspace_id={$ws->id}", ['passing_score' => 90])->assertForbidden();
        $this->stateful()->actingAs($other)->deleteJson("/api/v1/quizzes/{$quiz->id}?workspace_id={$ws->id}")->assertForbidden();
    }

    /** @test */
    public function quiz_create_queues_review_on_approved_course()
    {
        $creator = User::factory()->create();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        [$p,$c,$ch,$lesson] = $this->createCourseWithLesson($creator, $ws, 'approved');
        $this->assertEquals('approved', $p->fresh()->status);
        $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $this->quizPayload())->assertCreated();

        $fresh = $p->fresh();
        $this->assertEquals('approved', $fresh->status);
        $this->assertNotNull($fresh->review_requested_at);
        $this->assertNotNull($c->fresh()->published_at);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $p->id,
            'event' => 'updated',
        ]);
    }

    /** @test */
    public function quiz_update_queues_review()
    {
        $creator = User::factory()->create();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        [$p,$c,$ch,$lesson] = $this->createCourseWithLesson($creator, $ws, 'approved');
        $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $this->quizPayload())->assertCreated();
        // reset to approved with a clean review flag so the update is what queues the review
        $p->update(['status' => 'approved', 'approved_at' => now(), 'review_requested_at' => null, 'review_requested_by' => null]); $c->update(['published_at' => now()]);
        $quiz = $lesson->fresh()->quiz()->first();
        $this->stateful()->actingAs($creator)->putJson("/api/v1/quizzes/{$quiz->id}?workspace_id={$ws->id}", ['passing_score' => 80])->assertOk();

        $fresh = $p->fresh();
        $this->assertEquals('approved', $fresh->status);
        $this->assertNotNull($fresh->review_requested_at);
        $this->assertNotNull($c->fresh()->published_at);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $p->id,
            'event' => 'updated',
        ]);
    }
}
