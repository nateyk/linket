<?php

namespace Common\Files\Uploads;

use App\Models\User;
use Common\Files\FileEntry;
use Common\Files\FileEntryPayload;
use Common\Workspaces\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

/**
 * Single authorization boundary for ordinary, S3 and TUS uploads.
 *
 * The browser may describe a file; it never chooses the storage key,
 * owner, or an unverified workspace.
 */
final class SecureUpload
{
    /** @return array{payload: FileEntryPayload, metadata: array<string, mixed>} */
    public function prepare(Request $request, array $data, ?UploadedFile $file = null): array
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_if(array_key_exists('filename', $data), 403, 'Upload storage keys are server-generated.');
        abort_if(isset($data['ownerId']) && (int) $data['ownerId'] !== (int) $user->id, 403);

        $type = Uploads::type((string) ($data['uploadType'] ?? ''));
        abort_unless($type !== null, 422, 'Unknown upload type.');
        $backendId = (string) ($data['backendId'] ?? ($type->backendIds[0] ?? ''));
        $backend = Uploads::backend($backendId);
        abort_unless($backend && in_array($backend->id, $type->backendIds, true), 422, 'Upload backend is not enabled for this file type.');

        $workspaceId = $this->workspaceId($data['workspaceId'] ?? null);
        $parentId = isset($data['parentId']) && $data['parentId'] !== '' ? (int) $data['parentId'] : null;

        $name = $file ? $file->getClientOriginalName() : (string) ($data['clientName'] ?? '');
        $name = basename(str_replace('\\', '/', $name));
        $extension = strtolower((string) ($file ? $file->getClientOriginalExtension() : ($data['clientExtension'] ?? '')));
        $mime = (string) ($file ? ($file->getMimeType() ?: 'application/octet-stream') : ($data['clientMime'] ?? 'application/octet-stream'));
        $size = $file ? $file->getSize() : ($data['clientSize'] ?? null);
        abort_unless($name !== '' && mb_strlen($name) <= 255 && !str_contains($name, "\0"), 422, 'Invalid file name.');
        abort_unless(preg_match('/^[a-z0-9]{1,12}$/D', $extension) === 1, 422, 'Invalid file extension.');
        abort_unless(is_numeric($size) && (int) $size >= 0 && (string) (int) $size === (string) $size, 422, 'Invalid file size.');

        $relativePath = $data['relativePath'] ?? null;
        if (in_array($relativePath, ['null', 'false'], true)) {
            $relativePath = null;
        }
        if ($relativePath !== null && $relativePath !== '') {
            abort_unless($type->supportsFolders && $workspaceId !== null && is_string($relativePath) && strlen($relativePath) <= 255, 422, 'Invalid upload folder path.');
            foreach (explode('/', str_replace('\\', '/', $relativePath)) as $segment) {
                abort_unless($segment !== '' && $segment !== '.' && $segment !== '..' && !preg_match('/[\x00-\x1f]/', $segment), 422, 'Invalid upload folder path.');
            }
        }

        $filename = (string) Str::uuid() . ($type->public ? '.' . $extension : '');
        $metadata = [
            ...array_diff_key($data, array_flip(['relativePath', 'type', 'file_size', 'ownerId', 'workspaceId', 'parentId', 'filename', 'diskPrefix'])),
            'uploadType' => $type->name,
            'backendId' => $backend->id,
            'clientName' => $name,
            'clientMime' => $mime,
            'clientExtension' => $extension,
            'clientSize' => (int) $size,
            'size' => (int) $size,
            ...($workspaceId !== null ? ['workspaceId' => $workspaceId] : []),
            ...($parentId !== null ? ['parentId' => $parentId] : []),
            ...($relativePath ? ['relativePath' => $relativePath] : []),
            'ownerId' => (int) $user->id,
            'filename' => $filename,
        ];

        $payload = new FileEntryPayload($metadata);
        $this->assertAuthorized($request, $payload);

        return ['payload' => $payload, 'metadata' => $metadata];
    }

    public function assertAuthorized(Request $request, FileEntryPayload $payload): void
    {
        $user = $request->user();
        abort_unless($user instanceof User && (int) $payload->ownerId === (int) $user->id, 403);
        abort_unless(
            in_array($payload->backend->id, $payload->uploadType->backendIds, true),
            403,
            'Upload backend is not permitted.',
        );
        abort_unless(
            preg_match('/^[0-9a-f-]{36}(?:\.[a-z0-9]{1,12})?$/D', $payload->filename) === 1,
            403,
            'Invalid server-generated upload key.',
        );

        if ($payload->workspaceId !== null) {
            $workspace = Workspace::query()->forUser($user->id)->where('id', $payload->workspaceId)->first();
            abort_unless($workspace !== null, 403, 'Unauthorized workspace.');
            abort_unless($workspace->isOwner($user) || $workspace->findMember($user)?->hasPermission('files.create'), 403, 'No workspace upload permission.');
        }

        if ($payload->parentId !== null) {
            $parent = FileEntry::query()->findOrFail($payload->parentId);
            abort_unless((int) $parent->workspace_id === (int) $payload->workspaceId, 403, 'Upload parent belongs to another workspace.');
            Gate::forUser($user)->authorize('update', $parent);
        }

        Gate::forUser($user)->authorize('store', [FileEntry::class, $payload->parentId, $payload->uploadType->name]);
    }

    private function workspaceId(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === 'null' || $value === 'false') {
            return null;
        }
        $id = filter_var($value, FILTER_VALIDATE_INT);
        abort_unless($id !== false && $id > 0, 422, 'Invalid workspace.');
        return $id;
    }
}
