<?php

namespace App\Storefront;

use App\Biolinks\Models\Biolink;
use App\Entitlements\Entitlements;
use App\Payments\ChapaGateway;
use App\Payments\Models\PaymentTransaction;
use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class StorefrontCheckout
{
    public function create(
        DigitalProduct $product,
        Biolink|Store|null $biolink = null,
        array $buyer = [],
    ): StorefrontOrder
    {
        $entitlements = app(Entitlements::class);
        $gross = $product->price_cents;
        $bps = $entitlements->feeBps($product->creator);
        $fee = (int) round($gross * $bps / 10000);
        $feePercent = round($bps / 100, 4);

        Log::info('store.checkout.initiated', [
            'store_id' => $biolink?->id,
            'product_id' => $product->id,
            'workspace_id' => $product->workspace_id,
        ]);
        $buyerUserId = null;
        if (!empty($buyer['email'])) {
            $matched = \App\Models\User::where('email', $buyer['email'])->first();
            $buyerUserId = $matched?->id ?? (auth()->check() ? auth()->id() : null);
        } elseif (auth()->check()) {
            $buyerUserId = auth()->id();
        }
        $order = StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'biolink_id' => $biolink?->id,
            'creator_id' => $product->user_id,
            'buyer_user_id' => $buyerUserId,
            'buyer_name' => $buyer['name'] ?? null,
            'buyer_email' => $buyer['email'] ?? null,
            'currency' => $product->currency,
            'gross_amount_cents' => $gross,
            'commission_bps' => $bps,
            'platform_fee_percent' => $feePercent,
            'platform_fee_cents' => $fee,
            'creator_earnings_cents' => $gross - $fee,
        ]);
        $order->items()->create([
            'digital_product_id' => $product->id,
            'title' => $product->title,
            'unit_amount_cents' => $gross,
        ]);

        // Free course / free product: immediate fulfillment, no gateway.
        if ((int) $gross === 0) {
            try { app(\App\Storefront\StorefrontWebhookHandler::class)->fulfill($order->fresh('product'), $buyer['email'] ?? null, []); } catch (\Throwable $e) { \Illuminate\Support\Facades\Log::warning('store.checkout.free_fulfill_failed', ['order_id' => $order->id, 'error' => $e->getMessage()]); }
            $order = $order->fresh();
            // Ensure paid (fulfill already sets it, but guard if handler was no-op)
            if ($order->status !== 'paid') {
                $order->update(['status' => 'paid', 'paid_at' => now()]);
                try { app(\App\Courses\Services\EnrollmentService::class)->grantFromOrder($order->fresh('product.course')); } catch (\Throwable $e2) {}
            }
            $order->setAttribute('chapaCheckoutUrl', url("/find-my-purchase/orders?highlight={$order->uuid}"));
            return $order;
        }
        abort_unless(strtolower($order->currency) === 'etb', 422, 'Digital Products must use ETB before Chapa checkout can begin.');
        $productUrl = $biolink
            ? rtrim($biolink->short_url, '/') . "/products/{$product->id}"
            : url("storefront/products/{$product->id}");
        $transaction = app(ChapaGateway::class)->createTransaction(
            $order,
            'digital_product',
            number_format($gross / 100, 2, '.', ''),
            "{$productUrl}/orders/{$order->uuid}/success?tx_ref={tx_ref}",
            $product->title,
            $buyer,
        );

        $order->update([
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => $transaction->tx_ref,
        ]);
        $order = $order->fresh();
        $order->setAttribute('chapaCheckoutUrl', $transaction->checkout_url);
        Log::info('store.checkout.created', [
            'store_id' => $biolink?->id,
            'product_id' => $product->id,
            'workspace_id' => $product->workspace_id,
            'order_id' => $order->id,
        ]);
        return $order;
    }
}
