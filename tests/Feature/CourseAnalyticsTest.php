<?php

use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Models\Enrollment;
use App\Courses\Models\Lesson;
use App\Courses\Models\LessonProgress;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Support\Str;

uses(\Illuminate\Foundation\Testing\DatabaseTransactions::class);

afterEach(function () {
    ActiveWorkspace::clearCache();
});

function analyticsCreateCreator(): User
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

function analyticsCreateCourseProduct(User $creator, $workspace): DigitalProduct
{
    $product = DigitalProduct::create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Course ' . Str::random(6),
        'price_cents' => 1000,
        'currency' => 'ETB',
        'status' => 'draft',
        'type' => 'course',
    ]);
    $course = Course::firstOrCreate(['digital_product_id' => $product->id], ['instructor_user_id' => $creator->id]);
    return $product->fresh()->load('course');
}

/**
 * Create 3 chapters × 2+1+1 lessons = 4 lessons total, ordered.
 * Returns ['chapters' => Chapter[], 'lessons' => Lesson[] in global order]
 */
function analyticsCreateStructure(Course $course): array
{
    $ch1 = Chapter::create(['course_id' => $course->id, 'title' => 'Chapter 1', 'sort_order' => 0]);
    $ch2 = Chapter::create(['course_id' => $course->id, 'title' => 'Chapter 2', 'sort_order' => 1]);
    $ch3 = Chapter::create(['course_id' => $course->id, 'title' => 'Chapter 3', 'sort_order' => 2]);

    $l1 = Lesson::create(['chapter_id' => $ch1->id, 'course_id' => $course->id, 'title' => 'Lesson 1', 'status' => 'published', 'sort_order' => 0]);
    $l2 = Lesson::create(['chapter_id' => $ch1->id, 'course_id' => $course->id, 'title' => 'Lesson 2', 'status' => 'published', 'sort_order' => 1]);
    $l3 = Lesson::create(['chapter_id' => $ch2->id, 'course_id' => $course->id, 'title' => 'Lesson 3', 'status' => 'published', 'sort_order' => 0]);
    $l4 = Lesson::create(['chapter_id' => $ch3->id, 'course_id' => $course->id, 'title' => 'Lesson 4', 'status' => 'published', 'sort_order' => 0]);

    return [
        'chapters' => [$ch1, $ch2, $ch3],
        'lessons' => [$l1, $l2, $l3, $l4],
    ];
}

function analyticsStateful($test)
{
    $csrf = 'test-csrf-token';
    return $test->withSession(['_token' => $csrf])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrf);
}

it('owner can fetch analytics for own course', function () {
    $creator = analyticsCreateCreator();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    ActiveWorkspace::clearCache();

    $product = analyticsCreateCourseProduct($creator, $workspace);
    $course = $product->course;
    $structure = analyticsCreateStructure($course);
    [$l1, $l2, $l3, $l4] = $structure['lessons'];

    // Enroll two active learners
    $student1 = analyticsCreateCreator();
    $student2 = analyticsCreateCreator();
    Enrollment::create(['course_id' => $course->id, 'user_id' => $student1->id, 'status' => 'active', 'enrolled_at' => now()]);
    Enrollment::create(['course_id' => $course->id, 'user_id' => $student2->id, 'status' => 'active', 'enrolled_at' => now()]);

    LessonProgress::create(['user_id' => $student1->id, 'course_id' => $course->id, 'lesson_id' => $l1->id, 'completed_at' => now()]);
    LessonProgress::create(['user_id' => $student2->id, 'course_id' => $course->id, 'lesson_id' => $l1->id, 'completed_at' => now()]);
    LessonProgress::create(['user_id' => $student2->id, 'course_id' => $course->id, 'lesson_id' => $l2->id, 'completed_at' => now()]);

    $response = analyticsStateful($this)->actingAs($creator)->getJson("/api/v1/courses/{$course->id}/analytics?workspace_id={$workspace->id}");

    $response->assertOk();
    $response->assertJsonPath('data.activeLearners', 2);
    $response->assertJsonPath('data.totalLessons', 4);
    $response->assertJsonPath('data.totalChapters', 3);
    $response->assertJsonPath('data.lessonCompletions', 3);

    $data = $response->json('data');
    expect($data)->toHaveKey('avgLessonCompletion');
    expect($data)->toHaveKey('avgChapterCompletion');
    expect($data)->toHaveKey('chapters');
    expect($data['chapters'])->toHaveCount(3);
    // avgLessonCompletion = 3 / (2*4) *100 = 37.5
    $this->assertEqualsWithDelta(37.5, $data['avgLessonCompletion'], 0.01);
});

