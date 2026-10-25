<?php

namespace Envato\Purchases;

use Illuminate\Support\Collection;

class UserEnvatoPurchases
{
    public function __construct(public mixed $user = null)
    {
    }

    public function get(): Collection
    {
        return collect();
    }
}
