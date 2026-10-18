<?php

namespace App\Files;

use Intervention\Image\ImageManager;

final class WebpImage
{
    public const QUALITY = 82;

    /**
     * Absent admin setting means conversion is on. Stored inside the
     * `uploading` JSON blob so a boolean false survives the settings save
     * path, which deletes top-level false rows.
     */
    public static function uploadsShouldConvert(): bool
    {
        $value = settings('uploading.convert_images_to_webp');

        if ($value === null) {
            return true;
        }

        if (is_string($value)) {
            return !in_array(strtolower(trim($value)), ['false', '0', 'no', ''], true);
        }

        return (bool) $value;
    }

    public static function encode(string $contents): ?string
    {
        if ($contents === '' || !extension_loaded('gd')) {
            return null;
        }

        try {
            $webp = (string) ImageManager::gd()
                ->read($contents)
                ->toWebp(quality: self::QUALITY);

            return $webp === '' ? null : $webp;
        } catch (\Throwable) {
            return null;
        }
    }
}
