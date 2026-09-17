<?php

namespace App\Storefront;

use App\Courses\Services\CourseService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Entitlements\Entitlements;
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
        return DB::transaction(function () use ($data, $creator, $maxUploadBytes): DigitalProduct {
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

            return $product->fresh()->load(['files', 'cover', 'biolinks', 'course']);
        });
    }

    public function update(DigitalProduct $product, array $data, ?int $maxUploadBytes): DigitalProduct
    {
        return DB::transaction(function () use ($product, $data, $maxUploadBytes): DigitalProduct {
            $type = $data['type'] ?? $product->type ?? 'digital';
            $product->update([
                ...Arr::except($data, ['file_ids', 'biolink_ids', 'type']),
                'type' => $type,
                'currency' => $data['currency'] ?? $product->currency,
                'status' => $product->status === 'approved' ? 'draft' : $product->status,
            ]);

            $this->assertCoverBelongsToWorkspace($product);
            $this->syncProductFiles($product, $data, $type, $maxUploadBytes);
            if ($type === 'course') {
                $this->courses->ensureForProduct($product->fresh());
            }
            $this->visibility->sync(
                $product,
                $data['biolink_ids'] ?? $product->biolinks()->pluck('biolinks.id')->all(),
            );

            return $product->fresh()->load(['files', 'cover', 'biolinks', 'course']);
        });
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
        // Files already attached to this product keep working even when they
        // predate the current sellable set (legacy formats can stay, they
        // just cannot be newly attached). Only newly attached files must be
        // in the canonical capability.
        $existingIds = $product->exists
            ? $product->files()->pluck('file_entries.id')->all()
            : [];
        abort_if($files->contains(function (FileEntry $file) use ($maxBytes, $existingIds): bool {
            if ($maxBytes !== null && $file->file_size > $maxBytes) {
                return true;
            }
            if (ProductFileFormats::isSellableExtension($file->extension)) {
                return false;
            }
            return !in_array($file->id, $existingIds, true);
        }), 422, $maxBytes !== null && $files->max('file_size') > $maxBytes
            ? __("One or more files exceed your plan's storage allowance per file.")
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
