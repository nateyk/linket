<?php

declare(strict_types=1);

namespace App\Payments\Chapa\Exceptions;

use RuntimeException;

final class ChapaTransferRejectedException extends RuntimeException
{
    public function __construct(
        public readonly string $providerMessage,
        public readonly ?int $httpStatus = null,
    ) {
        parent::__construct('Chapa explicitly rejected the transfer before it was queued.');
    }

    public function publicReason(): string
    {
        $message = strtolower($this->providerMessage);

        if (str_contains($message, 'transfer hours') || str_contains($message, 'transfer hour')) {
            return 'Chapa rejected the transfer because it was submitted outside transfer hours.';
        }

        return 'Chapa rejected the transfer before it was queued.';
    }

    /** @return array{status: string, message: string, http_status: int|null, source: string} */
    public function evidence(): array
    {
        return [
            'status' => 'failed',
            'message' => $this->providerMessage,
            'http_status' => $this->httpStatus,
            'source' => 'transfer_submission',
        ];
    }
}
