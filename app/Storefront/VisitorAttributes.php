<?php

namespace App\Storefront;

use Illuminate\Support\Str;

class VisitorAttributes
{
    /**
     * ISO 3166-1 alpha-2 country code for the current visitor, or null
     * when the IP cannot be resolved to a location.
     */
    public static function country(): ?string
    {
        $ip = static::resolveIp();
        if (!$ip) {
            return null;
        }
        return geoip($ip)->iso_code ?: null;
    }

    /**
     * Normalized referrer URL. Returns null when there is no referrer or
     * when it points at a page on our own site (internal navigations).
     */
    public static function normalizedReferrer(): ?string
    {
        $referrer = request()->server('HTTP_REFERER');
        if (!$referrer) {
            return null;
        }
        return Str::contains($referrer, url(''))
            ? null
            : Str::limit($referrer, 190, '');
    }

    /**
     * SHA-256 hash of the visitor's resolved IP, or null when the IP
     * cannot be determined. Only the hash is ever persisted.
     */
    public static function ipHash(): ?string
    {
        $ip = static::resolveIp();
        if (!$ip) {
            return null;
        }
        return hash('sha256', $ip);
    }

    /**
     * Resolve the visitor IP from proxy headers first (so requests behind
     * Cloudflare or a reverse proxy are attributed correctly), falling
     * back to the request's client IP. Mirrors LogTrackedEvent.
     */
    private static function resolveIp(): ?string
    {
        foreach (
            [
                'HTTP_CF_CONNECTING_IP',
                'HTTP_CLIENT_IP',
                'HTTP_X_FORWARDED_FOR',
                'HTTP_X_FORWARDED',
                'HTTP_X_CLUSTER_CLIENT_IP',
                'HTTP_FORWARDED_FOR',
                'HTTP_FORWARDED',
                'REMOTE_ADDR',
            ]
            as $key
        ) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $candidate) {
                    $candidate = trim($candidate);
                    if (
                        filter_var(
                            $candidate,
                            FILTER_VALIDATE_IP,
                            FILTER_FLAG_NO_PRIV_RANGE |
                                FILTER_FLAG_NO_RES_RANGE,
                        ) !== false
                    ) {
                        return $candidate;
                    }
                }
            }
        }
        return request()->ip() ?: null;
    }
}