<?php

namespace App\Biolinks\Controllers;

use App\Biolinks\Actions\CrupdateBiolink;
use App\Biolinks\Actions\DeleteBiolinks;
use App\Biolinks\Models\Biolink;
use App\Biolinks\BiolinksQueryBuilder;
use App\Biolinks\Requests\CrupdateBiolinkRequest;
use App\Biolinks\Resources\BiolinkResource;
use App\Entitlements\Entitlements;
use Common\Workspaces\ActiveWorkspace;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

#[Group('Biolinks', weight: 4)]
class BiolinksController extends Controller
{
    /**
     * List all biolinks.
     *
     * @operationId listBiolinks
     */
    public function index(Request $request)
    {
        Gate::authorize('index', Biolink::class);

        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'fields_preset' => 'string',
            'page' => 'integer|min:1',
            'sort' => 'string',
            'workspace_id' => 'string',
            'user_id' => 'integer',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);

        $pagination = (new BiolinksQueryBuilder($data))->paginate();

        return BiolinkResource::collection($pagination);
    }

    /**
     * Retrieve a biolink.
     *
     * @operationId retrieveBiolink
     */
    public function show(mixed $id)
    {
        $biolink = $id instanceof Biolink || $id instanceof \App\Stores\Models\Store ? $id : Biolink::query()->findOrFail($id);

        Gate::authorize('show', $biolink);

        $biolink->loadContent();

        return new BiolinkResource($biolink, fieldsPreset: 'show');
    }

    /**
     * Create a biolink.
     *
     * @operationId createBiolink
     */
    public function store(CrupdateBiolinkRequest $request)
    {
        Gate::authorize('store', Biolink::class);

        $entitlements = app(Entitlements::class);
        $creator = $request->user();
        $maxStorefronts = $entitlements->limit($creator, 'max_storefronts');
        if ($maxStorefronts !== null) {
            $count = Biolink::query()
                ->where('workspace_id', ActiveWorkspace::get()->id)
                ->whereNull('deleted_at')
                ->count();
            abort_if($count >= $maxStorefronts, 422, __(
                "You've reached your :plan limit of :count storefronts.",
                ['plan' => $entitlements->planFor($creator)?->name ?? 'plan', 'count' => $maxStorefronts],
            ));
        }

        $biolink = (new CrupdateBiolink())->execute($request->validated());

        return new BiolinkResource($biolink);
    }

    /**
     * Update a biolink.
     *
     * @operationId updateBiolink
     */
    public function update(mixed $id, CrupdateBiolinkRequest $request)
    {
        $biolink = $id instanceof Biolink || $id instanceof \App\Stores\Models\Store ? $id : Biolink::query()->findOrFail($id);

        Gate::authorize('update', $biolink);

        $biolink = (new CrupdateBiolink())->execute(
            $request->validated(),
            $biolink,
        );

        return new BiolinkResource($biolink);
    }

    /**
     * Delete a biolink.
     *
     * @operationId deleteBiolink
     */
    public function destroy(mixed $id)
    {
        $biolink = $id instanceof Biolink || $id instanceof \App\Stores\Models\Store ? $id : Biolink::query()->findOrFail($id);
        $id = $biolink->id;

        Gate::authorize('destroy', $biolink);

        abort_if(
            Biolink::query()
                ->where('workspace_id', $biolink->workspace_id)
                ->count() === 1,
            422,
            __('At least one link in bio is required for workspace'),
        );

        (new DeleteBiolinks())->execute([$id]);

        return response()->noContent();
    }
}
