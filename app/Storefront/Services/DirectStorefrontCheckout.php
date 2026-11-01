<?php

namespace App\Storefront\Services;

use App\Payments\VerifyEt\VerifyEtSettings;
use App\Biolinks\Models\Biolink;
use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\VisitorAttributes;
use App\Entitlements\Entitlements;
use Illuminate\Support\Str;

final class DirectStorefrontCheckout
{
    /** @param array<string, mixed> $buyer */
    public function create(DigitalProduct $product, Biolink|Store|null $store, array $buyer, ?int $paymentMethodId = null): StorefrontOrder
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($product, $store, $buyer, $paymentMethodId): StorefrontOrder {
        $creator = \App\Models\User::query()->whereKey($product->user_id)->lockForUpdate()->firstOrFail();
        $allowance = app(CreatorVerificationAllowance::class);
        $isPro = $allowance->isPro($creator);
        abort_unless(app(AccountMonetizationStatus::class)->canSell($product->creator), 403, __('Temporarily unavailable.'));
        abort_unless(strtoupper($product->currency) === 'ETB', 422);

        $method = null;
        if ($product->price_cents > 0) {
            abort_unless(VerifyEtSettings::get('enabled'), 503, __('Checkout is temporarily unavailable.'));
            $methods = app(CheckoutAvailability::class)->eligibleAccounts($product->user_id, $product->workspace_id);
            $method = $paymentMethodId !== null ? $methods->firstWhere('id', $paymentMethodId) : $methods->first();
            abort_unless($method, 422, $paymentMethodId !== null
                ? __('This payment method is temporarily unavailable.')
                : __('The creator has not set up a receiving account.'));
        }

        $accessToken = Str::random(64);
        $plan = app(Entitlements::class)->planFor($product->creator);
        $commissionBps = 0;
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'monetization_policy' => $isPro ? CreatorVerificationAllowance::PRO_POLICY : CreatorVerificationAllowance::FREE_POLICY,
            'digital_product_id' => $product->id,
            'biolink_id' => $store?->id,
            'creator_id' => $product->user_id,
            'buyer_user_id' => auth()->id(),
            'buyer_name' => $buyer['name'] ?? null,
            'buyer_email' => $buyer['email'] ?? null,
            'currency' => 'ETB',
            'gross_amount_cents' => $product->price_cents,
            'commission_bps' => $commissionBps,
            'commission_plan_id' => $plan?->id,
            'platform_fee_percent' => $commissionBps / 100,
            'platform_fee_cents' => 0,
            'creator_earnings_cents' => $product->price_cents,
            'status' => 'pending_payment',
            'payment_gateway' => 'verify_et',
            'creator_payment_method_id' => $method?->id,
            'payment_provider_snapshot' => $method?->provider,
            'payment_account_snapshot' => $method?->account_number,
            'payment_account_name_snapshot' => $method?->account_name_raw,
            'payment_access_token_hash' => hash('sha256', $accessToken),
            'payment_expires_at' => now()->addHour(),
            'buyer_country' => VisitorAttributes::country(),
            'buyer_referrer' => VisitorAttributes::normalizedReferrer(),
        ]);
        if ($product->price_cents > 0 && !$isPro) {
            $allowance->reserve($order, $allowance->limit());
        }
        $order->items()->create([
            'digital_product_id' => $product->id,
            'title' => $product->title,
            'unit_amount_cents' => $product->price_cents,
        ]);

        if ($product->price_cents === 0) {
            app(DirectStorefrontFulfillment::class)->fulfill($order);
        }

        $order->setAttribute('paymentAccessToken', $accessToken);
        return $order;
        }, 3);
    }
}
