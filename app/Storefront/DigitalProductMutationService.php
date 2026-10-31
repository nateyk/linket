<?php

namespace App\Storefront;

use App\Courses\Models\Lesson;
use App\Courses\Services\CourseService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Entitlements\Entitlements;
use Common\Files\Actions\FileUploadValidator;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class DigitalProductMutationService
{
    public function __construct(
        private readonly CourseService $courses,
        private readonly DigitalProductVisibility $visibility,
    ) {}

    public function create(array $data, User $creator, ?int $maxUploadBytes): DigitalProduct
    {
        $product = DB::transaction(function () use ($data, $creator, $maxUploadBytes): DigitalProduct {
            $type = $data['type'] ?? 'digital';
            $product = DigitalProduct::create([
                ...Arr::except($data, ['file_ids', 'biolink_ids', 'type', 'sample_file_ids', 'sample_titles', 'sample_durations']),
                'type' => $type,
                'user_id' => $creator->id,
                'workspace_id' => ActiveWorkspace::get()->id,
                'currency' => $data['currency'] ?? config('storefront.currency'),
            ]);

            $this->assertCoverBelongsToWorkspace($product);
            if ($type === 'course') {
                $this->courses->ensureForProduct($product);
            }
            $this->syncProductFiles($product, $data, $type, $maxUploadBytes);
            $this->syncProductSamples($product, $data, $type);
            $this->visibility->sync($product, $data['biolink_ids'] ?? []);

            app(ProductReviewHistory::class)->record(
                $product,
                'created',
                null,
                $product->fresh()->status,
                $creator,
                'creator',
            );

            return $product->fresh()->load(['files', 'cover', 'biolinks', 'course', 'samples.file']);
        });

        app(ProductCoverWebp::class)->dispatchFor($product);

        return $product;
    }

    public function update(DigitalProduct $product, array $data, ?int $maxUploadBytes, ?User $actor = null): DigitalProduct
    {
        $coverBefore = $product->cover_file_entry_id;
        $this->abortUnlessTypeChangeIsSafe($product, $data);

        $updated = DB::transaction(function () use ($product, $data, $maxUploadBytes, $actor): DigitalProduct {
            $type = $data['type'] ?? $product->type ?? 'digital';
            $snapshot = $product->status === 'approved'
                ? app(\App\Storefront\ApprovedContentSnapshot::class)->capture($product)
                : null;
            $product->update([
                ...Arr::except($data, ['file_ids', 'biolink_ids', 'type', 'sample_file_ids', 'sample_titles', 'sample_durations']),
                'type' => $type,
                'currency' => $data['currency'] ?? $product->currency,
            ]);

            $changed = array_values(array_diff(array_keys($product->getChanges()), ['updated_at']));

            $this->assertCoverBelongsToWorkspace($product);
            $fileIdsBefore = $product->files()->pluck('file_entries.id')->sort()->values()->all();
            $samplesBefore = $this->sampleSignature($product);
            $biolinkIdsBefore = $product->biolinks()->pluck('biolinks.id')->sort()->values()->all();
            $this->syncProductFiles($product, $data, $type, $maxUploadBytes);
            $this->syncProductSamples($product, $data, $type);
            if ($type === 'course') {
                $this->courses->ensureForProduct($product->fresh());
            }
            $this->visibility->sync(
                $product,
                $data['biolink_ids'] ?? $product->biolinks()->pluck('biolinks.id')->all(),
            );

            if ($product->files()->pluck('file_entries.id')->sort()->values()->all() !== $fileIdsBefore) {
                $changed[] = 'file_ids';
            }
            if ($this->sampleSignature($product) !== $samplesBefore) {
                $changed[] = 'sample_file_ids';
            }
            if ($product->biolinks()->pluck('biolinks.id')->sort()->values()->all() !== $biolinkIdsBefore) {
                $changed[] = 'biolink_ids';
            }

            if ($changed !== []) {
                $queuedReview = $this->queueUpdateReviewIfNeeded($product, $actor, $snapshot);
                $meta = ['changed' => $changed];
                if ($queuedReview) {
                    $meta['review_requested'] = true;
                }

                app(ProductReviewHistory::class)->record(
                    $product->fresh(),
                    'updated',
                    $product->status,
                    $product->status,
                    $actor,
                    'creator',
                    null,
                    $meta,
                );
            }

            return $product->fresh()->load(['files', 'cover', 'biolinks', 'course', 'samples.file']);
        });

        if ($updated->cover_file_entry_id && $updated->cover_file_entry_id !== $coverBefore) {
            app(ProductCoverWebp::class)->dispatchFor($updated);
        }

        return $updated;
    }

    public function duplicate(DigitalProduct $source, User $creator, ?int $maxUploadBytes): DigitalProduct
    {
        $source->loadMissing(['files', 'samples', 'biolinks', 'cover']);

        return $this->create([
            'title' => trim($source->title).' (copy)',
            'description' => $source->description,
            'learning_outcomes' => $source->learning_outcomes,
            'price_cents' => (int) $source->price_cents,
            'currency' => $source->currency,
            'type' => $source->type ?? 'digital',
            'cover_file_entry_id' => $source->cover_file_entry_id,
            'file_ids' => $source->files->pluck('id')->all(),
            'biolink_ids' => [],
            'sample_file_ids' => $source->samples->pluck('file_entry_id')->all(),
            'sample_titles' => $source->samples->pluck('title')->all(),
            'sample_durations' => $source->samples->pluck('duration_ms')->all(),
        ], $creator, $maxUploadBytes);
    }

    /**
     * Reject a product `type` change outright (never silently rewrite or
     * migrate) when delivered history or built curriculum would be stranded.
     * Switching to `course` while sellable files are attached needs no guard:
     * course creation imposes no files incompatibility (file_ids are nullable
     * for courses and sync keeps them), so there is no existing rule to mirror.
     */
    private function abortUnlessTypeChangeIsSafe(DigitalProduct $product, array $data): void
    {
        $type = $data['type'] ?? $product->type ?? 'digital';
        if ($type === ($product->type ?? 'digital')) {
            return;
        }

        $hasPaidSales = Models\StorefrontOrder::query()
            ->where('digital_product_id', $product->id)
            ->where('status', 'paid')
            ->exists();
        if ($hasPaidSales) {
            throw ValidationException::withMessages([
                'type' => __('The product type cannot be changed after sales have been made.'),
            ]);
        }

        if (($product->type ?? 'digital') === 'course') {
            $course = $product->course;
            $hasCurriculum = $course !== null && (
                $course->chapters()->exists() ||
                Lesson::query()->where('course_id', $course->id)->exists()
            );
            if ($hasCurriculum) {
                throw ValidationException::withMessages([
                    'type' => __('The product type cannot be changed while course curriculum exists. Delete the chapters and lessons first.'),
                ]);
            }
        }
    }

    private function queueUpdateReviewIfNeeded(DigitalProduct $product, ?User $actor, ?array $snapshot): bool
    {
        $requiresReview = $product->isCourse()
            ? app(ProductSettings::class)->updatingRequiresReviewForCourse()
            : app(ProductSettings::class)->updatingRequiresReview();

        if ($product->status !== 'approved' || !$requiresReview) {
            return false;
        }

        if ($product->review_requested_at !== null && $product->pending_review_snapshot !== null) {
            return false;
        }

        $newlyRequested = $product->review_requested_at === null;

        $product->update([
            'review_requested_at' => $product->review_requested_at ?? now(),
            'review_requested_by' => $product->review_requested_by ?? ($actor?->id ?? $product->user_id),
            'pending_review_snapshot' => $product->pending_review_snapshot ?? $snapshot,
        ]);

        return $newlyRequested;
    }

    private function syncProductFiles(DigitalProduct $product, array $data, string $type, ?int $maxBytes): void
    {
        if ($type === 'course') {
            if (!array_key_exists('file_ids', $data)) {
                return;
            }

            if (empty($data['file_ids'])) {
                $product->files()->sync([]);

                return;
            }
        }

        $ids = $data['file_ids'];
        $this->assertCoverBelongsToWorkspace($product);
        $files = FileEntry::query()->whereIn('id', $ids)->where('workspace_id', $product->workspace_id)->get();
        abort_if($files->count() !== count($ids), 422, __('Every file must belong to the active workspace.'));
        // Platform per-file cap composes with (never loosens) the plan
        // allowance. Total workspace storage stays plan-only below.
        $platformMax = app(ProductSettings::class)->maxFileBytes();
        $perFileMax = $maxBytes;
        $platformBinding = false;
        if ($platformMax !== null && ($perFileMax === null || $platformMax < $perFileMax)) {
            $perFileMax = $platformMax;
            $platformBinding = true;
        }
        // Files already attached to this product keep working even when they
        // predate the current sellable set (legacy formats can stay, they
        // just cannot be newly attached). Only newly attached files must be
        // in the canonical capability.
        $existingIds = $product->exists
            ? $product->files()->pluck('file_entries.id')->all()
            : [];
        abort_if($files->contains(function (FileEntry $file) use ($perFileMax, $existingIds): bool {
            if ($perFileMax !== null && $file->file_size > $perFileMax) {
                return true;
            }
            if (ProductFileFormats::isSellableExtension($file->extension)) {
                return false;
            }
            return !in_array($file->id, $existingIds, true);
        }), 422, $perFileMax !== null && $files->max('file_size') > $perFileMax
            ? ($platformBinding
                ? __('The file size may not be greater than :size', ['size' => FileUploadValidator::formatBytes($platformMax)])
                : __("One or more files exceed your plan's storage allowance per file."))
            : __('One or more files are not allowed for sale. Allowed formats: :formats.', ['formats' => ProductFileFormats::helpText()]));

        if ($maxBytes !== null) {
            $existingBytes = (int) DB::table('digital_product_files')
                ->where('digital_product_id', '!=', $product->id)
                ->join('file_entries', 'file_entries.id', '=', 'digital_product_files.file_entry_id')
                ->where('file_entries.workspace_id', $product->workspace_id)
                ->sum('file_entries.file_size');
            $newBytes = $files->sum('file_size');
            abort_if($existingBytes + $newBytes > $maxBytes, 422, __("Uploading these files would exceed your plan's storage allowance of :limit.", ['limit' => Entitlements::formatBytes($maxBytes)]));
        }

        $product->files()->sync($ids);
    }

    public function restoreSamples(DigitalProduct $product, array $snapshot): void
    {
        $ids = array_map('intval', $snapshot['sample_file_ids'] ?? []);
        $existing = FileEntry::query()
            ->whereIn('id', $ids)
            ->where('workspace_id', $product->workspace_id)
            ->pluck('id')
            ->all();
        $ids = array_values(array_filter(
            $ids,
            fn (int $id): bool => in_array($id, $existing, true),
        ));

        $this->syncProductSamples($product, [
            'sample_file_ids' => $ids,
            'sample_titles' => $snapshot['sample_titles'] ?? [],
            'sample_durations' => $snapshot['sample_durations'] ?? [],
        ], $product->type ?? 'digital');
    }

    /**
     * @return list<array{0: int, 1: ?string, 2: ?int, 3: int}>
     */
    private function sampleSignature(DigitalProduct $product): array
    {
        return $product->samples()
            ->orderBy('position')
            ->get(['file_entry_id', 'title', 'duration_ms', 'position'])
            ->map(fn (Models\DigitalProductSample $sample): array => [
                (int) $sample->file_entry_id,
                $sample->title,
                $sample->duration_ms === null ? null : (int) $sample->duration_ms,
                (int) $sample->position,
            ])
            ->all();
    }

    private function syncProductSamples(DigitalProduct $product, array $data, string $type): void
    {
        if (!array_key_exists('sample_file_ids', $data)) {
            $this->assertExistingSamplesMatchType($product, $type);

            return;
        }

        $ids = array_values(array_map(fn ($id): int => (int) $id, $data['sample_file_ids'] ?? []));
        $kind = ProductSamplePolicy::allowedKind($type);

        if ($kind === null) {
            if ($ids !== []) {
                throw ValidationException::withMessages([
                    'sample_file_ids' => __('Courses cannot include preview files.'),
                ]);
            }

            $product->samples()->delete();

            return;
        }

        if (count($ids) > ProductSamplePolicy::maxCount($kind)) {
            throw ValidationException::withMessages([
                'sample_file_ids' => $kind === 'audio'
                    ? __('You can add up to :count preview tracks.', ['count' => ProductSamplePolicy::MAX_AUDIO_SAMPLES])
                    : __('You can add one sample PDF.'),
            ]);
        }

        $files = FileEntry::query()
            ->whereIn('id', $ids)
            ->where('workspace_id', $product->workspace_id)
            ->get()
            ->keyBy('id');
        if ($files->count() !== count(array_unique($ids))) {
            throw ValidationException::withMessages([
                'sample_file_ids' => __('Every preview file must belong to the active workspace.'),
            ]);
        }

        foreach ($ids as $id) {
            $error = ProductSamplePolicy::attachError($files->get($id), $kind);
            if ($error !== null) {
                throw ValidationException::withMessages([
                    'sample_file_ids' => $error,
                ]);
            }
        }

        $titlesProvided = array_key_exists('sample_titles', $data);
        $durationsProvided = array_key_exists('sample_durations', $data);
        $titles = $data['sample_titles'] ?? [];
        $durations = $data['sample_durations'] ?? [];
        $existing = $product->samples()->get()->keyBy('file_entry_id');

        $keep = [];
        foreach ($ids as $position => $id) {
            $file = $files->get($id);
            $title = $titlesProvided
                ? ($titles[$id] ?? $titles[(string) $id] ?? null)
                : $existing->get($id)?->title;
            $title = is_string($title) ? trim($title) : null;
            if ($title === '') {
                $title = null;
            }
            if ($title !== null && mb_strlen($title) > 160) {
                throw ValidationException::withMessages([
                    'sample_titles' => __('Preview titles may not be greater than 160 characters.'),
                ]);
            }

            $duration = $durationsProvided
                ? ($durations[$id] ?? $durations[(string) $id] ?? null)
                : $existing->get($id)?->duration_ms;
            $duration = $duration === null || $duration === '' ? null : (int) $duration;

            $payload = [
                'file_entry_id' => $id,
                'kind' => ProductSamplePolicy::kindForExtension($file->extension),
                'title' => $title,
                'position' => $position,
                'duration_ms' => $duration,
                'is_free_preview' => true,
            ];

            $row = $existing->get($id);
            if ($row) {
                $row->update($payload);
            } else {
                $product->samples()->create($payload);
            }
            $keep[] = $id;
        }

        if ($keep === []) {
            $product->samples()->delete();
        } else {
            $product->samples()->whereNotIn('file_entry_id', $keep)->delete();
        }
    }

    private function assertExistingSamplesMatchType(DigitalProduct $product, string $type): void
    {
        $kind = ProductSamplePolicy::allowedKind($type);
        $samples = $product->samples()->get();
        if ($samples->isEmpty()) {
            return;
        }

        if ($kind === null || $samples->contains(fn (Models\DigitalProductSample $sample): bool => $sample->kind !== $kind)) {
            throw ValidationException::withMessages([
                'sample_file_ids' => __('Remove preview files before changing the product type.'),
            ]);
        }
    }

    private function assertCoverBelongsToWorkspace(DigitalProduct $product): void
    {
        if (!$product->cover_file_entry_id) return;

        $cover = FileEntry::query()->find($product->cover_file_entry_id);
        abort_unless(
            $cover &&
                $cover->workspace_id === $product->workspace_id &&
                str_starts_with((string) $cover->mime, 'image/'),
            422,
            __('The product cover must be an image from the active workspace.'),
        );
    }
}
