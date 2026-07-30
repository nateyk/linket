<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Resources\DigitalProductResource;
use App\Storefront\StorefrontBenefits;
use App\Storefront\DigitalProductVisibility;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Arr;

class DigitalProductsController extends Controller
{
    public function index(Request $request) { return DigitalProductResource::collection(DigitalProduct::query()->where('workspace_id', ActiveWorkspace::get()->id)->where('user_id', $request->user()->id)->with(['files', 'cover', 'biolinks'])->latest()->paginate()); }
    public function show(Request $request, DigitalProduct $digitalProduct) { $this->assertOwner($digitalProduct, $request); return new DigitalProductResource($digitalProduct->load(['files', 'cover', 'biolinks'])); }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $creator = $request->user();
        $benefits = app(StorefrontBenefits::class)->forCreator($creator);
        $count = DigitalProduct::query()->where('workspace_id', ActiveWorkspace::get()->id)->whereNull('deleted_at')->count();
        abort_if($benefits['max_products'] !== null && $count >= $benefits['max_products'], 422, __('You are over your allowed product quota.'));

        return DB::transaction(function () use ($data, $creator): DigitalProduct {
            $product = DigitalProduct::create([...Arr::except($data, ['file_ids', 'biolink_ids']), 'user_id' => $creator->id, 'currency' => $data['currency'] ?? config('storefront.currency')]);
            $this->syncFiles($product, $data['file_ids'], app(StorefrontBenefits::class)->forCreator($creator)['max_upload_bytes']);
            app(DigitalProductVisibility::class)->sync($product, $data['biolink_ids'] ?? []);
            return new DigitalProductResource($product->load(['files', 'cover', 'biolinks']));
        });
    }

    public function update(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        $data = $this->validated($request);
        return DB::transaction(function () use ($digitalProduct, $data, $request): DigitalProduct {
            $digitalProduct->update([...Arr::except($data, ['file_ids', 'biolink_ids']), 'currency' => $data['currency'] ?? $digitalProduct->currency, 'status' => $digitalProduct->status === 'approved' ? 'draft' : $digitalProduct->status]);
            $this->syncFiles($digitalProduct, $data['file_ids'], app(StorefrontBenefits::class)->forCreator($request->user())['max_upload_bytes']);
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
            'title' => 'required|string|max:160', 'description' => 'nullable|string|max:5000', 'price_cents' => 'required|integer|min:50',
            'currency' => 'nullable|in:etb,ETB', 'cover_file_entry_id' => 'nullable|integer|exists:file_entries,id',
            'file_ids' => 'required|array|min:1', 'file_ids.*' => 'integer|distinct|exists:file_entries,id',
            'biolink_ids' => 'nullable|array', 'biolink_ids.*' => 'integer|distinct|exists:biolinks,id',
        ]);
    }
    private function syncFiles(DigitalProduct $product, array $ids, int $maxBytes): void
    {
        $this->assertCoverBelongsToWorkspace($product);
        $files = FileEntry::query()->whereIn('id', $ids)->where('workspace_id', $product->workspace_id)->get();
        abort_if($files->count() !== count($ids), 422, __('Every file must belong to the active workspace.'));
        abort_if($files->contains(fn(FileEntry $file) => $file->file_size > $maxBytes || !in_array(strtolower((string) $file->extension), config('storefront.allowed_extensions'), true)), 422, __('One or more files are not allowed for sale.'));
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
