<?php

namespace Tests\Unit;

use App\Analytics\Actions\ResolveVisitorLocation;
use Illuminate\Http\Request;
use Tests\TestCase;

class ResolveVisitorLocationTest extends TestCase
{
    public function testUntrustedCountryAndForwardedIpHeadersAreIgnored(): void
    {
        config(['geoip.country_header_proxies' => '10.0.0.0/8']);
        Request::setTrustedProxies([], Request::HEADER_X_FORWARDED_FOR);

        $request = Request::create('/', 'GET', server: [
            'REMOTE_ADDR' => '192.168.1.15',
            'HTTP_X_FORWARDED_FOR' => '8.8.8.8',
            'HTTP_CF_IPCOUNTRY' => 'US',
        ]);

        $this->assertNull(ResolveVisitorLocation::publicIp($request));
        $this->assertSame([
            'iso_code' => null,
            'city' => null,
            'state' => null,
        ], ResolveVisitorLocation::resolve($request));
    }

    public function testTrustedProxyCanSupplyACountryWhenLocalGeoipCannotResolve(): void
    {
        config(['geoip.country_header_proxies' => '10.0.0.0/8']);
        Request::setTrustedProxies([], Request::HEADER_X_FORWARDED_FOR);

        $request = Request::create('/', 'GET', server: [
            'REMOTE_ADDR' => '10.1.2.3',
            'HTTP_CF_IPCOUNTRY' => 'et',
        ]);

        $this->assertSame([
            'iso_code' => 'ET',
            'city' => null,
            'state' => null,
        ], ResolveVisitorLocation::resolve($request));
    }

    public function testUnresolvedCloudflareCountryCodesAreNotInvented(): void
    {
        config(['geoip.country_header_proxies' => '10.1.2.3']);
        $request = Request::create('/', 'GET', server: [
            'REMOTE_ADDR' => '10.1.2.3',
            'HTTP_CF_IPCOUNTRY' => 'XX',
        ]);

        $this->assertNull(ResolveVisitorLocation::resolve($request)['iso_code']);
    }
}
