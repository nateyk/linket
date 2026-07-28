<?php

namespace App\Http\Controllers;

use App\Links\Models\Link;
use App\Analytics\Models\TrackedEvent;
use App\Models\User;
use App\QrCodes\Models\QrCode;
use Common\Billing\Models\Product;
use Common\Billing\Products\ProductResource;
use Common\Core\Rendering\RendersClientSideApp;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Routing\Controller;

/**
 * @tags Landing Page
 */
#[ExcludeRoutesFromPublicDocs]
class LandingPageController extends Controller
{
    use RendersClientSideApp;

    /**
     * Show the landing page.
     *
     * @operationId showLandingPage
     */
    public function show()
    {
        $products = Product::with(['permissions', 'prices'])
            ->orderBy('position', 'asc')
            ->simplePaginate(15);

        return $this->clientSideOrPrerenderedResponse([
            'pageName' => 'landing-page',
            'loader' => 'landingPage',
            'data' => [
                'stats' => [
                    'links' => Link::query()->count(),
                    'qrCodes' => QrCode::query()->count(),
                    'clicks' => TrackedEvent::query()->count(),
                    'users' => User::query()->count(),
                ],
                'sections' => settings('landingPage.sections'),
                'products' => ProductResource::collection($products)
                    ->response(request())
                    ->getData(true),
            ],
        ]);
    }
}
