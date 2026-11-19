<?php

declare(strict_types=1);

namespace App\Payments\Chapa;

/** Input for one Chapa merchant environment. Never serialize or log this value. */
final readonly class ChapaProfileConfiguration
{
    /** @param array<string, string> $values */
    public function __construct(
        public string $mode,
        public array $values,
    ) {}
}
