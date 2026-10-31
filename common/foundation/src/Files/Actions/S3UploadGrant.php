<?php

namespace Common\Files\Actions;

use Common\Files\FileEntryPayload;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class S3UploadGrant
{
    public function issue(FileEntryPayload $payload, string $key): void
    {
        Cache::put('s3-upload-grant:' . hash('sha256', $key), [
            'owner_id' => $payload->ownerId,
            'filename' => $payload->filename,
            'upload_type' => $payload->uploadType->name,
            'backend_id' => $payload->backend->id,
            'workspace_id' => $payload->workspaceId,
            'parent_id' => $payload->parentId,
            'client_size' => $payload->size,
        ], now()->addHours(24));
    }

    public function verify(FileEntryPayload $payload, string $filename): void
    {
        $disk = \Common\Files\Uploads\Uploads::disk($payload->uploadType, $payload->backend);
        $path = trim($disk->path(''), '/') . '/' . $filename;
        $grant = Cache::get('s3-upload-grant:' . hash('sha256', ltrim($path, '/')));
        // Storage backends may prefix paths differently, so use the issued
        // full file key passed from presign instead of reconstructing paths.
        abort_unless($grant &&
            $grant['owner_id'] === $payload->ownerId &&
            $grant['filename'] === $filename &&
            $grant['upload_type'] === $payload->uploadType->name &&
            $grant['backend_id'] === $payload->backend->id &&
            (int) $grant['workspace_id'] === (int) $payload->workspaceId &&
            (int) $grant['parent_id'] === (int) $payload->parentId &&
            (int) $grant['client_size'] === (int) $payload->size, 403);
        $payload->filename = $filename;
        $payload->diskPrefix = $payload->uploadType->public ? null : $filename;
        Cache::forget('s3-upload-grant:' . hash('sha256', ltrim($path, '/')));
    }
}
