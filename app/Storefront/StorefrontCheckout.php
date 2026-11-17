<?php

namespace App\Storefront;

use App\Payments\VerifyEt\VerifyEtSettings;
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
    ): StorefrontOrder {
        $chapaManager = app(\App\Payments\Chapa\LinketChapaManager::class);
        $chapaEnabled = $chapaManager->isEnabled();

        $collector = \Common\Workspaces\Models\Workspace::query()
            ->whereKey($product->workspace_id)
            ->value('active_payment_collector') ?? 'verify_et';

        if ((int) $product->price_cents > 0) {
            // Centralized platform Chapa always wins for NEW paid orders.
            // Historical Verify.et orders keep their original verification paths.
            if ($chapaEnabled) {
                return app(\App\Storefront\Services\ChapaStorefrontCheckout::class)->create($product, $biolink, $buyer);
            }

            // Never silently downgrade a Chapa-designated workspace to legacy checkout.
            if ($collector !== 'chapa' && VerifyEtSettings::get('enabled')) {
                return app(\App\Storefront\Services\DirectStorefrontCheckout::class)->create($product, $biolink, $buyer, $paymentMethodId);
            }

            abort(503, __('Checkout is temporarily unavailable.'));
        }

        return $this->createFreeOrder($product, $biolink, $buyer);
    }

    /** @param array<string, mixed> $buyer */
    private function createFreeOrder(
        DigitalProduct $product,
        Biolink|Store|null $biolink,
        array $buyer,
    ): StorefrontOrder {
        $gross = $product->price_cents;
        $allowance = app(\App\Storefront\Services\CreatorVerificationAllowance::class);

        Log::info('store.checkout.initiated', [
            'store_id' => $biolink?->id,
            'product_id' => $product->id,
            'workspace_id' => $product->workspace_id,
        ]);

        $buyerUserId = $this->resolveBuyerUserId($buyer);

        $order = StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'biolink_id' => $biolink?->id,
            'creator_id' => $product->user_id,
            'buyer_user_id' => $buyerUserId,
            'buyer_name' => $buyer['name'] ?? null,
            'buyer_email' => $buyer['email'] ?? null,
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_FREE,
            'currency' => $product->currency,
            'gross_amount_cents' => $gross,
            'monetization_policy' => $allowance->isPro($product->creator)
                ? \App\Storefront\Services\CreatorVerificationAllowance::PRO_POLICY
                : \App\Storefront\Services\CreatorVerificationAllowance::FREE_POLICY,
            'commission_bps' => 0,
            'platform_fee_percent' => 0.0,
            'platform_fee_cents' => 0,
            'creator_earnings_cents' => $gross,
            'buyer_country' => VisitorAttributes::country(),
            'buyer_referrer' => VisitorAttributes::normalizedReferrer(),
        ]);

        $order->items()->create([
            'digital_product_id' => $product->id,
            'title' => $product->title,
            'unit_amount_cents' => $gross,
        ]);

        $this->fulfillFreeOrder($order, $buyer);

        $order = $order->fresh();
        $order->setAttribute('chapaCheckoutUrl', url("/find-my-purchase/orders?highlight={$order->uuid}"));

        return $order;
    }

    /** @param array<string, mixed> $buyer */
    private function resolveBuyerUserId(array $buyer): ?int
    {
        if (! empty($buyer['email'])) {
            $matched = \App\Models\User::where('email', $buyer['email'])->first();

            return $matched?->id ?? (auth()->check() ? auth()->id() : null);
        }

        return auth()->check() ? auth()->id() : null;
    }

    /** @param array<string, mixed> $buyer */
    private function fulfillFreeOrder(StorefrontOrder $order, array $buyer): void
    {
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
    }
}
