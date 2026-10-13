<?php

namespace Tests\Feature;

use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Models\Enrollment;
use App\Courses\Models\Lesson;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

/**
 * R01 acceptance: uploaded lesson video streams only via a signed,
 * expiring URL (reusing the download-entitlement signing mechanism).
 * The raw file-entries URL must reject everyone except course managers,
 * and the signature alone must never substitute for enrollment.
 */
#[Group('audit-verify')]
class AuditVerifyVideoAccessTest extends TestCase
{
    use DatabaseTransactions;

    protected User $seller;

    protected User $buyer;

    protected User $nonBuyer;

    protected User $otherSeller;

    protected $workspace;

    protected Course $course;

    protected Lesson $videoLesson;

    protected FileEntry $videoFile;

    protected array $fixturePaths = [];

    protected function tearDown(): void
    {
        foreach ($this->fixturePaths as [$disk, $path]) {
            try {
                $disk->delete($path);
            } catch (\Throwable) {
            }
        }
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function resolveBackendId(): string
    {
        // Backend ids are random per seed (UploadBackendsSeeder); resolve the
        // local backend at runtime like PublicMediaPersistenceTest does.
        $backends = \Common\Files\Uploads\Uploads::getAllBackends();
        foreach ($backends as $backend) {
            if ($backend->type === 'local') {
                return $backend->id;
            }
        }

        return $backends[0]->id ?? 'local';
    }

    protected function setUp(): void
    {
        parent::setUp();
        ActiveWorkspace::clearCache();

        $this->seller = User::factory()->create();
        $this->buyer = User::factory()->create();
        $this->nonBuyer = User::factory()->create();
        $this->otherSeller = User::factory()->create();

        $this->workspace = (new CreateWorkspace())->createPersonalWorkspace($this->seller);
        (new CreateWorkspace())->createPersonalWorkspace($this->otherSeller);

        $product = DigitalProduct::create([
            'user_id' => $this->seller->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'Audit Video Course',
            'description' => 'Verify video access gates.',
            'price_cents' => 1000,
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

        $fileName = 'audit-video-'.Str::random(8).'.mp4';
        $this->videoFile = FileEntry::create([
            'workspace_id' => $this->workspace->id,
            'owner_id' => $this->seller->id,
            'user_id' => (string) $this->seller->id,
            'name' => 'lesson-video.mp4',
            'file_name' => $fileName,
            'extension' => 'mp4',
            'mime' => 'video/mp4',
            'file_size' => 16,
            'disk_prefix' => 'course-videos',
            'upload_type' => 'courseVideos',
            'backend_id' => $this->resolveBackendId(),
            'type' => 'video',
            'public' => false,
        ]);

        $disk = $this->videoFile->getDisk();
        $storagePath = $this->videoFile->getStoragePath();
        $disk->put($storagePath, 'fake-video-bytes!');
        $this->fixturePaths[] = [$disk, $storagePath];

        $this->videoLesson = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $this->course->id,
            'title' => 'Uploaded Video Lesson',
            'content' => '<p>Watch me.</p>',
            'video_type' => 'upload',
            'video_file_entry_id' => $this->videoFile->id,
            'status' => 'published',
            'content_type' => 'video',
            'sort_order' => 0,
        ]);

        Enrollment::create([
            'course_id' => $this->course->id,
            'user_id' => $this->buyer->id,
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

    private function buyerVideoUrl(): string
    {
        $data = $this->stateful()->actingAs($this->buyer)
            ->getJson("/api/v1/courses/{$this->course->id}/learn/lessons/{$this->videoLesson->id}?workspace_id={$this->workspace->id}")
            ->assertOk()
            ->json('data');

        $url = $data['video']['url'] ?? '';
        $this->assertNotSame('', $url, 'Lesson must expose a video URL.');

        return $url;
    }

    public function test_enrolled_student_lesson_video_url_is_signed_and_expiring(): void
    {
        $url = $this->buyerVideoUrl();

        $this->assertStringNotContainsString(
            "file-entries/{$this->videoFile->id}",
            $url,
            'Students must not receive the raw long-lived file-entry URL.',
        );
        $this->assertMatchesRegularExpression(
            '/signature=|expires=|Expires=/',
            $url,
            'Student video URL must carry a signature/expiry.',
        );
    }

    public function test_signed_video_url_streams_within_expiry_window(): void
    {
        $url = $this->buyerVideoUrl();

        // The file response streams bytes directly (same as the file-entries
        // show path), so capture the printed output.
        ob_start();
        $response = $this->stateful()->actingAs($this->buyer)->get($url);
        $printed = ob_get_clean();
        $response->assertOk();
        $this->assertSame('fake-video-bytes!', $printed);
    }

    public function test_signed_video_url_rejected_after_expiry(): void
    {
        $url = $this->buyerVideoUrl();
        $this->assertStringContainsString('expires=', $url);

        $this->travel((int) config('storefront.download_days', 7) + 1)->days();

        $this->stateful()->actingAs($this->buyer)->get($url)->assertForbidden();
    }

    public function test_raw_file_entry_url_rejects_enrolled_buyer(): void
    {
        $this->stateful()->actingAs($this->buyer)
            ->get("/api/v1/file-entries/{$this->videoFile->id}")
            ->assertForbidden();
    }

    public function test_signed_url_does_not_substitute_for_enrollment(): void
    {
        $url = $this->buyerVideoUrl();
        $this->assertStringContainsString('signature=', $url);

        $this->stateful()->actingAs($this->nonBuyer)->get($url)->assertForbidden();
        $this->stateful()->actingAs($this->otherSeller)->get($url)->assertForbidden();
        $this->stateful()->get($url)->assertForbidden();
    }

    public function test_range_slicing_on_signed_url(): void
    {
        $url = $this->buyerVideoUrl();
        $this->assertStringContainsString('signature=', $url);

        // RangeFileResponse reads $_SERVER['HTTP_RANGE'] (set by php-fpm in
        // production, absent in CLI) and prints only the requested slice.
        $_SERVER['HTTP_RANGE'] = 'bytes=0-4';
        try {
            ob_start();
            $this->stateful()->actingAs($this->buyer)->get($url)->assertOk();
            $printed = ob_get_clean();
        } finally {
            unset($_SERVER['HTTP_RANGE']);
        }

        $this->assertSame('fake-', $printed, 'Range request must stream only bytes 0-4.');
    }
}