it('other creator gets 403', function () {
    $creatorA = analyticsCreateCreator();
    $workspaceA = (new CreateWorkspace())->createPersonalWorkspace($creatorA);
    ActiveWorkspace::clearCache();
    $product = analyticsCreateCourseProduct($creatorA, $workspaceA);
    $course = $product->course;
    analyticsCreateStructure($course);

    $creatorB = analyticsCreateCreator();
    $workspaceB = (new CreateWorkspace())->createPersonalWorkspace($creatorB);
    ActiveWorkspace::clearCache();

    $response = analyticsStateful($this)->actingAs($creatorB)->getJson("/api/v1/courses/{$course->id}/analytics?workspace_id={$workspaceB->id}");
    $response->assertStatus(403);
});

it('rejects analytics for a course outside the active workspace', function () {
    $creator = analyticsCreateCreator();
    $courseWorkspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = analyticsCreateCourseProduct($creator, $courseWorkspace);
    $course = $product->course;
    analyticsCreateStructure($course);

    $otherWorkspace = (new CreateWorkspace())->execute([
        'name' => 'Other workspace',
        'owner_id' => $creator->id,
    ]);
    ActiveWorkspace::clearCache();

    analyticsStateful($this)
        ->actingAs($creator)
        ->getJson("/api/v1/courses/{$course->id}/analytics?workspace_id={$otherWorkspace->id}")
        ->assertStatus(403);
});

it('allows an assigned instructor to fetch analytics from the course workspace', function () {
    $creator = analyticsCreateCreator();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = analyticsCreateCourseProduct($creator, $workspace);
    $course = $product->course;
    analyticsCreateStructure($course);

    $instructor = analyticsCreateCreator();
    $workspace->members()->create([
        'user_id' => $instructor->id,
        'is_owner' => false,
    ]);
    $course->update(['instructor_user_id' => $instructor->id]);
    ActiveWorkspace::clearCache();

    analyticsStateful($this)
        ->actingAs($instructor)
        ->getJson("/api/v1/courses/{$course->id}/analytics?workspace_id={$workspace->id}")
        ->assertOk();
});

it('missing course returns 404 JSON', function () {
    $creator = analyticsCreateCreator();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    ActiveWorkspace::clearCache();

    analyticsStateful($this)
        ->actingAs($creator)
        ->getJson("/api/v1/courses/999999999/analytics?workspace_id={$workspace->id}")
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json');
});

it('revoked enrollments are excluded', function () {
    $creator = analyticsCreateCreator();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    ActiveWorkspace::clearCache();

    $product = analyticsCreateCourseProduct($creator, $workspace);
    $course = $product->course;
    $structure = analyticsCreateStructure($course);
    [$l1, $l2, $l3, $l4] = $structure['lessons'];

    $activeStudent = analyticsCreateCreator();
    $revokedStudent = analyticsCreateCreator();

    Enrollment::create(['course_id' => $course->id, 'user_id' => $activeStudent->id, 'status' => 'active', 'enrolled_at' => now()]);
    Enrollment::create(['course_id' => $course->id, 'user_id' => $revokedStudent->id, 'status' => 'revoked', 'enrolled_at' => now()]);

    // Revoked student completes 2 lessons (should be excluded)
    LessonProgress::create(['user_id' => $revokedStudent->id, 'course_id' => $course->id, 'lesson_id' => $l1->id, 'completed_at' => now()]);
    LessonProgress::create(['user_id' => $revokedStudent->id, 'course_id' => $course->id, 'lesson_id' => $l2->id, 'completed_at' => now()]);
    // Active student completes 1
    LessonProgress::create(['user_id' => $activeStudent->id, 'course_id' => $course->id, 'lesson_id' => $l1->id, 'completed_at' => now()]);

    $response = analyticsStateful($this)->actingAs($creator)->getJson("/api/v1/courses/{$course->id}/analytics?workspace_id={$workspace->id}");
    $response->assertOk();

    $data = $response->json('data');
    // Only active learner counted
    $this->assertEquals(1, $data['activeLearners']);
    // lessonCompletions should be 1 if revoked filtered (strict), otherwise 3. Service filters revoked, so expect 1.
    $this->assertEquals(1, $data['lessonCompletions']);
    // L1 completedLearners should be 1 (only active)
    // Find L1 in chapters[0] lessons
    $l1Data = collect($data['chapters'])->flatMap(fn($c) => $c['lessons'])->firstWhere('id', $l1->id);
    $this->assertEquals(1, $l1Data['completedLearners']);
    $this->assertEqualsWithDelta(100.0, $l1Data['completionRate'], 0.01);
    // L2 should be 0 for active learners
    $l2Data = collect($data['chapters'])->flatMap(fn($c) => $c['lessons'])->firstWhere('id', $l2->id);
    $this->assertEquals(0, $l2Data['completedLearners']);
});

