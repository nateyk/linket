<?php

namespace Tests\Feature;

use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CoursePreviewLearningOutcomesTest extends TestCase
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

    #[Test]
    public function course_preview_returns_learning_outcomes()
    {
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $outcomes = ['Build your first course', 'Publish and sell it'];

        $product = DigitalProduct::create([
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'title' => 'Course With Outcomes',
            'description' => 'A course description',
            'learning_outcomes' => $outcomes,
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'draft',
            'type' => 'course',
        ]);

        $course = Course::create([
            'digital_product_id' => $product->id,
            'instructor_user_id' => $creator->id,
        ]);

        Chapter::create([
            'course_id' => $course->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);

        $response = $this->stateful()
            ->actingAs($creator)
            ->getJson("/api/v1/courses/{$course->id}/preview?workspace_id={$workspace->id}");

        $response
            ->assertOk()
            ->assertJsonPath('data.product.learning_outcomes', $outcomes);
    }
}
