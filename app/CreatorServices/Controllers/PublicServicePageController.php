<?php

namespace App\CreatorServices\Controllers;

use App\Biolinks\Resources\BiolinkResource;
use App\CreatorServices\PublicCreatorServices;
use App\CreatorServices\Resources\PublicServiceDetailResource;
use Common\Core\Rendering\RendersClientSideApp;
use Illuminate\Routing\Controller;

class PublicServicePageController extends Controller
{
    use RendersClientSideApp;

    public function show(string $storeSlug, string $service)
    {
        $store = app(PublicCreatorServices::class)->findStore($storeSlug);
        $creatorService = app(PublicCreatorServices::class)->service($store, $service);

        return $this->clientSideOrPrerenderedResponse([
            'loader' => 'servicePage',
            'data' => [
                'data' => [
                    'store' => (new BiolinkResource($store))->resolve(),
                    'appearance' => $store->appearance?->config,
                    'password' => $store->password ? \App\Links\Models\Link::PLACEHOLDER_PASSWORD : null,
                    'service' => (new PublicServiceDetailResource($creatorService))->resolve(),
                    'inquiry_endpoint' => "/api/v1/public/stores/{$store->id}/services/{$creatorService->slug}/inquiries",
                    'back_url' => rtrim((string) $store->short_url, '/').'/services',
                ],
            ],
        ]);
    }
}
