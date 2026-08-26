<?php

namespace App\Courses\Controllers;

use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Resources\ChapterResource;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class ChaptersController extends Controller
{
    public function store(Request $request, Course $course)
    {
        $this->assertOwner($course, $request);
        $data = $request->validate(['title' => 'required|string|max:160']);
        $maxOrder = (int) ($course->chapters()->max('sort_order') ?? -1) + 1;
        $chapter = $course->chapters()->create(['title' => $data['title'], 'sort_order' => $maxOrder]);
        return new ChapterResource($chapter->load('lessons'));
    }

    public function update(Request $request, Chapter $chapter)
    {
        $course = $chapter->course;
        $this->assertOwner($course, $request);
        $data = $request->validate(['title' => 'required|string|max:160']);
        $chapter->update(['title' => $data['title']]);
        return new ChapterResource($chapter->load('lessons'));
    }

    public function destroy(Request $request, Chapter $chapter)
    {
        $course = $chapter->course;
        $this->assertOwner($course, $request);
        $lessonCount = $chapter->lessons()->count();
        // Require confirmation handled client-side; server allows delete with cascade.
        DB::transaction(function () use ($chapter): void {
            // Clean up associated file_entries if needed? Keep files (they are FileEntry global).
            // Delete lesson resources will cascade.
            $chapter->delete();
        });

        return response()->noContent();
    }

    public function reorderLessons(Request $request, Chapter $chapter)
    {
        $course = $chapter->course;
        $this->assertOwner($course, $request);
        $data = $request->validate(['ordered_ids' => 'required|array', 'ordered_ids.*' => 'integer']);
        // Allow empty (chapter without lessons)
        if (empty($data['ordered_ids'])) {
            return new ChapterResource($chapter->load('lessons'));
        }
        app(\App\Courses\Services\CourseService::class)->reorderLessons($chapter, $data['ordered_ids']);
        return new ChapterResource($chapter->fresh()->load('lessons'));
    }

    private function assertOwner(Course $course, Request $request): void
    {
        $product = $course->product;
        abort_unless($product && $product->workspace_id === ActiveWorkspace::get()->id && $product->user_id === $request->user()->id, 403);
    }
}
