<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\Resources\DigitalProductWithdrawalMethodResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class DigitalProductWithdrawalMethodsController extends Controller
{
    public function index()
    {
        return DigitalProductWithdrawalMethodResource::collection(DigitalProductWithdrawalMethod::query()->active()->orderBy('position')->get());
    }

    public function adminIndex()
    {
        Gate::authorize('admin.access');
        return DigitalProductWithdrawalMethodResource::collection(DigitalProductWithdrawalMethod::query()->orderBy('position')->get());
    }

    public function store(Request $request): DigitalProductWithdrawalMethodResource
    {
        Gate::authorize('admin.access');
        $method = DigitalProductWithdrawalMethod::create($this->validated($request) + ['code' => Str::slug($request->string('name'))]);
        return new DigitalProductWithdrawalMethodResource($method);
    }

    public function update(Request $request, DigitalProductWithdrawalMethod $withdrawalMethod): DigitalProductWithdrawalMethodResource
    {
        Gate::authorize('admin.access');
        $withdrawalMethod->update($this->validated($request, false));
        return new DigitalProductWithdrawalMethodResource($withdrawalMethod->fresh());
    }

    public function destroy(DigitalProductWithdrawalMethod $withdrawalMethod): JsonResponse
    {
        Gate::authorize('admin.access');
        $withdrawalMethod->delete();

        return response()->json(['message' => __('Deleted Successfully')]);
    }

    private function validated(Request $request, bool $create = true): array
    {
        return $request->validate([
            'name' => [$create ? 'required' : 'sometimes', 'string', 'max:120'],
            'destination_label' => [$create ? 'required' : 'sometimes', 'string', 'max:120'],
            'instructions' => ['nullable', 'string', 'max:2000'],
            'minimum_amount_cents' => ['nullable', 'integer', 'min:0'],
            'maximum_amount_cents' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}
