<?php

namespace Common\Billing\Gateways\Chapa;

use App\Payments\ChapaGateway;
use Common\Billing\Gateways\Contracts\CommonSubscriptionGatewayActions;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;

class Chapa implements CommonSubscriptionGatewayActions
{
    public function isEnabled(): bool
    {
        return app(ChapaGateway::class)->isEnabled();
    }

    public function syncPlan(Product $product): bool
    {
        return true;
    }

    public function deletePlan(Product $product): bool
    {
        return true;
    }

    public function changePlan(Subscription $subscription, Product $newProduct, Price $newPrice): bool
    {
        $subscription->update([
            'pending_product_id' => $newProduct->id,
            'pending_price_id' => $newPrice->id,
        ]);

        return true;
    }

    public function cancelSubscription(Subscription $subscription, bool $atPeriodEnd = true): bool
    {
        return true;
    }

    public function resumeSubscription(Subscription $subscription, array $gatewayParams = []): bool
    {
        return true;
    }

    public function isSubscriptionIncomplete(Subscription $subscription): bool
    {
        return $subscription->gateway_status === 'pending';
    }

    public function isSubscriptionPastDue(Subscription $subscription): bool
    {
        return $subscription->gateway_status === 'past_due';
    }
}
