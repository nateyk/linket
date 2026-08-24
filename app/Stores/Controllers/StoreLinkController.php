<?php

namespace App\Stores\Controllers;

use App\Stores\Models\Store;
use App\Biolinks\Requests\CrupdateBiolinkLinkRequest;
use App\Biolinks\Resources\BiolinkResource;
use App\Links\Actions\CrupdateLink;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;
use Dedoc\Scramble\Attributes\Group;

#[Group('Stores', weight: 5)]
class StoreLinkController extends Controller
{
    public function store(CrupdateBiolinkLinkRequest $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('biolinkId');
        $store = $storeId instanceof Store ? $storeId : Store::query()->findOrFail($storeId);

        Gate::authorize('update', $store);

        abort_if(
            $store->isCreatorProfile(),
            422,
            __('Add approved Digital Products from the creator profile Work section.'),
        );

        $data = $request->validated();

        $link = (new CrupdateLink())->execute(
            Arr::except($data, ['position', 'active']),
        );

        $link->biolinks()->attach($store->id, [
            'position' => $data['position'] ?? 0,
            'active' => $data['active'] ?? true,
        ]);

        $store->adjustPositions(
            direction: 'increment',
            anchor: request('position', null),
            linkToSkip: $link->id,
        );

        return new BiolinkResource($store->fresh()->loadContent());
    }

    public function update(CrupdateBiolinkLinkRequest $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('biolinkId');
        $store = $storeId instanceof Store ? $storeId : Store::query()->findOrFail($storeId);
        $id = $request->route('id') ?? $request->route('link');
        $link = $store->links()->findOrFail($id);

        Gate::authorize('update', $store);

        $validatedData = collect($request->validated());

        $pivotData = $validatedData->only('animation','leap_until','position','active');
        $linkData = $validatedData->except('animation','leap_until','position','active');

        if ($pivotData->isNotEmpty()) {
            if ($pivotData->has('leap_until')) {
                $store->links()->whereNotNull('leap_until')->update(['leap_until' => null]);
            }
            $link->pivot->update($pivotData->toArray());
        }

        if ($linkData->isNotEmpty()) {
            (new CrupdateLink())->execute($linkData->toArray(), $link);
        }

        return new BiolinkResource($store->fresh()->loadContent());
    }

    public function detach($storeId, $id)
    {
        $store = Store::query()->findOrFail($storeId instanceof Store ? $storeId->id : $storeId);
        $link = $store->links()->findOrFail($id);
        Gate::authorize('update', $store);
        $store->links()->detach($link->id);
        $store->adjustPositions(direction: 'decrement', anchor: $link->position);
        return new BiolinkResource($store->fresh()->loadContent());
    }
}
