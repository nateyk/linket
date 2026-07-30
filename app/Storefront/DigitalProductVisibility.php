<?php

namespace App\Storefront;

use App\Biolinks\Models\Biolink;
use App\Biolinks\Models\BiolinkWidget;
use App\Storefront\Models\DigitalProduct;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;

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
    }

    private function syncShopWidget(Biolink $biolink): void
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
