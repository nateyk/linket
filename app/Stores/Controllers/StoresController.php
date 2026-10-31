<?php

namespace App\Stores\Controllers;

use App\Biolinks\BiolinksQueryBuilder;
use App\Stores\Models\Store;
use App\Stores\Requests\CrupdateStoreRequest;
use App\Stores\Resources\StoreResource;
use App\Biolinks\Actions\CrupdateBiolink;
use App\Biolinks\Actions\DeleteBiolinks;
use App\Entitlements\Entitlements;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;
use App\Models\User;

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

        $pagination = (new BiolinksQueryBuilder($data))->paginate();

        return StoreResource::collection($pagination);
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

        return new StoreResource($storeModel, fieldsPreset: 'show');
    }

    /**
     * Create a store.
     *
     * @operationId createStore
     */
    public function store(CrupdateStoreRequest $request)
    {
        Gate::authorize('store', Store::class);

        $store = DB::transaction(function () use ($request): Store {
            $creator = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $entitlements = app(Entitlements::class);
            $plan = $entitlements->planFor($creator);
            $maxStorefronts = $plan?->free ? 1 : $entitlements->limit($creator, 'max_storefronts');
            if ($maxStorefronts !== null) {
                $count = Store::query()->where('user_id', $creator->id)->whereNull('deleted_at')->count();
                abort_if($count >= $maxStorefronts, 422, __(
                    "You've reached your :plan limit of :count storefronts.",
                    ['plan' => $plan?->name ?? 'plan', 'count' => $maxStorefronts],
                ));
            }

            $biolink = (new CrupdateBiolink())->execute($request->validated());
            return Store::query()->findOrFail($biolink->id);
        });

        return new StoreResource($store);
    }

    /**
     * Update a store.
     *
     * @operationId updateStore
     */
    public function update(CrupdateStoreRequest $request, $store = null)
    {
        // Resolve id from route
        $routeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('id') ?? $store;
        if ($routeId instanceof Store) {
            $storeModel = $routeId;
        } else {
            $storeModel = Store::query()->findOrFail($routeId);
        }

        Gate::authorize('update', $storeModel);

        $validated = $request->validated();
        if (isset($validated['back_half']) && $validated['back_half'] !== $storeModel->back_half) {
            abort_unless(app(\App\Storefront\Services\AccountMonetizationStatus::class)->canSell($request->user()), 403);
        }

        $updated = (new CrupdateBiolink())->execute($validated, $storeModel);

        $storeFresh = Store::find($updated->id);

        return new StoreResource($storeFresh);
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
     *
     * @operationId listStoresList
     */
    public function list(Request $request)
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

        $pagination = (new BiolinksQueryBuilder($data))->paginate();

        return StoreResource::collection($pagination);
    }
}
