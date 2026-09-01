<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Entitlements\Entitlements;
use App\Storefront\Resources\DigitalProductResource;
use App\Storefront\DigitalProductVisibility;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Arr;

class DigitalProductsController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        return DigitalProductResource::collection(
            DigitalProduct::query()
                ->where('workspace_id', ActiveWorkspace::get()->id)
                ->where('user_id', $request->user()->id)
                ->withCount([
                    'orders as sales_count' => fn (Builder $query): Builder => $query->where('status', 'paid'),
                ])
                ->withSum([
                    'orders as gross_revenue_cents' => fn (Builder $query): Builder => $query->where('status', 'paid'),
                ], 'gross_amount_cents')
                ->with(['files', 'cover', 'biolinks'])
                ->latest()
                ->paginate($perPage),
        );
    }
    public function show(Request $request, DigitalProduct $digitalProduct) { $this->assertOwner($digitalProduct, $request); return new DigitalProductResource($digitalProduct->load(['files', 'cover', 'biolinks', 'course'])); }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $creator = $request->user();
        $entitlements = app(Entitlements::class);
        abort_unless($entitlements->enabled($creator, 'course_creation_enabled') || ($data['type'] ?? 'digital') !== 'course', 403, __('Course creation is not enabled for your plan.'));
        $this->enforceProductLimitForType(
            $entitlements,
            $data['price_cents'],
            $data['type'] ?? 'digital',
            $creator,
            null,
        );

        return DB::transaction(function () use ($data, $creator, $entitlements): DigitalProductResource {
            $type = $data['type'] ?? 'digital';
            $product = DigitalProduct::create([
                ...Arr::except($data, ['file_ids', 'biolink_ids', 'type']),
                'type' => $type,
                'user_id' => $creator->id,
                'workspace_id' => ActiveWorkspace::get()->id,
                'currency' => $data['currency'] ?? config('storefront.currency'),
            ]);
            if ($type === 'course') {
                app(\App\Courses\Services\CourseService::class)->ensureForProduct($product);
                // Courses do not require digital_product_files; file_ids optional
                if (!empty($data['file_ids'])) {
                    $this->syncFiles($product, $data['file_ids'], $entitlements->limit($creator, 'max_upload_bytes'));
                }
            } else {
                $this->syncFiles(
                    $product,
                    $data['file_ids'],
                    $entitlements->limit($creator, 'max_upload_bytes'),
                );
            }
            app(DigitalProductVisibility::class)->sync($product, $data['biolink_ids'] ?? []);

            $product->load(['files', 'cover', 'biolinks', 'course']);
            return new DigitalProductResource($product);
        });
    }

    public function update(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        $data = $this->validated($request, $digitalProduct);
        $creator = $request->user();
        $entitlements = app(Entitlements::class);
        $effectiveType = $data['type'] ?? $digitalProduct->type ?? 'digital';
        abort_unless($entitlements->enabled($creator, 'course_creation_enabled') || $effectiveType !== 'course', 403, __('Course creation is not enabled for your plan.'));
        $this->enforceProductLimitForType($entitlements, $data['price_cents'], $effectiveType, $creator, $digitalProduct->id);

        return DB::transaction(function () use ($digitalProduct, $data, $creator, $entitlements): DigitalProductResource {
            $type = $data['type'] ?? $digitalProduct->type ?? 'digital';
            $digitalProduct->update([
                ...Arr::except($data, ['file_ids', 'biolink_ids', 'type']),
                'type' => $type,
                'currency' => $data['currency'] ?? $digitalProduct->currency,
                'status' => $digitalProduct->status === 'approved' ? 'draft' : $digitalProduct->status,
            ]);
            if ($type === 'course') {
                app(\App\Courses\Services\CourseService::class)->ensureForProduct($digitalProduct->fresh());
                if (array_key_exists('file_ids', $data) && !empty($data['file_ids'])) {
                    $this->syncFiles($digitalProduct, $data['file_ids'], $entitlements->limit($creator, 'max_upload_bytes'));
                } elseif (array_key_exists('file_ids', $data) && empty($data['file_ids'])) {
                    $digitalProduct->files()->sync([]);
                }
            } else {
                $this->syncFiles(
                    $digitalProduct,
                    $data['file_ids'],
                    $entitlements->limit($creator, 'max_upload_bytes'),
                );
            }
            app(DigitalProductVisibility::class)->sync(
                $digitalProduct,
                $data['biolink_ids'] ?? $digitalProduct->biolinks()->pluck('biolinks.id')->all(),
            );

            return new DigitalProductResource($digitalProduct->fresh()->load(['files', 'cover', 'biolinks', 'course']));
        });
    }

    public function submit(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        if ($digitalProduct->isCourse()) {
            $course = $digitalProduct->course ?? app(\App\Courses\Services\CourseService::class)->ensureForProduct($digitalProduct);
            $hasPublished = \App\Courses\Models\Lesson::where('course_id', $course->id)->where('status', 'published')->exists();
            abort_unless($course->chapters()->exists() && $hasPublished, 422, __('Add at least one chapter and one published lesson before submitting.'));
            if (config('store.courses_require_approval')) {
                $course->update(['published_at' => now()]);
                $digitalProduct->update(['status' => 'pending_approval', 'rejection_reason' => null]);
            } else {
                $course->update(['published_at' => now()]);
                $digitalProduct->update(['status' => 'approved', 'approved_at' => now(), 'rejection_reason' => null]);
            }
            return new DigitalProductResource($digitalProduct->fresh()->load(['course', 'cover']));
        }
        abort_if($digitalProduct->files()->doesntExist(), 422, __('Add at least one downloadable file before submitting.'));
        $digitalProduct->update(['status' => 'pending_approval', 'rejection_reason' => null]);
        return new DigitalProductResource($digitalProduct->fresh());
    }

    public function destroy(Request $request, DigitalProduct $digitalProduct) { $this->assertOwner($digitalProduct, $request); app(DigitalProductVisibility::class)->sync($digitalProduct, []); $digitalProduct->delete(); return response()->noContent(); }

    private function validated(Request $request, ?DigitalProduct $existing = null): array
    {
        $type = $request->input('type', $existing?->type ?? 'digital');
        $isCourse = $type === 'course';
        $rules = [
            'title' => 'required|string|max:160', 'description' => 'nullable|string|max:20000', 'price_cents' => 'required|integer|min:0',
            'currency' => 'nullable|in:etb,ETB', 'cover_file_entry_id' => 'nullable|integer|exists:file_entries,id',
            'type' => 'nullable|in:digital,ebook,audio,course',
            'biolink_ids' => 'nullable|array', 'biolink_ids.*' => 'integer|distinct|exists:biolinks,id',
        ];
        if ($isCourse) {
            $rules['file_ids'] = 'nullable|array';
            $rules['file_ids.*'] = 'integer|distinct|exists:file_entries,id';
        } else {
            $rules['file_ids'] = 'required|array|min:1';
            $rules['file_ids.*'] = 'integer|distinct|exists:file_entries,id';
        }
        return $request->validate($rules);
    }
    private function enforceProductLimitForType(Entitlements $entitlements, int $priceCents, string $type, \App\Models\User $creator, ?int $existingId): void
    {
        if ($type === 'course') {
            $limit = $entitlements->limit($creator, 'max_courses') ?? $entitlements->limit($creator, 'max_products');
            if ($limit === null) return;
            $query = DigitalProduct::query()->where('workspace_id', ActiveWorkspace::get()->id)->whereNull('deleted_at')->where('type', 'course');
            if ($existingId) $query->where('id', '!=', $existingId);
            abort_if($query->count() >= $limit, 422, __("You've reached your :plan limit of :count courses.", ['plan' => $entitlements->planFor($creator)?->name ?? 'plan', 'count' => $limit]));
            return;
        }
        $this->enforceProductLimit($entitlements->limit($creator, 'max_free_products'), $entitlements->limit($creator, 'max_paid_products'), $priceCents, $entitlements->planFor($creator)?->name, $existingId);
    }
    private function enforceProductLimit(
        ?int $freeLimit,
        ?int $paidLimit,
        int $priceCents,
        ?string $planName,
        ?int $existingId,
    ): void {
        $isFree = $priceCents <= 0;
        $limit = $isFree ? $freeLimit : $paidLimit;
        if ($limit === null) {
            return;
        }
        $query = DigitalProduct::query()
            ->where('workspace_id', ActiveWorkspace::get()->id)
            ->whereNull('deleted_at');
        if ($existingId !== null) {
            $query->where('id', '!=', $existingId);
        }
        $query->where('price_cents', $isFree ? '<=' : '>', 0);
        $count = $query->count();
        abort_if($count >= $limit, 422, $isFree
            ? __("You've reached your :plan limit of :count free products.", ['plan' => $planName ?? 'plan', 'count' => $limit])
            : __("You've reached your :plan limit of :count paid products.", ['plan' => $planName ?? 'plan', 'count' => $limit]));
    }
    private function syncFiles(DigitalProduct $product, array $ids, ?int $maxBytes): void
    {
        $this->assertCoverBelongsToWorkspace($product);
        $files = FileEntry::query()->whereIn('id', $ids)->where('workspace_id', $product->workspace_id)->get();
        abort_if($files->count() !== count($ids), 422, __('Every file must belong to the active workspace.'));
        abort_if($files->contains(function (FileEntry $file) use ($maxBytes): bool {
            return ($maxBytes !== null && $file->file_size > $maxBytes) || !in_array(strtolower((string) $file->extension), config('storefront.allowed_extensions'), true);
        }), 422, $maxBytes !== null && $files->max('file_size') > $maxBytes
            ? __("One or more files exceed your plan's storage allowance per file.")
            : __('One or more files are not allowed for sale.'));

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
    private function assertOwner(DigitalProduct $product, Request $request): void
    {
        abort_unless(
            $product->workspace_id === ActiveWorkspace::get()->id &&
                $product->user_id === $request->user()->id,
            403,
        );
    }
}
