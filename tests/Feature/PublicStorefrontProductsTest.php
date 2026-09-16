<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PublicStorefrontProductsTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function stateful(): static
    {
        // VerifyApiAccessMiddleware 401s requests that are neither from the
        // frontend nor authenticated with api.access; real browsers send a
        // Referer, so tests must too.
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    public function test_course_aggregates_are_correct(): void
    {
        [$biolink, $courseProduct] = $this->storefrontWithCourse();
        ActiveWorkspace::clearCache();

        $response = $this->stateful()->getJson("/api/v1/public/stores/{$biolink->id}/digital-products");

        $response->assertOk();
        $row = collect($response->json('data'))->firstWhere('id', $courseProduct->id);

        $this->assertNotNull($row);
        $this->assertSame(2, $row['chapters_count']);
        // Draft lessons are excluded, published counted.
        $this->assertSame(3, $row['lessons_count']);
    }

    public function test_no_per_product_aggregate_queries(): void
    {
        [$biolink] = $this->storefrontWithCourse();
        ActiveWorkspace::clearCache();

        DB::enableQueryLog();
        DB::flushQueryLog();

        $this->stateful()->getJson("/api/v1/public/stores/{$biolink->id}/digital-products")->assertOk();

        $standaloneAggregates = collect(DB::getQueryLog())->filter(
            fn(array $entry): bool => str_starts_with(ltrim($entry['query']), 'select count(*) as aggregate')
                && (str_contains($entry['query'], 'course_chapters') || str_contains($entry['query'], 'course_lessons')),
        );

        // Counts must ride along as eager-load subselects, never as one
        // query per product. Two course products are listed, so N+1 would
        // show up as 4 standalone aggregate queries here.
        $this->assertCount(0, $standaloneAggregates);
    }

    /**
     * @return array{Biolink, DigitalProduct}
     */
    private function storefrontWithCourse(): array
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);

        $biolink = Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Test Storefront',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);

        $file = FileEntry::query()->create([
            'name' => 'download.pdf',
            'file_name' => Str::random(20),
            'file_size' => 1024,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);

        $guide = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Guide',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
        $guide->files()->attach($file->id);
        $guide->biolinks()->attach($biolink->id);

        // Two course products so N+1 would be observable.
        $courseProducts = [];
        foreach (['Course One', 'Course Two'] as $title) {
            $product = DigitalProduct::query()->create([
                'workspace_id' => $workspace->id,
                'user_id' => $creator->id,
                'title' => $title,
                'price_cents' => 2000,
                'currency' => 'ETB',
                'status' => 'approved',
                'approved_at' => now(),
                'type' => 'course',
            ]);
            $course = Course::query()->create([
                'digital_product_id' => $product->id,
                'published_at' => now(),
            ]);

            foreach ([0, 1] as $chapterIndex) {
                $chapter = Chapter::query()->create([
                    'course_id' => $course->id,
                    'title' => "Chapter {$chapterIndex}",
                    'sort_order' => $chapterIndex,
                ]);
                Lesson::query()->create([
                    'chapter_id' => $chapter->id,
                    'course_id' => $course->id,
                    'title' => 'Published Lesson',
                    'content' => '<p>hi</p>',
                    'status' => 'published',
                    'content_type' => 'readable',
                    'sort_order' => 0,
                ]);
                if ($chapterIndex === 0) {
                    Lesson::query()->create([
                        'chapter_id' => $chapter->id,
                        'course_id' => $course->id,
                        'title' => 'Second Published Lesson',
                        'content' => '<p>hi</p>',
                        'status' => 'published',
                        'content_type' => 'readable',
                        'sort_order' => 1,
                    ]);
                    Lesson::query()->create([
                        'chapter_id' => $chapter->id,
                        'course_id' => $course->id,
                        'title' => 'Draft Lesson',
                        'content' => '<p>hi</p>',
                        'status' => 'draft',
                        'content_type' => 'readable',
                        'sort_order' => 2,
                    ]);
                }
            }

            $product->biolinks()->attach($biolink->id);
            $courseProducts[] = $product;
        }

        return [$biolink, $courseProducts[0]];
    }

    private function createCreator(): User
    {
        $token = Str::lower(Str::random(12));

        return User::query()->forceCreate([
            'name' => 'Creator '.$token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }
}
