<?php

namespace App\Storefront\Controllers;

use App\Biolinks\Resources\BiolinkResource;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\PublicDigitalProducts;
use App\Storefront\Resources\PublicDigitalProductResource;
use App\Storefront\Resources\PublicStorefrontOrderResource;
use Common\Core\Rendering\RendersClientSideApp;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PublicDigitalProductPageController extends Controller
{
    use RendersClientSideApp;

    public function show(string $biolink, DigitalProduct $digitalProduct)
    {
        $biolink = app(PublicDigitalProducts::class)->findBiolink($biolink);
        $product = app(PublicDigitalProducts::class)->product($biolink, $digitalProduct);

        return $this->clientSideOrPrerenderedResponse([
            'loader' => 'digitalProductPage',
            'pageName' => 'digital-product',
            'data' => [
                'data' => [
                    'biolink' => (new BiolinkResource($biolink))->resolve(),
                    'appearance' => $biolink->appearance?->config,
                    'creator' => ['name' => $product->creator->name],
                    'product' => (new PublicDigitalProductResource($product))->resolve(),
                    'checkout_endpoint' => "/api/v1/public/biolinks/{$biolink->id}/digital-products/{$product->id}/checkout",
                    'reviews_enabled' => (bool) settings('storefront.reviews_enabled', true),
                    'back_url' => $biolink->short_url,
                ],
            ],
        ]);
    }

    public function success(Request $request, string $biolink, int $digitalProduct, string $order)
    {
        $biolink = app(PublicDigitalProducts::class)->findBiolink($biolink);
        $product = app(PublicDigitalProducts::class)->productForOrder($biolink, $digitalProduct);
        $storefrontOrder = StorefrontOrder::query()
            ->where('uuid', $order)
            ->where('digital_product_id', $product->id)
            ->where('biolink_id', $biolink->id)
            ->with(['product', 'entitlements.file'])
            ->firstOrFail();

        $paymentReference = $storefrontOrder->chapa_tx_ref
            ? $request->string('tx_ref')
            : $request->string('session_id');
        $expectedReference = $storefrontOrder->chapa_tx_ref
            ?: $storefrontOrder->stripe_checkout_session_id;
        abort_unless(hash_equals((string) $expectedReference, (string) $paymentReference), 403);

        return $this->clientSideOrPrerenderedResponse([
            'loader' => 'digitalProductOrderSuccessPage',
            'pageName' => 'digital-product',
            'data' => [
                'data' => [
                    'biolink' => (new BiolinkResource($biolink))->resolve(),
                    'appearance' => $biolink->appearance?->config,
                    'creator' => ['name' => $product->creator->name],
                    'product' => (new PublicDigitalProductResource($product))->resolve(),
                    'order' => (new PublicStorefrontOrderResource($storefrontOrder))->resolve(),
                    'status_endpoint' => "/api/v1/public/biolinks/{$biolink->id}/digital-products/{$product->id}/orders/{$storefrontOrder->uuid}?" . ($storefrontOrder->chapa_tx_ref ? 'tx_ref=' . urlencode((string) $request->string('tx_ref')) : 'session_id=' . urlencode((string) $request->string('session_id'))),
                    'back_url' => $biolink->short_url,
                ],
            ],
        ]);
    }
}
