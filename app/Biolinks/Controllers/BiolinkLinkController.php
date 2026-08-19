<?php

namespace App\Biolinks\Controllers;

use App\Biolinks\Models\Biolink;
use App\Biolinks\Requests\CrupdateBiolinkLinkRequest;
use App\Biolinks\Resources\BiolinkResource;
use App\Links\Actions\CrupdateLink;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;

#[Group('Biolinks', weight: 5)]
class BiolinkLinkController extends Controller
{
    /**
     * Create new link for a biolink.
     *
     * @operationId createBiolinkLink
     */
    public function store(int $biolinkId, CrupdateBiolinkLinkRequest $request)
    {
        $biolink = Biolink::query()->findOrFail($biolinkId);

        Gate::authorize('update', $biolink);

        abort_if(
            $biolink->isCreatorProfile(),
            422,
            __('Add approved Digital Products from the creator profile Work section.'),
        );

        $data = $request->validated();

        $link = (new CrupdateLink())->execute(
            Arr::except($data, ['position', 'active']),
        );

        $link->biolinks()->attach($biolink->id, [
            'position' => $data['position'] ?? 0,
            'active' => $data['active'] ?? true,
        ]);

        $biolink->adjustPositions(
            direction: 'increment',
            anchor: request('position', null),
            linkToSkip: $link->id,
        );

        return new BiolinkResource($biolink->fresh()->loadContent());
    }

    /**
     * Update a link for a biolink.
     *
     * @operationId updateBiolinkLink
     */
    public function update(
        int $biolinkId,
        int $id,
        CrupdateBiolinkLinkRequest $request,
    ) {
        $biolink = Biolink::query()->findOrFail($biolinkId);
        $link = $biolink->links()->findOrFail($id);

        Gate::authorize('update', $biolink);

        $validatedData = collect($request->validated());

        $pivotData = $validatedData->only(
            'animation',
            'leap_until',
            'position',
            'active',
        );

        $linkData = $validatedData->except(
            'animation',
            'leap_until',
            'position',
            'active',
        );

        if ($pivotData->isNotEmpty()) {
            // clear all other leap links for biolink
            if ($pivotData->has('leap_until')) {
                $biolink
                    ->links()
                    ->whereNotNull('leap_until')
                    ->update(['leap_until' => null]);
            }

            $link->pivot->update($pivotData->toArray());
        }

        if ($linkData->isNotEmpty()) {
            (new CrupdateLink())->execute($linkData->toArray(), $link);
        }

        return new BiolinkResource($biolink->fresh()->loadContent());
    }

    /**
     * Detach a link.
     *
     * This will not delete link itself, only remove it from link in bio.
     *
     * @operationId detachBiolinkLink
     */
    public function detach(int $biolinkId, int $id)
    {
        $biolink = Biolink::query()->findOrFail($biolinkId);
        $link = $biolink->links()->findOrFail($id);

        Gate::authorize('update', $biolink);

        $biolink->links()->detach($link->id);

        $biolink->adjustPositions(
            direction: 'decrement',
            anchor: $link->position,
        );

        return new BiolinkResource($biolink->fresh()->loadContent());
    }
}
