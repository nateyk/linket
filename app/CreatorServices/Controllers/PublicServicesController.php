<?php

namespace App\CreatorServices\Controllers;

use App\CreatorServices\Actions\CreateServiceInquiry;
use App\CreatorServices\Models\CreatorService;
use App\CreatorServices\PublicCreatorServices;
use App\CreatorServices\Resources\PublicServiceDetailResource;
use App\CreatorServices\Resources\PublicServiceResource;
use App\Links\Actions\LinkeablePublicPolicy;
use App\Stores\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\ValidationException;

class PublicServicesController extends Controller
{
    public function index(Store $biolink)
    {
        return PublicServiceResource::collection(
            app(PublicCreatorServices::class)->services($biolink),
        );
    }

    public function show(Store $biolink, string $service): PublicServiceDetailResource
    {
        return new PublicServiceDetailResource(
            app(PublicCreatorServices::class)->service($biolink, $service),
        );
    }

    public function inquiry(Request $request, Store $biolink, string $service)
    {
        $store = $biolink;
        app(LinkeablePublicPolicy::class)->isAccessible($store);

        $creatorService = CreatorService::query()
            ->where('store_id', $store->id)
            ->where('slug', $service)
            ->where('status', 'published')
            ->firstOrFail();

        $data = $request->validate([
            'name' => 'required|string|max:120',
            'email' => 'required|email|max:180',
            'phone' => 'nullable|string|max:40',
            'message' => 'required|string|max:5000',
            'package_id' => 'nullable|integer',
            'answers' => 'sometimes|array|max:3',
            'answers.*' => 'nullable|string|max:500',
        ]);

        $answers = $data['answers'] ?? [];
        $questions = $creatorService->buyer_questions ?? [];
        // Answer indexes are server-owned. Reject stale or malformed submissions
        // rather than allowing a buyer to invent question labels or hidden fields.
        if (!array_is_list($answers) || count($answers) > count($questions)) {
            throw ValidationException::withMessages([
                'answers' => __('These service questions have changed. Please refresh and try again.'),
            ]);
        }

        if (!empty($data['package_id'])) {
            abort_unless(
                $creatorService->packages()->whereKey($data['package_id'])->exists(),
                422,
                __('Select a package from this service.'),
            );
        }

        app(CreateServiceInquiry::class)->execute($creatorService, $data);

        return response()->json([
            'message' => __('Inquiry sent. The creator will contact you soon.'),
        ], 201);
    }
}
