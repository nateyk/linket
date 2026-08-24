<?php

namespace App\Stores\Controllers;

use App\Stores\Models\Store;
use App\Biolinks\Models\BiolinkWidget;
use App\Biolinks\Resources\BiolinkResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreWidgetsController extends Controller
{
    public function store(Request $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('biolinkId');
        $store = $storeId instanceof Store ? $storeId : Store::findOrFail($storeId);
        Gate::authorize('update', $store);
        $data = $request->validate([
            'type' => ['required','string', Rule::in(['image','text','socials','youtube','soundcloud','vimeo','spotify','twitch','tiktok','shop'])],
            'position' => 'int',
            'config' => 'nullable|array',
        ]);
        abort_if($store->isCreatorProfile(), 422, __('Add approved Digital Products from the creator profile Work section.'));
        $widget = $store->widgets()->create($data);
        $store->adjustPositions(direction: 'increment', anchor: $data['position'] ?? null, widgetToSkip: $widget->id);
        return new BiolinkResource($store->fresh()->loadContent());
    }

    public function update(Request $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('biolinkId');
        $store = $storeId instanceof Store ? $storeId : Store::findOrFail($storeId);
        $widgetId = $request->route('widgetId') ?? $request->route('widget') ?? $request->route('id');
        $widget = BiolinkWidget::findOrFail($widgetId);
        Gate::authorize('update', $store);
        $data = $request->validate([
            'type' => 'string',
            'active' => 'boolean',
            'pinned' => 'nullable|in:top,bottom',
            'config' => 'array',
        ]);
        if ($store->isCreatorProfile() && isset($data['type']) && !in_array($data['type'], ['image','text'], true)) {
            abort(422, __('Creator profiles only support image and text work items.'));
        }
        $widget->update($data);
        return new BiolinkResource($store->fresh()->loadContent());
    }

    public function destroy(Request $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('biolinkId');
        $store = $storeId instanceof Store ? $storeId : Store::findOrFail($storeId);
        $widgetId = $request->route('widgetId') ?? $request->route('widget');
        $widget = BiolinkWidget::findOrFail($widgetId);
        Gate::authorize('update', $store);
        $store->widgets()->where('id', $widgetId)->delete();
        $store->adjustPositions(direction: 'decrement', anchor: $widget->position);
        return new BiolinkResource($store->fresh()->loadContent());
    }
}
