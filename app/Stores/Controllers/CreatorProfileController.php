<?php

namespace App\Stores\Controllers;

use App\Biolinks\Actions\ConvertBiolinkToCreatorProfile;
use App\Biolinks\Actions\SanitizeCreatorAbout;
use App\Stores\Models\Store;
use App\Biolinks\Requests\UpdateCreatorProfileRequest;
use App\Biolinks\Resources\BiolinkResource;
use App\Storefront\DigitalProductVisibility;
use App\Storefront\Models\DigitalProduct;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

#[Group('Stores', weight: 4)]
class CreatorProfileController extends Controller
{
    public function update($id, UpdateCreatorProfileRequest $request): BiolinkResource
    {
        $storeId = $request->route('store') ?? $id;
        $store = $storeId instanceof Store ? $storeId : Store::query()->findOrFail($storeId);
        Gate::authorize('update', $store);

        abort_unless($store->isCreatorProfile(), 422, __('Upgrade this page to a creator profile before editing it.'));

        $validated = $request->validated();
        $validated['about_html'] = $request->exists('about_html')
            ? app(SanitizeCreatorAbout::class)->execute($validated['about_html'] ?? null)
            : ($store->profile_config['about_html'] ?? '');
        $featuredProductIds = $validated['featured_product_ids'];
        $featuredProducts = DigitalProduct::query()
            ->where('workspace_id', $store->workspace_id)
            ->where('user_id', $request->user()->id)
            ->where('status', 'approved')
            ->whereIn('id', $featuredProductIds)
            ->whereHas('files')
            ->get();

        abort_if($featuredProducts->count() !== count($featuredProductIds), 422, __('Every featured product must be approved, downloadable, and owned by you.'));

        DB::transaction(function () use ($store, $validated, $featuredProductIds): void {
            $store->update([
                'profile_config' => [
                    ...Arr::except($validated, ['featured_product_ids']),
                    'source_widget_ids' => $store->creatorProfileSourceWidgetIds(),
                ],
            ]);

            app(DigitalProductVisibility::class)->syncForBiolink($store, $featuredProductIds);
        });

        return new BiolinkResource($store->fresh()->loadContent());
    }

    public function convert($id): BiolinkResource
    {
        // handle both store and biolink param names
        $storeId = request()->route('store') ?? $id;
        $store = $storeId instanceof Store ? $storeId : Store::query()->findOrFail($storeId);
        Gate::authorize('update', $store);

        $store = app(ConvertBiolinkToCreatorProfile::class)->execute($store);

        return new BiolinkResource($store->fresh()->loadContent());
    }
}
