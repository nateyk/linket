<?php

namespace App\Stores\Controllers;

use App\Stores\Models\Store;
use App\Biolinks\Resources\BiolinkResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class StoreAppearanceController extends Controller
{
    public function update(Request $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('id');
        $store = $storeId instanceof Store ? $storeId : Store::query()->findOrFail($storeId);
        Gate::authorize('update', $store);

        $data = $request->validate([
            'config' => 'required|array',
        ]);

        if ($store->appearance && empty($data['config'])) {
            $store->appearance->delete();
        } else {
            if ($store->appearance) {
                $store->appearance->update(['config' => $data['config']]);
            } else {
                $appearance = $store->appearance()->create(['config' => $data['config']]);
                $store->setRelation('appearance', $appearance);
            }
        }

        $store->touch();

        return new BiolinkResource($store->fresh()->loadContent());
    }
}
