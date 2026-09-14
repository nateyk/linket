<?php

namespace App\Courses\Controllers;

use App\Courses\Models\Quiz;
use App\Courses\Models\QuizAttempt;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class QuizAttemptsController extends Controller
{
    public function store(Request $request, Quiz $quiz)
    {
        $user = $request->user('sanctum') ?? $request->user('web') ?? $request->user() ?? \Illuminate\Support\Facades\Auth::user();
        abort_unless($user, 401);
        $lesson = $quiz->lesson;
        $course = $lesson->course;
        // Must be enrolled or preview owner (same as lesson access)
        abort_unless(app(\App\Courses\CourseAccess::class)->canAccessLesson($user, $lesson, false), 403);

        $data = $request->validate([
            'answers' => 'required|array',
            'answers.*' => 'nullable|string|max:500',
        ]);

        $questions = $quiz->questions()->orderBy('sort_order')->get();
        abort_unless($questions->isNotEmpty(), 422, 'Quiz has no questions.');

        $correct = 0;
        $detailed = [];
        foreach ($questions as $q) {
            $given = $data['answers'][(string) $q->id] ?? $data['answers'][$q->id] ?? null;
            $isCorrect = $given !== null && strtolower(trim((string) $given)) === strtolower(trim((string) $q->correct_answer));
            if ($isCorrect) $correct++;
            $detailed[] = [
                'question_id' => $q->id,
                'given' => $given,
                'correct_answer' => $q->correct_answer,
                'is_correct' => $isCorrect,
            ];
        }

        $total = $questions->count();
        $score = (int) round($correct / max(1, $total) * 100);
        $passed = $score >= (int) $quiz->passing_score;

        $attempt = QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'score' => $score,
            'passed' => $passed,
            'answers' => $data['answers'],
        ]);

        return response()->json(['data' => [
            'id' => $attempt->id,
            'score' => $score,
            'passed' => $passed,
            'correct' => $correct,
            'total' => $total,
            'details' => $detailed,
        ]], 201);
    }

    public function index(Request $request, Quiz $quiz)
    {
        $user = $request->user('sanctum') ?? $request->user('web') ?? $request->user() ?? \Illuminate\Support\Facades\Auth::user();
        abort_unless($user, 401);
        $lesson = $quiz->lesson;
        abort_unless(app(\App\Courses\CourseAccess::class)->canAccessLesson($user, $lesson, false), 403);

        // Student can only see own attempts; instructor/admin can see any? For now restrict to own
        $attempts = QuizAttempt::where('quiz_id', $quiz->id)->where('user_id', $user->id)->latest()->get();
        // If instructor previewing, allow seeing own attempts only as well (no cross-user leak)
        return response()->json(['data' => $attempts->map(fn($a) => [
            'id' => $a->id,
            'score' => $a->score,
            'passed' => (bool) $a->passed,
            'answers' => $a->answers,
            'created_at' => $a->created_at,
        ])]);
    }
}
