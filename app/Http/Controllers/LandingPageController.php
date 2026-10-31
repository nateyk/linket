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

        $sections = settings('landingPage.sections');
        if ($sections === null) {
            $defaults = collect(require resource_path('defaults/default-settings.php'));
            $landingPage = json_decode($defaults->firstWhere('name', 'landingPage')['value'], true);
            $sections = $landingPage['sections'] ?? [];
        }

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
                'sections' => $sections,
                'products' => ProductResource::collection($products)
                    ->response(request())
                    ->getData(true),
            ],
        ]);
    }
}
