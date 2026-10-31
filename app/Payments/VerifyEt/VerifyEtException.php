<?php

namespace App\Payments\VerifyEt;

use RuntimeException;
use Throwable;

final class VerifyEtException extends RuntimeException
{
    public function __construct(
        public readonly int $httpStatus,
        string $reason,
        public readonly ?string $providerCode = null,
        public readonly ?int $retryAfterSeconds = null,
        ?Throwable $previous = null,
    )
    {
        parent::__construct($reason, $httpStatus, $previous);
    }
}
