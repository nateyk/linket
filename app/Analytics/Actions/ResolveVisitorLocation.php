<?php

namespace App\Analytics\Actions;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;

final class ResolveVisitorLocation
{
    /**
     * Country lookup only accepts public IPs resolved by Laravel's trusted
     * proxy middleware. Do not read client-supplied forwarding headers here.
     */
    public static function publicIp(?Request $request = null): ?string
    {
        $ip = ($request ?? request())->ip();

        return is_string($ip) && filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) ? $ip : null;
    }

    /**
     * Unknown countries stay unknown when GeoIP or a trusted ingress signal
     * is unavailable. No fallback country or city is fabricated.
     *
     * @return array{iso_code: ?string, city: ?string, state: ?string}
     */
    public static function resolve(?Request $request = null): array
    {
        $request ??= request();

        $location = self::resolveGeoIp(self::publicIp($request));

        return self::withTrustedCountry(
            $location,
            self::trustedCountryHeader($request)
        );
    }

    /**
     * @return array{iso_code: ?string, city: ?string, state: ?string}
     */
    private static function unknownLocation(): array
    {
        return ['iso_code' => null, 'city' => null, 'state' => null];
    }

    /**
     * @return array{iso_code: ?string, city: ?string, state: ?string}
     */
    private static function resolveGeoIp(?string $publicIp): array
    {
        if ($publicIp === null) {
            return self::unknownLocation();
        }

        try {
            $location = geoip($publicIp);

            return self::fromGeoIpResult($location);
        } catch (\Throwable) {
            // Missing or corrupt MaxMind data must not break public visits.
            return self::unknownLocation();
        }
    }

    /**
     * @return array{iso_code: ?string, city: ?string, state: ?string}
     */
    private static function fromGeoIpResult(mixed $result): array
    {
        $country = self::countryCode($result['iso_code'] ?? null);
        if ($country === null) {
            return self::unknownLocation();
        }

        return [
            'iso_code' => $country,
            'city' => self::nonemptyText($result['city'] ?? null),
            'state' => self::nonemptyText($result['state'] ?? null),
        ];
    }

    /**
     * @param array{iso_code: ?string, city: ?string, state: ?string} $location
     * @return array{iso_code: ?string, city: ?string, state: ?string}
     */
    private static function withTrustedCountry(array $location, ?string $country): array
    {
        if ($country === null) {
            return $location;
        }

        if ($country !== $location['iso_code']) {
            return ['iso_code' => $country, 'city' => null, 'state' => null];
        }

        return $location;
    }

    /**
     * CF-IPCountry is authentic only when the direct TCP peer is an explicitly
     * allowlisted ingress proxy. REMOTE_ADDR is not a forwarded header.
     */
    private static function trustedCountryHeader(Request $request): ?string
    {
        $peer = $request->server('REMOTE_ADDR');
        if (!is_string($peer) || !filter_var($peer, FILTER_VALIDATE_IP)) {
            return null;
        }

        $allowed = self::countryHeaderProxyRanges();
        if (!$allowed || !self::isAllowedPeer($peer, $allowed)) {
            return null;
        }

        return self::countryCode($request->header('CF-IPCountry'));
    }

    /**
     * @return list<string>
     */
    private static function countryHeaderProxyRanges(): array
    {
        $items = explode(',', (string) config('geoip.country_header_proxies', ''));

        return array_values(array_filter(
            array_map('trim', $items),
            static fn (string $value): bool => $value !== '' && $value !== '*'
        ));
    }

    /**
     * @param list<string> $allowed
     */
    private static function isAllowedPeer(string $peer, array $allowed): bool
    {
        try {
            return IpUtils::checkIp($peer, $allowed);
        } catch (\Throwable) {
            // A malformed operator-supplied CIDR fails closed.
            return false;
        }
    }

    private static function countryCode(mixed $code): ?string
    {
        if (!is_string($code)) {
            return null;
        }

        $code = strtoupper(trim($code));
        if (!preg_match('/^[A-Z]{2}$/', $code)) {
            return null;
        }

        return in_array($code, ['XX', 'ZZ', 'T1', 'A1', 'A2', 'O1', 'EU'], true)
            ? null
            : $code;
    }

    private static function nonemptyText(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
