<?php

namespace Common\Files\Actions;

use Common\Files\FileEntryPayload;
use Illuminate\Support\Facades\Cache;

class S3UploadGrant
{
    public function issue(FileEntryPayload $payload, string $key): void
    {
        Cache::put('s3-upload-grant:' . hash('sha256', $payload->filename), [
            'owner_id' => $payload->ownerId,
            'key' => $key,
            'filename' => $payload->filename,
            'upload_type' => $payload->uploadType->name,
            'backend_id' => $payload->backend->id,
            'workspace_id' => $payload->workspaceId,
            'parent_id' => $payload->parentId,
            'client_size' => $payload->size,
        ], now()->addHours(24));
    }

    public function authorizeKey(string $key): void
    {
        $grant = Cache::get('s3-upload-grant:' . hash('sha256', basename($key)));
        abort_unless($grant && hash_equals($grant['key'], $key) &&
            $grant['owner_id'] === auth()->id() &&
            $grant['backend_id'] === request('backendId') &&
            $grant['upload_type'] === request('uploadType'), 403);
    }

    public function verify(FileEntryPayload $payload, string $filename): void
    {
        $grant = Cache::get('s3-upload-grant:' . hash('sha256', $filename));
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
        Cache::forget('s3-upload-grant:' . hash('sha256', $filename));
    }
}
