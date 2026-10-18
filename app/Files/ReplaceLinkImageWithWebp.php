<?php

namespace App\Files;

use Common\Files\FileEntry;
use Common\Files\Uploads\Uploads;

/**
 * Replaces a stored link image with WebP on the same file entry.
 * The original PNG/JPEG/BMP bytes are deleted. Product-cover jobs that
 * still see a legacy JPEG or PNG keep that older entry and add a WebP one.
 */
final class ReplaceLinkImageWithWebp
{
    /** @var list<string> */
    private const CONVERTIBLE = ['jpg', 'jpeg', 'png', 'bmp'];

    public function execute(FileEntry $entry): bool
    {
        if (!$this->shouldConvert($entry)) {
            return false;
        }

        try {
            return $this->replace($entry);
        } catch (\Throwable $e) {
            report($e);

            return false;
        }
    }

    private function shouldConvert(FileEntry $entry): bool
    {
        if (!WebpImage::uploadsShouldConvert()) {
            return false;
        }

        if ($entry->upload_type !== 'linkImages') {
            return false;
        }

        if (!str_starts_with((string) $entry->mime, 'image/')) {
            return false;
        }

        return in_array(strtolower((string) $entry->extension), self::CONVERTIBLE, true);
    }

    private function replace(FileEntry $entry): bool
    {
        $this->raiseMemoryLimit();

        $disk = $entry->getDisk();
        $oldPath = $entry->getStoragePath();
        $contents = $disk->get($oldPath);
        if (!is_string($contents) || $contents === '') {
            return false;
        }

        $webp = WebpImage::encode($contents);
        if ($webp === null) {
            return false;
        }

        $max = Uploads::type('linkImages')?->maxFileSize();
        if ($max !== null && strlen($webp) > $max) {
            return false;
        }

        $newFileName = pathinfo((string) $entry->file_name, PATHINFO_FILENAME).'.webp';
        $newPath = $this->webpStoragePath($oldPath);
        $written = $disk->put($newPath, $webp, [
            'visibility' => $entry->public ? 'public' : 'private',
            'mimetype' => 'image/webp',
        ]);
        if ($written === false) {
            return false;
        }

        $displayName = pathinfo((string) $entry->name, PATHINFO_FILENAME);
        if ($displayName === '') {
            $displayName = 'image';
        }

        $entry->forceFill([
            'name' => $displayName.'.webp',
            'file_name' => $newFileName,
            'mime' => 'image/webp',
            'extension' => 'webp',
            'file_size' => strlen($webp),
            'type' => 'image',
        ])->save();

        if ($newPath !== $oldPath) {
            $disk->delete($oldPath);
        }

        return true;
    }

    private function webpStoragePath(string $currentPath): string
    {
        $updated = preg_replace('/\.[^\/.]+$/', '.webp', $currentPath);

        return is_string($updated) && $updated !== '' ? $updated : $currentPath.'.webp';
    }

    private function raiseMemoryLimit(): void
    {
        $current = (int) ini_get('memory_limit');
        if ($current > 0 && $current < 512) {
            @ini_set('memory_limit', '512M');
        }
    }
}
