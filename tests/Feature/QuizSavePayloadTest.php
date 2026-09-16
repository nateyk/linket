<?php

namespace Tests\Feature;

use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class QuizSavePayloadTest extends TestCase
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

    private function createCourseWithLesson(User $creator, $workspace): array
    {
        $product = DigitalProduct::create([
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'title' => 'Course '.substr(md5((string) mt_rand()), 0, 8),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'draft',
            'type' => 'course',
        ]);

        $course = Course::create([
            'digital_product_id' => $product->id,
            'instructor_user_id' => $creator->id,
        ]);

        $chapter = Chapter::create([
            'course_id' => $course->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);

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

    /**
     * Regression: the course-builder saveQuiz() function builds exactly this
     * payload shape. A production 422 was caused by it sending `question`
     * (not `question_text`), option objects (not strings) and a missing/
     * boolean `correct_answer`. Lock the contract to what the frontend sends.
     */
    public function test_frontend_quiz_save_payload_creates_quiz(): void
    {
        $creator = User::factory()->create();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        [, , , $lesson] = $this->createCourseWithLesson($creator, $ws);

        $payload = [
            'require_pass_to_progress' => true,
            'passing_score' => 70,
            'questions' => [
                [
                    'type' => 'multiple_choice',
                    'question_text' => 'Test Question',
                    'options' => ['arewrqwe', 'rqwerwerwer'],
                    'correct_answer' => 'arewrqwe',
                ],
                [
                    'type' => 'true_false',
                    'question_text' => 'Sky is blue',
                    'correct_answer' => 'true',
                ],
            ],
        ];

        $resp = $this->stateful()
            ->actingAs($creator)
            ->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $payload);

        $resp->assertCreated();
        $resp->assertJsonPath('data.questions.0.question_text', 'Test Question');
        $resp->assertJsonPath('data.questions.0.correct_answer', 'arewrqwe');

        $this->assertDatabaseHas('quizzes', [
            'lesson_id' => $lesson->id,
            'require_pass_to_progress' => true,
            'passing_score' => 70,
        ]);
        $this->assertDatabaseHas('quiz_questions', [
            'question_text' => 'Test Question',
            'correct_answer' => 'arewrqwe',
        ]);
        $this->assertDatabaseHas('quiz_questions', [
            'question_text' => 'Sky is blue',
            'correct_answer' => 'true',
        ]);
    }

    /**
     * Documents the exact production failure so it can never quietly return:
     * the old frontend shape is rejected, and we pin the four error keys.
     */
    public function test_legacy_frontend_quiz_payload_is_rejected(): void
    {
        $creator = User::factory()->create();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        [, , , $lesson] = $this->createCourseWithLesson($creator, $ws);

        $legacyPayload = [
            'require_pass_to_progress' => false,
            'passing_score' => 70,
            'questions' => [
                [
                    'type' => 'multiple_choice',
                    'question' => 'Test Question',
                    'options' => [
                        ['text' => 'arewrqwe', 'is_correct' => true],
                        ['text' => 'rqwerwerwer', 'is_correct' => false],
                    ],
                ],
            ],
        ];

        $resp = $this->stateful()
            ->actingAs($creator)
            ->postJson("/api/v1/course-lessons/{$lesson->id}/quiz?workspace_id={$ws->id}", $legacyPayload);

        $resp->assertStatus(422);
        $resp->assertJsonValidationErrors([
            'questions.0.question_text',
            'questions.0.options.0',
            'questions.0.options.1',
            'questions.0.correct_answer',
        ]);
    }
}
