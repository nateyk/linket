<?php

namespace App\Stores\Controllers;

use App\CreatorAi\Storefront\StorefrontAppearanceProposalService;
use App\Models\User;
use App\Stores\Models\Store;
use App\Stores\Resources\StoreResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class StoreAppearanceController extends Controller
{
    public function __construct(private readonly StorefrontAppearanceProposalService $proposals) {}

    /**
     * Update store appearance. A preview-based save is conditional on the
     * creator-reviewed source revision, checked while holding write locks.
     *
     * @operationId updateStoreAppearance
     */
    public function update(Request $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('id');
        $store = $storeId instanceof Store ? $storeId : Store::query()->findOrFail($storeId);
        Gate::authorize('update', $store);

        $data = $request->validate([
            'config' => 'required|array',
            'source_fingerprint' => ['sometimes', 'required', 'regex:/^[a-f0-9]{64}$/D'],
        ]);

        return DB::transaction(function () use ($request, $store, $data) {
            // Every regular appearance save locks the store in the same order,
            // preventing concurrent normal saves from racing preview validation.
            $current = Store::query()->lockForUpdate()->findOrFail($store->getKey());
            Gate::authorize('update', $current);
            $current->setRelation('appearance', $current->appearance()->lockForUpdate()->first());

            if (array_key_exists('source_fingerprint', $data)) {
                $creator = $request->user();
                abort_unless($creator instanceof User, 401);
                // Ownership, verified Pro and the default-OFF feature gate
                // are rechecked immediately before the conditional mutation.
                $this->proposals->verifyRevision($creator, $current, $data['source_fingerprint']);
            }

            if ($current->appearance && empty($data['config'])) {
                $current->appearance->delete();
            } elseif ($current->appearance) {
                $current->appearance->update(['config' => $data['config']]);
            } else {
                $appearance = $current->appearance()->create(['config' => $data['config']]);
                $current->setRelation('appearance', $appearance);
            }

            $current->touch();

            return new StoreResource($current->fresh()->loadContent());
        });
    }
}
