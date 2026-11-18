<?php

namespace App\Analytics\Actions;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;

final class ResolveVisitorLocation
{
    /**
     * Accept the client IP resolved by Laravel's trusted proxy middleware.
     * Never trust X-Forwarded-For / CF-Connecting-IP from an arbitrary request.
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
     * Returns geo coordinates only when a trustworthy public IP / CDN country
     * hint is available. No invented country is applied to unknown visitors.
     *
     * @return array{iso_code: ?string, city: ?string, state: ?string}
     */
    public static function resolve(?Request $request = null): array
    {
        $request ??= request();
        $data = ['iso_code' => null, 'city' => null, 'state' => null];
        $ip = self::publicIp($request);

        if ($ip) {
            try {
                $location = geoip($ip);
                $data = [
                    'iso_code' => self::countryCode($location['iso_code'] ?? null),
                    'city' => self::nonemptyText($location['city'] ?? null),
                    'state' => self::nonemptyText($location['state'] ?? null),
                ];

                // Countryless database lookups do not establish a trustworthy city.
                if (!$data['iso_code']) {
                    $data['city'] = null;
                    $data['state'] = null;
                }
            } catch (\Throwable) {
                // A missing or unreadable database must not break public clicks.
            }
        }

        // Cloudflare's country header is only authentic if the TCP peer is on
        // the operator-controlled allowlist (e.g. Cloudflare edge CIDR ranges).
        $edgeCountry = self::trustedCountryHeader($request);
        if ($edgeCountry !== null) {
            if ($edgeCountry !== $data['iso_code']) {
                $data['city'] = null;
                $data['state'] = null;
            }
            $data['iso_code'] = $edgeCountry;
        }

        return $data;
    }

    private static function trustedCountryHeader(Request $request): ?string
    {
        $allowed = array_values(array_filter(array_map(
            'trim',
            explode(',', (string) config('geoip.country_header_proxies', ''))
        ), static fn (string $value) => $value !== '' && $value !== '*'));

        $peer = $request->server('REMOTE_ADDR');
        if (!is_string($peer) || !$allowed || !filter_var($peer, FILTER_VALIDATE_IP)) {
            return null;
        }

        try {
            if (!IpUtils::checkIp($peer, $allowed)) {
                return null;
            }
        } catch (\Throwable) {
            return null;
        }

        return self::countryCode($request->header('CF-IPCountry'));
    }

    private static function countryCode(mixed $code): ?string
    {
        if (!is_string($code)) {
            return null;
        }
        $code = strtoupper(trim($code));

        return preg_match('/^[A-Z]{2}$/', $code)
            && !in_array($code, ['XX', 'ZZ', 'T1', 'A1', 'A2', 'O1', 'EU'], true)
                ? $code
                : null;
    }

    private static function nonemptyText(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
