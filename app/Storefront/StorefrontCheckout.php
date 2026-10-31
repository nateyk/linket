<?php

namespace App\Storefront;

use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\VisitorAttributes;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class StorefrontCheckout
{
    public function create(
        DigitalProduct $product,
        Biolink|Store|null $biolink = null,
        array $buyer = [],
        ?int $paymentMethodId = null,
    ): StorefrontOrder
    {
        if (config('services.verify_et.enabled')) {
            return app(\App\Storefront\Services\DirectStorefrontCheckout::class)->create($product, $biolink, $buyer, $paymentMethodId);
        }

        if ((int) $product->price_cents > 0) {
            abort(503, __('Checkout is temporarily unavailable.'));
        }

        $gross = $product->price_cents;
        $allowance = app(\App\Storefront\Services\CreatorVerificationAllowance::class);
        $bps = 0;
        $fee = 0;
        $feePercent = 0.0;

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
            'monetization_policy' => $allowance->isPro($product->creator)
                ? \App\Storefront\Services\CreatorVerificationAllowance::PRO_POLICY
                : \App\Storefront\Services\CreatorVerificationAllowance::FREE_POLICY,
            'commission_bps' => $bps,
            'platform_fee_percent' => $feePercent,
            'platform_fee_cents' => $fee,
            'creator_earnings_cents' => $gross - $fee,
            'buyer_country' => VisitorAttributes::country(),
            'buyer_referrer' => VisitorAttributes::normalizedReferrer(),
        ]);
        $order->items()->create([
            'digital_product_id' => $product->id,
            'title' => $product->title,
            'unit_amount_cents' => $gross,
        ]);

        try {
            app(\App\Storefront\StorefrontWebhookHandler::class)->fulfill($order->fresh('product'), $buyer['email'] ?? null, []);
        } catch (\Throwable $e) {
            Log::warning('store.checkout.free_fulfill_failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            try {
                $order->delete();
            } catch (\Throwable $deleteError) {
                Log::warning('store.checkout.free_cleanup_failed', ['order_id' => $order->id, 'error' => $deleteError->getMessage()]);
            }
            throw $e;
        }
        $order = $order->fresh();
        $order->setAttribute('chapaCheckoutUrl', url("/find-my-purchase/orders?highlight={$order->uuid}"));

        return $order;
    }
}
