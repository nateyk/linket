<?php

namespace App\Storefront;

use App\Courses\Services\CourseService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Entitlements\Entitlements;
use Common\Files\Actions\FileUploadValidator;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

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
                ...Arr::except($data, ['file_ids', 'biolink_ids', 'type']),
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
            $this->visibility->sync($product, $data['biolink_ids'] ?? []);

            app(ProductReviewHistory::class)->record(
                $product,
                'created',
                null,
                $product->fresh()->status,
                $creator,
                'creator',
            );

            return $product->fresh()->load(['files', 'cover', 'biolinks', 'course']);
        });

        app(ProductCoverWebp::class)->dispatchFor($product);

        return $product;
    }

    public function update(DigitalProduct $product, array $data, ?int $maxUploadBytes, ?User $actor = null): DigitalProduct
    {
        $coverBefore = $product->cover_file_entry_id;

        $updated = DB::transaction(function () use ($product, $data, $maxUploadBytes, $actor): DigitalProduct {
            $type = $data['type'] ?? $product->type ?? 'digital';
            $product->update([
                ...Arr::except($data, ['file_ids', 'biolink_ids', 'type']),
                'type' => $type,
                'currency' => $data['currency'] ?? $product->currency,
            ]);

            $changed = array_values(array_diff(array_keys($product->getChanges()), ['updated_at']));

            $this->assertCoverBelongsToWorkspace($product);
            $fileIdsBefore = $product->files()->pluck('file_entries.id')->sort()->values()->all();
            $biolinkIdsBefore = $product->biolinks()->pluck('biolinks.id')->sort()->values()->all();
            $this->syncProductFiles($product, $data, $type, $maxUploadBytes);
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
            if ($product->biolinks()->pluck('biolinks.id')->sort()->values()->all() !== $biolinkIdsBefore) {
                $changed[] = 'biolink_ids';
            }

            if ($changed !== []) {
                $queuedReview = $this->queueUpdateReviewIfNeeded($product, $actor);
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

            return $product->fresh()->load(['files', 'cover', 'biolinks', 'course']);
        });

        if ($updated->cover_file_entry_id && $updated->cover_file_entry_id !== $coverBefore) {
            app(ProductCoverWebp::class)->dispatchFor($updated);
        }

        return $updated;
    }

    private function queueUpdateReviewIfNeeded(DigitalProduct $product, ?User $actor): bool
    {
        $requiresReview = $product->isCourse()
            ? app(ProductSettings::class)->updatingRequiresReviewForCourse()
            : app(ProductSettings::class)->updatingRequiresReview();

        if ($product->status !== 'approved' || !$requiresReview) {
            return false;
        }

        if ($product->review_requested_at !== null) {
            return false;
        }

        $product->update([
            'review_requested_at' => now(),
            'review_requested_by' => $actor?->id ?? $product->user_id,
        ]);

        return true;
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
