<?php

namespace Common\Files;

use Illuminate\Support\Str;

class PublicMediaUrl
{
    /**
     * Canonicalize a public media URL/path to root-relative `/storage/...`.
     *
     * Preserves absolute http(s) and protocol-relative URLs (CDN).
     * Normalizes `storage/...` → `/storage/...`.
     * Strips `blob:` / `data:` (invalid durable identities).
     */
    public static function normalize(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);

        if ($value === '') {
            return '';
        }

        // Preserve absolute http/https URLs and protocol-relative //cdn
        $lower = Str::lower($value);
        if (Str::startsWith($lower, ['http://', 'https://', '//'])) {
            return $value;
        }

        // Invalid durable identities must not be persisted
        if (Str::startsWith($lower, ['blob:', 'data:'])) {
            return '';
        }

        // Reject filesystem absolute paths (security)
        if (Str::startsWith($value, ['/', '\\']) && preg_match('#^/([a-z]:|home|var|tmp|Users)#i', $value)) {
            return '';
        }

        // Normalize storage/... to /storage/...
        $ltrim = ltrim($value, '/');
        if (Str::startsWith($ltrim, 'storage/')) {
            return '/' . $ltrim;
        }

        // If already starts with /storage/, preserve as is (ensure single leading slash)
        if (Str::startsWith($value, '/storage/')) {
            return '/' . ltrim($value, '/');
        }

        return $value;
    }

    public static function isAbsoluteUrl(?string $value): bool
    {
        if (!$value) return false;
        $lower = Str::lower(trim($value));
        return Str::startsWith($lower, ['http://', 'https://', '//']);
    }

    public static function isLocalStorageUrl(?string $value): bool
    {
        if (!$value) return false;
        $trim = ltrim(trim($value), '/');
        return Str::startsWith($trim, 'storage/');
    }
}
