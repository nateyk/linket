<?php

namespace App\CreatorServices\Controllers;

use App\CreatorServices\Models\ServiceInquiry;
use App\CreatorServices\Resources\ServiceInquiryResource;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

class ServiceInquiriesController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('per_page', 30), 1), 100);

        return ServiceInquiryResource::collection(
            $this->ownedQuery($request)
                ->with(['service', 'package'])
                ->when($request->filled('service_id'), fn (Builder $query): Builder => $query->where(
                    'creator_service_id',
                    $request->integer('service_id'),
                ))
                ->when($request->filled('status'), fn (Builder $query): Builder => $query->where(
                    'status',
                    (string) $request->string('status'),
                ))
                ->latest()
                ->paginate($perPage),
        );
    }

    public function show(Request $request, int $serviceInquiry): ServiceInquiryResource
    {
        $inquiry = $this->ownedQuery($request)
            ->with(['service', 'package'])
            ->findOrFail($serviceInquiry);

        if ($inquiry->read_at === null) {
            $inquiry->update(['read_at' => now()]);
        }

        return new ServiceInquiryResource($inquiry);
    }

    public function update(Request $request, int $serviceInquiry): ServiceInquiryResource
    {
        $data = $request->validate([
            'status' => 'required|in:new,contacted,won,lost,archived',
        ]);

        $inquiry = $this->ownedQuery($request)->findOrFail($serviceInquiry);
        $inquiry->update(['status' => $data['status']]);

        return new ServiceInquiryResource($inquiry->load(['service', 'package']));
    }

    public function destroy(Request $request, int $serviceInquiry)
    {
        $this->ownedQuery($request)->findOrFail($serviceInquiry)->delete();

        return response()->noContent();
    }

    private function ownedQuery(Request $request): Builder
    {
        return ServiceInquiry::query()->whereHas(
            'service',
            fn (Builder $query): Builder => $query
                ->where('workspace_id', ActiveWorkspace::get()->id)
                ->where('user_id', $request->user()->id),
        );
    }
}
