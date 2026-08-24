<?php

namespace App\Stores\Controllers;

use App\Biolinks\BiolinksQueryBuilder;
use App\Stores\Models\Store;
use App\Biolinks\Requests\CrupdateBiolinkRequest;
use App\Biolinks\Resources\BiolinkResource;
use App\Biolinks\Actions\CrupdateBiolink;
use App\Biolinks\Actions\DeleteBiolinks;
use App\Entitlements\Entitlements;
use Common\Workspaces\ActiveWorkspace;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

#[Group('Stores', weight: 4)]
class StoresController extends Controller
{
    /**
     * List all stores.
     *
     * @operationId listStores
     */
    public function index(Request $request)
    {
        Gate::authorize('index', Store::class);

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

        // Use Store query but leverage existing query builder; override model via Store
        // For now reuse BiolinksQueryBuilder but it queries Biolink model which shares same table
        // We'll manually query Store for correct model_type
        $pagination = (new BiolinksQueryBuilder($data))->paginate();

        // Convert each Biolink model in pagination to Store for correct model_type
        // If items are Biolink, re-hydrate as Store
        $collection = $pagination->getCollection()->map(function ($model) {
            if ($model instanceof Store) {
                return $model;
            }
            // fetch as Store to get correct MODEL_TYPE
            return Store::find($model->id) ?? $model;
        });
        $pagination->setCollection($collection);

        return BiolinkResource::collection($pagination);
    }

    /**
     * Retrieve a store.
     *
     * @operationId retrieveStore
     */
    public function show(Request $request, $store = null)
    {
        $id = $request->route('store') ?? $request->route('biolink') ?? $request->route('id') ?? $store;
        if ($id instanceof Store) {
            $storeModel = $id;
        } else {
            $storeModel = Store::query()->findOrFail($id);
        }

        Gate::authorize('show', $storeModel);

        $storeModel->loadContent();

        return new BiolinkResource($storeModel, fieldsPreset: 'show');
    }

    /**
     * Create a store.
     *
     * @operationId createStore
     */
    public function store(CrupdateBiolinkRequest $request)
    {
        Gate::authorize('store', Store::class);

        $entitlements = app(Entitlements::class);
        $creator = $request->user();
        $maxStorefronts = $entitlements->limit($creator, 'max_storefronts');
        if ($maxStorefronts !== null) {
            $count = Store::query()
                ->where('workspace_id', ActiveWorkspace::get()->id)
                ->whereNull('deleted_at')
                ->count();
            abort_if($count >= $maxStorefronts, 422, __(
                "You've reached your :plan limit of :count storefronts.",
                ['plan' => $entitlements->planFor($creator)?->name ?? 'plan', 'count' => $maxStorefronts],
            ));
        }

        $biolink = (new CrupdateBiolink())->execute($request->validated());
        // Re-fetch as Store to ensure model_type store
        $store = Store::find($biolink->id);

        return new BiolinkResource($store);
    }

    /**
     * Update a store.
     *
     * @operationId updateStore
     */
    public function update(Request $request, $store = null)
    {
        // Resolve id from route
        $routeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('id') ?? $store;
        if ($routeId instanceof Store) {
            $storeModel = $routeId;
            $id = $storeModel->id;
        } else {
            $id = $routeId;
            $storeModel = Store::query()->findOrFail($id);
        }

        Gate::authorize('update', $storeModel);

        // Validate using CrupdateBiolinkRequest logic? Reuse validation from that request
        // For simplicity, use CrupdateBiolinkRequest validation via app
        $crupdateRequest = app(CrupdateBiolinkRequest::class);
        // Instead, validate directly via request
        $validated = $request->validate((new CrupdateBiolinkRequest())->rules());

        $updated = (new CrupdateBiolink())->execute($validated, $storeModel);

        $storeFresh = Store::find($updated->id);

        return new BiolinkResource($storeFresh);
    }

    /**
     * Delete a store.
     *
     * @operationId deleteStore
     */
    public function destroy(Request $request, $store = null)
    {
        $id = $request->route('store') ?? $request->route('biolink') ?? $request->route('id') ?? $store;
        if ($id instanceof Store) {
            $storeModel = $id;
        } else {
            $storeModel = Store::query()->findOrFail($id);
        }

        Gate::authorize('destroy', $storeModel);

        abort_if(
            Store::query()
                ->where('workspace_id', $storeModel->workspace_id)
                ->count() === 1,
            422,
            __('At least one link in bio is required for workspace'),
        );

        (new DeleteBiolinks())->execute([$storeModel->id]);

        return response()->noContent();
    }

    /**
     * Legacy alias for list - keep compatible with biolink/list
     */
    public function list(Request $request)
    {
        return $this->index($request);
    }
}
