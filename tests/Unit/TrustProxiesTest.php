<?php

namespace Tests\Unit;

use Common\Core\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Tests\TestCase;

class TrustProxiesTest extends TestCase
{
    public function testForwardedHeadersAreOnlyAcceptedFromConfiguredProxies(): void
    {
        $forwardedFor = '198.51.100.20';
        $proxy = '203.0.113.10';
        config(['trustedproxy.proxies' => '10.0.0.1']);

        $untrusted = $this->handleRequest($proxy, $forwardedFor);

        $this->assertSame($proxy, $untrusted['ip']);
        $this->assertFalse($untrusted['secure']);

        config(['trustedproxy.proxies' => $proxy]);

        $trusted = $this->handleRequest($proxy, $forwardedFor);

        $this->assertSame($forwardedFor, $trusted['ip']);
        $this->assertTrue($trusted['secure']);
    }

    private function handleRequest(string $proxy, string $forwardedFor): array
    {
        $request = Request::create('/', 'GET', server: [
            'REMOTE_ADDR' => $proxy,
            'HTTP_X_FORWARDED_FOR' => $forwardedFor,
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);

        return (new TrustProxies())->handle(
            $request,
            fn (Request $request): array => [
                'ip' => $request->ip(),
                'secure' => $request->isSecure(),
            ],
        );
    }
}
