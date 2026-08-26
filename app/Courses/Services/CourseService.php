<?php

namespace App\Courses\Services;

use App\Courses\Models\Chapter;
use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Storefront\Models\DigitalProduct;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CourseService
{
    public function ensureForProduct(DigitalProduct $product): Course
    {
        return Course::firstOrCreate(
            ['digital_product_id' => $product->id],
            ['instructor_user_id' => $product->user_id]
        );
    }

    public function publish(Course $course): Course
    {
        return DB::transaction(function () use ($course): Course {
            $course->update(['published_at' => now()]);

            // Immediate-live policy: approved instantly unless flag requires pre-approval.
            // Post-moderation path: admin can still reject afterwards.
            if (!config('store.courses_require_approval')) {
                $product = $course->product;
                if ($product && $product->status !== 'approved') {
                    $product->update(['status' => 'approved', 'approved_at' => now()]);
                }
            } else {
                // If approval required, move to pending_approval for moderator.
                $product = $course->product;
                if ($product && $product->status === 'draft') {
                    $product->update(['status' => 'pending_approval']);
                }
            }

            return $course->fresh();
        });
    }

    public function unpublish(Course $course): Course
    {
        return DB::transaction(function () use ($course): Course {
            $course->update(['published_at' => null]);
            // Keep product approved — visibility is course.published_at gated for published curriculum.
            return $course->fresh();
        });
    }

    public function updateSettings(Course $course, array $data): Course
    {
        $course->update([
            'require_sequential_completion' => $data['require_sequential_completion'] ?? $course->require_sequential_completion,
        ]);

        // Keep instructor synced to product owner by default if not explicitly set.
        if (array_key_exists('instructor_user_id', $data)) {
            $course->update(['instructor_user_id' => $data['instructor_user_id']]);
        }

        return $course->fresh();
    }

    public function reorderChapters(Course $course, array $orderedIds): void
    {
        $existing = $course->chapters()->pluck('id')->all();
        $this->assertPermutation($existing, $orderedIds);

        DB::transaction(function () use ($orderedIds): void {
            foreach ($orderedIds as $index => $id) {
                Chapter::whereKey($id)->update(['sort_order' => $index]);
            }
        });
    }

    public function reorderLessons(Chapter $chapter, array $orderedIds): void
    {
        $existing = $chapter->lessons()->pluck('id')->all();
        $this->assertPermutation($existing, $orderedIds);

        DB::transaction(function () use ($orderedIds): void {
            foreach ($orderedIds as $index => $id) {
                Lesson::whereKey($id)->update(['sort_order' => $index]);
            }
        });
    }

    public function moveLesson(Lesson $lesson, int $targetChapterId, int $position = 0): Lesson
    {
        $target = Chapter::findOrFail($targetChapterId);
        abort_unless($target->course_id === $lesson->course_id, 422, 'Target chapter must belong to same course.');

        return DB::transaction(function () use ($lesson, $target, $position): Lesson {
            $lesson->update(['chapter_id' => $target->id]);

            // Re-normalize sort_order for target chapter.
            $ids = $target->lessons()->orderBy('sort_order')->pluck('id')->all();
            // already includes moved lesson
            $ids = array_values(array_unique($ids));
            // Move moved id to requested position
            $ids = array_values(array_filter($ids, fn($id) => $id !== $lesson->id));
            array_splice($ids, max(0, min($position, count($ids))), 0, [$lesson->id]);
            foreach ($ids as $idx => $id) {
                Lesson::whereKey($id)->update(['sort_order' => $idx]);
            }

            return $lesson->fresh();
        });
    }

    public function duplicateLesson(Lesson $lesson): Lesson
    {
        return DB::transaction(function () use ($lesson): Lesson {
            $copy = $lesson->replicate();
            $copy->title = $lesson->title . ' (copy)';
            $copy->status = 'draft';
            $copy->sort_order = $lesson->sort_order + 1;
            $copy->save();

            // Shift following lessons
            Lesson::where('chapter_id', $lesson->chapter_id)
                ->where('sort_order', '>', $lesson->sort_order)
                ->whereKeyNot($copy->id)
                ->increment('sort_order');

            // Duplicate resources (shallow: same file_entry_id)
            foreach ($lesson->resources as $resource) {
                $resCopy = $resource->replicate();
                $resCopy->lesson_id = $copy->id;
                $resCopy->save();
            }

            return $copy;
        });
    }

    private function assertPermutation(array $existing, array $orderedIds): void
    {
        sort($existing);
        $sorted = $orderedIds;
        sort($sorted);
        abort_unless($existing === $sorted, 422, 'Reorder payload must contain exactly the existing IDs.');
    }

    /**
     * Return chapters with lessons eager-loaded and counts, ordered.
     */
    public function loadCurriculum(Course $course, bool $includeDrafts = true): Course
    {
        $query = $course->load([
            'chapters' => fn($q) => $q->orderBy('sort_order'),
            'chapters.lessons' => fn($q) => $q->orderBy('sort_order'),
            'chapters.lessons.resources.file',
            'chapters.lessons.videoFile',
        ]);

        if (!$includeDrafts) {
            // Filter to published lessons only — do not rely on frontend.
            $query->chapters->each(function (Chapter $chapter) {
                $chapter->setRelation('lessons', $chapter->lessons->filter(fn(Lesson $l) => $l->isPublished())->values());
            });
        }

        return $query;
    }

    public function publishedLessonIds(Course $course): Collection
    {
        return Lesson::where('course_id', $course->id)->where('status', 'published')->pluck('id');
    }
}
