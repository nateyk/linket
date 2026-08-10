<?php

namespace App\Storefront;

use App\Biolinks\Models\Biolink;
use App\Payments\ChapaGateway;
use App\Payments\Models\PaymentTransaction;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Str;

class StorefrontCheckout
{
    public function create(
        DigitalProduct $product,
        ?Biolink $biolink = null,
        array $buyer = [],
    ): StorefrontOrder
    {
        $benefits = app(StorefrontBenefits::class)->forCreator($product->creator);
        $gross = $product->price_cents;
        $feePercent = $benefits['platform_fee_percent'];
        $fee = (int) round($gross * ($feePercent / 100));

        $order = StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'biolink_id' => $biolink?->id,
            'creator_id' => $product->user_id,
            'buyer_name' => $buyer['name'] ?? null,
            'buyer_email' => $buyer['email'] ?? null,
            'currency' => $product->currency,
            'gross_amount_cents' => $gross,
            'commission_bps' => $benefits['commission_bps'],
            'platform_fee_percent' => $feePercent,
            'platform_fee_cents' => $fee,
            'creator_earnings_cents' => $gross - $fee,
        ]);
        $order->items()->create([
            'digital_product_id' => $product->id,
            'title' => $product->title,
            'unit_amount_cents' => $gross,
        ]);

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
        return $order;
    }
}
