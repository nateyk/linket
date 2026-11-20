<?php

namespace App\Storefront;

use App\Analytics\Actions\ResolveVisitorLocation;
use Illuminate\Support\Str;

class VisitorAttributes
{
    /**
     * ISO 3166-1 alpha-2 country code for the current visitor, or null
     * when the IP cannot be resolved to a location.
     */
    public static function country(): ?string
    {
        return ResolveVisitorLocation::resolve()['iso_code'];
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
        // View deduplication uses Laravel's trusted-proxy-resolved client IP.
        // A valid private/loopback IP can still identify a local test visit or
        // a request arriving through a private ingress proxy. It must not be
        // used to invent a geographic location.
        $ip = request()->ip();
        if (!is_string($ip) || !filter_var($ip, FILTER_VALIDATE_IP)) {
            return null;
        }

        return hash('sha256', $ip);
    }

}
