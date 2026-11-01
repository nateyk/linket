<?php

namespace App\Payments\VerifyEt;

use Common\Billing\Gateways\Contracts\CommonSubscriptionGatewayActions;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;

final class VerifyEtSubscriptionGateway implements CommonSubscriptionGatewayActions
{
    public function isEnabled(): bool { return (bool) VerifyEtSettings::get('enabled'); }
    public function syncPlan(Product $product): bool { return true; }
    public function deletePlan(Product $product): bool { return true; }
    public function changePlan(Subscription $subscription, Product $newProduct, Price $newPrice): bool { return false; }
    public function cancelSubscription(Subscription $subscription, bool $atPeriodEnd = true): bool { return false; }
    public function resumeSubscription(Subscription $subscription, array $gatewayParams = []): bool { return false; }
    public function isSubscriptionIncomplete(Subscription $subscription): bool { return $subscription->gateway_status === 'pending'; }
    public function isSubscriptionPastDue(Subscription $subscription): bool { return $subscription->gateway_status === 'past_due'; }
}
