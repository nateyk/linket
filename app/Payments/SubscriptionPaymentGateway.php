<?php

namespace App\Payments;

final class SubscriptionPaymentGateway
{
    public const KEY = 'billing.subscription_gateway';

    public static function current(): string
    {
        // A historical setting must never reactivate the retired payment provider.
        return 'chapa';
    }
}