it('zero-state returns zeros matching the reference HTML', function () {
    $creator = analyticsCreateCreator();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    ActiveWorkspace::clearCache();

    $product = analyticsCreateCourseProduct($creator, $workspace);
    $course = $product->course;
    analyticsCreateStructure($course);

    $response = analyticsStateful($this)->actingAs($creator)->getJson("/api/v1/courses/{$course->id}/analytics?workspace_id={$workspace->id}");
    $response->assertOk();

    $data = $response->json('data');
    $this->assertEquals(0, $data['activeLearners']);
    $this->assertEquals(4, $data['totalLessons']);
    $this->assertEquals(3, $data['totalChapters']);
    $this->assertEquals(0, $data['lessonCompletions']);
    $this->assertEqualsWithDelta(0.0, $data['avgLessonCompletion'], 0.01);
    $this->assertEqualsWithDelta(0.0, $data['avgChapterCompletion'], 0.01);

    foreach ($data['chapters'] as $chapter) {
        $this->assertEquals(0, $chapter['completedLearners']);
        $this->assertEqualsWithDelta(0.0, $chapter['completionRate'], 0.01);
        foreach ($chapter['lessons'] as $lesson) {
            $this->assertEquals(0, $lesson['completedLearners']);
            $this->assertEqualsWithDelta(0.0, $lesson['completionRate'], 0.01);
            $this->assertEqualsWithDelta(0.0, $lesson['dropOffRate'], 0.01);
        }
    }
});

