<?php

namespace App\Storefront\Services;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Payments\Chapa\ChapaV2Client;
use App\Stores\Models\Store;
use App\Storefront\Models\CreatorChapaGateway;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\VisitorAttributes;
use Illuminate\Support\Str;

final class ChapaStorefrontCheckout
{
    /** @param array<string, mixed> $buyer */
    public function create(DigitalProduct $product, Biolink|Store|null $store, array $buyer): StorefrontOrder
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($product, $store, $buyer): StorefrontOrder {
            $creator = User::query()->whereKey($product->user_id)->lockForUpdate()->firstOrFail();
            $allowance = app(CreatorVerificationAllowance::class);
            abort_unless(app(AccountMonetizationStatus::class)->canSell($creator), 403, __('Temporarily unavailable.'));
            abort_unless($allowance->isPro($creator), 403, __('Chapa checkout is available on Pro.'));
            abort_unless(strtoupper((string) $product->currency) === 'ETB', 422);
            abort_unless((int) $product->price_cents >= 100, 422);

            $gateway = CreatorChapaGateway::query()->where('workspace_id', $product->workspace_id)->first();
            abort_unless($gateway, 422, __('Connect Chapa before taking payments.'));

            $reference = 'lk'.Str::lower(Str::random(16));
            $order = StorefrontOrder::query()->create([
                'uuid' => (string) Str::uuid(),
                'monetization_policy' => CreatorVerificationAllowance::PRO_POLICY,
                'digital_product_id' => $product->id,
                'biolink_id' => $store?->id,
                'creator_id' => $product->user_id,
                'buyer_user_id' => auth()->id(),
                'buyer_name' => $buyer['name'] ?? null,
                'buyer_email' => $buyer['email'] ?? null,
                'currency' => 'ETB',
                'gross_amount_cents' => $product->price_cents,
                'commission_bps' => 0,
                'platform_fee_percent' => 0,
                'platform_fee_cents' => 0,
                'creator_earnings_cents' => $product->price_cents,
                'status' => 'pending_payment',
                'payment_gateway' => 'chapa',
                'chapa_tx_ref' => $reference,
                'buyer_country' => VisitorAttributes::country(),
                'buyer_referrer' => VisitorAttributes::normalizedReferrer(),
            ]);
            $order->items()->create([
                'digital_product_id' => $product->id,
                'title' => $product->title,
                'unit_amount_cents' => $product->price_cents,
            ]);

            [$firstName, $lastName] = $this->splitBuyerName($buyer['name'] ?? null);
            $customer = array_filter([
                'email' => $buyer['email'] ?? null,
                'phone_number' => $buyer['phone'] ?? null,
                'first_name' => $firstName,
                'last_name' => $lastName,
            ], fn (mixed $value): bool => filled($value));
            // Keep provider callbacks non-HTML; return the buyer to a human-readable page.
            $callbackUrl = url('storefront/chapa/return/'.$reference);
            $buyerReturnUrl = url('storefront/chapa/checkout-return/'.$reference);
            $hosted = app(ChapaV2Client::class)->createHostedPayment($gateway->secret_key, [
                'amount_cents' => (int) $product->price_cents,
                'currency' => 'ETB',
                'merchant_reference' => $reference,
                'idempotency_key' => $order->uuid,
                'callback_url' => $callbackUrl,
                'return_url' => $buyerReturnUrl,
                'customer' => $customer === [] ? null : $customer,
                'customization' => [
                    'title' => (string) config('app.name'),
                    'description' => Str::limit((string) $product->title, 150),
                ],
            ]);

            $order->setAttribute('chapaCheckoutUrl', $hosted['checkout_url']);

            return $order;
        }, 3);
    }

    /** @return array{0: string|null, 1: string|null} */
    private function splitBuyerName(?string $name): array
    {
        $parts = preg_split('/\s+/', trim((string) $name), 2) ?: [];

        return [$parts[0] ?? null, $parts[1] ?? null];
    }
}
