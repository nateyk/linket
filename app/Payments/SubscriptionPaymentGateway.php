<?php

namespace App\Payments;

final class SubscriptionPaymentGateway
{
    public const KEY = 'billing.subscription_gateway';

    public static function current(): string
    {
        return settings()->get(self::KEY, 'verify_et') === 'chapa' ? 'chapa' : 'verify_et';
    }
}
