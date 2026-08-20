<?php

namespace Common\Core\Middleware;

use Illuminate\Http\Middleware\TrustProxies as Middleware;

class TrustProxies extends Middleware
{
    protected function proxies(): array|string|null
    {
        return config('trustedproxy.proxies');
    }
}
