<?php

namespace Common\Billing\Gateways\Actions;

use Common\Billing\Models\Product;

class SyncProductOnEnabledGateways
{
    public function execute(Product $product): void
    {
        // Chapa charges the local ETB price at checkout; it has no remote plan
        // synchronization step. Stripe and PayPal remain read-only legacy gateways.
    }
}
