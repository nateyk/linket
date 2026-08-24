<?php

namespace App\Stores\Controllers;

use App\Stores\Models\Store;
use App\Stores\Models\StoreWidget;
use App\Biolinks\Models\BiolinkWidget;
use App\Stores\Resources\StoreResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreWidgetsController extends Controller
{
    /**
     * Create a new widget for a store.
     *
     * @operationId createStoreWidget
     */
    public function store(Request $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('biolinkId');
        $store = $storeId instanceof Store ? $storeId : Store::findOrFail($storeId);
        Gate::authorize('update', $store);
        $data = $request->validate([
            'type' => ['required','string', Rule::in(['image','text','socials','youtube','soundcloud','vimeo','spotify','twitch','tiktok','shop'])],
            'position' => 'int',
            /** @var array<string, string>|null */
            'config' => 'nullable|array',
        ]);
        abort_if($store->isCreatorProfile(), 422, __('Add approved Digital Products from the creator profile Work section.'));
        $widget = $store->widgets()->create($data);
        $store->adjustPositions(direction: 'increment', anchor: $data['position'] ?? null, widgetToSkip: $widget->id);
        return new StoreResource($store->fresh()->loadContent());
    }

    /**
     * Update a widget for a store.
     *
     * @operationId updateStoreWidget
     */
    public function update(Request $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('biolinkId');
        $store = $storeId instanceof Store ? $storeId : Store::findOrFail($storeId);
        $widgetId = $request->route('widgetId') ?? $request->route('widget') ?? $request->route('id');
        $widget = StoreWidget::findOrFail($widgetId);
        Gate::authorize('update', $store);
        $data = $request->validate([
            'type' => 'string',
            'active' => 'boolean',
            'pinned' => 'nullable|in:top,bottom',
            /** @var array<string, string> */
            'config' => 'array',
        ]);
        if ($store->isCreatorProfile() && isset($data['type']) && !in_array($data['type'], ['image','text'], true)) {
            abort(422, __('Creator profiles only support image and text work items.'));
        }
        $widget->update($data);
        return new StoreResource($store->fresh()->loadContent());
    }

    /**
     * Delete a widget for a store.
     *
     * @operationId deleteStoreWidget
     */
    public function destroy(Request $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('biolinkId');
        $store = $storeId instanceof Store ? $storeId : Store::findOrFail($storeId);
        $widgetId = $request->route('widgetId') ?? $request->route('widget');
        $widget = StoreWidget::findOrFail($widgetId);
        Gate::authorize('update', $store);
        $store->widgets()->where('id', $widgetId)->delete();
        $store->adjustPositions(direction: 'decrement', anchor: $widget->position);
        return new StoreResource($store->fresh()->loadContent());
    }
}
