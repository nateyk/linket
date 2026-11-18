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
        $ip = ResolveVisitorLocation::publicIp();
        if (!$ip) {
            return null;
        }
        return hash('sha256', $ip);
    }

}
