<?php

namespace App\Courses\Controllers;

use App\Courses\Models\Chapter;
use App\Courses\Models\Lesson;
use App\Courses\Resources\LessonResource;
use App\Courses\Services\VideoUrlNormalizer;
use App\Entitlements\Entitlements;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LessonsController extends Controller
{
    public function store(Request $request, Chapter $chapter)
    {
        $course = $chapter->course;
        $this->assertOwner($course, $request);
        $data = $request->validate([
            'title' => 'required|string|max:160',
            'status' => 'sometimes|in:draft,published',
            'sort_order' => 'sometimes|integer|min:0',
            'content_type' => 'required|in:video,readable',
        ]);

        $maxOrder = (int) ($chapter->lessons()->max('sort_order') ?? -1) + 1;

        $lesson = Lesson::create([
            'chapter_id' => $chapter->id,
            'course_id' => $course->id,
            'title' => $data['title'],
            'status' => $data['status'] ?? 'draft',
            'content_type' => $data['content_type'],
            'sort_order' => $data['sort_order'] ?? $maxOrder,
        ]);

        return new LessonResource($lesson->load(['resources.file', 'videoFile']));
    }

    public function show(Request $request, Lesson $lesson)
    {
        // For creator preview: must own course
        if ($request->boolean('preview')) {
            $this->assertOwner($lesson->course, $request);
            $lesson->load(['resources.file', 'videoFile', 'course.product']);
            return new LessonResource($lesson);
        }

        // For student: check access via CourseAccess (caller typically StudentLessonsController shows)
        $this->assertOwner($lesson->course, $request);
        $lesson->load(['resources.file', 'videoFile']);
        return new LessonResource($lesson);
    }

    public function update(Request $request, Lesson $lesson)
    {
        $course = $lesson->course;
        $this->assertOwner($course, $request);

        $data = $request->validate([
            'title' => 'sometimes|string|max:160',
            'content' => 'sometimes|nullable|string|max:100000',
            'status' => 'sometimes|in:draft,published',
            'video_type' => 'sometimes|nullable|in:upload,external',
            'video_file_entry_id' => 'sometimes|nullable|integer|exists:file_entries,id',
            'video_url' => 'sometimes|nullable|string|max:1024',
            'duration_seconds' => 'sometimes|nullable|integer|min:0|max:86400',
            'sort_order' => 'sometimes|integer|min:0',
            'content_type' => 'sometimes|in:video,readable',
        ]);

        return DB::transaction(function () use ($lesson, $data, $request): LessonResource {
            // Sanitize content: strip script/iframe except allowed; use html-sanitizer if available
            if (array_key_exists('content', $data) && $data['content'] !== null) {
                $data['content'] = $this->sanitizeContent($data['content']);
            }

            // Video handling
            if (array_key_exists('video_type', $data)) {
                if ($data['video_type'] === 'external') {
                    // Validate URL allowlist
                    $url = $data['video_url'] ?? $lesson->video_url;
                    abort_unless($url, 422, 'Video URL required for external video.');
                    $normalized = VideoUrlNormalizer::normalize($url);
                    $data['video_url'] = $normalized;
                    $data['video_file_entry_id'] = null;
                } elseif ($data['video_type'] === 'upload') {
                    abort_unless(app(Entitlements::class)->enabled($request->user(), 'course_video_upload_enabled'), 403, __('Video uploads are not enabled for your plan.'));
                    $fileId = $data['video_file_entry_id'] ?? $lesson->video_file_entry_id;
                    if ($fileId) {
                        $file = FileEntry::find($fileId);
                        abort_unless($file && $file->workspace_id === $lesson->course->product->workspace_id, 422, 'Video file must belong to workspace.');
                        // Check mime via upload type or extension
                        $allowedMimes = config('filesystems.upload_types.courseVideos.defaults.accept', []);
                        // Simple extension check
                        $ext = strtolower((string) $file->extension);
                        $allowedExts = ['mp4', 'mov', 'avi', 'webm', 'mpeg', 'mkv'];
                        abort_unless(in_array($ext, $allowedExts, true) || in_array($file->mime, $allowedMimes, true), 422, 'Invalid video file type.');
                        // Enforce storage entitlement
                        $entitlements = app(Entitlements::class);
                        $limit = $entitlements->limit($request->user(), 'max_course_storage_bytes') ?? $entitlements->limit($request->user(), 'max_upload_bytes');
                        if ($limit !== null) {
                            $used = $this->workspaceCourseStorageBytes($lesson->course->product->workspace_id);
                            // Allow update without double-count if same file
                            $isNew = $file->id !== $lesson->video_file_entry_id;
                            if ($isNew && $used + (int) $file->file_size > $limit) {
                                abort(422, __('Uploading this video would exceed your plan storage allowance of :limit.', ['limit' => Entitlements::formatBytes($limit)]));
                            }
                        }
                    }
                    $data['video_url'] = null;
                } elseif ($data['video_type'] === null) {
                    $data['video_file_entry_id'] = null;
                    $data['video_url'] = null;
                }
            } elseif (array_key_exists('video_url', $data) && $data['video_url']) {
                // If only url provided without type, normalize
                $data['video_url'] = VideoUrlNormalizer::normalize($data['video_url']);
                $data['video_type'] = 'external';
                $data['video_file_entry_id'] = null;
            }

            $lesson->update($data);

            // Re-review gate (A4b): substantive lesson edits on an approved
            // course revert the product to draft and unpublish the course.
            // Pure sort_order-only updates are excluded: intra-list
            // drag-reorder uses POST course-chapters/{chapter}/lessons/reorder.
            if (array_diff(array_keys($data), ['sort_order']) !== []) {
                app(\App\Courses\Services\CourseService::class)->revertApprovalForContentChange($lesson->course);
            }

            $lesson->load(['resources.file', 'videoFile', 'course.product']);
            return new LessonResource($lesson);
        });
    }

    public function destroy(Request $request, Lesson $lesson)
    {
        $course = $lesson->course;
        $this->assertOwner($course, $request);
        $lesson->delete();

        // Re-review gate: removing a lesson changes approved content.
        app(\App\Courses\Services\CourseService::class)->revertApprovalForContentChange($course);

        return response()->noContent();
    }

    public function duplicate(Request $request, Lesson $lesson)
    {
        $this->assertOwner($lesson->course, $request);
        $copy = app(\App\Courses\Services\CourseService::class)->duplicateLesson($lesson);

        // Re-review gate: adding a lesson changes approved content
        // (the copy itself is created as draft).
        app(\App\Courses\Services\CourseService::class)->revertApprovalForContentChange($lesson->course);

        return new LessonResource($copy->load(['resources.file', 'videoFile']));
    }

    public function move(Request $request, Lesson $lesson)
    {
        $course = $lesson->course;
        $this->assertOwner($course, $request);
        $data = $request->validate(['target_chapter_id' => 'required|integer|exists:course_chapters,id', 'position' => 'sometimes|integer|min:0']);
        $lesson = app(\App\Courses\Services\CourseService::class)->moveLesson($lesson, (int) $data['target_chapter_id'], (int) ($data['position'] ?? 0));
        return new LessonResource($lesson->load(['resources.file', 'videoFile']));
    }

    private function sanitizeContent(string $content): string
    {
        // Use HTMLPurifier if available, else allowlist strip.
        try {
            if (class_exists(\HTMLPurifier::class)) {
                $config = \HTMLPurifier_Config::createDefault();
                $config->set('HTML.Allowed', 'p,br,strong,b,em,i,u,s,strike,a[href|target],ul,ol,li,h1,h2,h3,blockquote,code,pre,hr,span[class]');
                $config->set('AutoFormat.Linkify', false);
                $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true]);
                $purifier = new \HTMLPurifier($config);
                return $purifier->purify($content);
            }
        } catch (\Throwable $e) {
            // fallback
        }

        // Fallback: strip script/style/iframe
        $content = preg_replace('#<script.*?>.*?</script>#is', '', $content);
        $content = preg_replace('#<style.*?>.*?</style>#is', '', $content);
        $content = preg_replace('#<iframe.*?>.*?</iframe>#is', '', $content);
        return $content;
    }

    private function workspaceCourseStorageBytes(int $workspaceId): int
    {
        return (int) DB::table('course_lessons')
            ->join('courses', 'courses.id', '=', 'course_lessons.course_id')
            ->join('digital_products', 'digital_products.id', '=', 'courses.digital_product_id')
            ->where('digital_products.workspace_id', $workspaceId)
            ->whereNotNull('course_lessons.video_file_entry_id')
            ->join('file_entries', 'file_entries.id', '=', 'course_lessons.video_file_entry_id')
            ->sum('file_entries.file_size')
            + (int) DB::table('course_lesson_resources')
                ->join('course_lessons', 'course_lessons.id', '=', 'course_lesson_resources.lesson_id')
                ->join('courses', 'courses.id', '=', 'course_lessons.course_id')
                ->join('digital_products', 'digital_products.id', '=', 'courses.digital_product_id')
                ->where('digital_products.workspace_id', $workspaceId)
                ->join('file_entries', 'file_entries.id', '=', 'course_lesson_resources.file_entry_id')
                ->sum('file_entries.file_size');
    }

    private function assertOwner($course, Request $request): void
    {
        // $course may be Course
        if ($course instanceof Lesson) {
            $course = $course->course;
        }
        if ($course instanceof Chapter) {
            $course = $course->course;
        }
        $product = $course->product;
        abort_unless($product && $product->workspace_id === ActiveWorkspace::get()->id && $product->user_id === $request->user()->id, 403);
    }
}