it('per-lesson and per-chapter rates/drops are correct', function () {
    $creator = analyticsCreateCreator();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    ActiveWorkspace::clearCache();

    $product = analyticsCreateCourseProduct($creator, $workspace);
    $course = $product->course;
    $structure = analyticsCreateStructure($course);
    [$l1, $l2, $l3, $l4] = $structure['lessons'];
    [$ch1, $ch2, $ch3] = $structure['chapters'];

    $student1 = analyticsCreateCreator();
    $student2 = analyticsCreateCreator();
    Enrollment::create(['course_id' => $course->id, 'user_id' => $student1->id, 'status' => 'active', 'enrolled_at' => now()]);
    Enrollment::create(['course_id' => $course->id, 'user_id' => $student2->id, 'status' => 'active', 'enrolled_at' => now()]);

    // student1: L1 only
    LessonProgress::create(['user_id' => $student1->id, 'course_id' => $course->id, 'lesson_id' => $l1->id, 'completed_at' => now()]);
    // student2: L1, L2, L3
    LessonProgress::create(['user_id' => $student2->id, 'course_id' => $course->id, 'lesson_id' => $l1->id, 'completed_at' => now()]);
    LessonProgress::create(['user_id' => $student2->id, 'course_id' => $course->id, 'lesson_id' => $l2->id, 'completed_at' => now()]);
    LessonProgress::create(['user_id' => $student2->id, 'course_id' => $course->id, 'lesson_id' => $l3->id, 'completed_at' => now()]);

    $response = analyticsStateful($this)->actingAs($creator)->getJson("/api/v1/courses/{$course->id}/analytics?workspace_id={$workspace->id}");
    $response->assertOk();

    $data = $response->json('data');

    $this->assertEquals(2, $data['activeLearners']);
    $this->assertEquals(4, $data['totalLessons']);
    $this->assertEquals(3, $data['totalChapters']);
    $this->assertEquals(4, $data['lessonCompletions']);
    $this->assertEqualsWithDelta(50.0, $data['avgLessonCompletion'], 0.01);
    // chapterCompletions = 1 (ch1) +1 (ch2)+0(ch3)=2 ; avg =2/(2*3)*100=33.33
    $this->assertEqualsWithDelta(33.33, $data['avgChapterCompletion'], 0.05);

    // Per chapter checks
    // ch1 has L1,L2 => only student2 completed both => completedLearners 1, rate 50%
    $ch1Data = collect($data['chapters'])->firstWhere('id', $ch1->id);
    $this->assertEquals(1, $ch1Data['completedLearners']);
    $this->assertEqualsWithDelta(50.0, $ch1Data['completionRate'], 0.01);
    $this->assertEquals(2, $ch1Data['lessonsCount']);

    $ch2Data = collect($data['chapters'])->firstWhere('id', $ch2->id);
    $this->assertEquals(1, $ch2Data['completedLearners']);
    $this->assertEqualsWithDelta(50.0, $ch2Data['completionRate'], 0.01);

    $ch3Data = collect($data['chapters'])->firstWhere('id', $ch3->id);
    $this->assertEquals(0, $ch3Data['completedLearners']);
    $this->assertEqualsWithDelta(0.0, $ch3Data['completionRate'], 0.01);

    // Per lesson checks (global order L1,L2,L3,L4)
    $allLessons = collect($data['chapters'])->flatMap(fn($c) => $c['lessons'])->keyBy('id');

    $l1Data = $allLessons[$l1->id];
    $this->assertEquals(2, $l1Data['completedLearners']);
    $this->assertEqualsWithDelta(100.0, $l1Data['completionRate'], 0.01);
    $this->assertEqualsWithDelta(0.0, $l1Data['dropOffRate'], 0.01); // first lesson: (2-2)/2=0

    $l2Data = $allLessons[$l2->id];
    $this->assertEquals(1, $l2Data['completedLearners']);
    $this->assertEqualsWithDelta(50.0, $l2Data['completionRate'], 0.01);
    $this->assertEqualsWithDelta(50.0, $l2Data['dropOffRate'], 0.01); // (2-1)/2=50

    $l3Data = $allLessons[$l3->id];
    $this->assertEquals(1, $l3Data['completedLearners']);
    $this->assertEqualsWithDelta(50.0, $l3Data['completionRate'], 0.01);
    $this->assertEqualsWithDelta(0.0, $l3Data['dropOffRate'], 0.01); // (1-1)/1=0

    $l4Data = $allLessons[$l4->id];
    $this->assertEquals(0, $l4Data['completedLearners']);
    $this->assertEqualsWithDelta(0.0, $l4Data['completionRate'], 0.01);
    $this->assertEqualsWithDelta(100.0, $l4Data['dropOffRate'], 0.01); // (1-0)/1=100
});

it('clamps drop-off when a later non-sequential lesson has more completions', function () {
    $creator = analyticsCreateCreator();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = analyticsCreateCourseProduct($creator, $workspace);
    $course = $product->course;
    [$firstLesson, $secondLesson] = analyticsCreateStructure($course)['lessons'];

    $student1 = analyticsCreateCreator();
    $student2 = analyticsCreateCreator();
    Enrollment::create(['course_id' => $course->id, 'user_id' => $student1->id, 'status' => 'active', 'enrolled_at' => now()]);
    Enrollment::create(['course_id' => $course->id, 'user_id' => $student2->id, 'status' => 'active', 'enrolled_at' => now()]);
    LessonProgress::create(['user_id' => $student1->id, 'course_id' => $course->id, 'lesson_id' => $firstLesson->id, 'completed_at' => now()]);
    LessonProgress::create(['user_id' => $student1->id, 'course_id' => $course->id, 'lesson_id' => $secondLesson->id, 'completed_at' => now()]);
    LessonProgress::create(['user_id' => $student2->id, 'course_id' => $course->id, 'lesson_id' => $secondLesson->id, 'completed_at' => now()]);
    ActiveWorkspace::clearCache();

    $data = analyticsStateful($this)
        ->actingAs($creator)
        ->getJson("/api/v1/courses/{$course->id}/analytics?workspace_id={$workspace->id}")
        ->assertOk()
        ->json('data');

    $secondLessonData = collect($data['chapters'])->flatMap(fn ($chapter) => $chapter['lessons'])->firstWhere('id', $secondLesson->id);
    $this->assertEqualsWithDelta(0.0, $secondLessonData['dropOffRate'], 0.01);
});
