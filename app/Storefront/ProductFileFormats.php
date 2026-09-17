<?php

namespace App\Storefront;

/**
 * Single authoritative definition of the creator-sellable digital-product
 * file formats.
 *
 * Everything that talks about product file formats derives from here:
 *
 * - config/filesystems.php (digitalProductFiles upload accept, MIME)
 * - config/store.php allowed_extensions (deprecated alias, derived)
 * - DigitalProductMutationService attach-time validation + error wording
 * - AppBootstrapData product_file_formats (frontend accept + help text)
 *
 * The lowercase file extension is the canonical identity for
 * attachment/sale validation. MIME matters for upload/server checks, but
 * browser MIME behavior is inconsistent across browsers and operating
 * systems, so it must never be the sole definition of sellability.
 *
 * Kinds scope creator-facing guidance per product type
 * (digital/ebook/audio). Attachment validation enforces the union of all
 * kinds; files already attached before a rule change keep working (see
 * DigitalProductMutationService), so tightening the sellable set can never
 * strand an existing product.
 */
final class ProductFileFormats
{
    /**
     * Canonical format table, keyed by lowercase extension.
     *
     * @return array<string, array{label: string, mime: string[], kinds: string[]}>
     */
    public static function all(): array
    {
        return [
            'pdf' => ['label' => 'PDF', 'mime' => ['application/pdf'], 'kinds' => ['digital', 'ebook']],
            'epub' => ['label' => 'EPUB', 'mime' => ['application/epub+zip'], 'kinds' => ['digital', 'ebook']],
            'zip' => ['label' => 'ZIP', 'mime' => ['application/zip'], 'kinds' => ['digital']],
            'txt' => ['label' => 'TXT', 'mime' => ['text/plain'], 'kinds' => ['digital']],
            'mp3' => ['label' => 'MP3', 'mime' => ['audio/mpeg'], 'kinds' => ['audio']],
            'm4a' => ['label' => 'M4A', 'mime' => ['audio/mp4'], 'kinds' => ['audio']],
            'wav' => ['label' => 'WAV', 'mime' => ['audio/wav', 'audio/x-wav'], 'kinds' => ['audio']],
        ];
    }

    /**
     * Canonical extensions, optionally scoped to a product kind.
     *
     * A null or unrecognized kind (including 'course', which has no format
     * policy of its own and keeps the generic product-file uploader)
     * returns the full sellable union.
     *
     * @return string[]
     */
    public static function extensions(?string $kind = null): array
    {
        if ($kind === null) {
            return array_keys(self::all());
        }

        $scoped = [];
        foreach (self::all() as $extension => $format) {
            if (in_array($kind, $format['kinds'], true)) {
                $scoped[] = $extension;
            }
        }

        return $scoped !== [] ? $scoped : array_keys(self::all());
    }

    /**
     * @return string[]
     */
    public static function labels(?string $kind = null): array
    {
        $labels = [];
        foreach (self::all() as $extension => $format) {
            if ($kind === null || in_array($extension, self::extensions($kind), true)) {
                $labels[] = $format['label'];
            }
        }

        return $labels;
    }

    /**
     * Human-readable list, e.g. "PDF, EPUB, ZIP, or TXT".
     */
    public static function helpText(?string $kind = null): string
    {
        $labels = self::labels($kind);

        if (count($labels) === 1) {
            return $labels[0];
        }

        if (count($labels) === 2) {
            return $labels[0].' or '.$labels[1];
        }

        $last = array_pop($labels);

        return implode(', ', $labels).', or '.$last;
    }

    /**
     * Value for an <input type="file" accept="..."> attribute.
     */
    public static function acceptAttribute(?string $kind = null): string
    {
        return implode(',', array_map(
            fn(string $extension): string => '.'.$extension,
            self::extensions($kind),
        ));
    }

    /**
     * Flat unique MIME list for upload accept configuration, in canonical
     * format order. Matches the previous upload accept list exactly, minus
     * audio/aac (raw AAC is not a sellable format).
     *
     * @return string[]
     */
    public static function uploadMimes(): array
    {
        $mimes = [];
        foreach (self::all() as $format) {
            foreach ($format['mime'] as $mime) {
                if (!in_array($mime, $mimes, true)) {
                    $mimes[] = $mime;
                }
            }
        }

        return $mimes;
    }

    public static function normalizeExtension(?string $extension): ?string
    {
        $normalized = strtolower(ltrim(trim((string) $extension), '.'));

        return $normalized === '' ? null : $normalized;
    }

    public static function isSellableExtension(?string $extension): bool
    {
        $normalized = self::normalizeExtension($extension);

        return $normalized !== null && array_key_exists($normalized, self::all());
    }

    /**
     * Payload shape served to the frontend via bootstrap data.
     *
     * @return array<string, array{extensions: string[], accept: string, hint: string}>
     */
    public static function forFrontend(): array
    {
        $payload = [];
        foreach (['digital', 'ebook', 'audio', 'course'] as $kind) {
            $payload[$kind] = [
                'extensions' => self::extensions($kind === 'course' ? null : $kind),
                'accept' => self::acceptAttribute($kind === 'course' ? null : $kind),
                'hint' => self::helpText($kind === 'course' ? null : $kind),
            ];
        }

        return $payload;
    }
}
