<?php

namespace App\Payments;

final class SubscriptionPaymentGateway
{
    public const KEY = 'billing.subscription_gateway';

    public static function current(): string
    {
        return 'chapa';
    }
}
