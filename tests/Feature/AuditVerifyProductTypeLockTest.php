<?php

namespace Tests\Feature;

use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

/**
 * Batch 0 verification for R03 (product `type` mutable after
 * creation/sales with no guard).
 *
 * Desired behavior asserted: changing `type` on a product that already has
 * files, curriculum, or sales is rejected (422) and the type is unchanged.
 */
#[Group('audit-verify')]
class AuditVerifyProductTypeLockTest extends TestCase
{
    use DatabaseTransactions;

    protected User $creator;

    protected $workspace;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    protected function setUp(): void
    {
        parent::setUp();
        ActiveWorkspace::clearCache();

        $this->creator = User::factory()->create();
        $this->workspace = (new CreateWorkspace())->createPersonalWorkspace($this->creator);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function sellableFile(): FileEntry
    {
        return FileEntry::create([
            'workspace_id' => $this->workspace->id,
            'owner_id' => $this->creator->id,
            'user_id' => (string) $this->creator->id,
            'name' => 'ebook.pdf',
            'file_name' => 'audit-'.Str::random(8).'.pdf',
            'extension' => 'pdf',
            'mime' => 'application/pdf',
            'file_size' => 1024,
            'disk_prefix' => 'digital-products',
            'upload_type' => 'digitalProductFiles',
            'type' => 'file',
            'public' => false,
        ]);
    }

    public function test_update_cannot_change_type_on_product_with_files_and_sales(): void
    {
        $file = $this->sellableFile();

        $product = DigitalProduct::create([
            'user_id' => $this->creator->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'Audit Type Product',
            'description' => 'Has files and sales.',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
        $product->files()->attach($file->id);

        StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $this->creator->id,
            'buyer_email' => 'buyer@example.test',
            'buyer_name' => 'Buyer',
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 1000,
            'platform_fee_cents' => 100,
            'creator_earnings_cents' => 900,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->stateful()->actingAs($this->creator)->putJson(
            "/api/v1/digital-products/{$product->id}",
            [
                'title' => 'Audit Type Product',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'type' => 'course',
                'file_ids' => [$file->id],
            ]
        )->assertUnprocessable();

        $this->assertSame('digital', $product->fresh()->type);
    }

    public function test_update_cannot_change_type_on_course_with_curriculum(): void
    {
        $product = DigitalProduct::create([
            'user_id' => $this->creator->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'Audit Type Course',
            'description' => 'Has curriculum.',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'course',
        ]);

        $course = Course::create([
            'digital_product_id' => $product->id,
            'published_at' => now(),
        ]);

        $chapter = Chapter::create([
            'course_id' => $course->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);

        Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => 'Published Lesson',
            'content' => '<p>Content.</p>',
            'status' => 'published',
            'content_type' => 'readable',
            'sort_order' => 0,
        ]);

        $file = $this->sellableFile();

        $this->stateful()->actingAs($this->creator)->putJson(
            "/api/v1/digital-products/{$product->id}",
            [
                'title' => 'Audit Type Course',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'type' => 'digital',
                'file_ids' => [$file->id],
            ]
        )->assertUnprocessable();

        $this->assertSame('course', $product->fresh()->type);
    }
}
