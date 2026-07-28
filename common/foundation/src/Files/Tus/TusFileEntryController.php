<?php

namespace Common\Files\Tus;

use Common\Files\Actions\CreateFileEntry;
use Common\Files\Actions\StoreFile;
use Common\Files\Events\FileUploaded;
use Common\Files\FileEntry;
use Common\Files\FileEntryPayload;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Files
 */
class TusFileEntryController extends Controller
{
    /**
     * Store tus file entry
     *
     * @operationId storeTusFileEntry
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'uploadKey' => 'required|string',
        ]);

        $tusData = (new TusCache())->get($data['uploadKey']);
        $uploadType = $tusData['metadata']['uploadType'] ?? null;

        if (!$tusData) {
            return abort(404);
        }

        $metadata = $tusData['metadata'];
        $tusFilePath = $tusData['file_path'];
        $metadata['size'] = $tusData['size'];
        // tus temp file fingerprint, not needed anymore
        unset($metadata['name']);

        $payload = new FileEntryPayload($metadata);

        Gate::authorize('store', [
            FileEntry::class,
            $payload->parentId,
            $uploadType,
        ]);

        (new StoreFile())->execute($payload, [
            'path' => $tusFilePath,
            'moveFile' => true,
        ]);

        $fileEntry = (new CreateFileEntry())->execute($payload);

        $fileEntry = $payload->uploadType->runHandler($fileEntry, $metadata);

        event(new FileUploaded($fileEntry));

        File::delete($tusFilePath);

        return response()->json(['fileEntry' => $fileEntry]);
    }
}
