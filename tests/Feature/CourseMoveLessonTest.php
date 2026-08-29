<?php

namespace Tests\Feature;

use App\Courses\Models\Chapter;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CourseMoveLessonTest extends TestCase
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

    public function testMoveReindexesSourceAndTarget(): void
    {
        $creator = $this->createCreator();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $ws);
        $course = $product->course;
        $c1 = Chapter::create(['course_id' => $course->id, 'title' => 'C1', 'sort_order' => 0]);
        $c2 = Chapter::create(['course_id' => $course->id, 'title' => 'C2', 'sort_order' => 1]);
        $l1 = Lesson::create(['chapter_id' => $c1->id, 'course_id' => $course->id, 'title' => 'L1', 'status' => 'draft', 'sort_order' => 0]);
        $l2 = Lesson::create(['chapter_id' => $c1->id, 'course_id' => $course->id, 'title' => 'L2', 'status' => 'draft', 'sort_order' => 1]);
        $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$l1->id}/move", ['target_chapter_id' => $c2->id, 'position' => 0])->assertOk();
        // Source must be reindexed to contiguous 0..n-1 (single remaining lesson should be 0, not 1)
        $this->assertEquals([0], Chapter::find($c1->id)->lessons()->pluck('sort_order')->all());
        // Target was empty, so after move it should have single lesson at 0
        $this->assertEquals([0], Chapter::find($c2->id)->lessons()->orderBy('sort_order')->pluck('sort_order')->all());
    }

    public function testMoveWithExistingTargetReindexesBoth(): void
    {
        $creator = $this->createCreator();
        $ws = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createCourseProduct($creator, $ws);
        $course = $product->course;
        $c1 = Chapter::create(['course_id' => $course->id, 'title' => 'C1', 'sort_order' => 0]);
        $c2 = Chapter::create(['course_id' => $course->id, 'title' => 'C2', 'sort_order' => 1]);
        $l1 = Lesson::create(['chapter_id' => $c1->id, 'course_id' => $course->id, 'title' => 'L1', 'status' => 'draft', 'sort_order' => 0]);
        $l2 = Lesson::create(['chapter_id' => $c1->id, 'course_id' => $course->id, 'title' => 'L2', 'status' => 'draft', 'sort_order' => 1]);
        $l3 = Lesson::create(['chapter_id' => $c2->id, 'course_id' => $course->id, 'title' => 'L3', 'status' => 'draft', 'sort_order' => 0]);
        $this->stateful()->actingAs($creator)->postJson("/api/v1/course-lessons/{$l1->id}/move", ['target_chapter_id' => $c2->id, 'position' => 0])->assertOk();
        $this->assertEquals([0], Chapter::find($c1->id)->lessons()->orderBy('sort_order')->pluck('sort_order')->all());
        $this->assertEquals([0, 1], Chapter::find($c2->id)->lessons()->orderBy('sort_order')->pluck('sort_order')->all());
        // Ensure moved lesson is at position 0
        $this->assertEquals($l1->id, Chapter::find($c2->id)->lessons()->orderBy('sort_order')->first()->id);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';
        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
