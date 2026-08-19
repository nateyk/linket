<?php

namespace App\Payments;

use RuntimeException;

class PaymentVerificationException extends RuntimeException
{
    public function __construct(
        public readonly string $reason,
        public readonly bool $shouldMarkFailed = false,
    ) {
        parent::__construct('Chapa verification did not match the expected payment.');
    }
}
