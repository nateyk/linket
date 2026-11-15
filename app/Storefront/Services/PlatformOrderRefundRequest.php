<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Storefront\Models\StorefrontOrder;

final class PlatformOrderRefundRequest
{
    public ?string $externalReference = null;
    public bool $callProvider = true;

    public function __construct(
        public readonly StorefrontOrder $order,
        public readonly int $amountCents,
        public readonly string $reason,
        public readonly int $actorId,
    ) {
    }

    public static function forOrder(
        StorefrontOrder $order,
        int $amountCents,
        string $reason,
        int $actorId,
    ): self {
        return new self($order, $amountCents, $reason, $actorId);
    }

    public function withExternalReference(?string $reference): self
    {
        $this->externalReference = $reference;

        return $this;
    }

    public function withoutProviderCall(): self
    {
        $this->callProvider = false;

        return $this;
    }
}
