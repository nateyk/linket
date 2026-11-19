<?php

declare(strict_types=1);

namespace App\Payments\Chapa;

enum ChapaProfileField: string
{
    case PublicKey = 'public_key';
    case SecretKey = 'secret_key';
    case WebhookSecret = 'webhook_secret';
}
