<?php

namespace App\Courses\Controllers;

use App\Courses\Models\Lesson;
use App\Courses\Models\LessonResource;
use App\Courses\Resources\LessonResourceFileResource;
use App\Entitlements\Entitlements;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class LessonResourcesController extends Controller
{
    public function store(Request $request, Lesson $lesson)
    {
        $course = $lesson->course;
        $product = $course->product;
        abort_unless($product && $product->workspace_id === ActiveWorkspace::get()->id && $product->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'file_entry_id' => 'required|integer|exists:file_entries,id',
            'display_name' => 'sometimes|string|max:255',
        ]);

        $file = FileEntry::findOrFail($data['file_entry_id']);
        abort_unless($file->workspace_id === $product->workspace_id, 422, 'File must belong to workspace.');

        $allowed = config('filesystems.upload_types.courseResources.defaults.accept', []);
        $mimeOk = in_array($file->mime, $allowed, true);
        $extOk = in_array(strtolower((string) $file->extension), ['pdf','zip','doc','docx','xls','xlsx','ppt','pptx','txt','csv','png','jpg','jpeg','webp','gif','svg'], true);
        abort_unless($mimeOk || $extOk, 422, 'File type not allowed for course resources.');

        // Storage quota
        $entitlements = app(Entitlements::class);
        $limit = $entitlements->limit($request->user(), 'max_course_storage_bytes') ?? $entitlements->limit($request->user(), 'max_upload_bytes');
        if ($limit !== null) {
            $used = (int) DB::table('course_lesson_resources')
                ->join('course_lessons', 'course_lessons.id', '=', 'course_lesson_resources.lesson_id')
                ->join('courses', 'courses.id', '=', 'course_lessons.course_id')
                ->join('digital_products', 'digital_products.id', '=', 'courses.digital_product_id')
                ->where('digital_products.workspace_id', $product->workspace_id)
                ->join('file_entries', 'file_entries.id', '=', 'course_lesson_resources.file_entry_id')
                ->sum('file_entries.file_size');
            $videoUsed = (int) DB::table('course_lessons')
                ->join('courses', 'courses.id', '=', 'course_lessons.course_id')
                ->join('digital_products', 'digital_products.id', '=', 'courses.digital_product_id')
                ->where('digital_products.workspace_id', $product->workspace_id)
                ->whereNotNull('course_lessons.video_file_entry_id')
                ->join('file_entries', 'file_entries.id', '=', 'course_lessons.video_file_entry_id')
                ->sum('file_entries.file_size');
            $totalUsed = $used + $videoUsed;
            abort_if($totalUsed + (int) $file->file_size > $limit, 422, __('Adding this resource would exceed your plan storage of :limit.', ['limit' => Entitlements::formatBytes($limit)]));
        }

        $maxOrder = (int) ($lesson->resources()->max('sort_order') ?? -1) + 1;

        $resource = LessonResource::create([
            'lesson_id' => $lesson->id,
            'file_entry_id' => $file->id,
            'display_name' => $data['display_name'] ?? $file->name,
            'size' => $file->file_size,
            'mime' => $file->mime,
            'sort_order' => $maxOrder,
        ]);

        // Re-review gate: attachment changes are content changes.
        app(\App\Courses\Services\CourseService::class)->revertApprovalForContentChange($lesson->course);

        return new LessonResourceFileResource($resource->load('file'));
    }

    public function destroy(Request $request, LessonResource $resource)
    {
        $lesson = $resource->lesson;
        $course = $lesson->course;
        $product = $course->product;
        abort_unless($product && $product->workspace_id === ActiveWorkspace::get()->id && $product->user_id === $request->user()->id, 403);

        $resource->delete();

        // Re-review gate: attachment changes are content changes.
        app(\App\Courses\Services\CourseService::class)->revertApprovalForContentChange($course);

        return response()->noContent();
    }

    public function download(Request $request, LessonResource $resource)
    {
        $lesson = $resource->lesson;
        $course = $lesson->course;
        $user = $request->user();
        abort_unless($user, 403);
        abort_unless(app(\App\Courses\CourseAccess::class)->canDownloadResource($user, $lesson), 403, 'You do not have access to this resource.');

        $file = $resource->file;
        abort_unless($file && $file->getDisk()->exists($file->getStoragePath()), 404, 'File not found.');

        // Optional: require valid signature if accessed via signed route — but we already checked enrollment.
        // Use private storage streaming.
        return $file->getDisk()->download($file->getStoragePath(), $resource->display_name ?: $file->getNameWithExtension());
    }
}
