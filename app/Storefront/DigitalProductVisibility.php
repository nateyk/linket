<?php

namespace App\Storefront;

use App\Biolinks\Models\Biolink;
use App\Biolinks\Models\BiolinkWidget;
use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class DigitalProductVisibility
{
    /** @param array<int> $biolinkIds */
    public function sync(DigitalProduct $product, array $biolinkIds): void
    {
        $currentIds = $product->biolinks()->pluck('biolinks.id')->all();
        $biolinks = Biolink::query()
            ->where('workspace_id', $product->workspace_id)
            ->whereIn('id', $biolinkIds)
            ->get();

        abort_if($biolinks->count() !== count($biolinkIds), 422, __('Every bio page must belong to the active workspace.'));
        $biolinks->each(fn(Biolink $biolink) => Gate::authorize('update', $biolink));

        $product->biolinks()->sync($biolinkIds);

        Biolink::query()
            ->whereIn('id', [...$currentIds, ...$biolinkIds])
            ->get()
            ->each(fn(Biolink $biolink) => $this->syncShopWidget($biolink));

        foreach ($biolinks as $store) {
            Log::info('store.visibility.sync', ['store_id' => $store->id, 'product_id' => $product->id, 'workspace_id' => $product->workspace_id]);
        }
        // also log removals for currentIds that are no longer present
        $removedIds = array_diff($currentIds, $biolinkIds);
        foreach ($removedIds as $removedId) {
            Log::info('store.visibility.sync', ['store_id' => $removedId, 'product_id' => $product->id, 'workspace_id' => $product->workspace_id, 'action' => 'removed']);
        }
    }

    /** @param array<int> $productIds */
    public function syncForBiolink(Biolink|Store $biolink, array $productIds): void
    {
        // Same placement policy as sync(): every product must live in the
        // biolink's workspace and the caller must be allowed to update it.
        // (Per-product ownership beyond the workspace stays at the endpoint
        // layer, matching sync(). Trashed products fail the count check via
        // the SoftDeletes global scope.)
        $products = DigitalProduct::query()
            ->where('workspace_id', $biolink->workspace_id)
            ->whereIn('id', $productIds)
            ->get();

        abort_if($products->count() !== count($productIds), 422, __('Every featured product must belong to this workspace.'));
        Gate::authorize('update', $biolink);

        // Same atomicity guarantee as sync(): pivot and widget commit together.
        DB::transaction(function () use ($biolink, $productIds): void {
            $biolink->digitalProducts()->sync($productIds);
            $this->syncShopWidget($biolink);
        });
        Log::info('store.visibility.sync', ['store_id' => $biolink->id, 'workspace_id' => $biolink->workspace_id, 'product_ids' => $productIds]);
    }

    private function syncShopWidget(Biolink|Store $biolink): void
    {
        $productIds = $biolink->digitalProducts()
            ->whereNull('digital_products.deleted_at')
            ->pluck('digital_products.id')
            ->map(fn(int $id) => $id)
            ->values()
            ->all();

        $widget = $biolink->widgets()
            ->where('type', 'shop')
            ->get()
            ->first(fn(BiolinkWidget $item) => ($item->config['source'] ?? null) === 'digital-products');

        if (!$productIds) {
            if ($widget) {
                $position = $widget->position;
                $widget->delete();
                $biolink->adjustPositions(anchor: $position);
            }

            return;
        }

        if (!$widget) {
            $widget = $biolink->widgets()->create([
                'type' => 'shop',
                'position' => ($biolink->widgets()->max('position') ?? -1) + 1,
                'config' => ['source' => 'digital-products'],
            ]);
        }

        $widget->update([
            'config' => [...$widget->config, 'source' => 'digital-products', 'product_ids' => $productIds],
        ]);
    }
}
