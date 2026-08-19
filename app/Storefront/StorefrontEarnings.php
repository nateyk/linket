<?php

namespace App\Storefront;


class StorefrontEarnings
{
    public function forCreator(int $creatorId, int $workspaceId, bool $lock = false): array
    {
        return app(DigitalProductFinance::class)->summary($creatorId, $workspaceId, $lock);
    }
}
