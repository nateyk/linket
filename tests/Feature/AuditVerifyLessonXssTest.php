<?php

namespace Tests\Feature;

use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

/**
 * Batch 0 verification for R02 (lesson summary/content rendered with
 * dangerouslySetInnerHTML; server fallback regex strips only
 * script/style/iframe).
 *
 * Desired behavior asserted: no active payload survives either the
 * HTMLPurifier path or the fallback path.
 */
#[Group('audit-verify')]
class AuditVerifyLessonXssTest extends TestCase
{
    use DatabaseTransactions;

    protected User $creator;

    protected $workspace;

    protected Course $course;

    /** @var list<string> */
    public static array $payloads = [
        '<img src=x onerror=alert(1)>',
        '<a href="javascript:alert(1)">click</a>',
        '<svg onload=alert(1)>',
        '<iframe src="https://evil.test"></iframe>',
        '<script>alert(1)</script>',
        '<div style="x:expression(alert(1))">hi</div>',
        '<a href="data:text/html,<script>alert(1)</script>">data</a>',
        '<IMG SRC=x OnErRoR=alert(1)>',
        '<a href="&#106;avascript:alert(1)">encoded</a>',
        '<scr<script>ipt>alert(1)</scr<script>ipt>',
        '<video><source onerror=alert(1)></video>',
        '<details open ontoggle=alert(1)>',
    ];

    /** @var list<string> */
    public static array $mustBeAbsent = [
        '<script',
        'onerror',
        'onload',
        'ontoggle',
        'javascript:',
        '<iframe',
        '<svg',
        'data:text/html',
        'expression(',
    ];

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

        $product = DigitalProduct::create([
            'user_id' => $this->creator->id,
            'workspace_id' => $this->workspace->id,
            'title' => 'Audit XSS Course',
            'description' => 'Verify lesson sanitization.',
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'course',
        ]);

        $this->course = Course::create([
            'digital_product_id' => $product->id,
            'published_at' => now(),
        ]);

        Chapter::create([
            'course_id' => $this->course->id,
            'title' => 'Chapter 1',
            'sort_order' => 0,
        ]);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    public function test_purifier_path_strips_active_payloads(): void
    {
        $chapterId = $this->course->chapters()->first()->id;

        foreach (self::$payloads as $i => $payload) {
            $response = $this->stateful()->actingAs($this->creator)->postJson(
                "/api/v1/course-chapters/{$chapterId}/lessons?workspace_id={$this->workspace->id}",
                [
                    'title' => "XSS probe {$i}",
                    'content_type' => 'readable',
                    'content' => "<p>Before.</p>{$payload}<p>After.</p>",
                    'summary' => "Summary {$payload}",
                ]
            );
            $response->assertCreated();

            $stored = \App\Courses\Models\Lesson::findOrFail($response->json('data.id'));
            foreach (self::$mustBeAbsent as $needle) {
                $this->assertStringNotContainsStringIgnoringCase(
                    $needle,
                    (string) $stored->content,
                    "Purifier path leaked '{$needle}' from payload: {$payload}"
                );
                $this->assertStringNotContainsStringIgnoringCase(
                    $needle,
                    (string) $stored->summary,
                    "Purifier path leaked '{$needle}' into summary from payload: {$payload}"
                );
            }
        }
    }

    public function test_fallback_path_strips_active_payloads(): void
    {
        // The regex fallback in LessonsController::sanitizeContent only strips
        // script/style/iframe tags. If HTMLPurifier is ever missing, event
        // handlers and javascript: URLs survive. This pins the requirement.
        $src = file_get_contents(app_path('Courses/Controllers/LessonsController.php'));
        $this->assertNotFalse($src);

        $fallbackPos = strpos($src, '// Fallback');
        $this->assertNotFalse($fallbackPos, 'Expected a marked fallback block.');
        $fallback = substr($src, $fallbackPos);

        $this->assertMatchesRegularExpression(
            '/on\w+\s*=/i',
            $fallback,
            'Fallback sanitizer must strip event-handler attributes (on*).'
        );
        $this->assertMatchesRegularExpression(
            '/javascript:/i',
            $fallback,
            'Fallback sanitizer must strip javascript: URLs.'
        );
    }
}
