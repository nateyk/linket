<?php

namespace App\Storefront\Controllers;

use App\Biolinks\Models\Biolink;
use App\Payments\ChapaPaymentFulfillment;
use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\PublicDigitalProducts;
use App\Storefront\Resources\PublicDigitalProductResource;
use App\Storefront\Resources\PublicStorefrontOrderResource;
use App\Storefront\StorefrontCheckout;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PublicDigitalProductsController extends Controller
{
    public function index(Biolink|Store $biolink)
    {
        return PublicDigitalProductResource::collection(
            app(PublicDigitalProducts::class)->products($biolink)->get(),
        );
    }

    public function show(Biolink|Store $biolink, DigitalProduct $digitalProduct): PublicDigitalProductResource
    {
        return new PublicDigitalProductResource(
            app(PublicDigitalProducts::class)->product($biolink, $digitalProduct),
        );
    }

    public function checkout(Biolink|Store $biolink, DigitalProduct $digitalProduct)
    {
        $buyer = request()->validate([
            'buyer_name' => ['required', 'string', 'min:2', 'max:120'],
            'buyer_email' => ['required', 'email:rfc', 'max:254'],
            'buyer_phone' => ['nullable', 'string', 'max:32'],
            'creator_payment_method_id' => ['nullable', 'integer'],
        ]);
        $product = app(PublicDigitalProducts::class)->product($biolink, $digitalProduct);
        $order = app(StorefrontCheckout::class)->create($product, $biolink, [
            'name' => $buyer['buyer_name'],
            'email' => $buyer['buyer_email'],
            'phone' => $buyer['buyer_phone'] ?? null,
        ], isset($buyer['creator_payment_method_id']) ? (int) $buyer['creator_payment_method_id'] : null);

        return response()->json([
            'order_id' => $order->uuid,
            'checkout_url' => $order->payment_gateway === 'verify_et' ? null : $order->chapaCheckoutUrl,
            'instructions_endpoint' => $order->payment_gateway === 'verify_et' ? "/api/v1/public/direct-orders/{$order->uuid}/payment-instructions" : null,
            'access_token' => $order->paymentAccessToken,
            'status_endpoint' => $order->payment_gateway === 'verify_et' ? "/api/v1/public/direct-orders/{$order->uuid}" : null,
            'reference_endpoint' => $order->payment_gateway === 'verify_et' ? "/api/v1/public/direct-orders/{$order->uuid}/reference" : null,
            'status' => $order->status,
        ])->header('Cache-Control', 'no-store, private');
    }

    public function order(Request $request, Biolink|Store $biolink, int $digitalProduct, string $order): PublicStorefrontOrderResource
    {
        $product = app(PublicDigitalProducts::class)->productForOrder($biolink, $digitalProduct);
        $storefrontOrder = StorefrontOrder::query()
            ->where('uuid', $order)
            ->where('digital_product_id', $product->id)
            ->where('biolink_id', $biolink->id)
            ->with(['product', 'entitlements.file'])
            ->firstOrFail();

        if ($storefrontOrder->payment_gateway === 'verify_et') {
            $token = $request->header('X-Order-Access-Token');
            abort_unless(is_string($token) && $storefrontOrder->payment_access_token_hash
                && hash_equals($storefrontOrder->payment_access_token_hash, hash('sha256', $token)), 403);

            return new PublicStorefrontOrderResource($storefrontOrder);
        }

        $paymentReference = $storefrontOrder->chapa_tx_ref
            ? $request->string('tx_ref')
            : $request->string('session_id');
        $expectedReference = $storefrontOrder->chapa_tx_ref
            ?: $storefrontOrder->stripe_checkout_session_id;
        abort_unless($expectedReference && hash_equals((string) $expectedReference, (string) $paymentReference), 403);

        app(ChapaPaymentFulfillment::class)->syncPendingStorefrontOrder($storefrontOrder);
        $storefrontOrder->refresh()->load(['product', 'entitlements.file']);

        return new PublicStorefrontOrderResource($storefrontOrder);
    }
}
