<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Resources\DigitalProductResource;
use App\Storefront\StorefrontBenefits;
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
    public function show(Request $request, DigitalProduct $digitalProduct) { $this->assertOwner($digitalProduct, $request); return new DigitalProductResource($digitalProduct->load(['files', 'cover', 'biolinks'])); }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $creator = $request->user();
        $benefits = app(StorefrontBenefits::class)->forCreator($creator);
        $this->enforceProductLimit($benefits, $data['price_cents'], null);

        return DB::transaction(function () use ($data, $creator, $benefits): DigitalProduct {
            $product = DigitalProduct::create([...Arr::except($data, ['file_ids', 'biolink_ids']), 'user_id' => $creator->id, 'currency' => $data['currency'] ?? config('storefront.currency')]);
            $this->syncFiles($product, $data['file_ids'], $benefits['max_upload_bytes']);
            app(DigitalProductVisibility::class)->sync($product, $data['biolink_ids'] ?? []);
            return new DigitalProductResource($product->load(['files', 'cover', 'biolinks']));
        });
    }

    public function update(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        $data = $this->validated($request);
        $benefits = app(StorefrontBenefits::class)->forCreator($request->user());
        return DB::transaction(function () use ($digitalProduct, $data, $request, $benefits): DigitalProduct {
            $digitalProduct->update([...Arr::except($data, ['file_ids', 'biolink_ids']), 'currency' => $data['currency'] ?? $digitalProduct->currency, 'status' => $digitalProduct->status === 'approved' ? 'draft' : $digitalProduct->status]);
            $this->syncFiles($digitalProduct, $data['file_ids'], $benefits['max_upload_bytes'] ?? null);
            app(DigitalProductVisibility::class)->sync($digitalProduct, $data['biolink_ids'] ?? $digitalProduct->biolinks()->pluck('biolinks.id')->all());
            return new DigitalProductResource($digitalProduct->fresh()->load(['files', 'cover', 'biolinks']));
        });
    }

    public function submit(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        abort_if($digitalProduct->files()->doesntExist(), 422, __('Add at least one downloadable file before submitting.'));
        $digitalProduct->update(['status' => 'pending_approval', 'rejection_reason' => null]);
        return new DigitalProductResource($digitalProduct->fresh());
    }

    public function destroy(Request $request, DigitalProduct $digitalProduct) { $this->assertOwner($digitalProduct, $request); app(DigitalProductVisibility::class)->sync($digitalProduct, []); $digitalProduct->delete(); return response()->noContent(); }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => 'required|string|max:160', 'description' => 'nullable|string|max:20000', 'price_cents' => 'required|integer|min:0',
            'currency' => 'nullable|in:etb,ETB', 'cover_file_entry_id' => 'nullable|integer|exists:file_entries,id',
            'file_ids' => 'required|array|min:1', 'file_ids.*' => 'integer|distinct|exists:file_entries,id',
            'biolink_ids' => 'nullable|array', 'biolink_ids.*' => 'integer|distinct|exists:biolinks,id',
        ]);
    }
    private function enforceProductLimit(array $benefits, int $priceCents, ?int $existingId): void
    {
        $isFree = $priceCents <= 0;
        $key = $isFree ? 'max_free_products' : 'max_paid_products';
        $limit = $benefits[$key] ?? null;
        if ($limit === null) {
            return;
        }
        $query = DigitalProduct::query()->where('workspace_id', ActiveWorkspace::get()->id)->whereNull('deleted_at');
        if ($existingId !== null) {
            $query->where('id', '!=', $existingId);
        }
        $query->where('price_cents', $isFree ? '<=' : '>', 0);
        $count = $query->count();
        abort_if($count >= $limit, 422, $isFree
            ? __("You've reached your plan limit of :limit free products.", ['limit' => $limit])
            : __("You've reached your plan limit of :limit paid products.", ['limit' => $limit])
        );
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
            abort_if($existingBytes + $newBytes > $maxBytes, 422, __("Uploading these files would exceed your plan's storage allowance of :limit.", ['limit' => $this->formatBytes($maxBytes)]));
        }

        $product->files()->sync($ids);
    }
    private function formatBytes(int $bytes): string
    {
        $gb = 1073741824;
        $mb = 1048576;
        return $bytes >= $gb ? round($bytes / $gb, 1) . ' GB' : round($bytes / $mb, 1) . ' MB';
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
