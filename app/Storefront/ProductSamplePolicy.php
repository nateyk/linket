<?php

namespace App\Storefront;

use Common\Files\Actions\FileUploadValidator;
use Common\Files\FileEntry;

/**
 * Buyer-facing preview limits. These are separate from paid
 * digitalProductFiles (private, 100MB, delivered only after purchase).
 *
 * - Audio clips: MP3, M4A, WAV, at most 8 per product, 20MB each.
 * - PDF sample: one PDF, 15MB. EPUB samples are out of scope.
 * - Courses cannot have samples.
 * - Upload type digitalProductSamples, disk prefix digital-product-samples.
 * - Public playback uses a signed URL that expires after URL_TTL_MINUTES.
 */
final class ProductSamplePolicy
{
    public const MAX_AUDIO_SAMPLES = 8;

    public const MAX_PDF_SAMPLES = 1;

    public const MAX_AUDIO_BYTES = 20971520;

    public const MAX_PDF_BYTES = 15728640;

    public const URL_TTL_MINUTES = 180;

    public const UPLOAD_TYPE = 'digitalProductSamples';

    /**
     * @return string[]
     */
    public static function uploadMimes(): array
    {
        return [
            'audio/mpeg',
            'audio/mp4',
            'audio/x-m4a',
            'audio/wav',
            'audio/x-wav',
            'audio/wave',
            'application/pdf',
        ];
    }

    public static function allowedKind(string $productType): ?string
    {
        return match ($productType) {
            'audio' => 'audio',
            'ebook', 'digital' => 'pdf',
            default => null,
        };
    }

    public static function maxCount(string $kind): int
    {
        return $kind === 'audio' ? self::MAX_AUDIO_SAMPLES : self::MAX_PDF_SAMPLES;
    }

    public static function maxBytes(string $kind): int
    {
        return $kind === 'audio' ? self::MAX_AUDIO_BYTES : self::MAX_PDF_BYTES;
    }

    public static function kindForExtension(?string $extension): ?string
    {
        return match (ProductFileFormats::normalizeExtension($extension)) {
            'mp3', 'm4a', 'wav' => 'audio',
            'pdf' => 'pdf',
            default => null,
        };
    }

    public static function uploadError(string $uploadType, string $extension, string $mime, int $bytes): ?string
    {
        if ($uploadType !== self::UPLOAD_TYPE) {
            return null;
        }

        $kind = self::kindForExtension($extension);
        if ($kind === null) {
            return __('Preview files must be an MP3, M4A, WAV, or PDF.');
        }

        if ($kind === 'pdf' && $mime !== '' && $mime !== 'application/pdf') {
            return __('The sample file must be a PDF.');
        }

        if ($bytes > self::maxBytes($kind)) {
            $size = FileUploadValidator::formatBytes(self::maxBytes($kind));

            return $kind === 'pdf'
                ? __('The sample PDF may not be greater than :size.', ['size' => $size])
                : __('A preview track may not be greater than :size.', ['size' => $size]);
        }

        return null;
    }

    public static function attachError(FileEntry $file, string $kind): ?string
    {
        if ($file->upload_type !== self::UPLOAD_TYPE) {
            return __('Preview files must be uploaded as product previews. Paid files stay private.');
        }

        $fileKind = self::kindForExtension($file->extension);
        if ($fileKind !== $kind) {
            return $kind === 'audio'
                ? __('Preview tracks must be MP3, M4A, or WAV.')
                : __('The sample file must be a PDF.');
        }

        if ((int) $file->file_size > self::maxBytes($kind)) {
            $size = FileUploadValidator::formatBytes(self::maxBytes($kind));

            return $kind === 'pdf'
                ? __('The sample PDF may not be greater than :size.', ['size' => $size])
                : __('A preview track may not be greater than :size.', ['size' => $size]);
        }

        return null;
    }
}
