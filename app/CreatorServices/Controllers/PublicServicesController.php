<?php

namespace App\CreatorServices\Controllers;

use App\CreatorServices\Actions\CreateServiceInquiry;
use App\CreatorServices\Models\CreatorService;
use App\Links\Actions\LinkeablePublicPolicy;
use App\Stores\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PublicServicesController extends Controller
{
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
        ]);

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
