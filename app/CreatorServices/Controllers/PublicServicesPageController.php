<?php

namespace App\CreatorServices\Controllers;

use App\Biolinks\Resources\BiolinkResource;
use App\CreatorServices\PublicCreatorServices;
use App\CreatorServices\Resources\PublicServiceResource;
use Common\Core\Rendering\RendersClientSideApp;
use Illuminate\Routing\Controller;

class PublicServicesPageController extends Controller
{
    use RendersClientSideApp;

    public function show(string $storeSlug)
    {
        $store = app(PublicCreatorServices::class)->findStore($storeSlug);
        $services = app(PublicCreatorServices::class)->services($store);

        return $this->clientSideOrPrerenderedResponse([
            'loader' => 'servicesPage',
            'data' => [
                'data' => [
                    'store' => (new BiolinkResource($store))->resolve(),
                    'appearance' => $store->appearance?->config,
                    'services' => PublicServiceResource::collection($services)->resolve(),
                    'back_url' => $store->short_url,
                ],
            ],
        ]);
    }
}
