<?php

namespace App\Courses\Controllers;

use App\Courses\Models\Lesson;
use App\Courses\Models\Quiz;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class QuizzesController extends Controller
{
    public function show(Request $request, Lesson $lesson)
    {
        $user = $request->user('sanctum') ?? $request->user('web') ?? $request->user() ?? \Illuminate\Support\Facades\Auth::user();
        $course = $lesson->course;
        abort_unless($course, 404);
        // Instructor can view any, student must be enrolled (same as lesson access)
        $isInstructor = $user ? app(\App\Courses\CourseAccess::class)->canPreviewCourse($user, $course) : false;
        if (!$isInstructor) {
            abort_unless(app(\App\Courses\CourseAccess::class)->canAccessLesson($user, $lesson, false), 403);
        }
        $quiz = $lesson->quiz()->with('questions')->first();
        if (!$quiz) return response()->json(['data' => null]);
        $includeAnswers = $isInstructor;
        return response()->json(['data' => $this->formatQuiz($quiz, $includeAnswers)]);
    }

    public function store(Request $request, Lesson $lesson)
    {
        $course = $lesson->course;
        $this->assertOwner($course, $request);
        $data = $request->validate([
            'require_pass_to_progress' => 'sometimes|boolean',
            'passing_score' => 'sometimes|integer|min:0|max:100',
            'questions' => 'required|array|min:1',
            'questions.*.type' => 'required|in:multiple_choice,true_false',
            'questions.*.question_text' => 'required|string|max:2000',
            'questions.*.options' => 'nullable|array',
            'questions.*.options.*' => 'string|max:500',
            'questions.*.correct_answer' => 'required|string|max:500',
            'questions.*.sort_order' => 'sometimes|integer|min:0',
        ]);

        // MC must have options
        foreach ($data['questions'] as $q) {
            if ($q['type'] === 'multiple_choice') {
                abort_unless(!empty($q['options']) && count($q['options']) >= 2, 422, 'Multiple choice requires at least 2 options.');
                abort_unless(in_array($q['correct_answer'], $q['options'], true), 422, 'Correct answer must be one of the options.');
            } else {
                abort_unless(in_array(strtolower($q['correct_answer']), ['true','false'], true), 422, 'True/False correct_answer must be true or false.');
            }
        }

        return DB::transaction(function () use ($lesson, $data, $course) {
            $quiz = $lesson->quiz()->first();
            if ($quiz) {
                $quiz->update([
                    'require_pass_to_progress' => $data['require_pass_to_progress'] ?? $quiz->require_pass_to_progress,
                    'passing_score' => $data['passing_score'] ?? $quiz->passing_score,
                ]);
                $quiz->questions()->delete();
            } else {
                $quiz = Quiz::create([
                    'lesson_id' => $lesson->id,
                    'require_pass_to_progress' => $data['require_pass_to_progress'] ?? false,
                    'passing_score' => $data['passing_score'] ?? 70,
                ]);
            }

            foreach ($data['questions'] as $idx => $q) {
                $quiz->questions()->create([
                    'type' => $q['type'],
                    'question_text' => $q['question_text'],
                    'options' => $q['type'] === 'multiple_choice' ? $q['options'] : null,
                    'correct_answer' => strtolower($q['correct_answer']),
                    'sort_order' => $q['sort_order'] ?? $idx,
                ]);
            }

            app(\App\Courses\Services\CourseService::class)->revertApprovalForContentChange($course);

            return response()->json(['data' => $this->formatQuiz($quiz->fresh()->load('questions'))], 201);
        });
    }

    public function update(Request $request, Quiz $quiz)
    {
        $lesson = $quiz->lesson;
        $course = $lesson->course;
        $this->assertOwner($course, $request);
        $data = $request->validate([
            'require_pass_to_progress' => 'sometimes|boolean',
            'passing_score' => 'sometimes|integer|min:0|max:100',
            'questions' => 'sometimes|array|min:1',
            'questions.*.type' => 'required|in:multiple_choice,true_false',
            'questions.*.question_text' => 'required|string|max:2000',
            'questions.*.options' => 'nullable|array',
            'questions.*.options.*' => 'string|max:500',
            'questions.*.correct_answer' => 'required|string|max:500',
            'questions.*.sort_order' => 'sometimes|integer|min:0',
        ]);

        if (isset($data['questions'])) {
            foreach ($data['questions'] as $q) {
                if ($q['type'] === 'multiple_choice') {
                    abort_unless(!empty($q['options']) && count($q['options']) >= 2, 422, 'Multiple choice requires at least 2 options.');
                    abort_unless(in_array($q['correct_answer'], $q['options'], true), 422, 'Correct answer must be one of the options.');
                } else {
                    abort_unless(in_array(strtolower($q['correct_answer']), ['true','false'], true), 422, 'True/False correct_answer must be true or false.');
                }
            }
        }

        return DB::transaction(function () use ($quiz, $data, $course) {
            $quiz->update([
                'require_pass_to_progress' => $data['require_pass_to_progress'] ?? $quiz->require_pass_to_progress,
                'passing_score' => $data['passing_score'] ?? $quiz->passing_score,
            ]);
            if (isset($data['questions'])) {
                $quiz->questions()->delete();
                foreach ($data['questions'] as $idx => $q) {
                    $quiz->questions()->create([
                        'type' => $q['type'],
                        'question_text' => $q['question_text'],
                        'options' => $q['type'] === 'multiple_choice' ? $q['options'] : null,
                        'correct_answer' => strtolower($q['correct_answer']),
                        'sort_order' => $q['sort_order'] ?? $idx,
                    ]);
                }
            }
            app(\App\Courses\Services\CourseService::class)->revertApprovalForContentChange($course);
            return response()->json(['data' => $this->formatQuiz($quiz->fresh()->load('questions'))]);
        });
    }

    public function destroy(Request $request, Quiz $quiz)
    {
        $course = $quiz->lesson->course;
        $this->assertOwner($course, $request);
        $quiz->delete();
        app(\App\Courses\Services\CourseService::class)->revertApprovalForContentChange($course);
        return response()->noContent();
    }

    private function formatQuiz(Quiz $quiz, bool $includeAnswers = true): array
    {
        return [
            'id' => $quiz->id,
            'lesson_id' => $quiz->lesson_id,
            'require_pass_to_progress' => (bool) $quiz->require_pass_to_progress,
            'passing_score' => (int) $quiz->passing_score,
            'questions' => $quiz->questions->map(function ($q) use ($includeAnswers) {
                $row = [
                    'id' => $q->id,
                    'type' => $q->type,
                    'question_text' => $q->question_text,
                    'options' => $q->options,
                    'sort_order' => $q->sort_order,
                ];
                if ($includeAnswers) {
                    $row['correct_answer'] = $q->correct_answer;
                }
                return $row;
            })->values(),
            'created_at' => $quiz->created_at,
        ];
    }

    private function assertOwner($course, Request $request): void
    {
        $product = $course->product;
        abort_unless($product && $product->workspace_id === \Common\Workspaces\ActiveWorkspace::get()->id && $product->user_id === $request->user()->id, 403);
    }
}
