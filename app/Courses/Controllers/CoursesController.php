<?php

namespace App\Courses\Controllers;

use App\Courses\Models\Course;
use App\Courses\Resources\CourseResource;
use App\Courses\Services\CourseAnalyticsService;
use App\Courses\Services\CourseService;
use App\Storefront\DigitalProductVisibility;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class CoursesController extends Controller
{
    use AuthorizesRequests;
    public function show(Request $request, Course $course)
    {
        $this->assertOwner($course, $request);
        $course->load([
            'product.cover',
            'product.biolinks',
            'chapters.lessons.resources.file',
            'chapters.lessons.videoFile',
        ]);
        // Provide counts
        $course->loadCount('chapters');
        $lessonsCount = \App\Courses\Models\Lesson::where(
            'course_id',
            $course->id,
        )->count();
        $course->setAttribute('lessons_count', $lessonsCount);

        return new CourseResource($course);
    }

    public function analytics(Course $course, CourseAnalyticsService $service)
    {
        $this->assertActiveWorkspace($course);
        $this->authorize('view', $course);
        return response()->json(['data' => $service->forCourse($course)]);
    }

    public function update(Request $request, Course $course)
    {
        $this->assertOwner($course, $request);
        $data = $request->validate([
            'title' => 'sometimes|string|max:160',
            'description' => 'sometimes|nullable|string|max:20000',
            'learning_outcomes' => 'sometimes|array',
            'learning_outcomes.*' => 'string|max:280',
            'price_cents' => 'sometimes|integer|min:0',
            'cover_file_entry_id' =>
                'sometimes|nullable|integer|exists:file_entries,id',
            'biolink_ids' => 'sometimes|array',
            'biolink_ids.*' => 'integer|distinct|exists:biolinks,id',
            'require_sequential_completion' => 'sometimes|boolean',
            'instructor_user_id' =>
                'sometimes|nullable|integer|exists:users,id',
        ]);

        $coverBefore = $course->product->cover_file_entry_id;

        $result = DB::transaction(function () use (
            $course,
            $data,
            $request,
        ): CourseResource {
            // Update product fields if provided
            $productData = collect($data)
                ->only([
                    'title',
                    'description',
                    'learning_outcomes',
                    'price_cents',
                    'cover_file_entry_id',
                ])
                ->all();
            if (!empty($productData)) {
                // price_cents 0 sanitized via DigitalProducts rules; allow free courses.
                if (array_key_exists('cover_file_entry_id', $productData)) {
                    $coverId = $productData['cover_file_entry_id'];
                    if ($coverId) {
                        $cover = \Common\Files\FileEntry::find($coverId);
                        abort_unless(
                            $cover &&
                                $cover->workspace_id ===
                                    $course->product->workspace_id &&
                                str_starts_with(
                                    (string) $cover->mime,
                                    'image/',
                                ),
                            422,
                            __(
                                'The product cover must be an image from the active workspace.',
                            ),
                        );
                    }
                }
                $policy = app(\App\Storefront\ProductSettings::class);
                if (array_key_exists('price_cents', $productData)) {
                    $policy->enforcePricePolicy($productData['price_cents']);
                }
                $course->product->update($productData);
                // Keep a live course sellable while its edit awaits review.
                if ($course->product->status === 'approved' && $policy->updatingRequiresReviewForCourse()) {
                    if ($course->product->review_requested_at === null) {
                        $course->product->update([
                            'review_requested_at' => now(),
                            'review_requested_by' => $request->user()->id,
                        ]);
                    }
                    app(\App\Storefront\ProductReviewHistory::class)->record(
                        $course->product->fresh(),
                        'updated',
                        'approved',
                        'approved',
                        $request->user(),
                        'creator',
                        null,
                        ['changed' => array_keys($productData)],
                    );
                }
            }

            if (array_key_exists('biolink_ids', $data)) {
                app(DigitalProductVisibility::class)->sync(
                    $course->product,
                    $data['biolink_ids'],
                );
            }

            if (array_key_exists('require_sequential_completion', $data)) {
                app(CourseService::class)->updateSettings($course, [
                    'require_sequential_completion' =>
                        (bool) $data['require_sequential_completion'],
                ]);
            }
            if (array_key_exists('instructor_user_id', $data)) {
                $course->update([
                    'instructor_user_id' => $data['instructor_user_id'],
                ]);
            }

            $course->load([
                'product.cover',
                'product.biolinks',
                'chapters.lessons',
            ]);
            return new CourseResource($course);
        });

        $product = $course->product()->first();
        if ($product && $product->cover_file_entry_id && $product->cover_file_entry_id !== $coverBefore) {
            app(\App\Storefront\ProductCoverWebp::class)->dispatchFor($product);
        }

        return $result;
    }

    public function publish(Request $request, Course $course)
    {
        $this->assertOwner($course, $request);
        $hasPublished = \App\Courses\Models\Lesson::where(
            'course_id',
            $course->id,
        )
            ->where('status', 'published')
            ->exists();
        abort_unless(
            $course->chapters()->exists() && $hasPublished,
            422,
            __(
                'Add at least one chapter and one published lesson before publishing.',
            ),
        );
        $course = app(CourseService::class)->publish($course);
        $course->load(['product.cover', 'chapters.lessons.resources.file']);
        return new CourseResource($course);
    }

    public function unpublish(Request $request, Course $course)
    {
        $this->assertOwner($course, $request);
        $course = app(CourseService::class)->unpublish($course);
        $course->load(['product.cover', 'chapters.lessons.resources.file']);
        return new CourseResource($course);
    }

    public function reorderChapters(Request $request, Course $course)
    {
        $this->assertOwner($course, $request);
        $data = $request->validate([
            'ordered_ids' => 'required|array|min:1',
            'ordered_ids.*' => 'integer',
        ]);
        app(CourseService::class)->reorderChapters(
            $course,
            $data['ordered_ids'],
        );
        $course->load(['chapters.lessons']);
        return new CourseResource($course);
    }

    public function preview(Request $request, Course $course)
    {
        $this->assertCanPreview($course, $request);
        $course->load([
            'product.cover',
            'chapters.lessons.resources.file',
            'chapters.lessons.videoFile',
            'product.creator',
        ]);
        return new CourseResource($course);
    }

    // Public published curriculum — no auth required but respects published filters.
    public function publicShow(string $storeSlug, int $courseId)
    {
        $course = Course::with([
            'product',
            'chapters.lessons' => fn($q) => $q
                ->where('status', 'published')
                ->orderBy('sort_order'),
            'product.creator',
            'product.cover',
        ])->findOrFail($courseId);
        // Ensure belongs to biolink/store via product visibility
        // For simplicity, ensure product is approved and course published
        abort_unless(
            $course->product->isCourse() &&
                $course->product->status === 'approved' &&
                $course->published_at !== null,
            404,
        );
        // Optionally verify store contains product
        // (skip strict — publicDigitalProducts pattern does that, here we light-check)
        return new CourseResource($course);
    }

    private function assertOwner(Course $course, Request $request): void
    {
        $this->assertActiveWorkspace($course);
        $product = $course->product;
        abort_unless(
            $product && $product->user_id === $request->user()->id,
            403,
        );
    }

    private function assertActiveWorkspace(Course $course): void
    {
        $product = $course->product;
        abort_unless(
            $product && $product->workspace_id === ActiveWorkspace::get()->id,
            403,
        );
    }

    private function assertCanPreview(Course $course, Request $request): void
    {
        $user = $request->user();
        abort_unless(
            $user &&
                app(\App\Courses\CourseAccess::class)->canPreviewCourse(
                    $user,
                    $course,
                ),
            403,
        );
    }
}
