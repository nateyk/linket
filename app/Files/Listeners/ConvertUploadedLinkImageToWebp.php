<?php

namespace App\Files\Listeners;

use App\Files\ReplaceLinkImageWithWebp;
use Common\Files\Events\FileUploaded;

/**
 * Runs during the upload request so the returned file entry is already WebP.
 * Queuing this would hand the client the original PNG id and mime.
 */
class ConvertUploadedLinkImageToWebp
{
    public function handle(FileUploaded $event): void
    {
        (new ReplaceLinkImageWithWebp())->execute($event->fileEntry);
    }
}
