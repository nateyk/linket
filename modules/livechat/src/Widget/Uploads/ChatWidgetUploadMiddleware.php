<?php

namespace Livechat\Widget\Uploads;

use Common\Files\Actions\ValidateFileUpload;
use Common\Files\FileEntry;
use Common\Files\Middleware\FileUploadMiddlewareContract;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class ChatWidgetUploadMiddleware implements FileUploadMiddlewareContract
{
    public function validate(array $data): Collection|null
    {
        return (new ValidateFileUpload(
            maxSize: settings('lc.uploads.max_size'),
            allowedExtensions: settings('lc.uploads.allowed_extensions'),
            blockedExtensions: settings('lc.uploads.blocked_extensions'),
        ))->execute($data);
    }

    public function handle(FileEntry $fileEntry, array $data): FileEntry
    {
        return $fileEntry;
    }
}
